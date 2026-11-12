import tomllib
from pathlib import Path
from types import SimpleNamespace
import pytest
from sqlalchemy import String
from app.config import ConfigurationError
from app.models import Complaint
from app.scripts import migrate
from app.scripts.check_configuration import configuration_issues

ROOT = Path(__file__).resolve().parents[3]
READY = {'DATABASE_URL': 'postgresql://synthetic:private@db.example.test/postgres',
         'SUPABASE_URL': 'https://project.example.test', 'CORS_ORIGINS': 'https://web.example.test',
         'EMBEDDING_MODEL': 'synthetic-model', 'EMBEDDING_DIMENSIONS': '3',
         'OPENAI_API_KEY': 'synthetic-private-marker', 'LLM_MODEL': 'synthetic-model'}


def test_valid_configuration_is_read_only_and_does_not_claim_service_connectivity():
    assert configuration_issues(READY) == []
    issues = configuration_issues({})
    assert len(issues) == 7 and all(i['code'] == 'MISSING' for i in issues)


@pytest.mark.parametrize('patch,variable', [
    ({'DATABASE_URL': 'sqlite:///not-production.db'}, 'DATABASE_URL'),
    ({'DATABASE_URL': 'postgresql://synthetic:private@db.example.test/postgres?sslmode=disable'}, 'DATABASE_URL'),
    ({'DATABASE_URL': 'postgresql://synthetic:private@test.pooler.supabase.com:6543/postgres'}, 'DATABASE_URL'),
    ({'SUPABASE_URL': 'https://private@project.example.test'}, 'SUPABASE_URL'),
    ({'SUPABASE_URL': 'https://project.example.test:invalid'}, 'SUPABASE_URL'),
    ({'CORS_ORIGINS': '*'}, 'CORS_ORIGINS'),
    ({'CORS_ORIGINS': 'https://web.example.test/path'}, 'CORS_ORIGINS'),
    ({'EMBEDDING_DIMENSIONS': 'not-an-integer'}, 'EMBEDDING_DIMENSIONS'),
    ({'EMBEDDING_DIMENSIONS': '0'}, 'EMBEDDING_DIMENSIONS'),
    ({'EMBEDDING_DIMENSIONS': '16001'}, 'EMBEDDING_DIMENSIONS'),
])
def test_unsafe_configuration_outputs_only_names_and_codes(patch, variable):
    issues = configuration_issues({**READY, **patch})
    assert any(i['variable'] == variable for i in issues)
    assert all(set(i) == {'variable', 'code'} for i in issues)
    assert 'private' not in str(issues)


def test_loopback_configuration_requires_explicit_local_mode():
    env = {**READY, 'SUPABASE_URL': 'http://127.0.0.1:8765', 'CORS_ORIGINS': 'http://localhost:5173'}
    assert configuration_issues(env)
    assert configuration_issues(env, allow_local=True) == []


def test_netlify_rewrites_spa_and_checks_public_environment_before_build():
    config = tomllib.loads((ROOT / 'netlify.toml').read_text())
    assert config['build']['base'] == 'apps/web'
    assert config['build']['publish'] == 'dist'
    command = config['build']['command']
    assert command.index('check:deployment') < command.index('npm run build')
    assert any(r['from'] == '/*' and r['to'] == '/index.html' and r['status'] == 200 for r in config['redirects'])


def test_render_uses_production_import_and_never_runs_automatic_database_mutations():
    config = (ROOT / 'render.yaml').read_text()
    assert 'rootDir: services/api' in config
    assert 'uvicorn app.main:app --host 0.0.0.0 --port $PORT' in config
    assert 'healthCheckPath: /api/health' in config
    assert 'autoDeployTrigger: "off"' in config
    assert not any(word in config for word in ['preDeployCommand:', 'initialDeployHook:', 'e2e_server.py', 'app.scripts.migrate', 'ingest_schemes'])
    assert (ROOT / 'services/api/.python-version').read_text().strip() == '3.12'


def test_schema_check_rejects_conflicting_filing_date_type(monkeypatch):
    table = Complaint.__table__
    columns = [{'name': c.name, 'nullable': c.nullable, 'type': c.type} for c in table.columns]
    next(c for c in columns if c['name'] == 'official_submitted_on')['type'] = String(20)
    inspector = SimpleNamespace(
        get_columns=lambda *a, **k: columns,
        get_pk_constraint=lambda *a, **k: {'constrained_columns': ['id']},
        get_foreign_keys=lambda *a, **k: [
            {'constrained_columns': [e.parent.name for e in fk.elements], 'referred_table': fk.referred_table.name,
             'referred_schema': 'public', 'referred_columns': [e.column.name for e in fk.elements],
             'options': {'ondelete': fk.ondelete}} for fk in table.foreign_key_constraints],
        get_check_constraints=lambda *a, **k: [{'name': c.name} for c in table.constraints if c.__class__.__name__ == 'CheckConstraint'],
        get_indexes=lambda *a, **k: [{'name': i.name, 'column_names': [c.name for c in i.columns]} for i in table.indexes],
        get_unique_constraints=lambda *a, **k: [{'column_names': [c.name for c in u.columns]} for u in table.constraints if u.__class__.__name__ == 'UniqueConstraint'])
    monkeypatch.setattr(migrate, 'CORE_TABLES', [table])
    monkeypatch.setattr(migrate, 'inspect', lambda _: inspector)
    with pytest.raises(ConfigurationError, match='official_submitted_on'):
        migrate.validate_schema(None)
