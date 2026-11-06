from uuid import UUID

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
import pytest
from sqlalchemy.orm import Session

from app.auth import accessible_complaint, assigned_officer_complaint, get_current_user, require_citizen, require_officer, visible_complaints
from app.db import get_db
from app.models import Complaint, ComplaintCategory, Profile
from app.schemas import ComplaintCreate
from app.main import validation_error_handler
from fastapi.exceptions import RequestValidationError


@pytest.fixture
def guard_client(db_session):
    # Test probes exercise dependencies without shipping Phase 2 business endpoints.
    test_app = FastAPI()
    test_app.add_exception_handler(RequestValidationError, validation_error_handler)
    test_app.dependency_overrides[get_db] = lambda: db_session

    @test_app.get("/citizen")
    def citizen(user: Profile = Depends(require_citizen)):
        return {"id": str(user.user_id)}

    @test_app.get("/officer")
    def officer(user: Profile = Depends(require_officer)):
        return {"id": str(user.user_id)}

    @test_app.get("/complaints")
    def queue(user: Profile = Depends(get_current_user), db: Session = Depends(get_db)):
        return [str(c.id) for c in db.scalars(visible_complaints(user))]

    @test_app.get("/complaints/{complaint_id}")
    def detail(complaint_id: UUID, user: Profile = Depends(get_current_user), db: Session = Depends(get_db)):
        return {"id": str(accessible_complaint(db, user, complaint_id).id)}

    @test_app.post("/officer/{complaint_id}")
    def officer_action(complaint_id: UUID, user: Profile = Depends(get_current_user), db: Session = Depends(get_db)):
        return {"id": str(assigned_officer_complaint(db, user, complaint_id).id)}

    @test_app.post("/draft")
    def draft(body: ComplaintCreate, user: Profile = Depends(require_citizen)):
        return {"user_id": str(user.user_id), **body.model_dump()}

    with TestClient(test_app) as client:
        yield client


@pytest.mark.parametrize("persona,citizen_status,officer_status", [
    ("citizen", 200, 403), ("officer", 403, 200),
])
def test_server_database_role_controls_access(guard_client, profiles, tokens, persona, citizen_status, officer_status):
    headers = {"Authorization": "Bearer " + tokens(profiles[persona].user_id), "X-Role": "officer"}
    assert guard_client.get("/citizen", headers=headers).status_code == citizen_status
    assert guard_client.get("/officer", headers=headers).status_code == officer_status


def test_owner_and_assigned_officer_scope_including_synthetic_records(guard_client, profiles, tokens, db_session):
    complaint = Complaint(user_id=profiles["citizen"].user_id, assigned_officer_id=profiles["officer"].user_id,
                          title="Synthetic access check", description="Synthetic authorization test only.",
                          category=ComplaintCategory.OTHER, locality="Test Ward", is_synthetic=True)
    db_session.add(complaint)
    db_session.commit()
    for persona, expected in [("citizen", 200), ("officer", 200), ("other_citizen", 404), ("other_officer", 404)]:
        headers = {"Authorization": "Bearer " + tokens(profiles[persona].user_id)}
        detail = guard_client.get(f"/complaints/{complaint.id}", headers=headers)
        assert detail.status_code == expected
        ids = guard_client.get("/complaints", headers=headers).json()
        assert (str(complaint.id) in ids) == (expected == 200)
        update_status = guard_client.post(f"/officer/{complaint.id}", headers=headers).status_code
        assert update_status == (200 if persona == "officer" else 404 if persona == "other_officer" else 403)


def test_citizen_create_boundary_uses_verified_owner_and_forbids_injected_fields(guard_client, profiles, tokens):
    headers = {"Authorization": "Bearer " + tokens(profiles["citizen"].user_id)}
    draft = {"title": "Test complaint", "description": "Synthetic input validation example.", "category": "road", "locality": "Test Ward"}
    response = guard_client.post("/draft", json=draft, headers=headers)
    assert response.status_code == 200
    assert response.json()["user_id"] == str(profiles["citizen"].user_id)
    for field, value in [("user_id", str(profiles["other_citizen"].user_id)), ("status", "RESOLVED"), ("role", "officer")]:
        response = guard_client.post("/draft", json={**draft, field: value}, headers=headers)
        assert response.status_code == 422
        assert response.json()["detail"]["code"] == "VALIDATION_ERROR"
    officer_headers = {"Authorization": "Bearer " + tokens(profiles["officer"].user_id)}
    assert guard_client.post("/draft", json=draft, headers=officer_headers).status_code == 403
