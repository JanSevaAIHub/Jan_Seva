"""Reproducible boundary failures; all upstream traffic remains isolated."""

from contextlib import nullcontext
from types import SimpleNamespace

import httpx
import pytest
from sqlalchemy import String

from app.ai import provider
from app.ai.provider import ProviderError
from app.config import ConfigurationError
from app.models import Complaint
from app.scripts import migrate


@pytest.mark.parametrize("output", [[None], ["malformed"], [{"type": "message", "content": [None]}]])
def test_malformed_generation_items_become_sanitized_provider_errors(monkeypatch, output):
    monkeypatch.setenv("LLM_MODEL", "isolated-provider-model")
    monkeypatch.setattr(provider, "provider_post", lambda *_: {"status": "completed", "output": output})
    with pytest.raises(ProviderError, match="completed evidence selection"):
        provider.select_evidence("Synthetic test question", [], None)


def test_schema_check_rejects_undersized_category(monkeypatch):
    columns = [{"name": c.name, "nullable": c.nullable, "type": c.type} for c in Complaint.__table__.columns]
    next(c for c in columns if c["name"] == "category")["type"] = String(10)
    inspector = SimpleNamespace(get_columns=lambda *_, **__: columns,
        get_pk_constraint=lambda *_, **__: {"constrained_columns": ["id"]},
        get_foreign_keys=lambda *_, **__: [
            {"constrained_columns": [e.parent.name for e in fk.elements],
             "referred_table": fk.referred_table.name, "referred_schema": "public",
             "referred_columns": [e.column.name for e in fk.elements],
             "options": {"ondelete": fk.ondelete}} for fk in Complaint.__table__.foreign_key_constraints],
        get_check_constraints=lambda *_, **__: [{"name": c.name} for c in Complaint.__table__.constraints
            if c.__class__.__name__ == "CheckConstraint"],
        get_indexes=lambda *_, **__: [{"name": i.name, "column_names": [c.name for c in i.columns]}
            for i in Complaint.__table__.indexes],
        get_unique_constraints=lambda *_, **__: [{"column_names": ["seed_key"]}])
    monkeypatch.setattr(migrate, "CORE_TABLES", [Complaint.__table__])
    monkeypatch.setattr(migrate, "inspect", lambda _: inspector)
    with pytest.raises(ConfigurationError, match=r"complaints.category"):
        migrate.validate_schema(None)


def test_existing_database_upgrade_runs_before_validation_in_one_transaction(monkeypatch):
    calls = []
    connection = SimpleNamespace(exec_driver_sql=lambda sql, **_: calls.append(sql))
    monkeypatch.setattr(migrate, "get_engine", lambda: SimpleNamespace(begin=lambda: nullcontext(connection)))
    monkeypatch.setattr(migrate, "validate_schema", lambda _: calls.append("validated"))
    migrate.migrate()
    assert "CREATE TABLE IF NOT EXISTS public.complaints" in calls[0]
    assert "ALTER TABLE public.complaints ALTER COLUMN category TYPE VARCHAR(50)" in calls[1]
    assert "character_maximum_length < 50" in calls[1]
    assert "ADD COLUMN IF NOT EXISTS official_channel" in calls[2]
    assert "ADD COLUMN IF NOT EXISTS official_submitted_on" in calls[2]
    assert "complaints_filing_requires_reference" in calls[2]
    assert calls[3] == "validated"


@pytest.mark.parametrize("failure", ["timeout", "401", "429", "500", "bad-json"])
def test_provider_failures_are_sanitized_without_retries(monkeypatch, failure):
    monkeypatch.setenv("OPENAI_API_KEY", "isolated-private-provider-marker")
    real_client = httpx.Client
    attempts = []

    def handler(request):
        attempts.append(request)
        if failure == "timeout":
            raise httpx.ReadTimeout("isolated-private-provider-marker", request=request)
        if failure == "bad-json":
            return httpx.Response(200, text="isolated-private-provider-marker")
        return httpx.Response(int(failure), json={"error": "isolated-private-provider-marker"})

    monkeypatch.setattr(provider.httpx, "Client", lambda **kwargs: real_client(transport=httpx.MockTransport(handler), **kwargs))
    with pytest.raises(ProviderError) as error:
        provider.provider_post("embeddings", {"input": ["Synthetic evidence"]})
    assert "isolated-private-provider-marker" not in str(error.value)
    assert len(attempts) == 1


def test_missing_provider_key_fails_without_network(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setattr(provider.httpx, "Client", lambda **_: pytest.fail("Missing credentials triggered network"))
    with pytest.raises(ConfigurationError, match="OPENAI_API_KEY"):
        provider.provider_post("embeddings", {})
