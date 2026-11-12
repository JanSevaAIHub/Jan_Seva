"""Read-only deployment configuration checks. Outputs variable names/codes only."""
import argparse
import json
import os
from urllib.parse import urlsplit

from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError

# Loads the existing ignored services/api/.env without overwriting process values.
from app.config import ConfigurationError, get_settings


def safe_origin(value, allow_local=False):
    try:
        url = urlsplit(value)
        _ = url.port  # Validate malformed/out-of-range ports without printing URLs.
        return (bool(url.hostname) and not url.username and not url.password and not url.query and not url.fragment
                and url.path in ('', '/') and (url.scheme == 'https' or
                (allow_local and url.scheme == 'http' and url.hostname in ('localhost', '127.0.0.1', '::1'))))
    except ValueError:
        return False


def configuration_issues(env, *, allow_local=False):
    issues = []
    for name in ('DATABASE_URL', 'SUPABASE_URL', 'EMBEDDING_MODEL', 'EMBEDDING_DIMENSIONS', 'OPENAI_API_KEY', 'LLM_MODEL', 'CORS_ORIGINS'):
        if not env.get(name, '').strip():
            issues.append({'variable': name, 'code': 'MISSING'})
    if env.get('SUPABASE_URL') and not safe_origin(env['SUPABASE_URL'], allow_local):
        issues.append({'variable': 'SUPABASE_URL', 'code': 'INVALID_ORIGIN'})
    if env.get('CORS_ORIGINS'):
        origins = env['CORS_ORIGINS'].split(',')
        if any(not safe_origin(origin.strip(), allow_local) for origin in origins):
            issues.append({'variable': 'CORS_ORIGINS', 'code': 'EXACT_ORIGINS_REQUIRED'})
    if env.get('DATABASE_URL'):
        try:
            url = make_url(env['DATABASE_URL'])
            if url.get_backend_name() != 'postgresql' or not url.host or not url.database:
                raise ValueError
            local = url.host in ('localhost', '127.0.0.1', '::1')
            if not local and url.query.get('sslmode', 'require') not in ('require', 'verify-ca', 'verify-full'):
                issues.append({'variable': 'DATABASE_URL', 'code': 'TLS_REQUIRED'})
            if url.host.endswith('.pooler.supabase.com') and url.port == 6543:
                issues.append({'variable': 'DATABASE_URL', 'code': 'USE_DIRECT_OR_SESSION_POOLER'})
        except (ArgumentError, ValueError, TypeError):
            issues.append({'variable': 'DATABASE_URL', 'code': 'INVALID_POSTGRES_URL'})
    if env.get('EMBEDDING_DIMENSIONS'):
        try:
            if not 1 <= int(env['EMBEDDING_DIMENSIONS']) <= 16000:
                raise ValueError
        except (ValueError, TypeError):
            issues.append({'variable': 'EMBEDDING_DIMENSIONS', 'code': 'INVALID_DIMENSIONS'})
    return issues


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--allow-local', action='store_true', help='Permit explicit HTTP loopback origins for local development')
    args = parser.parse_args()
    issues = configuration_issues(os.environ, allow_local=args.allow_local)
    try:
        get_settings().auth_issuer
    except ConfigurationError:
        if not any(i['variable'] in ('SUPABASE_URL', 'EMBEDDING_DIMENSIONS') for i in issues):
            issues.append({'variable': 'SUPABASE_URL', 'code': 'INVALID_AUTH_CONFIGURATION'})
    print(json.dumps({'status': 'BLOCKED' if issues else 'PASS', 'issues': issues}))
    return int(bool(issues))


if __name__ == '__main__':
    raise SystemExit(main())
