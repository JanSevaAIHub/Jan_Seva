"""LOCAL TEST SERVER ONLY: real FastAPI routes/storage with a fake Auth provider.

No test hooks are installed by app.main. Never use this entrypoint for deployment.
The temporary SQLite database and provider identities disappear on exit.
"""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
import os
import secrets
from tempfile import TemporaryDirectory
from time import time
from uuid import UUID, uuid4, uuid5

from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import jwt
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session
import uvicorn

os.environ["SUPABASE_URL"] = "http://127.0.0.1:8765"
os.environ["CORS_ORIGINS"] = "http://127.0.0.1:5174"
os.environ["EMBEDDING_MODEL"] = "isolated-e2e-no-network"
os.environ["EMBEDDING_DIMENSIONS"] = "3"
os.environ["OPENAI_API_KEY"] = ""
os.environ["LLM_MODEL"] = ""

from app.db import Base, get_db
from app.main import app
from app.models import CORE_TABLES, Profile, Role, Scheme, SchemeChunk
from app.ai.corpus import CHUNKING_VERSION, CORPUS, chunk_evidence, content_hash, read_corpus
from app.ai import retrieval
from app.ai.budget import ModelBudget
from app.routers import schemes

# Explicit TEST DOUBLE: bypass only the PostgreSQL catalog guard in isolated
# SQLite. With no provider key, the real retrieve() uses real stored-text lexical
# fallback. No fake embeddings, generated answers or synthetic schemes are used.
retrieval.prepare_vectors = lambda _db: None
schemes.model_budget = ModelBudget(per_client=100, total=300)

# The fake Auth endpoints also receive Supabase SDK headers (apikey, client info).
app.add_middleware(CORSMiddleware, allow_origins=["http://127.0.0.1:5174"],
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"], allow_headers=["*"])

key = ec.generate_private_key(ec.SECP256R1())
jwk = jwt.algorithms.ECAlgorithm.to_jwk(key.public_key(), as_dict=True)
jwk.update(alg="ES256", kid="isolated-e2e-key", use="sig")
identities = {email: {"id": str(uuid4()), "email": email, "name": name, "role": role}
    for email, name, role in [("arjun@example.test", "Arjun Mishra", Role.CITIZEN),
                               ("singh@example.test", "R. Singh", Role.OFFICER)]}
os.environ["DEMO_CITIZEN_USER_ID"] = identities["arjun@example.test"]["id"]
os.environ["DEMO_OFFICER_USER_ID"] = identities["singh@example.test"]["id"]
password = os.environ["E2E_AUTH_PASSWORD"]
refresh_tokens = {}


@asynccontextmanager
async def lifespan(_app):
    with TemporaryDirectory(prefix="janseva-e2e-") as directory:
        engine = create_engine(f"sqlite:///{directory}/complaints.db", connect_args={"check_same_thread": False})

        @event.listens_for(engine, "connect")
        def constraints(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")

        Base.metadata.create_all(engine, tables=CORE_TABLES)
        with engine.begin() as db:
            db.execute(text("ALTER TABLE scheme_chunks ADD COLUMN is_current BOOLEAN NOT NULL DEFAULT true"))
            db.execute(text("ALTER TABLE scheme_chunks ADD COLUMN source_metadata JSON NOT NULL DEFAULT '{}'"))
        with Session(engine) as db:
            db.add_all([Profile(user_id=UUID(user["id"]), name=user["name"], role=user["role"]) for user in identities.values()])
            # Real reviewed schemes and chunks exercise listing, lexical fallback,
            # eligibility and citations through actual API routes and SQLite rows.
            records, failures = read_corpus()
            assert not failures
            db.add_all([Scheme(id=r.id, title=r.title, category=r.category, state=r.state,
                description=r.description, source_url=r.source_url, rules_json=r.rules(),
                reviewed_at=r.reviewed_at) for r in records])
            db.flush()
            for record in records:
                db.add_all([SchemeChunk(id=uuid5(record.id, f"{CORPUS}:{CHUNKING_VERSION}:{content_hash(chunk)}"),
                    scheme_id=record.id, chunk_text=chunk, source_url=record.source_url)
                    for chunk in chunk_evidence(record.evidence_text)])
            db.commit()

        def database():
            with Session(engine, expire_on_commit=False) as db:
                try:
                    yield db
                except Exception:
                    db.rollback()
                    raise

        app.dependency_overrides[get_db] = database
        try:
            yield
        finally:
            app.dependency_overrides.clear()
            engine.dispose()


app.router.lifespan_context = lifespan


@app.get("/auth/v1/.well-known/jwks.json")
def keys():
    return {"keys": [jwk]}


@app.post("/auth/v1/token")
async def login(request: Request):
    data = await request.json()
    if request.query_params.get("grant_type") == "refresh_token":
        user = refresh_tokens.get(data.get("refresh_token"))
    else:
        user = identities.get(data.get("email"))
        if not secrets.compare_digest(data.get("password", ""), password):
            user = None
    if not user:
        return JSONResponse(status_code=400, content={"error": "invalid_grant", "error_description": "Invalid test credentials"})
    now = int(time())
    token = jwt.encode({"sub": user["id"], "iss": "http://127.0.0.1:8765/auth/v1", "aud": "authenticated",
        "iat": now - 1, "exp": now + 3600, "role": "authenticated", "is_anonymous": False,
        "session_id": str(uuid4())}, key, algorithm="ES256", headers={"kid": "isolated-e2e-key"})
    refresh = secrets.token_urlsafe(32)
    refresh_tokens[refresh] = user
    return {"access_token": token, "refresh_token": refresh, "token_type": "bearer", "expires_in": 3600,
        "expires_at": now + 3600, "user": {"id": user["id"], "email": user["email"], "aud": "authenticated",
        "role": "authenticated", "created_at": datetime.now(timezone.utc).isoformat(), "app_metadata": {}, "user_metadata": {}}}


@app.post("/auth/v1/logout", status_code=204)
def logout():
    return None


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8765)
