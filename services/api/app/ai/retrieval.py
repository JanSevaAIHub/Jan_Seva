"""One exact cosine retrieval method on the existing PostgreSQL scheme_chunks."""

import json
import math
from os import environ
import re

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.ai.corpus import official_url
from app.ai.provider import ProviderError, embed_texts, embedding_config, validate_vector
from app.ai.scheme_schemas import Passage
from app.config import ConfigurationError


def prepare_vectors(db: Session) -> None:
    if db.bind.dialect.name != "postgresql":
        raise ConfigurationError("Scheme retrieval requires PostgreSQL with migration 002 and pgvector.")
    # Extension namespace comes from PostgreSQL's catalog, never a request value.
    schema = db.scalar(text("SELECT n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='vector'"))
    if not schema:
        raise ConfigurationError("Apply 002_scheme_vectors.sql before ingestion or retrieval.")
    db.execute(text("SELECT set_config('search_path', 'public,' || quote_ident(:schema), true)"), {"schema": schema})
    _, dimensions = embedding_config()
    column = db.execute(text("""
        SELECT t.typname, a.atttypmod AS dimensions
        FROM pg_attribute a JOIN pg_type t ON t.oid=a.atttypid
        WHERE a.attrelid=to_regclass('public.scheme_chunks')
          AND a.attname='embedding_vector' AND NOT a.attisdropped
    """)).mappings().first()
    if not column or column["typname"] != "vector":
        raise ConfigurationError("The scheme_chunks embedding_vector column requires pgvector migration 002.")
    if column["dimensions"] not in (-1, dimensions):
        raise ConfigurationError("Configured embedding dimension does not match the database vector column dimension.")


class RetrievedPassages(list):
    """Keep existing list callers compatible while recording retrieval provenance."""
    def __init__(self, passages=(), *, method="pgvector_cosine_retrieval"):
        super().__init__(passages)
        self.method = method


STOP_WORDS = set("a an and are as at be by can could do does for from government how i in is it me my not of official on or scheme schemes source sources tell that the their there these they this to verified was what when where which who with would you your required".split())


def lexical_terms(value: str) -> set[str]:
    words = re.findall(r"[^\W_]+", value.casefold())
    return {word[:-1] if len(word) > 4 and word.endswith("s") else word
            for word in words if len(word) >= 3 and word not in STOP_WORDS}


def stored_passage(row) -> Passage | None:
    """An invalid stored source is insufficient evidence, never a provider instruction."""
    try:
        data = dict(row)
        if isinstance(data.get("source_metadata"), str):
            data["source_metadata"] = json.loads(data["source_metadata"])
        passage = Passage.model_validate(data)
        if official_url(passage.source_url) and passage.text.strip() and math.isfinite(passage.score):
            return passage
    except (ValueError, TypeError):
        pass
    return None


def lexical_retrieve(db: Session, query: str, state: str | None = None,
                     category: str | None = None, limit: int = 5) -> RetrievedPassages:
    """Bounded deterministic ranking of actual current stored chunks, never invented text."""
    if not 3 <= len(query.strip()) <= 1000 or not 1 <= limit <= 10:
        raise ValueError("Invalid lexical query or limit")
    terms = lexical_terms(query)
    if not terms:
        return RetrievedPassages(method="lexical_fallback")
    # No vector operation is attempted after a provider failure. SQL parameters
    # remain separate from query text; candidates are bounded for this small corpus.
    rows = db.execute(text("""
        SELECT c.id AS chunk_id, s.id AS scheme_id, s.title, s.state,
               c.chunk_text AS text, c.source_url, s.reviewed_at, c.source_metadata
        FROM scheme_chunks c JOIN schemes s ON s.id=c.scheme_id
        WHERE c.is_current AND c.source_url=s.source_url
          AND (CAST(:state AS text) IS NULL OR lower(s.state)=lower(CAST(:state AS text)) OR s.state='National')
          AND (CAST(:category AS text) IS NULL OR lower(s.category)=lower(CAST(:category AS text)))
        ORDER BY c.id LIMIT 200
    """), {"state": state.strip() if state else None, "category": category.strip() if category else None}).mappings()
    candidates = []
    for row in rows:
        p = stored_passage({**row, "score": 0.0})
        if p is not None:
            candidates.append((p, lexical_terms(p.text), lexical_terms(p.title)))
    # Strong named-scheme queries should not pull in unrelated document lists.
    # Recognize actual stored title acronyms or two distinctive title terms.
    titles = {p.scheme_id: title for p, _, title in candidates}
    named = set()
    for p, _, title in candidates:
        distinctive = {term for term in title if sum(term in t for t in titles.values()) == 1}
        aliases = re.findall(r"\(([A-Z][A-Z0-9-]{1,})\)", p.title)
        if len(terms & distinctive) >= 2 or any(re.search(r"(?<!\w)" + re.escape(alias) + r"(?!\w)", query, re.I) for alias in aliases):
            named.add(p.scheme_id)
    ranked = []
    for p, body, title in candidates:
        if named and p.scheme_id not in named:
            continue
        matches = terms & (body | title)
        if not matches:
            continue
        score = sum((1 + math.log((1 + len(candidates)) / (1 + sum(term in b or term in t for _, b, t in candidates))))
                    * (3 if term in title else 1) for term in matches)
        p.score = score  # Lexical score, never a cosine/confidence percentage.
        ranked.append(p)
    ranked.sort(key=lambda p: (-p.score, str(p.chunk_id)))
    return RetrievedPassages(ranked[:limit], method="lexical_fallback")


def retrieve(db: Session, query: str, state: str | None = None, category: str | None = None, limit: int = 5) -> list[Passage]:
    query = query.strip()
    if not 3 <= len(query) <= 1000 or not 1 <= limit <= 10:
        raise ValueError("Query must contain 3–1000 characters and limit must be 1–10.")
    model, dimensions = embedding_config()
    try:
        threshold = float(environ.get("RAG_MIN_SCORE", "0.35"))
        if not math.isfinite(threshold) or not -1 <= threshold <= 1:
            raise ValueError
    except ValueError:
        raise ConfigurationError("RAG_MIN_SCORE must be a finite cosine score between -1 and 1.") from None
    prepare_vectors(db)
    try:
        vector = validate_vector(embed_texts([query])[0], dimensions)
    except (ProviderError, ConfigurationError):
        return lexical_retrieve(db, query, state, category, limit)
    result = db.execute(text("""
        SELECT c.id AS chunk_id, s.id AS scheme_id, s.title, s.state, c.chunk_text AS text,
               1 - (c.embedding_vector <=> CAST(:vector AS vector)) AS score,
               c.source_url, s.reviewed_at, c.source_metadata
        FROM public.scheme_chunks c JOIN public.schemes s ON s.id=c.scheme_id
        WHERE c.embedding_vector IS NOT NULL AND c.is_current
          AND c.source_url=s.source_url
          AND c.embedding_model=:model AND c.embedding_dimensions=:dimensions
          AND (CAST(:state AS text) IS NULL OR lower(s.state)=lower(CAST(:state AS text)) OR s.state='National')
          AND (CAST(:category AS text) IS NULL OR lower(s.category)=lower(CAST(:category AS text)))
        ORDER BY c.embedding_vector <=> CAST(:vector AS vector), c.id
        LIMIT :limit
    """), {"vector": json.dumps(vector), "model": model, "dimensions": dimensions,
            "state": state.strip() if state else None, "category": category.strip() if category else None, "limit": limit})
    passages = []
    for row in result.mappings():
        p = stored_passage(row)
        if p is not None and threshold <= p.score <= 1:
            passages.append(p)
    return RetrievedPassages(passages)
