"""Durable, owned internal complaints. No government submission occurs here."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from app.auth import accessible_complaint, get_current_user, require_citizen, visible_complaints
from app.config import get_settings
from app.db import get_db
from app.models import Complaint, ComplaintEvent, InternalStatus, Profile, Role
from app.schemas import ComplaintCreate, ComplaintDetail, OfficialReferenceUpdate

router = APIRouter(prefix="/complaints", tags=["complaints"])


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
def create_complaint(data: ComplaintCreate, user: Profile = Depends(require_citizen), db: Session = Depends(get_db)):
    complaint = Complaint(**data.model_dump(), user_id=user.user_id,
                          assigned_officer_id=demo_assignee(db, user), status=InternalStatus.LOCAL_SUBMITTED)
    complaint.events.append(ComplaintEvent(actor_id=user.user_id, old_status=None,
        new_status=InternalStatus.LOCAL_SUBMITTED, note="Citizen created an internal JanSeva ticket; no government filing."))
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return complaint


@router.get("", response_model=list[ComplaintDetail])
def list_complaints(status: InternalStatus | None = None, user: Profile = Depends(get_current_user), db: Session = Depends(get_db)):
    query = visible_complaints(user).options(selectinload(Complaint.events)).order_by(Complaint.created_at.desc(), Complaint.id)
    if status is not None:
        query = query.where(Complaint.status == status)
    return db.scalars(query).all()


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
