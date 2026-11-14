"""The authenticated profile boundary; no self-service role mutation endpoint."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db import get_db

from app.auth import get_current_user
from app.models import Profile as ProfileRecord
from app.schemas import Profile, ProfileUpdate

router = APIRouter()


@router.get("/me", response_model=Profile, tags=["profiles"])
def read_my_profile(user: ProfileRecord = Depends(get_current_user)) -> ProfileRecord:
    return user


@router.patch('/me', response_model=Profile, tags=['profiles'])
def update_my_profile(data: ProfileUpdate, user: ProfileRecord = Depends(get_current_user), db: Session = Depends(get_db)):
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user
