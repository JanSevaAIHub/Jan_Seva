"""Check an explicitly configured database without making schema/data changes."""

import sys

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.config import ConfigurationError
from app.db import get_engine
from app.scripts.migrate import validate_schema


def check_database() -> None:
    with get_engine().connect() as connection:
        assert connection.scalar(text("SELECT 1")) == 1
        validate_schema(connection)


if __name__ == "__main__":
    try:
        check_database()
    except ConfigurationError as error:
        print(f"Database check failed: {error}", file=sys.stderr)
        sys.exit(1)
    except SQLAlchemyError:
        print("Database check failed. Check connectivity, privileges and whether migration 001 was applied.", file=sys.stderr)
        sys.exit(1)
    print("Database connected; five core tables, constraints and indexes verified.")
