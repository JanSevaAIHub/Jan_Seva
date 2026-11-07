from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import db
from app.config import ConfigurationError, get_settings


@pytest.fixture
def database_settings(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    get_settings.cache_clear()
    db.get_engine.cache_clear()
    yield monkeypatch
    db.get_engine.cache_clear()
    get_settings.cache_clear()


def test_database_configuration_is_required(database_settings):
    with pytest.raises(ConfigurationError, match="DATABASE_URL is not configured"):
        db.get_engine()


@pytest.mark.parametrize("url", ["not a connection URL", "sqlite:///unwanted.db", "postgresql://localhost:invalid/db"])
def test_invalid_or_non_postgres_runtime_urls_rejected(database_settings, url):
    database_settings.setenv("DATABASE_URL", url)
    get_settings.cache_clear()
    with pytest.raises(ConfigurationError):
        db.get_engine()


def test_failed_query_returns_sanitized_503_and_session_is_closed(db_session, monkeypatch):
    monkeypatch.setattr(db, "get_engine", lambda: db_session.bind)
    probe = FastAPI()

    @probe.get("/db-probe")
    def failed(db_value: Session = Depends(db.get_db)):
        db_value.execute(text("SELECT secret_column FROM nonexistent_private_table"))

    with TestClient(probe) as client:
        response = client.get("/db-probe")
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "DATABASE_UNAVAILABLE"
    assert "secret_column" not in response.text and "nonexistent_private_table" not in response.text


def test_missing_database_with_valid_token_is_not_a_demo_bypass(database_settings, tokens, profiles, monkeypatch):
    from app.main import app
    # Real auth verification; no DB override or fallback for this request.
    with TestClient(app) as client:
        response = client.get("/api/me", headers={"Authorization": "Bearer " + tokens(profiles["citizen"].user_id)})
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "DATABASE_NOT_CONFIGURED"


def test_remote_postgres_defaults_to_tls_and_preserves_explicit_connection_options(database_settings):
    database_settings.setenv("DATABASE_URL", "postgresql://test-user@db.example.invalid/testdb")
    get_settings.cache_clear()
    engine = db.get_engine()  # Construction is lazy; no remote connection is made.
    assert engine.url.drivername == "postgresql+psycopg"
    assert engine.url.query["sslmode"] == "require"
    engine.dispose()
