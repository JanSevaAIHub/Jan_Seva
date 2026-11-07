"""Assignment-scoped officer updates with atomic, immutable status history."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.auth import assigned_officer_complaint, require_officer
from app.db import get_db
from app.models import Complaint, ComplaintEvent, InternalStatus, Profile
from app.schemas import ComplaintDetail, ComplaintStatusUpdate

router = APIRouter(prefix="/officer/complaints", tags=["officer"])
NEXT_STATUS = {
    InternalStatus.LOCAL_SUBMITTED: InternalStatus.UNDER_REVIEW,
    InternalStatus.UNDER_REVIEW: InternalStatus.IN_PROGRESS,
    InternalStatus.IN_PROGRESS: InternalStatus.RESOLVED,
}


@router.patch("/{complaint_id}", response_model=ComplaintDetail)
def update_status(complaint_id: UUID, data: ComplaintStatusUpdate,
                  user: Profile = Depends(require_officer), db: Session = Depends(get_db)):
    complaint = assigned_officer_complaint(db, user, complaint_id)
    old_status = complaint.status
    if NEXT_STATUS.get(old_status) != data.status:
        raise HTTPException(409, detail={"code": "INVALID_STATUS_TRANSITION",
            "message": f"Cannot change {old_status} to {data.status}. Next permitted status: {NEXT_STATUS.get(old_status, 'none')}."})
    # Compare-and-set also protects against concurrent requests using an older status
    # or a stale officer assignment. The event commits in the same transaction.
    changed = db.execute(update(Complaint).where(Complaint.id == complaint_id,
        Complaint.status == old_status, Complaint.assigned_officer_id == user.user_id)
        .values(status=InternalStatus(data.status)).execution_options(synchronize_session=False))
    if changed.rowcount != 1:
        raise HTTPException(409, detail={"code": "COMPLAINT_CHANGED", "message": "The ticket changed. Refresh it before updating."})
    db.add(ComplaintEvent(complaint_id=complaint_id, actor_id=user.user_id,
        old_status=old_status, new_status=InternalStatus(data.status),
        note=data.note or f"Internal status changed to {data.status}; no official government action is implied."))
    db.commit()
    db.refresh(complaint)
    db.expire(complaint, ["events"])
    return complaint
