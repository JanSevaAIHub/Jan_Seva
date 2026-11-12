"""Validated API boundary models; server-owned identity/status fields are not inputs."""

from datetime import date, datetime, timedelta, timezone
from uuid import UUID
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

from app.models import ComplaintCategory, InternalStatus, Role


class APIModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid", str_strip_whitespace=True)

    @field_validator('*', mode='before')
    @classmethod
    def reject_nul_text(cls, value):
        # PostgreSQL text cannot store U+0000. Reject at the boundary rather
        # than failing a valid-looking complaint during its database write.
        if isinstance(value, str) and '\x00' in value:
            raise ValueError('Text must not contain NUL characters')
        return value


class HealthResponse(BaseModel):
    status: str = "ok"


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    detail: ErrorDetail


class Profile(APIModel):
    user_id: UUID
    name: str = Field(min_length=1, max_length=120)
    role: Role
    state: str | None = Field(default=None, max_length=100)
    occupation: str | None = Field(default=None, max_length=100)


class Scheme(APIModel):
    id: UUID
    title: str = Field(min_length=1, max_length=250)
    category: str = Field(min_length=1, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    description: str = Field(min_length=1)
    source_url: HttpUrl
    rules_json: dict = Field(default_factory=dict)
    reviewed_at: datetime


class ComplaintCreate(APIModel):
    title: str = Field(min_length=3, max_length=250)
    description: str = Field(min_length=10, max_length=5000)
    category: ComplaintCategory
    locality: str = Field(min_length=2, max_length=250)


class ComplaintAnalysisInput(APIModel):
    title: str = Field(default="", max_length=250)
    description: str = Field(min_length=10, max_length=5000)
    locality: str = Field(default="", max_length=250)


class ComplaintSummary(APIModel):
    id: UUID
    user_id: UUID
    title: str
    category: ComplaintCategory
    locality: str
    status: InternalStatus
    assigned_officer_id: UUID | None
    official_ref: str | None
    official_channel: str | None = None
    official_submitted_on: date | None = None
    created_at: datetime
    updated_at: datetime
    is_synthetic: bool
    official_status: str = "NOT_FILED"


class ComplaintEvent(APIModel):
    id: UUID
    complaint_id: UUID
    actor_id: UUID
    old_status: InternalStatus | None
    new_status: InternalStatus
    note: str
    event_time: datetime


class ComplaintDetail(ComplaintSummary):
    description: str
    events: list[ComplaintEvent] = Field(default_factory=list)


class ComplaintStatusUpdate(APIModel):
    status: Literal["LOCAL_SUBMITTED", "UNDER_REVIEW", "IN_PROGRESS", "RESOLVED"]
    note: str | None = Field(default=None, min_length=1, max_length=2000)


class OfficialReferenceUpdate(APIModel):
    official_ref: str = Field(min_length=1, max_length=250)


    official_channel: Literal["CPGRAMS", "CONNECT_PUNJAB", "OTHER_OFFICIAL"] | None = None
    official_submitted_on: date | None = None

    @field_validator("official_ref")
    @classmethod
    def safe_reference(cls, value):
        if any(ord(char) < 32 or ord(char) == 127 for char in value):
            raise ValueError("Reference must not contain control characters")
        return value

    @field_validator("official_submitted_on")
    @classmethod
    def no_future_filing(cls, value):
        today = datetime.now(timezone(timedelta(hours=5, minutes=30))).date()
        if value is not None and value > today:
            raise ValueError("Submission date cannot be in the future")
        return value
