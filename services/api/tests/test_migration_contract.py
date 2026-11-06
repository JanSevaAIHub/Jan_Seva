"""Check PostgreSQL migration widths without misrepresenting SQLite as PostgreSQL."""

import re
from contextlib import nullcontext
from types import SimpleNamespace

import pytest
from sqlalchemy import String

from app.config import ConfigurationError
from app.models import Complaint, ComplaintCategory
from app.scripts import migrate


def test_initial_sql_can_store_every_complaint_category():
    sql = migrate.MIGRATION.read_text(encoding="utf-8")
    complaint_sql = sql.split("CREATE TABLE IF NOT EXISTS public.complaints (")[1].split(");")[0]
    width = int(re.search(r"category VARCHAR\((\d+)\)", complaint_sql)[1])
    assert width >= max(len(category.value) for category in ComplaintCategory)


def test_schema_check_rejects_undersized_category_before_reporting_ready(monkeypatch):
    # Reflection double reproduces the original PostgreSQL VARCHAR(10) column.
    # No actual PostgreSQL connection is claimed by this test.
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


def test_existing_database_repair_runs_before_validation_in_the_same_transaction(monkeypatch):
    calls = []
    connection = SimpleNamespace(exec_driver_sql=lambda sql, **_: calls.append(sql))
    monkeypatch.setattr(migrate, "get_engine", lambda: SimpleNamespace(begin=lambda: nullcontext(connection)))
    monkeypatch.setattr(migrate, "validate_schema", lambda _: calls.append("validated"))
    migrate.migrate()
    assert "CREATE TABLE IF NOT EXISTS public.complaints" in calls[0]
    assert "ALTER TABLE public.complaints ALTER COLUMN category TYPE VARCHAR(11)" in calls[1]
    assert "character_maximum_length < 11" in calls[1]  # never narrow a wider installation
    assert calls[2] == "validated"
