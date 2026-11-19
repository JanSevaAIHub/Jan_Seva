"""Owned attachments with durable pending records across remote partial failures."""
from hashlib import sha256
from uuid import UUID, uuid5, NAMESPACE_URL
from urllib.parse import unquote
import re

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.auth import accessible_complaint, get_current_user, require_citizen, visible_complaints
from app.db import get_db
from app.evidence_storage import MAX_BYTES, fail, get_storage, storage_access_guard, validated_image
from app.models import Complaint, ComplaintEvidence, Profile
from app.schemas import EvidenceSummary

router = APIRouter(tags=['evidence'])

@router.get('/complaints/evidence-config')
def compatible_evidence_config():
    from app.storage import max_evidence_bytes
    return {'max_bytes':min(MAX_BYTES,max_evidence_bytes()),'mime_types':['image/jpeg','image/png','image/webp']}



@router.get('/evidence/config')
def evidence_config():
    try:
        get_storage()
        enabled = True
    except HTTPException:
        enabled = False
    return {'enabled': enabled, 'max_bytes': MAX_BYTES, 'max_files': 3,
            'content_types': ['image/jpeg', 'image/png', 'image/webp']}


def owned_ticket(db, user, complaint_id):
    ticket = db.scalar(visible_complaints(user).where(Complaint.id == complaint_id).with_for_update())
    if ticket is None:
        raise fail('COMPLAINT_NOT_FOUND', 'Complaint not found.', 404)
    return ticket


def evidence_record(db, complaint_id, evidence_id):
    row = db.scalar(select(ComplaintEvidence).where(ComplaintEvidence.id == evidence_id,
                    ComplaintEvidence.complaint_id == complaint_id).with_for_update())
    if row is None:
        raise fail('EVIDENCE_NOT_FOUND', 'Evidence not found.', 404)
    return row


@router.get('/complaints/{complaint_id}/evidence', response_model=list[EvidenceSummary])
def list_evidence(complaint_id: UUID, response: Response, user: Profile = Depends(get_current_user), db: Session = Depends(get_db)):
    accessible_complaint(db, user, complaint_id)
    response.headers['Cache-Control'] = 'private, no-store'
    return db.scalars(select(ComplaintEvidence).where(ComplaintEvidence.complaint_id == complaint_id).order_by(ComplaintEvidence.slot)).all()


def save_image(db, user, complaint_id, upload_key, raw, mime, filename=''):
    owned_ticket(db, user, complaint_id)
    data, extension = validated_image(raw, mime)
    storage_access_guard(db)
    storage = get_storage()
    digest = sha256(raw).hexdigest()
    row = db.scalar(select(ComplaintEvidence).where(ComplaintEvidence.complaint_id == complaint_id, ComplaintEvidence.upload_key == upload_key))
    if row is not None:
        if row.content_hash != digest or row.state == 'DELETE_PENDING':
            raise fail('UPLOAD_CONFLICT', 'This upload attempt has different content or is being removed.', 409)
        if row.state == 'READY':
            return row
    else:
        used = set(db.scalars(select(ComplaintEvidence.slot).where(ComplaintEvidence.complaint_id == complaint_id)))
        slot = next((i for i in range(1, 4) if i not in used), None)
        if slot is None:
            raise fail('EVIDENCE_LIMIT', 'A complaint can have at most three attachments, including pending uploads.', 409)
        row = ComplaintEvidence(complaint_id=complaint_id, uploaded_by=user.user_id, upload_key=upload_key,
            slot=slot, extension=extension, content_type=mime, size_bytes=len(data), content_hash=digest,
            original_filename=re.sub(r'[^\w. ()-]', '_', unquote(filename).replace('\\','/').split('/')[-1])[:120] or None)
        db.add(row)
        try:
            db.commit()  # The path is durably tracked BEFORE any remote object can exist.
        except IntegrityError:
            db.rollback()
            raise fail('UPLOAD_CONFLICT', 'Another attachment changed this ticket. Retry this upload.', 409) from None
        except SQLAlchemyError:
            db.rollback()
            raise
    # Hold the row lock through remote work. Deletion cannot race a late upload.
    row = evidence_record(db, complaint_id, row.id)
    if row.state != 'PENDING':
        raise fail('UPLOAD_CONFLICT', 'The attachment changed. Refresh and retry.', 409)
    storage.put(row.object_path, data, mime)
    row.state = 'READY'
    db.commit()
    db.refresh(row)
    return row


@router.post('/complaints/{complaint_id}/evidence', response_model=EvidenceSummary, status_code=201)
async def upload_evidence(complaint_id: UUID, request: Request, idempotency_key: UUID | None = Header(default=None),
                          user: Profile = Depends(require_citizen), db: Session = Depends(get_db)):
    # Authorize before reading a potentially large body or contacting storage.
    owned_ticket(db, user, complaint_id)
    raw = bytearray()
    async for chunk in request.stream():
        raw.extend(chunk)
        from app.storage import max_evidence_bytes
        if len(raw) > min(MAX_BYTES,max_evidence_bytes()):
            raise fail('IMAGE_SIZE', 'Choose an image of at most 5 MiB.', 413)
    upload_key = idempotency_key or uuid5(NAMESPACE_URL,str(complaint_id)+':'+sha256(raw).hexdigest())
    return await run_in_threadpool(save_image, db, user, complaint_id, upload_key, bytes(raw), request.headers.get('content-type', ''), request.headers.get('x-filename',''))


@router.get('/complaints/{complaint_id}/evidence/{evidence_id}/content')
def read_evidence(complaint_id: UUID, evidence_id: UUID, user: Profile = Depends(get_current_user), db: Session = Depends(get_db)):
    # Lock the complaint so reassignment cannot race an authorized content read.
    owned_ticket(db, user, complaint_id)
    row = evidence_record(db, complaint_id, evidence_id)
    if row.state != 'READY':
        raise fail('EVIDENCE_NOT_READY', 'This attachment is pending. Retry the upload or remove it.', 409)
    storage_access_guard(db)
    data = get_storage().read(row.object_path)
    data, _ = validated_image(data, row.content_type)
    return Response(data, media_type=row.content_type, headers={
        'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': f'inline; filename="evidence.{row.extension}"'})


@router.delete('/complaints/{complaint_id}/evidence/{evidence_id}', status_code=204)
def delete_evidence(complaint_id: UUID, evidence_id: UUID, user: Profile = Depends(require_citizen), db: Session = Depends(get_db)):
    owned_ticket(db, user, complaint_id)
    row = evidence_record(db, complaint_id, evidence_id)
    storage_access_guard(db)
    row.state = 'DELETE_PENDING'
    db.commit()  # Failed deletions remain visible/tracked and cannot serve images.
    row = evidence_record(db, complaint_id, evidence_id)
    get_storage().delete(row.object_path)
    db.delete(row)
    db.commit()
    return Response(status_code=204)
