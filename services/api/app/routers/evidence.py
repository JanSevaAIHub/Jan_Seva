"""Bounded binary uploads; private, ownership-checked evidence references."""

from hashlib import sha256
from urllib.parse import unquote
from uuid import UUID, uuid4
import re

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.auth import accessible_complaint, get_current_user, require_citizen
from app.config import ConfigurationError
from app.db import get_db
from app.models import ComplaintEvidence, Profile
from app.storage import EvidenceStorage, StorageError, max_evidence_bytes, validate_image

router = APIRouter(prefix="/complaints", tags=["evidence"])


def storage_unavailable(error):
    return HTTPException(503, detail={"code": "EVIDENCE_UNAVAILABLE", "message": "Private photo storage is not configured. The ticket is kept; retry the photo later." if isinstance(error, ConfigurationError) else str(error)})


def metadata(record):
    return {"id": str(record.id), "filename": record.filename, "mime_type": record.mime_type,
        "size_bytes": record.size_bytes, "created_at": record.created_at}


@router.get("/evidence-config")
def evidence_config():
    try:
        return {"max_bytes": max_evidence_bytes(), "mime_types": ["image/jpeg", "image/png", "image/webp"]}
    except ConfigurationError as error:
        raise storage_unavailable(error) from None


@router.post("/{complaint_id}/evidence", status_code=201)
async def upload_evidence(complaint_id: UUID, request: Request,
                          user: Profile = Depends(require_citizen), db: Session = Depends(get_db)):
    # Ownership and JWT verification occur before any image data is read.
    complaint = await run_in_threadpool(accessible_complaint, db, user, complaint_id)
    try:
        maximum = max_evidence_bytes()
    except ConfigurationError as error:
        raise storage_unavailable(error) from None
    mime = request.headers.get("content-type", "").split(";")[0].lower()
    content = bytearray()
    async for chunk in request.stream():
        if len(content) + len(chunk) > maximum:
            raise HTTPException(413, detail={"code": "EVIDENCE_TOO_LARGE", "message": f"Choose an image of at most {maximum / 1048576:g} MB."})
        content.extend(chunk)
    return await run_in_threadpool(save_image, db, user, complaint, bytes(content), mime, request.headers.get('x-filename', ''))


def save_image(db, user, complaint, content, mime, supplied_filename):
    try:
        cleaned, extension = validate_image(content, mime)
    except ValueError as error:
        raise HTTPException(422, detail={"code": "INVALID_IMAGE", "message": str(error)}) from None
    # Serialize uploads/replacements for this complaint on PostgreSQL.
    db.refresh(complaint, with_for_update=True)
    existing = db.get(ComplaintEvidence, complaint.id)
    digest = sha256(cleaned).hexdigest()
    if existing and existing.sha256 == digest:
        return metadata(existing)
    storage = None
    path = f"{user.user_id}/{complaint.id}/{uuid4()}.{extension}"
    previous_path = existing.object_path if existing else None
    try:
        storage = EvidenceStorage()
        storage.upload(path, cleaned, mime)
        filename = unquote(supplied_filename or "evidence." + extension)
        filename = re.sub(r"[^\w. ()-]", "_", filename.replace("\\", "/").split("/")[-1])[:120] or "evidence." + extension
        record = existing or ComplaintEvidence(complaint_id=complaint.id)
        record.id = uuid4()
        record.object_path, record.filename, record.mime_type = path, filename, mime
        record.size_bytes, record.sha256 = len(cleaned), digest
        db.add(record)
        db.flush()
        result = metadata(record)
        db.commit()
    except (ConfigurationError, StorageError) as error:
        db.rollback()
        if storage:
            storage.cleanup(path)
        raise storage_unavailable(error) from None
    except Exception:
        db.rollback()
        if storage:
            storage.cleanup(path)
        raise
    if previous_path:
        storage.cleanup(previous_path)
    return result


@router.get("/{complaint_id}/evidence")
def read_evidence(complaint_id: UUID, response: Response,
                  user: Profile = Depends(get_current_user), db: Session = Depends(get_db)):
    accessible_complaint(db, user, complaint_id)
    response.headers["Cache-Control"] = "private, no-store"
    record = db.get(ComplaintEvidence, complaint_id)
    return [metadata(record)] if record else []


@router.get("/{complaint_id}/evidence/{evidence_id}/access")
def evidence_access(complaint_id: UUID, evidence_id: UUID, response: Response,
                     user: Profile = Depends(get_current_user), db: Session = Depends(get_db)):
    accessible_complaint(db, user, complaint_id)
    response.headers["Cache-Control"] = "private, no-store"
    record = db.get(ComplaintEvidence, complaint_id)
    if not record or record.id != evidence_id:
        raise HTTPException(404, detail={"code": "EVIDENCE_NOT_FOUND", "message": "Evidence not found."})
    try:
        return {"url": EvidenceStorage().signed_url(record.object_path), "expires_in": 300}
    except (ConfigurationError, StorageError) as error:
        raise storage_unavailable(error) from None
