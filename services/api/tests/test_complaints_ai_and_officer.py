"""Tests for officer queue filtering, complaint analysis and duplicate detection."""

from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.main import app
from app.models import Complaint, ComplaintCategory, InternalStatus, Profile, Role


@pytest.fixture
def workflow_client(db_session, profiles, tokens, monkeypatch):
    monkeypatch.setenv("DEMO_CITIZEN_USER_ID", str(profiles["citizen"].user_id))
    monkeypatch.setenv("DEMO_OFFICER_USER_ID", str(profiles["officer"].user_id))
    get_settings.cache_clear()
    engine = db_session.bind

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


def test_officer_complaints_queue_requires_officer(workflow_client):
    client, headers, _ = workflow_client
    # Anonymous -> 401
    assert client.get("/api/officer/complaints").status_code == 401
    # Citizen -> 403
    assert client.get("/api/officer/complaints", headers=headers["citizen"]).status_code == 403
    # Officer -> 200
    res = client.get("/api/officer/complaints", headers=headers["officer"])
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_officer_complaints_queue_filters(workflow_client, profiles):
    client, headers, engine = workflow_client

    # Create distinct complaints assigned to officer
    officer_profile = profiles["officer"]
    citizen_user_id = profiles["citizen"].user_id
    with Session(engine) as db:
        c1 = Complaint(
            title="Broken road surface near school",
            description="Deep potholes causing traffic jams and bike accidents.",
            category=ComplaintCategory.ROAD,
            locality="Ward 12 Market Area",
            status=InternalStatus.LOCAL_SUBMITTED,
            user_id=citizen_user_id,
            assigned_officer_id=officer_profile.user_id,
        )
        c2 = Complaint(
            title="Water pipeline leaking heavily",
            description="Clean drinking water getting wasted on the main road.",
            category=ComplaintCategory.WATER,
            locality="Ward 12 Market Area",
            status=InternalStatus.IN_PROGRESS,
            user_id=citizen_user_id,
            assigned_officer_id=officer_profile.user_id,
        )
        c3 = Complaint(
            title="Streetlight pole knocked down",
            description="Darkness in residential sector after storm.",
            category=ComplaintCategory.STREETLIGHT,
            locality="Ward 5 North Colony",
            status=InternalStatus.UNDER_REVIEW,
            user_id=citizen_user_id,
            assigned_officer_id=officer_profile.user_id,
        )
        db.add_all([c1, c2, c3])
        db.commit()

    # Filter by category
    res = client.get("/api/officer/complaints?category=road", headers=headers["officer"])
    assert res.status_code == 200
    roads = res.json()
    assert any(c["title"] == "Broken road surface near school" for c in roads)
    assert not any(c["category"] == "water" for c in roads)

    # Filter by status
    res = client.get("/api/officer/complaints?status=IN_PROGRESS", headers=headers["officer"])
    assert res.status_code == 200
    in_prog = res.json()
    assert all(c["status"] == "IN_PROGRESS" for c in in_prog)

    # Filter by locality
    res = client.get("/api/officer/complaints?locality=North Colony", headers=headers["officer"])
    assert res.status_code == 200
    north = res.json()
    assert all("North Colony" in c["locality"] for c in north)


def test_complaints_analyze_endpoint_classifications(workflow_client):
    client, _, _ = workflow_client

    # Case 1: Road & Potholes
    res = client.post(
        "/api/complaints/analyze",
        json={
            "title": "Huge pothole on road",
            "description": "The asphalt road has caved in creating a dangerous gaddha near the crossing.",
            "locality": "Sector 4",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["category"] == "road"
    assert data["department"] == "Roads & Transport Dept"
    assert data["confidence"] >= 0.70
    assert data["urgency_level"] in ["Low", "Medium", "High"]

    # Case 2: Water Supply
    res = client.post(
        "/api/complaints/analyze",
        json={
            "title": "Low water pressure and dirty water",
            "description": "Contaminated paani coming from the municipal pipeline tap since yesterday morning.",
            "locality": "Sector 8",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["category"] == "water"
    assert data["department"] == "Water Supply Dept"

    # Case 3: Sanitation & Garbage
    res = client.post(
        "/api/complaints/analyze",
        json={
            "title": "Garbage dump overflow",
            "description": "Foul smell and rotting trash accumulated near the market. Safai needed immediately.",
            "locality": "Sector 2",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["category"] == "sanitation"
    assert data["department"] == "Sanitation Dept"

    # Case 4: Streetlight with High Urgency
    res = client.post(
        "/api/complaints/analyze",
        json={
            "title": "Sparking streetlight wire hazard",
            "description": "Urgent emergency: exposed live wire sparking from streetlight pole creating fatal accident risk.",
            "locality": "Sector 1",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["category"] == "streetlight"
    assert data["department"] == "Urban Infrastructure Dept"
    assert data["urgency_level"] == "High"


def test_complaints_analyze_duplicate_detection(workflow_client, profiles):
    client, _, engine = workflow_client

    # Seed an active complaint in DB
    with Session(engine) as db:
        existing = Complaint(
            title="Broken street light near central park gate",
            description="Darkness at night because lamp is fused and not turning on.",
            category=ComplaintCategory.STREETLIGHT,
            locality="Central Park Phase 2",
            status=InternalStatus.LOCAL_SUBMITTED,
            user_id=profiles["citizen"].user_id,
        )
        db.add(existing)
        db.commit()

    # Query with a very similar new complaint
    res = client.post(
        "/api/complaints/analyze",
        json={
            "title": "Street light broken near central park",
            "description": "Lamp is fused and pole is completely dark at central park.",
            "locality": "Central Park Phase 2",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["category"] == "streetlight"
    assert len(data["duplicates"]) >= 1
    top_dup = data["duplicates"][0]
    assert "Central Park" in top_dup["locality"]
    assert top_dup["similarity_score"] >= 0.50


def test_complaints_analyze_validation_errors(workflow_client):
    client, _, _ = workflow_client
    # Empty title
    assert client.post("/api/complaints/analyze", json={"title": "a", "description": "short"}).status_code == 422
    # Missing description
    assert client.post("/api/complaints/analyze", json={"title": "Valid title"}).status_code == 422
