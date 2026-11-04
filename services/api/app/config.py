"""Environment configuration for the API service."""

from os import environ


def cors_origins() -> list[str]:
    configured = environ.get(
        "CORS_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173"
    )
    return [origin.strip() for origin in configured.split(",") if origin.strip()]

