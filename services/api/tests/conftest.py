"""Isolated SQLite storage and a local JWKS server; no real provider credentials."""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from threading import Thread
from time import time
from uuid import uuid4

from cryptography.hazmat.primitives.asymmetric import ec, rsa
from fastapi.testclient import TestClient
import jwt
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from app.auth import get_jwks_client
from app.config import get_settings
from app.db import Base, get_db
from app.main import app
from app.models import CORE_TABLES, Profile, Role


@pytest.fixture
def db_session(tmp_path):
    engine = create_engine(f"sqlite:///{(tmp_path / 'isolated.db').as_posix()}", connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine, tables=CORE_TABLES)
    with Session(engine, expire_on_commit=False) as session:
        yield session
    engine.dispose()


@pytest.fixture
def profiles(db_session):
    records = {
        "citizen": Profile(user_id=uuid4(), name="Test Citizen", role=Role.CITIZEN),
        "other_citizen": Profile(user_id=uuid4(), name="Other Test Citizen", role=Role.CITIZEN),
        "officer": Profile(user_id=uuid4(), name="Test Officer", role=Role.OFFICER),
        "other_officer": Profile(user_id=uuid4(), name="Other Test Officer", role=Role.OFFICER),
    }
    db_session.add_all(records.values())
    db_session.commit()
    return records


@pytest.fixture(scope="session")
def signing_server():
    ec_key = ec.generate_private_key(ec.SECP256R1())
    rsa_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    keys = []
    for key, algorithm, kid, adapter in [
        (ec_key, "ES256", "test-ec", jwt.algorithms.ECAlgorithm),
        (rsa_key, "RS256", "test-rsa", jwt.algorithms.RSAAlgorithm),
    ]:
        jwk = adapter.to_jwk(key.public_key(), as_dict=True)
        jwk.update(alg=algorithm, kid=kid, use="sig")
        keys.append(jwk)

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path != "/auth/v1/.well-known/jwks.json":
                self.send_error(404)
                return
            data = json.dumps({"keys": keys}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(data)

        def log_message(self, *_):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield {"url": f"http://127.0.0.1:{server.server_port}", "ES256": ec_key, "RS256": rsa_key}
    server.shutdown()
    server.server_close()
    thread.join()


@pytest.fixture
def tokens(monkeypatch, signing_server):
    monkeypatch.setenv("SUPABASE_URL", signing_server["url"])
    get_settings.cache_clear()
    get_jwks_client.cache_clear()

    def make_token(user_id, *, algorithm="ES256", key=None, kid=None, remove=(), **claims):
        now = int(time())
        payload = {
            "sub": str(user_id), "iss": signing_server["url"] + "/auth/v1",
            "aud": "authenticated", "exp": now + 300, "iat": now - 1,
            "role": "authenticated", "is_anonymous": False, "session_id": str(uuid4()),
        }
        payload.update(claims)
        for name in remove:
            payload.pop(name, None)
        return jwt.encode(payload, key or signing_server[algorithm], algorithm=algorithm,
                          headers={"kid": kid or ("test-ec" if algorithm == "ES256" else "test-rsa")})

    yield make_token
    get_jwks_client.cache_clear()
    get_settings.cache_clear()


@pytest.fixture
def client(db_session):
    def override_db():
        yield db_session

    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_db, None)
