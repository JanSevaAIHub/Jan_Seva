"""Environment configuration for the API service."""

from os import environ
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlsplit

from dotenv import load_dotenv

# Respect process/deployment configuration; never overwrite it with a local file.
load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)


class ConfigurationError(ValueError):
    """Missing/invalid server configuration (messages must not contain secrets)."""


@dataclass(frozen=True)
class Settings:
    database_url: str = field(repr=False)
    supabase_url: str
    supabase_service_role_key: str = field(repr=False)
    embedding_model: str
    embedding_dimensions: int | None

    @property
    def auth_issuer(self) -> str:
        try:
            parts = urlsplit(self.supabase_url)
        except ValueError:
            raise ConfigurationError("SUPABASE_URL is invalid.") from None
        if (
            not parts.hostname
            or parts.username or parts.password or parts.query or parts.fragment
            or parts.path not in ("", "/")
            or (parts.scheme != "https" and not (
                parts.scheme == "http" and parts.hostname in ("localhost", "127.0.0.1", "::1")
            ))
        ):
            raise ConfigurationError("Set SUPABASE_URL to the trusted project URL (HTTPS, or loopback for local Supabase).")
        return self.supabase_url.rstrip("/") + "/auth/v1"


@lru_cache
def get_settings() -> Settings:
    raw_dimensions = environ.get("EMBEDDING_DIMENSIONS", "").strip()
    try:
        dimensions = int(raw_dimensions) if raw_dimensions else None
        if dimensions is not None and dimensions <= 0:
            raise ValueError
    except ValueError:
        raise ConfigurationError("EMBEDDING_DIMENSIONS must be a positive integer.") from None
    return Settings(
        database_url=environ.get("DATABASE_URL", "").strip(),
        supabase_url=environ.get("SUPABASE_URL", "").strip(),
        supabase_service_role_key=environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip(),
        embedding_model=environ.get("EMBEDDING_MODEL", "").strip(),
        embedding_dimensions=dimensions,
    )


def cors_origins() -> list[str]:
    configured = environ.get(
        "CORS_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173"
    )
    return [origin.strip() for origin in configured.split(",") if origin.strip()]

