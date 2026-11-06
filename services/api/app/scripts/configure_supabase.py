"""Private local terminal prompts; never pass real credentials as CLI arguments."""

from getpass import getpass
from pathlib import Path
import shutil
import subprocess
import sys
from urllib.parse import urlsplit

from dotenv import set_key
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError

from app.config import ConfigurationError

ROOT = Path(__file__).resolve().parents[4]


def database_url(template: str, password: str) -> str:
    """URL-encode the separately entered password, including @, #, / and %."""
    try:
        url = make_url(template.strip())
        if (url.get_backend_name() != "postgresql" or not url.host or not url.username
            or not url.database or url.port not in (None, 5432) or not password):
            raise ValueError
        if url.query.get("sslmode") not in (None, "require", "verify-ca", "verify-full"):
            raise ValueError
        return url.set(password=password).update_query_dict(
            {"sslmode": url.query.get("sslmode", "require")}
        ).render_as_string(hide_password=False)
    except (ArgumentError, TypeError, ValueError):
        raise ConfigurationError("Use the PostgreSQL direct/Session pooler template on port 5432 and a nonempty database password. The connection value was not printed.") from None


def write_configuration(project_url: str, connection: str, secret: str, public_key: str = "") -> None:
    try:
        url = urlsplit(project_url.strip())
        if (url.scheme != "https" or not url.hostname or url.username or url.password
            or url.path not in ("", "/") or url.query or url.fragment or url.port not in (None, 443)):
            raise ValueError
    except ValueError:
        raise ConfigurationError("Enter the project's HTTPS API URL, without dashboard paths or credentials.") from None
    if not secret.startswith("sb_secret_"):
        raise ConfigurationError("Enter a current backend secret key beginning sb_secret_. Legacy keys can still be configured manually.")
    if public_key and not public_key.startswith("sb_publishable_"):
        raise ConfigurationError("The optional browser value must be a publishable key beginning sb_publishable_.")
    targets = [(ROOT / "services/api/.env", ROOT / ".env.example"),
               (ROOT / "apps/web/.env", ROOT / "apps/web/.env.example")]
    # Refuse to place real values in a file not covered by Git's ignore rules.
    for target, _ in targets:
        result = subprocess.run(["git", "check-ignore", "--quiet", str(target)], cwd=ROOT, capture_output=True)
        if result.returncode != 0:
            raise ConfigurationError("Local env files must be Git-ignored before entering credentials.")
    for target, example in targets:
        if not target.exists():
            shutil.copyfile(example, target)
    backend, frontend = targets[0][0], targets[1][0]
    for name, value in {"DATABASE_URL": connection, "SUPABASE_URL": project_url.rstrip("/"),
                        "SUPABASE_SECRET_KEY": secret}.items():
        set_key(backend, name, value, quote_mode="always")
    set_key(frontend, "VITE_SUPABASE_URL", project_url.rstrip("/"), quote_mode="always")
    if public_key:
        set_key(frontend, "VITE_SUPABASE_PUBLISHABLE_KEY", public_key, quote_mode="always")


def main() -> int:
    if not sys.stdin.isatty():
        print("Run this command in your own interactive terminal. Credentials must not be sent through chat or command arguments.")
        return 1
    print("No credentials will be echoed. This only updates Git-ignored local env files; it does not create accounts or run migrations.")
    try:
        project = input("Supabase project API URL (public): ").strip()
        template = getpass("Connect > Session pooler URI template (leave [YOUR-PASSWORD] placeholder): ").strip()
        password = getpass("Database password (hidden): ")
        connection = database_url(template, password)
        secret = getpass("Backend secret key sb_secret_... (hidden): ").strip()
        public_key = getpass("Browser publishable key sb_publishable_... (optional, hidden): ").strip()
        write_configuration(project, connection, secret, public_key)
    except (ConfigurationError, OSError) as error:
        print(str(error) if isinstance(error, ConfigurationError) else "Could not update local configuration; check file permissions. Values were not printed.")
        return 1
    except (EOFError, KeyboardInterrupt):
        print("Private setup cancelled.")
        return 1
    print("Saved local backend configuration and public frontend settings. Restart servers, then run the connectivity/migration commands. No secret was copied into browser configuration.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
