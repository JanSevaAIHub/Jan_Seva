from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field

from app.schemas import APIModel, Scheme


class SchemeProfile(APIModel):
    state: str | None = Field(default=None, min_length=2, max_length=100)
    occupation: str | None = Field(default=None, min_length=2, max_length=100)


class SchemeAsk(APIModel):
    message: str = Field(min_length=3, max_length=1000)
    profile: SchemeProfile | None = None
    state: str | None = Field(default=None, min_length=2, max_length=100)
    category: str | None = Field(default=None, min_length=2, max_length=100)


class SchemeCard(Scheme):
    eligibility: str
    required_documents: list[str]
    evidence_text: str
    evidence_kind: str
    document_note: str


class Passage(APIModel):
    chunk_id: UUID
    scheme_id: UUID
    title: str
    state: str | None
    text: str
    score: float
    source_url: str
    reviewed_at: datetime
    source_metadata: dict


class Citation(APIModel):
    scheme_id: UUID
    chunk_id: UUID
    title: str
    url: str
    excerpt: str
    reviewed_at: datetime
    evidence_kind: str = "reviewed_paraphrase"


class ToolTrace(APIModel):
    tool: str
    status: Literal["ok", "skipped", "error"]
    detail: str


class SchemeAnswer(APIModel):
    answer: str
    citations: list[Citation]
    tool_trace: list[ToolTrace]
    mode: Literal["grounded_extracts", "extractive_fallback", "insufficient_evidence"]
