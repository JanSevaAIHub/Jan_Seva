"""Insert exactly twenty labeled synthetic fixtures; never reset real/existing records."""

import json
from pathlib import Path
import sys
from uuid import UUID

import httpx
from pydantic import ValidationError
from sqlalchemy import func, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import ConfigurationError
from app.db import get_engine
from app.models import Complaint, ComplaintEvent, InternalStatus, Profile, Role
from app.schemas import ComplaintCreate
from app.scripts.setup_demo import admin_client, demo_accounts, resolve_identities

FIXTURES = Path(__file__).resolve().parents[4] / "data" / "seed_complaints.json"


def seed_complaints(session: Session, citizen_id: UUID, officer_id: UUID) -> tuple[int, int]:
    for user_id, role in [(citizen_id, Role.CITIZEN), (officer_id, Role.OFFICER)]:
        profile = session.get(Profile, user_id)
        if profile is None or profile.role != role:
            raise ConfigurationError("Seed requires the provisioned demo citizen and officer profiles.")
    if session.bind.dialect.name == "postgresql":
        session.execute(text("SELECT pg_advisory_xact_lock(hashtext('janseva:phase1-demo-seed'))"))
    fixtures = json.loads(FIXTURES.read_text(encoding="utf-8"))
    keys = [row["seed_key"] for row in fixtures]
    if len(fixtures) != 20 or len(set(keys)) != 20 or any(not key.startswith("phase1-demo-") for key in keys):
        raise ConfigurationError("Expected exactly twenty distinct Phase 1 synthetic fixtures.")
    inserted = 0
    for row in fixtures:
        draft = ComplaintCreate.model_validate({key: row[key] for key in ("title", "description", "category", "locality")})
        status = InternalStatus(row["status"])
        if not draft.title.startswith("[SYNTHETIC]") or "Synthetic demonstration only" not in draft.description:
            raise ConfigurationError("All demo complaints must be clearly labeled synthetic.")
        existing = session.scalar(select(Complaint).where(Complaint.seed_key == row["seed_key"]))
        if existing is not None:
            if not existing.is_synthetic or existing.user_id != citizen_id or existing.assigned_officer_id != officer_id:
                raise ConfigurationError("Existing seed record conflicts with demo identities; no data was reassigned.")
            continue
        complaint = Complaint(**draft.model_dump(), user_id=citizen_id, assigned_officer_id=officer_id,
                              status=status, is_synthetic=True, seed_key=row["seed_key"])
        session.add(complaint)
        session.flush()
        complaint.events.append(ComplaintEvent(
            actor_id=citizen_id, old_status=None, new_status=InternalStatus.LOCAL_SUBMITTED,
            note="Synthetic demo: citizen confirmed the internal complaint; no official filing.",
        ))
        if status != InternalStatus.LOCAL_SUBMITTED:
            complaint.events.append(ComplaintEvent(
                actor_id=officer_id, old_status=InternalStatus.LOCAL_SUBMITTED, new_status=status,
                note="Synthetic demo: preloaded internal status history, not a real action or government filing.",
            ))
        inserted += 1
    session.flush()
    count = session.scalar(select(func.count()).select_from(Complaint).where(Complaint.seed_key.in_(keys)))
    if count != 20:
        raise ConfigurationError("Synthetic fixture count is not twenty; transaction must be rolled back.")
    return inserted, count


def seed_demo() -> tuple[int, int]:
    accounts = demo_accounts()
    from app.scripts.check_db import check_database
    check_database()
    with admin_client() as client:
        identities = resolve_identities(client, accounts, create=False)
    with Session(get_engine()) as session, session.begin():
        return seed_complaints(session, identities[Role.CITIZEN], identities[Role.OFFICER])


if __name__ == "__main__":
    try:
        inserted, total = seed_demo()
    except ConfigurationError as error:
        print(f"Seed not applied: {error}", file=sys.stderr)
        sys.exit(1)
    except (SQLAlchemyError, httpx.HTTPError, KeyError, ValueError, ValidationError):
        print("Seed not applied. Check the migrated database, provisioned demo identities, and fixture format; transaction rolled back.", file=sys.stderr)
        sys.exit(1)
    print(f"Synthetic demo complaints: inserted {inserted}; total {total}. Existing records preserved.")
