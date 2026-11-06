"""Header/configuration contracts only; these do not imply a live project check."""

import secrets
from types import SimpleNamespace

import pytest
from dotenv import dotenv_values
from sqlalchemy.engine import make_url

from app.config import ConfigurationError, get_settings
from app.scripts import configure_supabase
from app.scripts.setup_demo import admin_client


@pytest.fixture
def settings_env(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://project.example.supabase.co")
    monkeypatch.delenv("SUPABASE_SECRET_KEY", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    get_settings.cache_clear()
    yield monkeypatch
    get_settings.cache_clear()


def test_current_secret_key_uses_apikey_without_jwt_authorization(settings_env):
    key = "sb_secret_" + secrets.token_urlsafe(24)
    settings_env.setenv("SUPABASE_SECRET_KEY", key)
    settings_env.setenv("SUPABASE_SERVICE_ROLE_KEY", "unused-legacy-test-value")
    with admin_client() as client:
        assert client.headers["apikey"] == key
        assert "authorization" not in client.headers
        assert key not in repr(get_settings())


def test_legacy_key_remains_supported(settings_env):
    key = secrets.token_urlsafe(24)  # generated fixture, never a real token
    settings_env.setenv("SUPABASE_SERVICE_ROLE_KEY", key)
    with admin_client() as client:
        assert client.headers["apikey"] == key
        assert client.headers["authorization"] == "Bearer " + key


def test_publishable_key_is_not_accepted_for_admin_setup(settings_env):
    settings_env.setenv("SUPABASE_SECRET_KEY", "sb_publishable_" + secrets.token_urlsafe(24))
    with pytest.raises(ConfigurationError, match="browser publishable"):
        admin_client()


def test_private_password_is_url_encoded_and_remote_tls_is_enabled():
    password = secrets.token_urlsafe(18) + "@/#%:'"
    value = configure_supabase.database_url("postgresql://postgres.example:[YOUR-PASSWORD]@pooler.example:5432/postgres", password)
    assert make_url(value).password == password
    assert make_url(value).query["sslmode"] == "require"
    with pytest.raises(ConfigurationError, match="Session pooler"):
        configure_supabase.database_url("postgresql://user@pooler.example:6543/postgres", password)


def test_private_configuration_preserves_other_values_and_never_writes_secret_to_web(tmp_path, monkeypatch):
    monkeypatch.setattr(configure_supabase, "ROOT", tmp_path)
    for folder in [tmp_path / "services/api", tmp_path / "apps/web"]:
        folder.mkdir(parents=True)
    backend, frontend = tmp_path / "services/api/.env", tmp_path / "apps/web/.env"
    backend.write_text("LLM_MODEL=existing-model\n", encoding="utf-8")
    frontend.write_text("VITE_API_BASE_URL=http://127.0.0.1:8000\n", encoding="utf-8")
    monkeypatch.setattr(configure_supabase.subprocess, "run", lambda *_, **__: SimpleNamespace(returncode=0))
    secret = "sb_secret_" + secrets.token_urlsafe(24)
    public = "sb_publishable_" + secrets.token_urlsafe(24)
    connection = configure_supabase.database_url("postgresql://user@pooler.example:5432/postgres", secrets.token_urlsafe(24))
    configure_supabase.write_configuration("https://project.example.supabase.co", connection, secret, public)
    assert dotenv_values(backend)["SUPABASE_SECRET_KEY"] == secret
    assert dotenv_values(backend)["LLM_MODEL"] == "existing-model"
    assert dotenv_values(frontend)["VITE_SUPABASE_PUBLISHABLE_KEY"] == public
    assert secret not in frontend.read_text() and connection not in frontend.read_text()
