"""Production HTTP routes, signed JWTs and durable isolated database sessions."""

from uuid import UUID
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.main import app
from app.models import Complaint, ComplaintEvent, InternalStatus
from app.routers import officer

DRAFT = {"title": "[SYNTHETIC] Streetlight test", "description": "Synthetic demonstration only: streetlight needs internal review.",
         "category": "streetlight", "locality": "Synthetic Test Ward"}


@pytest.fixture
def workflow_client(db_session, profiles, tokens, monkeypatch):
    monkeypatch.setenv("DEMO_CITIZEN_USER_ID", str(profiles["citizen"].user_id))
    monkeypatch.setenv("DEMO_OFFICER_USER_ID", str(profiles["officer"].user_id))
    get_settings.cache_clear()
    engine = db_session.bind

    # A new DB session for EVERY HTTP request, just like the deployed API.
    def database():
        with Session(engine, expire_on_commit=False) as session:
            try:
                yield session
            except Exception:
                session.rollback()
                raise

    app.dependency_overrides[get_db] = database
    headers = {persona: {"Authorization": "Bearer " + tokens(profile.user_id)} for persona, profile in profiles.items()}
    try:
        with TestClient(app) as client:
            yield client, headers, engine
    finally:
        app.dependency_overrides.pop(get_db, None)
        get_settings.cache_clear()


def create(workflow_client, persona="citizen"):
    client, headers, _ = workflow_client
    response = client.post("/api/complaints", json=DRAFT, headers=headers[persona])
    assert response.status_code == 201, response.text
    return response.json()


def test_create_persist_list_and_detail_after_client_reload(workflow_client, profiles):
    client, headers, engine = workflow_client
    saved = create(workflow_client)
    UUID(saved["id"])
    assert saved["user_id"] == str(profiles["citizen"].user_id)
    assert saved["assigned_officer_id"] == str(profiles["officer"].user_id)
    assert saved["status"] == "LOCAL_SUBMITTED"
    assert saved["official_status"] == "NOT_FILED" and saved["official_ref"] is None
    assert len(saved["events"]) == 1
    assert saved["events"][0]["old_status"] is None
    assert saved["events"][0]["actor_id"] == saved["user_id"]
    assert saved["events"][0]["event_time"] and saved["created_at"]
    # A distinct HTTP client plus a new session, not shared in-memory ORM objects.
    with TestClient(app) as reloaded:
        result = reloaded.get(f'/api/complaints/{saved["id"]}', headers=headers["citizen"])
        assert result.status_code == 200 and result.json() == saved
        assert reloaded.get("/api/complaints", headers=headers["citizen"]).json()[0]["id"] == saved["id"]
    with Session(engine) as db:
        assert db.get(Complaint, UUID(saved["id"])).title == DRAFT["title"]


def test_ownership_and_assignment_filters(workflow_client):
    client, headers, _ = workflow_client
    own = create(workflow_client)
    other = create(workflow_client, "other_citizen")
    assert other["assigned_officer_id"] is None
    for persona, ids in [("citizen", [own["id"]]), ("other_citizen", [other["id"]]),
                         ("officer", [own["id"]]), ("other_officer", [])]:
        response = client.get("/api/complaints", headers=headers[persona])
        assert response.status_code == 200
        assert [row["id"] for row in response.json()] == ids
    for persona in ["other_citizen", "other_officer"]:
        assert client.get(f'/api/complaints/{own["id"]}', headers=headers[persona]).status_code == 404
    assert client.get("/api/complaints?status=RESOLVED", headers=headers["citizen"]).json() == []
    assert len(client.get("/api/complaints?status=LOCAL_SUBMITTED", headers=headers["officer"]).json()) == 1
    assert client.get("/api/complaints?status=bad", headers=headers["citizen"]).status_code == 422


def test_missing_jwt_and_role_or_field_injection_rejected(workflow_client):
    client, headers, _ = workflow_client
    assert client.post("/api/complaints", json=DRAFT).status_code == 401
    assert client.get("/api/complaints").status_code == 401
    assert client.post("/api/complaints", json=DRAFT, headers=headers["officer"]).status_code == 403
    for data in [{**DRAFT, "user_id": "attacker"}, {**DRAFT, "assigned_officer_id": "attacker"},
                 {**DRAFT, "status": "RESOLVED"}, {**DRAFT, "title": " "}, {**DRAFT, "description": "short"}]:
        assert client.post("/api/complaints", json=data, headers=headers["citizen"]).status_code == 422
    saved = create(workflow_client)
    path = f'/api/officer/complaints/{saved["id"]}'
    assert client.patch(path, json={"status": "UNDER_REVIEW"}).status_code == 401
    assert client.patch(path, json={"status": "UNDER_REVIEW"}, headers=headers["citizen"]).status_code == 403
    assert client.patch(path, json={"status": "UNDER_REVIEW"}, headers=headers["other_officer"]).status_code == 404


def test_full_citizen_officer_citizen_journey_with_real_event_history(workflow_client, profiles):
    client, headers, engine = workflow_client
    saved = create(workflow_client)
    path = f'/api/officer/complaints/{saved["id"]}'
    for status in ["UNDER_REVIEW", "IN_PROGRESS", "RESOLVED"]:
        previous = saved["status"]
        response = client.patch(path, json={"status": status, "note": f"Synthetic internal update: {status}"}, headers=headers["officer"])
        assert response.status_code == 200, response.text
        saved = response.json()
        event = saved["events"][-1]
        assert event["old_status"] == previous and event["new_status"] == status
        assert event["actor_id"] == str(profiles["officer"].user_id)
        assert event["note"] == f"Synthetic internal update: {status}" and event["event_time"]
        assert saved["official_status"] == "NOT_FILED"
        citizen = client.get(f'/api/complaints/{saved["id"]}', headers=headers["citizen"]).json()
        assert citizen == saved
    with TestClient(app) as browser_reload:
        detail = browser_reload.get(f'/api/complaints/{saved["id"]}', headers=headers["citizen"]).json()
        assert detail["status"] == "RESOLVED" and len(detail["events"]) == 4
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(ComplaintEvent)) == 4


@pytest.mark.parametrize("status", ["LOCAL_SUBMITTED", "IN_PROGRESS", "RESOLVED", "REJECTED"])
def test_invalid_transition_does_not_change_status_or_append_event(workflow_client, status):
    client, headers, _ = workflow_client
    saved = create(workflow_client)
    response = client.patch(f'/api/officer/complaints/{saved["id"]}', json={"status": status}, headers=headers["officer"])
    assert response.status_code == (422 if status == "REJECTED" else 409)
    if response.status_code == 409:
        assert response.json()["detail"]["code"] == "INVALID_STATUS_TRANSITION"
    assert client.get(f'/api/complaints/{saved["id"]}', headers=headers["citizen"]).json() == saved


def test_omitted_note_and_terminal_status(workflow_client):
    client, headers, _ = workflow_client
    saved = create(workflow_client)
    path = f'/api/officer/complaints/{saved["id"]}'
    for status in ["UNDER_REVIEW", "IN_PROGRESS", "RESOLVED"]:
        response = client.patch(path, json={"status": status}, headers=headers["officer"])
        assert response.status_code == 200 and response.json()["events"][-1]["note"]
    assert client.patch(path, json={"status": "RESOLVED"}, headers=headers["officer"]).status_code == 409


def test_failed_event_insert_rolls_back_status_update(workflow_client, monkeypatch):
    client, headers, engine = workflow_client
    saved = create(workflow_client)
    original_add = Session.add

    def fail_event(self, instance, *args, **kwargs):
        if isinstance(instance, ComplaintEvent):
            raise SQLAlchemyError("Synthetic event insertion failure")
        return original_add(self, instance, *args, **kwargs)

    monkeypatch.setattr(Session, "add", fail_event)
    with pytest.raises(SQLAlchemyError):
        client.patch(f'/api/officer/complaints/{saved["id"]}', json={"status": "UNDER_REVIEW"}, headers=headers["officer"])
    with Session(engine) as db:
        assert db.get(Complaint, UUID(saved["id"])).status == InternalStatus.LOCAL_SUBMITTED
        assert db.scalar(select(func.count()).select_from(ComplaintEvent)) == 1


def test_official_reference_is_owned_user_reported_and_separate(workflow_client):
    client, headers, _ = workflow_client
    saved = create(workflow_client)
    path = f'/api/complaints/{saved["id"]}/official-ref'
    for persona, expected in [("other_citizen", 404), ("officer", 403)]:
        assert client.patch(path, json={"official_ref": "SYNTHETIC-REFERENCE"}, headers=headers[persona]).status_code == expected
    response = client.patch(path, json={"official_ref": "SYNTHETIC-REFERENCE"}, headers=headers["citizen"])
    assert response.status_code == 200
    assert response.json()["status"] == "LOCAL_SUBMITTED"
    assert response.json()["official_status"] == "USER_REPORTED_FILED"
    detail = client.get(f'/api/complaints/{saved["id"]}', headers=headers["citizen"]).json()
    assert detail["official_ref"] == "SYNTHETIC-REFERENCE"


def test_demo_assignment_is_optional_and_misconfiguration_fails_closed(workflow_client, monkeypatch, profiles):
    client, headers, _ = workflow_client
    monkeypatch.delenv("DEMO_CITIZEN_USER_ID")
    monkeypatch.delenv("DEMO_OFFICER_USER_ID")
    get_settings.cache_clear()
    assert create(workflow_client)["assigned_officer_id"] is None
    for officer in ["not-a-uuid", str(profiles["other_citizen"].user_id)]:
        monkeypatch.setenv("DEMO_CITIZEN_USER_ID", str(profiles["citizen"].user_id))
        monkeypatch.setenv("DEMO_OFFICER_USER_ID", officer)
        get_settings.cache_clear()
        response = client.post("/api/complaints", json=DRAFT, headers=headers["citizen"])
        assert response.status_code == 503
        assert response.json()["detail"]["code"] == "ASSIGNMENT_NOT_CONFIGURED"
    assert len(client.get("/api/complaints", headers=headers["citizen"]).json()) == 1


def test_concurrent_officer_updates_append_only_one_event(workflow_client, monkeypatch):
    client, headers, engine = workflow_client
    saved = create(workflow_client)
    rendezvous = Barrier(2, timeout=10)
    original = officer.assigned_officer_complaint

    def read_same_version(*args):
        complaint = original(*args)
        rendezvous.wait()
        return complaint

    monkeypatch.setattr(officer, "assigned_officer_complaint", read_same_version)

    def update(_):
        return client.patch(f'/api/officer/complaints/{saved["id"]}',
                            json={"status": "UNDER_REVIEW"}, headers=headers["officer"])

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(update, range(2)))
    assert sorted(response.status_code for response in responses) == [200, 409]
    with Session(engine) as db:
        assert db.get(Complaint, UUID(saved["id"])).status == InternalStatus.UNDER_REVIEW
        assert db.scalar(select(func.count()).select_from(ComplaintEvent)) == 2


def test_repeated_identical_creates_are_distinct_tickets_not_silent_deduplication(workflow_client):
    first, second = create(workflow_client), create(workflow_client)
    assert first["id"] != second["id"]
    assert len(first["events"]) == len(second["events"]) == 1


@pytest.mark.parametrize("change", [{"category": "electricity"}, {"locality": " "}, {"description": " "}])
def test_invalid_complaint_fields_are_rejected_without_saving(workflow_client, change):
    client, headers, engine = workflow_client
    response = client.post("/api/complaints", json={**DRAFT, **change}, headers=headers["citizen"])
    assert response.status_code == 422
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(Complaint)) == 0


def test_invalid_ticket_uuid_has_sanitized_validation_error(workflow_client):
    client, headers, _ = workflow_client
    response = client.get('/api/complaints/not-a-uuid', headers=headers["citizen"])
    assert response.status_code == 422 and "not-a-uuid" not in response.text
