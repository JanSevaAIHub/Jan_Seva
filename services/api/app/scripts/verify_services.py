"""Read-only release probes. No migrations, ingestion, users or role changes.

Outputs statuses and variable NAMES only. Never prints tokens, connection strings,
provider responses, citizen data, signed URLs or underlying exception messages.
"""

import json
from os import environ
from pathlib import Path

import httpx
from dotenv import dotenv_values
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.config import ConfigurationError, get_settings
from app.db import get_engine
from app.scripts.migrate import validate_schema
from app.storage import EvidenceStorage, StorageError

EXPECTED_PROJECT = 'https://rmexxrdtqszlnsndcrpj.supabase.co'
ROOT = Path(__file__).resolve().parents[4]


def verify():
    settings = get_settings()
    frontend = dotenv_values(ROOT / 'apps/web/.env')
    result = {'project_match': settings.supabase_url == frontend.get('VITE_SUPABASE_URL') == EXPECTED_PROJECT,
        'missing_variables': [key for key in ('DATABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY',
            'LLM_MODEL', 'EMBEDDING_MODEL', 'EMBEDDING_DIMENSIONS') if not environ.get(key, '').strip()]}
    key = frontend.get('VITE_SUPABASE_PUBLISHABLE_KEY', '')
    if result['project_match']:
        with httpx.Client(timeout=15, follow_redirects=False) as client:
            for label, path in [('auth_settings', '/auth/v1/settings'), ('jwks', '/auth/v1/.well-known/jwks.json')]:
                try:
                    response = client.get(EXPECTED_PROJECT + path, headers={'apikey': key})
                    data = response.json()
                    result[label] = {'http_status': response.status_code}
                    if label == 'jwks' and response.status_code == 200:
                        result[label]['algorithms'] = sorted({v.get('alg', 'unspecified') for v in data.get('keys', [])})
                    if label == 'auth_settings' and response.status_code == 200:
                        result[label]['email_enabled'] = data.get('external', {}).get('email')
                except (httpx.HTTPError, ValueError):
                    result[label] = {'status': 'unavailable'}
    else:
        result['auth_settings'] = result['jwks'] = {'status': 'blocked_project_mismatch'}
    if settings.database_url and result['project_match']:
        try:
            with get_engine().connect() as connection:
                result['select_1'] = connection.scalar(text('SELECT 1')) == 1
                validate_schema(connection)
                result['schema'] = 'verified'
                rows = connection.execute(text("SELECT c.relname, c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('profiles','complaints','complaint_events','schemes','scheme_chunks','complaint_evidence','complaint_submissions')")).all()
                result['rls'] = {name: enabled for name, enabled in rows}
                result['storage_api_only_policy'] = bool(connection.scalar(text("SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='janseva_evidence_api_only' AND permissive='RESTRICTIVE')")))
        except (SQLAlchemyError, ConfigurationError):
            result['database'] = 'failed_connectivity_or_schema_review_required'
    else:
        result['database'] = 'blocked_missing_DATABASE_URL_or_project_mismatch'
    if settings.supabase_service_role_key and result['project_match']:
        try:
            EvidenceStorage().require_private()
            result['storage_bucket'] = 'verified_private'
        except (ConfigurationError, StorageError):
            result['storage_bucket'] = 'failed_or_unavailable'
    else:
        result['storage_bucket'] = 'blocked_missing_SUPABASE_SERVICE_ROLE_KEY_or_project_mismatch'
    result['live_model'] = 'not_called_by_read_only_probe'
    return result


if __name__ == '__main__':
    print(json.dumps(verify(), indent=2))
