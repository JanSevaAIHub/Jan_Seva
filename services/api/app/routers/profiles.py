"""The authenticated profile boundary; no self-service role mutation endpoint."""

from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.models import Profile as ProfileRecord
from app.schemas import Profile

router = APIRouter()


@router.get("/me", response_model=Profile, tags=["profiles"])
def read_my_profile(user: ProfileRecord = Depends(get_current_user)) -> ProfileRecord:
    return user
