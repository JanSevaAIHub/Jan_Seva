"""Provision explicitly configured demo identities via the Supabase Admin API."""

from dataclasses import dataclass, field
from os import environ
import sys
from uuid import UUID

import httpx
from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import ConfigurationError, get_settings
from app.db import get_engine
from app.models import Profile, Role


@dataclass(frozen=True)
class DemoAccount:
    email: str
    password: str | None = field(repr=False)
    name: str
    role: Role


def demo_accounts() -> list[DemoAccount]:
    accounts = []
    for prefix, name, role in [("CITIZEN", "Arjun Mishra", Role.CITIZEN), ("OFFICER", "R. Singh", Role.OFFICER)]:
        try:
            email = str(TypeAdapter(EmailStr).validate_python(environ.get(f"DEMO_{prefix}_EMAIL", "")))
        except ValidationError:
            raise ConfigurationError(f"Set a valid DEMO_{prefix}_EMAIL.") from None
        accounts.append(DemoAccount(email, environ.get(f"DEMO_{prefix}_PASSWORD") or None, name, role))
    if accounts[0].email.casefold() == accounts[1].email.casefold():
        raise ConfigurationError("Citizen and officer demo emails must be distinct.")
    return accounts


def admin_client() -> httpx.Client:
    settings = get_settings()
    if not settings.supabase_service_role_key:
        raise ConfigurationError("SUPABASE_SERVICE_ROLE_KEY is required for explicit demo setup/lookup.")
    return httpx.Client(
        base_url=settings.auth_issuer + "/", timeout=10, follow_redirects=False,
        headers={"apikey": settings.supabase_service_role_key,
                 "Authorization": "Bearer " + settings.supabase_service_role_key},
    )


def resolve_identities(client: httpx.Client, accounts: list[DemoAccount], *, create: bool) -> dict[Role, UUID]:
    """Only the provider supplies user UUIDs. Reruns reuse existing identities."""
    found = {}
    page = 1
    while len(found) < len(accounts):
        response = client.get("admin/users", params={"page": page, "per_page": 100})
        response.raise_for_status()
        users = response.json()["users"]
        for user in users:
            for account in accounts:
                if (user.get("email") or "").casefold() == account.email.casefold():
                    found[account.role] = UUID(user["id"])
        if len(users) < 100:
            break
        page += 1
    # Validate local prerequisites before making any external account writes.
    for account in accounts:
        if account.role not in found and (not create or not account.password):
            if not create:
                raise ConfigurationError(f"The demo {account.role.value} identity is missing; run setup_demo first.")
            raise ConfigurationError(f"DEMO_{account.role.value.upper()}_PASSWORD is required when creating a new identity.")
    for account in accounts:
        if account.role in found:
            continue
        response = client.post("admin/users", json={
            "email": account.email, "password": account.password,
            "email_confirm": True, "user_metadata": {"name": account.name},
        })
        response.raise_for_status()
        found[account.role] = UUID(response.json()["id"])
    if len(set(found.values())) != len(accounts):
        raise ConfigurationError("Demo identities must have distinct provider user IDs.")
    return found


def provision_profiles(session: Session, accounts: list[DemoAccount], identities: dict[Role, UUID]) -> None:
    for account in accounts:
        user_id = identities[account.role]
        profile = session.get(Profile, user_id)
        if profile is not None:
            if profile.role != account.role or profile.name != account.name:
                raise ConfigurationError("An existing profile conflicts with demo setup; no roles/names were overwritten.")
            continue
        session.add(Profile(user_id=user_id, name=account.name, role=account.role))
    session.flush()


def setup_demo() -> None:
    accounts = demo_accounts()
    # Check the migrated database before creating external identities.
    from app.scripts.check_db import check_database
    check_database()
    with admin_client() as client:
        identities = resolve_identities(client, accounts, create=True)
    with Session(get_engine()) as session, session.begin():
        provision_profiles(session, accounts, identities)


if __name__ == "__main__":
    try:
        setup_demo()
    except ConfigurationError as error:
        print(f"Demo setup incomplete: {error}", file=sys.stderr)
        sys.exit(1)
    except (SQLAlchemyError, httpx.HTTPError, KeyError, ValueError):
        print("Demo setup incomplete. Check the migrated database and Supabase admin configuration. No existing account passwords or roles were changed; rerun safely after correcting configuration.", file=sys.stderr)
        sys.exit(1)
    print("Demo identities and server-controlled citizen/officer profiles are ready.")
