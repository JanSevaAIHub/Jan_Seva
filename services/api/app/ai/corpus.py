"""Validate the hand-reviewed CSV and local evidence files; no web scraping."""

import csv
from datetime import datetime
import hashlib
import json
import math
from pathlib import Path
import re
from typing import Literal
from urllib.parse import urlsplit
from uuid import UUID
import unicodedata

from pydantic import Field, field_validator

from app.schemas import APIModel
from app.ai.scheme_rules import EligibilityRule, RuleSet

DATA = Path(__file__).resolve().parents[4] / "data"
CORPUS = "janseva-curated-v1"
CHUNKING_VERSION = "clean-paragraph-v2"


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
    department: str | None = Field(default=None, min_length=3, max_length=200)
    scope: Literal["Central", "State"] | None = None
    application_url: str | None = None
    rules_version: Literal[1] = 1
    eligibility_rules: list[EligibilityRule] = Field(default_factory=list)
    unmodeled_conditions: list[str] = Field(default_factory=list)

    @field_validator("application_url")
    @classmethod
    def validate_application(cls, value):
        if value is not None and not (official_url(value) or value == "https://maandhan.in/"):
            raise ValueError("Application link must be an inspected official portal")
        return value

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
            "department": self.department, "scope": self.scope, "application_url": self.application_url,
            "rules_version": self.rules_version,
            "eligibility_rules": [rule.model_dump() for rule in self.eligibility_rules],
            "unmodeled_conditions": self.unmodeled_conditions,
            "required_documents": self.required_documents, "evidence_text": self.evidence_text,
            "evidence_kind": "reviewed_paraphrase", "document_note": "Only records verified in the consulted source are listed; completeness is not guaranteed."}


def read_corpus(csv_path: Path = DATA / "schemes.csv") -> tuple[list[CuratedScheme], list[dict]]:
    records, failures, ids, slugs, evidence_files = [], [], set(), set(), set()
    evidence_root = (csv_path.parent / "scheme_sources").resolve()
    with csv_path.open(encoding="utf-8-sig", newline="") as source:
        for line, row in enumerate(csv.DictReader(source), start=2):
            try:
                path = (evidence_root / row["evidence_file"]).resolve()
                if not path.is_relative_to(evidence_root) or path.suffix != ".txt":
                    raise ValueError("Invalid evidence path")
                row["evidence_text"] = path.read_text(encoding="utf-8")
                row["required_documents"] = json.loads(row.pop("required_documents_json"))
                if "eligibility_rules_json" in row:
                    config = json.loads(row.pop("eligibility_rules_json"))
                    if not isinstance(config, dict) or set(config) != set(RuleSet.model_fields):
                        raise ValueError("Invalid rule configuration")
                    RuleSet.model_validate(config)
                    row.update(config)
                if not row.get("application_url"):
                    row.pop("application_url", None)
                record = CuratedScheme.model_validate(row)
                if record.id in ids or record.slug in slugs or path in evidence_files:
                    raise ValueError("Duplicate corpus identity")
                if (record.source_url not in record.evidence_text or record.eligibility not in record.evidence_text or
                    any(doc not in record.evidence_text for doc in record.required_documents) or
                    any(rule.evidence not in record.evidence_text for rule in record.eligibility_rules)):
                    raise ValueError("CSV metadata is not supported by the reviewed evidence file")
                ids.add(record.id)
                slugs.add(record.slug)
                evidence_files.add(path)
                records.append(record)
            except (OSError, KeyError, TypeError, ValueError):
                failures.append({"line": line, "error": "Invalid CSV metadata, duplicate ID, official URL or corresponding evidence file."})
    for path in evidence_root.glob("*.txt"):
        if path.resolve() not in evidence_files:
            failures.append({"file": path.name, "error": "Unassociated scheme source note."})
    return records, failures


def clean_source_text(text: str) -> str:
    """Normalize reviewed plain text, preserving paragraph and heading boundaries."""
    text = unicodedata.normalize("NFC", text.replace("\ufeff", "").replace("\r\n", "\n").replace("\r", "\n"))
    text = "".join(c for c in text if c in "\n\t" or not unicodedata.category(c).startswith("C"))
    lines = [re.sub(r"[^\S\n]+", " ", line).strip() for line in text.split("\n")]
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()


def estimated_tokens(text: str) -> int:
    """Approximate English-source token budget; no tokenizer download/network needed."""
    return math.ceil(len(text) / 4)


def chunk_evidence(text: str, max_chars: int = 1800, overlap: int = 160) -> list[str]:
    # About 250–450 estimated English tokens; retain short sources/tails as-is.
    if max_chars <= overlap or overlap < 0:
        raise ValueError("Invalid chunk/overlap sizes")
    text = clean_source_text(text)
    chunks, start = [], 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        if end < len(text):
            minimum = start + min(1000, max_chars * 3 // 4)
            boundary = text.rfind("\n\n", minimum, end)
            if boundary < 0:
                boundary = text.rfind(" ", minimum, end)
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
