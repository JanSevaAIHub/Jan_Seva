from datetime import datetime, timezone
import json
import secrets
from uuid import uuid4

import httpx
from pydantic import ValidationError
import pytest
from sqlalchemy import func, inspect, select
from sqlalchemy.exc import IntegrityError

from app.config import ConfigurationError, get_settings
from app.models import Complaint, ComplaintCategory, ComplaintEvent, InternalStatus, Profile, Role, Scheme, SchemeChunk
from app.schemas import ComplaintCreate, ComplaintDetail, ComplaintStatusUpdate
from app.scripts.seed_demo import seed_complaints
from app.scripts.setup_demo import DemoAccount, provision_profiles, resolve_identities


def complaint_data(profiles):
    return dict(user_id=profiles["citizen"].user_id, title="Test complaint", description="Synthetic model test only.", category=ComplaintCategory.ROAD, locality="Test Ward")


def test_persistent_defaults_relationships_and_response_schema(db_session, profiles):
    complaint = Complaint(**complaint_data(profiles))
    db_session.add(complaint)
    db_session.flush()
    complaint.events.append(ComplaintEvent(actor_id=profiles["citizen"].user_id, new_status=complaint.status))
    db_session.commit()
    saved_id = complaint.id
    db_session.expunge_all()
    saved = db_session.get(Complaint, saved_id)
    assert saved.status == InternalStatus.LOCAL_SUBMITTED
    assert saved.created_at and saved.updated_at
    assert saved.assigned_officer_id is None and saved.official_ref is None
    assert saved.owner.user_id == profiles["citizen"].user_id
    assert saved.events[0].actor_id == saved.user_id
    assert saved.events[0].complaint is saved
    response = ComplaintDetail.model_validate(saved)
    assert len(response.events) == 1 and response.is_synthetic is False


@pytest.mark.parametrize("kind", ["owner", "assignee", "actor", "event_complaint", "scheme_chunk"])
def test_foreign_keys_reject_orphans(db_session, profiles, kind):
    data = complaint_data(profiles)
    if kind == "owner":
        db_session.add(Complaint(**{**data, "user_id": uuid4()}))
    elif kind == "assignee":
        db_session.add(Complaint(**data, assigned_officer_id=uuid4()))
    elif kind == "scheme_chunk":
        db_session.add(SchemeChunk(scheme_id=uuid4(), chunk_text="Test", source_url="https://example.gov.in"))
    elif kind == "event_complaint":
        db_session.add(ComplaintEvent(complaint_id=uuid4(), actor_id=profiles["citizen"].user_id, new_status=InternalStatus.LOCAL_SUBMITTED))
    else:
        complaint = Complaint(**data)
        db_session.add(complaint)
        db_session.flush()
        db_session.add(ComplaintEvent(complaint_id=complaint.id, actor_id=uuid4(), new_status=InternalStatus.LOCAL_SUBMITTED))
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_invalid_role_and_status_are_rejected_by_database(db_session, profiles):
    db_session.add(Profile(user_id=uuid4(), name="Test", role="admin"))
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()
    db_session.add(Complaint(**complaint_data(profiles), status="OFFICIALLY_FILED"))
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_required_indexes_exist(db_session):
    inspector = inspect(db_session.bind)
    for table, columns in {"complaints": ["user_id", "assigned_officer_id", "status"], "complaint_events": ["complaint_id"], "scheme_chunks": ["scheme_id"]}.items():
        indexed = {tuple(index["column_names"]) for index in inspector.get_indexes(table)}
        assert all((column,) in indexed for column in columns)


def test_embeddings_require_real_model_dimensions_and_finite_values(db_session, monkeypatch):
    monkeypatch.setenv("EMBEDDING_MODEL", "test-model-only")
    monkeypatch.setenv("EMBEDDING_DIMENSIONS", "3")
    get_settings.cache_clear()
    try:
        scheme = Scheme(title="Synthetic scheme", category="test", description="Test only", source_url="https://example.gov.in", reviewed_at=datetime.now(timezone.utc))
        db_session.add(scheme)
        db_session.flush()
        chunk = SchemeChunk(scheme_id=scheme.id, chunk_text="Test only", source_url=scheme.source_url, embedding=[0.1, 0.2, 0.3])
        db_session.add(chunk)
        db_session.commit()
        db_session.expunge_all()
        saved = db_session.get(SchemeChunk, chunk.id)
        assert saved.embedding == [0.1, 0.2, 0.3]
        assert saved.embedding_model == "test-model-only" and saved.embedding_dimensions == 3
        for value in [[1, 2], [1, 2, float("nan")], [1, 2, True], [1, 2, "three"]]:
            with pytest.raises(ValueError):
                saved.embedding = value
        monkeypatch.delenv("EMBEDDING_MODEL")
        get_settings.cache_clear()
        with pytest.raises(ConfigurationError):
            saved.embedding = [1, 2, 3]
    finally:
        get_settings.cache_clear()


def test_demo_provider_setup_and_seed_twice_reuses_actual_mock_provider_ids(db_session):
    accounts = [DemoAccount("citizen@example.com", secrets.token_urlsafe(24), "Arjun Mishra", Role.CITIZEN),
                DemoAccount("officer@example.com", secrets.token_urlsafe(24), "R. Singh", Role.OFFICER)]
    provider_users = []
    creation_requests = []

    def provider(request):
        assert request.url.path == "/auth/v1/admin/users"
        if request.method == "GET":
            return httpx.Response(200, json={"users": provider_users})
        payload = json.loads(request.content)
        creation_requests.append(payload)
        # These UUIDs belong only to an isolated provider test double.
        user = {"id": str(uuid4()), "email": payload["email"]}
        provider_users.append(user)
        return httpx.Response(200, json=user)

    with httpx.Client(base_url="https://provider.example/auth/v1/", transport=httpx.MockTransport(provider)) as client:
        identities = resolve_identities(client, accounts, create=True)
        provision_profiles(db_session, accounts, identities)
        db_session.commit()
        assert seed_complaints(db_session, identities[Role.CITIZEN], identities[Role.OFFICER]) == (20, 20)
        db_session.commit()
        first_ids = set(db_session.scalars(select(Complaint.id)))
        first_events = db_session.scalar(select(func.count()).select_from(ComplaintEvent))
        again = resolve_identities(client, accounts, create=True)
        provision_profiles(db_session, accounts, again)
        assert seed_complaints(db_session, again[Role.CITIZEN], again[Role.OFFICER]) == (0, 20)
        db_session.commit()
    assert len(creation_requests) == 2
    assert all("role" not in payload["user_metadata"] for payload in creation_requests)
    assert again == identities
    assert set(db_session.scalars(select(Complaint.id))) == first_ids
    assert db_session.scalar(select(func.count()).select_from(ComplaintEvent)) == first_events
    assert db_session.scalar(select(func.count()).select_from(Complaint)) == 20
    assert db_session.scalar(select(func.count()).select_from(Profile)) == 2
    assert all(c.is_synthetic and c.title.startswith("[SYNTHETIC]") and c.official_ref is None for c in db_session.scalars(select(Complaint)))
    assert all(c.user_id == identities[Role.CITIZEN] and c.assigned_officer_id == identities[Role.OFFICER] for c in db_session.scalars(select(Complaint)))


def test_seed_does_not_reset_modified_synthetic_records(db_session, profiles):
    citizen, officer = profiles["citizen"].user_id, profiles["officer"].user_id
    seed_complaints(db_session, citizen, officer)
    db_session.commit()
    record = db_session.scalar(select(Complaint).where(Complaint.seed_key == "phase1-demo-01"))
    record.status = InternalStatus.CANCELLED
    db_session.commit()
    assert seed_complaints(db_session, citizen, officer) == (0, 20)
    assert record.status == InternalStatus.CANCELLED
    record.is_synthetic = False
    db_session.flush()
    with pytest.raises(ConfigurationError):
        seed_complaints(db_session, citizen, officer)


def test_conflicting_existing_profile_is_not_promoted(db_session, profiles):
    existing = profiles["citizen"]
    account = DemoAccount("test@example.com", None, existing.name, Role.OFFICER)
    with pytest.raises(ConfigurationError):
        provision_profiles(db_session, [account], {Role.OFFICER: existing.user_id})
    assert existing.role == Role.CITIZEN


@pytest.mark.parametrize("update", [{"title": " "}, {"category": "Roads & Potholes"}, {"locality": ""}, {"description": "short"}])
def test_create_schema_validates_inputs(update):
    draft = {"title": "Test complaint", "description": "Synthetic input test.", "category": "road", "locality": "Test Ward"}
    with pytest.raises(ValidationError):
        ComplaintCreate.model_validate({**draft, **update})


def test_status_update_requires_note_and_internal_enum():
    with pytest.raises(ValidationError):
        ComplaintStatusUpdate(status="RESOLVED", note=" ")
    with pytest.raises(ValidationError):
        ComplaintStatusUpdate(status="ACKNOWLEDGED", note="Not an internal status")
