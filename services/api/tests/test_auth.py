from time import time
from uuid import uuid4

from cryptography.hazmat.primitives.asymmetric import ec
import jwt
from jwt.exceptions import PyJWKClientConnectionError
import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import auth
from app.auth import provision_citizen_profile
from app.config import get_settings
from app.models import Profile, Role


def bearer(token):
    return {"Authorization": "Bearer " + token}


@pytest.mark.parametrize("algorithm", ["ES256", "RS256"])
def test_valid_signed_jwt_returns_own_profile(client, profiles, tokens, algorithm):
    user = profiles["citizen"]
    response = client.get("/api/me", headers=bearer(tokens(user.user_id, algorithm=algorithm)))
    assert response.status_code == 200
    assert response.json()["user_id"] == str(user.user_id)
    assert response.json()["role"] == "citizen"


@pytest.mark.parametrize("authorization", [None, "", "Basic abc", "Bearer", "Bearer not.a.jwt", "Bearer junk", "Bearer " + "a" * 17000])
def test_missing_or_malformed_tokens_rejected(client, authorization):
    response = client.get("/api/me", headers={} if authorization is None else {"Authorization": authorization})
    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"
    assert response.json()["detail"]["code"] == "INVALID_TOKEN"


@pytest.mark.parametrize("changes", [
    {"exp": int(time()) - 60}, {"iss": "https://wrong.invalid/auth/v1"},
    {"aud": "wrong"}, {"role": "service_role"}, {"role": "anon"},
    {"is_anonymous": True}, {"sub": "not-a-uuid"}, {"session_id": "invalid"},
    {"iat": int(time()) + 3600}, {"nbf": int(time()) + 3600},
    {"exp": float("inf")}, {"iat": float("inf")}, {"nbf": float("inf")},
])
def test_invalid_claims_rejected(client, profiles, tokens, changes):
    token = tokens(profiles["citizen"].user_id, **changes)
    assert client.get("/api/me", headers=bearer(token)).status_code == 401


@pytest.mark.parametrize("claim", ["sub", "iss", "aud", "exp", "iat", "role"])
def test_required_claims_cannot_be_omitted(client, profiles, tokens, claim):
    response = client.get("/api/me", headers=bearer(tokens(profiles["citizen"].user_id, remove=[claim])))
    assert response.status_code == 401


def test_invalid_signature_unknown_kid_and_unsigned_tokens_rejected(client, profiles, tokens):
    user_id = profiles["citizen"].user_id
    wrong_key = ec.generate_private_key(ec.SECP256R1())
    for token in [tokens(user_id, key=wrong_key), tokens(user_id, kid="unknown"),
                  jwt.encode({"sub": str(user_id)}, key="", algorithm="none", headers={"kid": "test-ec"}),
                  jwt.encode({"sub": str(user_id)}, "x" * 64, algorithm="HS256", headers={"kid": "test-ec"})]:
        assert client.get("/api/me", headers=bearer(token)).status_code == 401


def test_first_authenticated_request_provisions_citizen_profile(client, db_session, tokens):
    user_id = uuid4()

    response = client.get("/api/me", headers=bearer(tokens(user_id)))

    assert response.status_code == 200
    assert response.json() == {
        "user_id": str(user_id),
        "name": "Citizen",
        "role": "citizen",
        "state": None,
        "occupation": None,
    }
    profile = db_session.get(Profile, user_id)
    assert profile is not None and profile.role == Role.CITIZEN


def test_existing_profile_is_returned_without_overwrite(client, db_session, profiles, tokens):
    officer = profiles["officer"]

    response = client.get("/api/me", headers=bearer(tokens(officer.user_id)))

    assert response.status_code == 200
    assert response.json()["name"] == officer.name
    assert response.json()["role"] == "officer"
    assert db_session.get(Profile, officer.user_id).role == Role.OFFICER


def test_repeated_first_login_requests_do_not_duplicate_profile(client, db_session, tokens):
    user_id = uuid4()
    headers = bearer(tokens(user_id))

    first = client.get("/api/me", headers=headers)
    second = client.get("/api/me", headers=headers)

    assert first.status_code == second.status_code == 200
    assert first.json() == second.json()
    assert db_session.scalar(select(func.count()).select_from(Profile).where(Profile.user_id == user_id)) == 1


def test_concurrent_profile_creation_keeps_authoritative_officer_role(db_session, monkeypatch):
    user_id = uuid4()
    original_commit = Session.commit
    competing_insert = False

    def commit_with_admin_insert(session):
        nonlocal competing_insert
        if session is db_session and not competing_insert:
            competing_insert = True
            with Session(db_session.get_bind()) as admin_session:
                admin_session.add(Profile(user_id=user_id, name="Admin Officer", role=Role.OFFICER))
                original_commit(admin_session)
        return original_commit(session)

    monkeypatch.setattr(Session, "commit", commit_with_admin_insert)
    profile = provision_citizen_profile(db_session, user_id)

    assert competing_insert
    assert profile.name == "Admin Officer"
    assert profile.role == Role.OFFICER
    assert db_session.scalar(select(func.count()).select_from(Profile).where(Profile.user_id == user_id)) == 1


def test_frontend_and_user_metadata_cannot_escalate_role(client, profiles, tokens):
    token = tokens(profiles["citizen"].user_id, user_metadata={"role": "officer"}, app_metadata={"role": "officer"})
    response = client.get("/api/me?role=officer", headers={**bearer(token), "X-Role": "officer"})
    assert response.status_code == 200
    assert response.json()["role"] == "citizen"


def test_new_user_cannot_provision_or_request_officer_role(client, db_session, tokens):
    user_id = uuid4()
    token = tokens(user_id, user_metadata={"role": "officer"}, app_metadata={"role": "officer"})
    headers = {**bearer(token), "X-Role": "officer"}

    profile = client.get("/api/me?role=officer", headers=headers)
    officer_action = client.patch(
        f"/api/officer/complaints/{uuid4()}",
        json={"status": "UNDER_REVIEW"},
        headers=headers,
    )

    assert profile.status_code == 200
    assert profile.json()["role"] == "citizen"
    assert officer_action.status_code == 403
    assert db_session.get(Profile, user_id).role == Role.CITIZEN


def test_jwks_outage_is_retryable_not_an_auth_bypass(client, profiles, tokens, monkeypatch):
    token = tokens(profiles["citizen"].user_id)

    class Unavailable:
        def get_signing_key(self, kid):
            raise PyJWKClientConnectionError("private upstream details")

    monkeypatch.setattr(auth, "get_jwks_client", lambda: Unavailable())
    response = client.get("/api/me", headers=bearer(token))
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "AUTH_UNAVAILABLE"
    assert "private" not in response.text


def test_missing_auth_config_fails_closed(client, profiles, tokens, monkeypatch):
    token = tokens(profiles["citizen"].user_id)
    monkeypatch.delenv("SUPABASE_URL")
    get_settings.cache_clear()
    response = client.get("/api/me", headers=bearer(token))
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "AUTH_NOT_CONFIGURED"
