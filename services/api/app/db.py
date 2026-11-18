"""Lazy PostgreSQL engine and request-scoped sessions; no startup DDL or seeds."""

from collections.abc import Iterator
from functools import lru_cache

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.exc import ArgumentError, IntegrityError, SQLAlchemyError
from sqlalchemy.orm import DeclarativeBase, Session

from app.config import ConfigurationError, get_settings


class Base(DeclarativeBase):
    pass


@lru_cache
def get_engine() -> Engine:
    configured = get_settings().database_url
    if not configured:
        raise ConfigurationError("DATABASE_URL is not configured.")
    try:
        url = make_url(configured)
        if url.get_backend_name() != "postgresql":
            raise ConfigurationError("DATABASE_URL must use PostgreSQL; SQLite is used only by isolated tests.")
        trusted_host = get_settings().supabase_url.split('://')[-1].split('/')[0]
        project = trusted_host.removesuffix('.supabase.co') if trusted_host.endswith('.supabase.co') else None
        if project and url.host and (url.host.endswith('.supabase.co') or url.host.endswith('.pooler.supabase.com')):
            database_project = url.host[3:].removesuffix('.supabase.co') if url.host.startswith('db.') else (url.username or '').removeprefix('postgres.') if (url.username or '').startswith('postgres.') else None
            if database_project and database_project != project:
                raise ConfigurationError('DATABASE_URL and SUPABASE_URL refer to different Supabase projects.')
        url = url.set(drivername="postgresql+psycopg")
        if url.host not in ("localhost", "127.0.0.1", "::1") and "sslmode" not in url.query:
            url = url.update_query_dict({"sslmode": "require"})
        return create_engine(
            url, pool_pre_ping=True, pool_recycle=300, pool_timeout=5,
            pool_size=5, max_overflow=5, hide_parameters=True,
            connect_args={"connect_timeout": 5},
        )
    except ConfigurationError:
        raise
    except (ArgumentError, ValueError):
        raise ConfigurationError("DATABASE_URL is invalid.") from None


def get_db() -> Iterator[Session]:
    """Close/rollback on every path; callers explicitly commit successful writes."""
    try:
        with Session(get_engine(), expire_on_commit=False) as session:
            try:
                yield session
            except Exception:
                session.rollback()
                raise
    except ConfigurationError:
        raise HTTPException(503, detail={"code": "DATABASE_NOT_CONFIGURED", "message": "Database configuration is unavailable."}) from None
    except IntegrityError:
        raise HTTPException(409, detail={"code": "DATA_CONFLICT", "message": "The operation conflicts with existing data."}) from None
    except SQLAlchemyError:
        raise HTTPException(503, detail={"code": "DATABASE_UNAVAILABLE", "message": "The database is temporarily unavailable."}) from None
