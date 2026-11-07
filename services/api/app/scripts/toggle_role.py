"""Operator-only role helper. Requires an explicit profile UUID; never picks a user."""

import argparse
import sys
from uuid import UUID

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import ConfigurationError
from app.db import get_engine
from app.models import Profile, Role


def toggle_role(session: Session, user_id: UUID, target_role: Role | None = None) -> Role:
    profile = session.get(Profile, user_id, with_for_update=True)
    if profile is None:
        raise ConfigurationError("The explicitly selected profile does not exist.")
    profile.role = Role(target_role) if target_role is not None else (
        Role.OFFICER if profile.role == Role.CITIZEN else Role.CITIZEN
    )
    # Preserve the user's name, assignments and complaint audit history.
    session.flush()
    return profile.role


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--user-id", type=UUID, required=True)
    parser.add_argument("--role", choices=[role.value for role in Role])
    args = parser.parse_args()
    try:
        with Session(get_engine()) as session, session.begin():
            role = toggle_role(session, args.user_id, Role(args.role) if args.role else None)
    except (ConfigurationError, SQLAlchemyError):
        print("Role unchanged; check the selected profile, database configuration and privileges.", file=sys.stderr)
        return 1
    print(f"Selected profile role updated to {role.value}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

