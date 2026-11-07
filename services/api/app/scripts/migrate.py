"""Apply the versioned SQL atomically and refuse incompatible existing tables."""

from pathlib import Path
import sys

from sqlalchemy import inspect
from sqlalchemy.engine import Connection
from sqlalchemy.exc import SQLAlchemyError

from app.config import ConfigurationError
from app.db import get_engine
from app.models import CORE_TABLES

MIGRATION = Path(__file__).resolve().parents[2] / "migrations" / "001_initial.sql"
CATEGORY_UPGRADE = MIGRATION.with_name("003_complaint_category_width.sql")


def validate_schema(connection: Connection) -> None:
    inspector = inspect(connection)
    for table in CORE_TABLES:
        actual = {c["name"]: c for c in inspector.get_columns(table.name, schema="public")}
        for column in table.columns:
            if column.name not in actual or actual[column.name]["nullable"] != column.nullable:
                raise ConfigurationError(f"Incompatible existing table: {table.name}.{column.name}; review manually without dropping data.")
        primary = set(inspector.get_pk_constraint(table.name, schema="public")["constrained_columns"])
        if primary != {c.name for c in table.primary_key}:
            raise ConfigurationError(f"Incompatible primary key on {table.name}.")
        existing_fks = inspector.get_foreign_keys(table.name, schema="public")
        for foreign_key in table.foreign_key_constraints:
            target = foreign_key.referred_table
            if not any(
                fk["constrained_columns"] == [e.parent.name for e in foreign_key.elements]
                and fk["referred_table"] == target.name
                and (fk["referred_schema"] or "public") == (target.schema or "public")
                and fk["referred_columns"] == [e.column.name for e in foreign_key.elements]
                and fk.get("options", {}).get("ondelete", "NO ACTION") == foreign_key.ondelete
                for fk in existing_fks
            ):
                raise ConfigurationError(f"Missing/incompatible foreign key on {table.name}.")
        actual_checks = {c["name"] for c in inspector.get_check_constraints(table.name, schema="public")}
        expected_checks = {c.name for c in table.constraints if c.__class__.__name__ == "CheckConstraint"}
        if not expected_checks <= actual_checks:
            raise ConfigurationError(f"Missing check constraints on {table.name}.")
        actual_indexes = {i["name"]: i["column_names"] for i in inspector.get_indexes(table.name, schema="public")}
        for index in table.indexes:
            if actual_indexes.get(index.name) != [c.name for c in index.columns]:
                raise ConfigurationError(f"Missing/incompatible index on {table.name}.")
        for unique in table.constraints:
            if unique.__class__.__name__ == "UniqueConstraint":
                if not any(set(c["column_names"]) == {c.name for c in unique.columns}
                           for c in inspector.get_unique_constraints(table.name, schema="public")):
                    raise ConfigurationError(f"Missing unique constraint on {table.name}.")


def migrate() -> None:
    with get_engine().begin() as connection:
        connection.exec_driver_sql(MIGRATION.read_text(encoding="utf-8"), execution_options={"no_parameters": True})
        connection.exec_driver_sql(CATEGORY_UPGRADE.read_text(encoding="utf-8"), execution_options={"no_parameters": True})
        validate_schema(connection)


if __name__ == "__main__":
    try:
        migrate()
    except ConfigurationError as error:
        print(f"Migration not applied: {error}", file=sys.stderr)
        sys.exit(1)
    except SQLAlchemyError:
        print("Migration not applied. Check database connectivity, privileges and schema compatibility; transaction rolled back.", file=sys.stderr)
        sys.exit(1)
    print("001_initial.sql and 003_complaint_category_width.sql applied and schema verified (safe to rerun).")
