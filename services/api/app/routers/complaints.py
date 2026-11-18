"""Durable, owned internal complaints. No government submission occurs here."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Header, Query
import hashlib
import json
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.auth import accessible_complaint, get_current_user, require_citizen, visible_complaints
from app.config import get_settings
from app.db import get_db
from app.models import Complaint, ComplaintEvent, ComplaintSubmission, InternalStatus, Profile, Role
from app.ai.assistant import analyze_complaint
from app.ai.provider import ProviderError
from app.config import ConfigurationError
from app.schemas import APIModel
from app.routers.schemes import model_request_budget
from pydantic import Field
from difflib import SequenceMatcher
from app.schemas import ComplaintCreate, ComplaintDetail, OfficialReferenceUpdate

router = APIRouter(prefix="/complaints", tags=["complaints"])


class ComplaintAnalysisRequest(APIModel):
    title: str = Field(min_length=3, max_length=250)
    description: str = Field(min_length=10, max_length=5000)
    locality: str = Field(min_length=2, max_length=250)


def duplicate_score(title: str, locality: str, other_title: str, other_locality: str) -> float:
    if locality.strip().casefold() != other_locality.strip().casefold():
        return 0.0
    return SequenceMatcher(None, title.strip().casefold(), other_title.strip().casefold()).ratio()


@router.post("/analyze", dependencies=[Depends(model_request_budget)])
def complaint_analysis(data: ComplaintAnalysisRequest, user: Profile = Depends(require_citizen), db: Session = Depends(get_db)):
    try:
        advice = analyze_complaint(data.title, data.description, data.locality)
    except (ConfigurationError, ProviderError) as error:
        raise HTTPException(503, detail={"code": "AI_UNAVAILABLE", "message": "Complaint AI is not configured. Keep editing your draft or retry later." if isinstance(error, ConfigurationError) else "Complaint AI is unavailable. Keep editing your draft or retry."}) from None
    recent = db.scalars(visible_complaints(user).order_by(Complaint.created_at.desc()).limit(100)).all()
    advice["similar_complaints"] = [{"id": str(c.id), "title": c.title, "status": c.status}
        for c in recent if duplicate_score(data.title, data.locality, c.title, c.locality) >= 0.65][:5]
    advice["similarity_note"] = "Text similarity among your last 100 tickets in the same locality; these are suggestions, not confirmed duplicates."
    return advice


def demo_assignee(db: Session, citizen: Profile) -> UUID | None:
    settings = get_settings()
    citizen_id, officer_id = settings.demo_citizen_user_id, settings.demo_officer_user_id
    if not citizen_id and not officer_id:
        return None
    try:
        configured_citizen, configured_officer = UUID(citizen_id), UUID(officer_id)
    except ValueError:
        raise HTTPException(503, detail={"code": "ASSIGNMENT_NOT_CONFIGURED", "message": "Demo assignment requires two valid provider user IDs."}) from None
    if citizen.user_id != configured_citizen:
        return None
    officer = db.get(Profile, configured_officer)
    if officer is None or officer.role != Role.OFFICER:
        raise HTTPException(503, detail={"code": "ASSIGNMENT_NOT_CONFIGURED", "message": "The configured demo officer needs an officer profile."})
    return officer.user_id


@router.post("", response_model=ComplaintDetail, status_code=201)
def create_complaint(data: ComplaintCreate, user: Profile = Depends(require_citizen), db: Session = Depends(get_db),
                     idempotency_key: UUID | None = Header(default=None)):
    fingerprint = hashlib.sha256(json.dumps(data.model_dump(mode="json"), sort_keys=True).encode()).hexdigest()

    def replay():
        previous = db.get(ComplaintSubmission, (user.user_id, idempotency_key))
        if previous is None:
            return None
        if previous.fingerprint != fingerprint:
            raise HTTPException(409, detail={"code": "SUBMISSION_KEY_REUSED", "message": "This submission key belongs to a different draft. Start a new submission."})
        return accessible_complaint(db, user, previous.complaint_id)

    if idempotency_key and (previous := replay()) is not None:
        return previous
    complaint = Complaint(**data.model_dump(), user_id=user.user_id,
                          assigned_officer_id=demo_assignee(db, user), status=InternalStatus.LOCAL_SUBMITTED)
    complaint.events.append(ComplaintEvent(actor_id=user.user_id, old_status=None,
        new_status=InternalStatus.LOCAL_SUBMITTED, note="Citizen created an internal JanSeva ticket; no government filing."))
    db.add(complaint)
    try:
        db.flush()
        if idempotency_key:
            db.add(ComplaintSubmission(user_id=user.user_id, request_key=idempotency_key,
                complaint_id=complaint.id, fingerprint=fingerprint))
        db.commit()
    except IntegrityError:
        db.rollback()
        if idempotency_key and (previous := replay()) is not None:
            return previous
        raise
    db.refresh(complaint)
    return complaint


@router.get("", response_model=list[ComplaintDetail])
def list_complaints(status: InternalStatus | None = None, user: Profile = Depends(get_current_user), db: Session = Depends(get_db),
                    limit: int = Query(default=100, ge=1, le=100), offset: int = Query(default=0, ge=0, le=100000)):
    query = visible_complaints(user).options(selectinload(Complaint.events)).order_by(Complaint.created_at.desc(), Complaint.id)
    if status is not None:
        query = query.where(Complaint.status == status)
    return db.scalars(query.limit(limit).offset(offset)).all()


@router.get("/{complaint_id}", response_model=ComplaintDetail)
def read_complaint(complaint_id: UUID, user: Profile = Depends(get_current_user), db: Session = Depends(get_db)):
    return accessible_complaint(db, user, complaint_id)


@router.patch("/{complaint_id}/official-ref", response_model=ComplaintDetail)
def record_official_reference(complaint_id: UUID, data: OfficialReferenceUpdate,
                              user: Profile = Depends(require_citizen), db: Session = Depends(get_db)):
    complaint = db.scalar(visible_complaints(user).where(Complaint.id == complaint_id).with_for_update())
    if complaint is None:
        raise HTTPException(404, detail={"code": "COMPLAINT_NOT_FOUND", "message": "Complaint not found."})
    complaint.official_ref = data.official_ref
    complaint.events.append(ComplaintEvent(actor_id=user.user_id, old_status=complaint.status,
        new_status=complaint.status, note="Citizen recorded an unverified government filing reference; internal status unchanged."))
    db.commit()
    db.refresh(complaint)
    return complaint
