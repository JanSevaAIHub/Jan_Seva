"""Verify Supabase user JWTs, then authorize from server-managed profile records."""

from functools import lru_cache
from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientConnectionError, PyJWTError
from sqlalchemy import Select, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import ConfigurationError, get_settings
from app.db import get_db
from app.models import Complaint, Profile, Role

bearer = HTTPBearer(auto_error=False)
ALGORITHMS = ["ES256", "RS256"]


def unauthorized() -> HTTPException:
    return HTTPException(401, detail={"code": "INVALID_TOKEN", "message": "A valid Supabase user access token is required."}, headers={"WWW-Authenticate": "Bearer"})


@lru_cache
def get_jwks_client() -> PyJWKClient:
    issuer = get_settings().auth_issuer
    return PyJWKClient(issuer + "/.well-known/jwks.json", cache_jwk_set=True, lifespan=300, timeout=5)


def get_verified_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> UUID:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise unauthorized()
    token = credentials.credentials
    if len(token) > 16384:
        raise unauthorized()
    try:
        # Only routing metadata is inspected before verification; never decode claims unsigned.
        header = jwt.get_unverified_header(token)
        algorithm, kid = header.get("alg"), header.get("kid")
        if algorithm not in ALGORITHMS or not isinstance(kid, str) or not kid or len(kid) > 256:
            raise unauthorized()
        issuer = get_settings().auth_issuer
        key = get_jwks_client().get_signing_key(kid)
        if key.algorithm_name != algorithm:
            raise unauthorized()
        claims = jwt.decode(
            token, key.key, algorithms=ALGORITHMS, issuer=issuer, audience="authenticated",
            options={"require": ["sub", "iss", "aud", "exp", "iat", "role"]},
        )
        # Supabase's JWT role identifies a user token, never the application's officer role.
        if claims["role"] != "authenticated" or claims.get("is_anonymous", False) is not False:
            raise unauthorized()
        if "session_id" in claims:
            UUID(claims["session_id"])
        return UUID(claims["sub"])
    except ConfigurationError:
        raise HTTPException(503, detail={"code": "AUTH_NOT_CONFIGURED", "message": "Authentication configuration is unavailable."}) from None
    except PyJWKClientConnectionError:
        raise HTTPException(503, detail={"code": "AUTH_UNAVAILABLE", "message": "The authentication key service is temporarily unavailable."}) from None
    except (PyJWTError, ValueError, TypeError, AttributeError):
        raise unauthorized() from None


def get_current_user(
    user_id: UUID = Depends(get_verified_user_id), db: Session = Depends(get_db),
) -> Profile:
    profile = db.get(Profile, user_id)
    if profile is None:
        profile = provision_citizen_profile(db, user_id)
    return profile


def provision_citizen_profile(db: Session, user_id: UUID) -> Profile:
    """Create the default citizen profile for a verified first-time user.

    User IDs come from the verified Supabase JWT. The role, display name and
    optional profile fields are server-owned; request data cannot set them.
    """
    profile = db.get(Profile, user_id)
    if profile is not None:
        return profile

    profile = Profile(user_id=user_id, name="Citizen", role=Role.CITIZEN)
    db.add(profile)
    try:
        db.commit()
    except IntegrityError:
        # Another request or an admin setup may have inserted this user after
        # our initial lookup. Keep the authoritative row and its assigned role.
        db.rollback()
        profile = db.get(Profile, user_id)
        if profile is None:
            raise
    return profile


def require_citizen(user: Profile = Depends(get_current_user)) -> Profile:
    if user.role != Role.CITIZEN:
        raise HTTPException(403, detail={"code": "CITIZEN_REQUIRED", "message": "Citizen access is required."})
    return user


def require_officer(user: Profile = Depends(get_current_user)) -> Profile:
    if user.role != Role.OFFICER:
        raise HTTPException(403, detail={"code": "OFFICER_REQUIRED", "message": "Officer access is required."})
    return user


def visible_complaints(user: Profile) -> Select:
    """Use this scope for future list/queue endpoints, never a client-selected role."""
    if user.role == Role.CITIZEN:
        return select(Complaint).where(Complaint.user_id == user.user_id)
    if user.role == Role.OFFICER:
        return select(Complaint).where(Complaint.assigned_officer_id == user.user_id)
    raise HTTPException(403, detail={"code": "ROLE_REQUIRED", "message": "An authorized role is required."})


def accessible_complaint(db: Session, user: Profile, complaint_id: UUID) -> Complaint:
    complaint = db.scalar(visible_complaints(user).where(Complaint.id == complaint_id))
    if complaint is None:
        raise HTTPException(404, detail={"code": "COMPLAINT_NOT_FOUND", "message": "Complaint not found."})
    return complaint


def assigned_officer_complaint(db: Session, user: Profile, complaint_id: UUID) -> Complaint:
    """Future writes/audit reads must first pass this explicit assignment check."""
    require_officer(user)
    return accessible_complaint(db, user, complaint_id)
