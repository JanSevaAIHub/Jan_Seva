"""Single-agent boundary: no browser-controlled identity or executable actions."""
from typing import Literal
from uuid import UUID

from pydantic import Field

from app.ai.eligibility import EligibilityCitation, EligibilityProfile, EligibilityResult
from app.ai.scheme_schemas import Citation, ToolTrace
from app.models import ComplaintCategory
from app.schemas import APIModel

Intent = Literal["scheme", "complaint", "mixed", "clarify"]


class ComplaintDraft(APIModel):
    title: str = Field(default="", max_length=250)
    description: str = Field(default="", max_length=5000)
    category: ComplaintCategory | None = None
    locality: str = Field(default="", max_length=250)


class AgentMessage(APIModel):
    message: str = Field(min_length=3, max_length=1000)
    session_id: UUID | None = None
    profile: EligibilityProfile | None = None
    scheme_id: UUID | None = None
    complaint: ComplaintDraft | None = None


class AgentAction(ToolTrace):
    label: str
    path: Literal["/schemes", "/complaints/new", "/requests"]
    requires_confirmation: bool = False
    draft: ComplaintDraft | None = None


class AgentResponse(APIModel):
    session_id: UUID
    intent: Intent
    response: str
    status: Literal["ok", "partial", "needs_info", "unavailable"]
    citations: list[Citation | EligibilityCitation] = Field(default_factory=list)
    actions: list[AgentAction] = Field(default_factory=list)
    tool_trace: list[ToolTrace] = Field(default_factory=list)
    eligibility: list[EligibilityResult] = Field(default_factory=list)
