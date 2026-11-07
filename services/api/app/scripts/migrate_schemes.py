"""Apply the additive pgvector migration after the Phase 1 migration."""

from pathlib import Path
import sys

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.config import ConfigurationError
from app.db import get_engine
from app.scripts.migrate import validate_schema

MIGRATION = Path(__file__).resolve().parents[2] / "migrations" / "002_scheme_vectors.sql"


def migrate_scheme_vectors():
    with get_engine().begin() as db:
        validate_schema(db)
        db.exec_driver_sql(MIGRATION.read_text(encoding="utf-8"), execution_options={"no_parameters": True})
        assert db.scalar(text("SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname='vector')"))


if __name__ == "__main__":
    try:
        migrate_scheme_vectors()
    except ConfigurationError as error:
        print(f"Scheme migration not applied: {error}", file=sys.stderr)
        sys.exit(1)
    except SQLAlchemyError:
        print("Scheme migration not applied; transaction rolled back. Check PostgreSQL, pgvector availability and DDL privileges.", file=sys.stderr)
        sys.exit(1)
    print("002_scheme_vectors.sql applied (safe to rerun).")
