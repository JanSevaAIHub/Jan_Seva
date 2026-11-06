"""Validate the hand-reviewed CSV and local evidence files; no web scraping."""

import csv
from datetime import datetime
import hashlib
import json
from pathlib import Path
from urllib.parse import urlsplit
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas import APIModel

DATA = Path(__file__).resolve().parents[4] / "data"
CORPUS = "janseva-curated-v1"


def official_url(value: str) -> bool:
    try:
        url = urlsplit(value)
        host = url.hostname or ""
        return (url.scheme == "https" and not url.username and not url.password and
            url.port in (None, 443) and not url.fragment and
            (host.endswith(".gov.in") or host.endswith(".nic.in") or host == "sansad.in"))
    except ValueError:
        return False


class CuratedScheme(APIModel):
    id: UUID
    slug: str = Field(pattern=r"^[a-z0-9-]{2,80}$")
    title: str = Field(min_length=3, max_length=250)
    state: str = Field(min_length=2, max_length=100)
    category: str = Field(min_length=2, max_length=100)
    description: str = Field(min_length=10, max_length=2000)
    source_url: str
    eligibility: str = Field(min_length=20, max_length=3000)
    required_documents: list[str]
    reviewed_at: datetime
    evidence_file: str
    evidence_text: str = Field(min_length=100, max_length=20000)

    @field_validator("source_url")
    @classmethod
    def validate_source(cls, value):
        if not official_url(value):
            raise ValueError("Source must be a reviewed HTTPS government URL.")
        return value

    @field_validator("reviewed_at")
    @classmethod
    def validate_review(cls, value):
        if value.tzinfo is None:
            raise ValueError("Reviewed date needs a timezone.")
        return value

    def rules(self):
        return {"corpus": CORPUS, "slug": self.slug, "eligibility": self.eligibility,
            "required_documents": self.required_documents, "evidence_text": self.evidence_text,
            "evidence_kind": "reviewed_paraphrase", "document_note": "Only records verified in the consulted source are listed; completeness is not guaranteed."}


def read_corpus(csv_path: Path = DATA / "schemes.csv") -> tuple[list[CuratedScheme], list[dict]]:
    records, failures, ids, slugs = [], [], set(), set()
    evidence_root = (csv_path.parent / "scheme_sources").resolve()
    with csv_path.open(encoding="utf-8-sig", newline="") as source:
        for line, row in enumerate(csv.DictReader(source), start=2):
            try:
                path = (evidence_root / row["evidence_file"]).resolve()
                if not path.is_relative_to(evidence_root) or path.suffix != ".txt":
                    raise ValueError("Invalid evidence path")
                row["evidence_text"] = path.read_text(encoding="utf-8")
                row["required_documents"] = json.loads(row.pop("required_documents_json"))
                record = CuratedScheme.model_validate(row)
                if record.id in ids or record.slug in slugs:
                    raise ValueError("Duplicate corpus identity")
                if (record.source_url not in record.evidence_text or record.eligibility not in record.evidence_text or
                    any(doc not in record.evidence_text for doc in record.required_documents)):
                    raise ValueError("CSV metadata is not supported by the reviewed evidence file")
                ids.add(record.id)
                slugs.add(record.slug)
                records.append(record)
            except (OSError, KeyError, TypeError, ValueError):
                failures.append({"line": line, "error": "Invalid CSV metadata, duplicate ID, official URL or corresponding evidence file."})
    return records, failures


def chunk_evidence(text: str, max_chars: int = 1800, overlap: int = 160) -> list[str]:
    if max_chars <= overlap or overlap < 0:
        raise ValueError("Invalid chunk/overlap sizes")
    chunks, start = [], 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        if end < len(text):
            boundary = text.rfind(" ", start + max_chars // 2, end)
            if boundary > start:
                end = boundary
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == len(text):
            break
        start = end - overlap
    return chunks


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()
