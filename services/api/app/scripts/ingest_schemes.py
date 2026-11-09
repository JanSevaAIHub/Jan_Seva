"""CSV -> reviewed chunks -> real OpenAI embeddings -> existing PostgreSQL tables."""

import argparse
import json
import sys
from uuid import uuid5

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.ai.corpus import CHUNKING_VERSION, CORPUS, chunk_evidence, content_hash, read_corpus
from app.ai.provider import ProviderError, embed_texts, embedding_config, validate_vector
from app.ai.retrieval import prepare_vectors
from app.config import ConfigurationError
from app.db import get_engine
from app.models import Scheme, SchemeChunk


def ingest_record(db: Session, record) -> tuple[int, int]:
    model, dimensions = embedding_config()
    prepare_vectors(db)
    db.execute(text("SELECT pg_advisory_xact_lock(hashtext(:identity))"), {"identity": "janseva:scheme:" + str(record.id)})
    previous = db.get(Scheme, record.id)
    if previous is not None and (not isinstance(previous.rules_json, dict) or previous.rules_json.get("corpus") != CORPUS):
        raise ConfigurationError("Existing scheme ID is not owned by this curated corpus; no overwrite performed.")
    chunks = chunk_evidence(record.evidence_text)
    if not chunks:
        raise ValueError("Reviewed source has no usable text")
    # Content-derived IDs retain old cited text as inactive when a source changes.
    ids = [uuid5(record.id, f"{CORPUS}:{CHUNKING_VERSION}:{content_hash(chunk)}") for chunk in chunks]
    existing = {row["id"]: row for row in db.execute(text("""
        SELECT id, source_metadata, embedding_model, embedding_dimensions,
               embedding_vector IS NOT NULL AS has_vector
        FROM public.scheme_chunks WHERE scheme_id=:id
    """), {"id": record.id}).mappings()}
    pending = [i for i, chunk in enumerate(chunks) if ids[i] not in existing or not (
        isinstance(existing[ids[i]]["source_metadata"], dict) and
        existing[ids[i]]["source_metadata"].get("content_hash") == content_hash(chunk) and
        existing[ids[i]]["embedding_model"] == model and existing[ids[i]]["embedding_dimensions"] == dimensions and
        existing[ids[i]]["has_vector"])]
    vectors = {}
    if pending:
        embedded = embed_texts([chunks[i] for i in pending])
        if len(embedded) != len(pending):
            raise ProviderError("Embedding provider returned an incomplete batch; record not stored.")
        vectors = dict(zip(pending, [validate_vector(vector, dimensions) for vector in embedded]))
    values = {"id": record.id, "title": record.title, "category": record.category, "state": record.state,
        "description": record.description, "source_url": record.source_url, "rules_json": record.rules(), "reviewed_at": record.reviewed_at}
    db.execute(insert(Scheme).values(**values).on_conflict_do_update(index_elements=[Scheme.id], set_={k: v for k, v in values.items() if k != "id"}))
    # Preserve old reviewed passages as inactive, rather than deleting source data.
    db.execute(text("UPDATE public.scheme_chunks SET is_current=false WHERE scheme_id=:id AND source_metadata->>'corpus'=:corpus"), {"id": record.id, "corpus": CORPUS})
    for index, chunk in enumerate(chunks):
        if index in vectors:
            # Clear the old vector within this transaction before changing its
            # dimension metadata; rollback preserves it if any later write fails.
            db.execute(text("UPDATE public.scheme_chunks SET embedding_vector=NULL WHERE id=:id"), {"id": ids[index]})
            fields = {"id": ids[index], "scheme_id": record.id, "chunk_text": chunk, "source_url": record.source_url,
                "embedding": vectors[index], "embedding_model": model, "embedding_dimensions": dimensions}
            db.execute(insert(SchemeChunk).values(**fields).on_conflict_do_update(index_elements=[SchemeChunk.id], set_={k: v for k, v in fields.items() if k != "id"}))
        metadata = {"corpus": CORPUS, "slug": record.slug, "content_hash": content_hash(chunk),
            "scheme_id": str(record.id), "heading": record.title, "source_url": record.source_url,
            "chunking_version": CHUNKING_VERSION, "estimated_tokens": (len(chunk) + 3) // 4,
            "evidence_file": record.evidence_file, "chunk_index": index, "reviewed_at": record.reviewed_at.isoformat(), "evidence_kind": "reviewed_paraphrase"}
        if index in vectors:
            db.execute(text("UPDATE public.scheme_chunks SET embedding_vector=CAST(:vector AS vector) WHERE id=:id"), {"vector": json.dumps(vectors[index]), "id": ids[index]})
        # Source corrections do not require new embeddings, but the stored URL
        # must stay aligned with the scheme and metadata on every rerun.
        db.execute(text("UPDATE public.scheme_chunks SET source_url=:source_url, source_metadata=CAST(:metadata AS jsonb), is_current=true WHERE id=:id"),
                   {"source_url": record.source_url, "metadata": json.dumps(metadata), "id": ids[index]})
    return len(chunks), len(pending)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--validate-only", action="store_true", help="Validate the curated files without database/model calls")
    args = parser.parse_args()
    records, failures = read_corpus()
    for failure in failures:
        print(json.dumps(failure), file=sys.stderr)
    if args.validate_only:
        print(json.dumps({"validated_records": len(records), "failed_records": len(failures),
            "chunks": sum(len(chunk_evidence(record.evidence_text)) for record in records)}))
        return int(bool(failures))
    if failures:
        print("Corpus validation failed; no records written.", file=sys.stderr)
        return 1
    engine = get_engine()
    for record in records:
        try:
            with Session(engine) as db, db.begin():
                chunks, embedded = ingest_record(db, record)
            print(json.dumps({"scheme_id": str(record.id), "slug": record.slug, "stored_chunks": chunks, "new_embeddings": embedded}))
        except (ConfigurationError, ProviderError, SQLAlchemyError, ValueError):
            failures.append({"scheme_id": str(record.id), "slug": record.slug, "error": "Record rolled back; check vector migration, provider configuration and database. No credentials or provider payload logged."})
            print(json.dumps(failures[-1]), file=sys.stderr)
    return int(bool(failures))


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ConfigurationError, ProviderError, SQLAlchemyError, OSError) as error:
        print(f"Scheme ingestion unavailable: {error}" if isinstance(error, ConfigurationError) else "Scheme ingestion unavailable; check database, provider and corpus configuration.", file=sys.stderr)
        sys.exit(1)
