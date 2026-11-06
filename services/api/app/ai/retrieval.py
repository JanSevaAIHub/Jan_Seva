"""One exact cosine retrieval method on the existing PostgreSQL scheme_chunks."""

import json
import math
from os import environ

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.ai.corpus import official_url
from app.ai.provider import embed_texts, embedding_config
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
    vector = embed_texts([query])[0]
    result = db.execute(text("""
        SELECT c.id AS chunk_id, s.id AS scheme_id, s.title, s.state, c.chunk_text AS text,
               1 - (c.embedding_vector <=> CAST(:vector AS vector)) AS score,
               c.source_url, s.reviewed_at, c.source_metadata
        FROM public.scheme_chunks c JOIN public.schemes s ON s.id=c.scheme_id
        WHERE c.embedding_vector IS NOT NULL AND c.is_current
          AND c.embedding_model=:model AND c.embedding_dimensions=:dimensions
          AND (CAST(:state AS text) IS NULL OR lower(s.state)=lower(CAST(:state AS text)) OR s.state='National')
          AND (CAST(:category AS text) IS NULL OR lower(s.category)=lower(CAST(:category AS text)))
        ORDER BY c.embedding_vector <=> CAST(:vector AS vector), c.id
        LIMIT :limit
    """), {"vector": json.dumps(vector), "model": model, "dimensions": dimensions,
            "state": state, "category": category, "limit": limit})
    passages = []
    for row in result.mappings():
        if row["score"] is not None and row["score"] >= threshold and official_url(row["source_url"]):
            passages.append(Passage.model_validate(dict(row)))
    return passages
