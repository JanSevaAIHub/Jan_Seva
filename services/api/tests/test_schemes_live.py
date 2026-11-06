"""Opt-in checks against actual PostgreSQL/pgvector and the configured OpenAI API.

Requires real configuration and provider usage; never substitutes test vectors.
Run with JANSEVA_LIVE_RAG=1 after Phase 1 and migration 002.
"""

import os

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.ai.corpus import CORPUS, read_corpus
from app.ai.rag import answer_question
from app.ai.retrieval import prepare_vectors, retrieve
from app.ai.scheme_schemas import SchemeAsk
from app.db import get_engine
from app.scripts.evaluate_schemes import QUESTIONS
from app.scripts.ingest_schemes import ingest_record

pytestmark = pytest.mark.skipif(os.environ.get("JANSEVA_LIVE_RAG") != "1", reason="Live PostgreSQL/pgvector/provider configuration not enabled; no fake embeddings used.")


def test_real_ingestion_rerun_vectors_and_five_questions():
    records, errors = read_corpus()
    assert not errors and len(records) >= 8
    engine = get_engine()
    for record in records:
        with Session(engine) as db, db.begin():
            ingest_record(db, record)
    with Session(engine) as db:
        prepare_vectors(db)
        before = db.scalar(text("SELECT count(*) FROM scheme_chunks WHERE source_metadata->>'corpus'=:corpus"), {"corpus": CORPUS})
        assert db.scalar(text("SELECT count(*) FROM scheme_chunks WHERE is_current AND embedding_vector IS NOT NULL AND source_metadata->>'corpus'=:corpus"), {"corpus": CORPUS}) >= 8
    for record in records:
        with Session(engine) as db, db.begin():
            _, embedded = ingest_record(db, record)
            assert embedded == 0
    with Session(engine) as db:
        assert db.scalar(text("SELECT count(*) FROM scheme_chunks WHERE source_metadata->>'corpus'=:corpus"), {"corpus": CORPUS}) == before
        for name, question, profile in QUESTIONS:
            passages = retrieve(db, question, state=profile.get("state") if profile else None)
            answer = answer_question(db, SchemeAsk(message=question, profile=profile))
            retrieved_urls = {p.source_url for p in passages}
            assert all(c.url in retrieved_urls for c in answer.citations)
            assert all(any(c.excerpt in p.text for p in passages if p.chunk_id == c.chunk_id) for c in answer.citations)
            if name == "unknown":
                assert answer.mode == "insufficient_evidence"
            elif name == "documents":
                assert any("Sukanya" in c.title for c in answer.citations)
            elif name == "student":
                assert any("Scholarship" in c.title for c in answer.citations)
            elif name == "farmer":
                assert any("Kisan" in c.title for c in answer.citations)
            elif name == "state":
                assert any("Punjab domicile" in c.excerpt or "domicile of Punjab" in c.excerpt for c in answer.citations)
