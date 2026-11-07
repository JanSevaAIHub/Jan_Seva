"""Safe loading behavior for API configuration."""

import pytest

from app.config import get_settings


@pytest.fixture(autouse=True)
def clear_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_process_environment_is_loaded_and_secrets_are_not_repr(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://test-user:db-secret@localhost/testdb")
    monkeypatch.setenv("SUPABASE_URL", "https://project.example")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-role-secret")
    monkeypatch.setenv("EMBEDDING_MODEL", "test-embedding-model")
    monkeypatch.setenv("EMBEDDING_DIMENSIONS", "1536")

    settings = get_settings()

    assert settings.database_url.endswith("/testdb")
    assert settings.supabase_url == "https://project.example"
    assert settings.embedding_model == "test-embedding-model"
    assert settings.embedding_dimensions == 1536
    assert "db-secret" not in repr(settings)
    assert "service-role-secret" not in repr(settings)

