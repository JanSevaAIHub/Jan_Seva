"""Public, read-only scheme discovery from the real database and pgvector."""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ai.corpus import official_url
from app.ai.eligibility import EligibilityRequest, EligibilityResult, evaluate_eligibility
from app.ai.budget import ModelBudget
from app.ai.provider import ProviderError
from app.ai.rag import answer_question
from app.ai.retrieval import retrieve
from app.ai.scheme_schemas import SchemeAnswer, SchemeAsk, SchemeCard
from app.config import ConfigurationError
from app.db import get_db
from app.models import Scheme

router = APIRouter(prefix="/schemes", tags=["schemes"])
model_budget = ModelBudget()


@router.post("/eligibility", response_model=EligibilityResult)
def check_eligibility(request: EligibilityRequest, db: Session = Depends(get_db)):
    scheme = db.get(Scheme, request.scheme_id)
    if scheme is None:
        raise HTTPException(404, detail={"code": "SCHEME_NOT_FOUND", "message": "Scheme was not found."})
    return evaluate_eligibility(scheme, request.profile)


def model_request_budget(request: Request):
    # Plain stored-record listing incurs no model usage and remains available.
    if request.method == "GET" and "query" not in request.query_params:
        yield
        return
    client = request.client.host if request.client else "unknown"
    with model_budget.reserve(client):
        yield


def card(scheme: Scheme) -> SchemeCard:
    rules = scheme.rules_json
    return SchemeCard.model_validate({**{name: getattr(scheme, name) for name in
        ("id", "title", "category", "state", "description", "source_url", "rules_json", "reviewed_at")},
        "eligibility": rules.get("eligibility", "Eligibility details have not been curated for this record."),
        "required_documents": rules.get("required_documents", []),
        "evidence_text": rules.get("evidence_text", "No reviewed source passage is stored for this record."),
        "evidence_kind": rules.get("evidence_kind", "not_reviewed"),
        "document_note": rules.get("document_note", "Document requirements are not verified.")})


def unavailable(error):
    if isinstance(error, ConfigurationError):
        return HTTPException(503, detail={"code": "RAG_NOT_CONFIGURED", "message": str(error)})
    return HTTPException(503, detail={"code": "MODEL_UNAVAILABLE", "message": "The embedding service is temporarily unavailable. Please retry."})


@router.get("", response_model=list[SchemeCard], dependencies=[Depends(model_request_budget)])
def list_schemes(response: Response, query: str | None = Query(default=None, min_length=3, max_length=1000),
                  state: str | None = Query(default=None, min_length=2, max_length=100),
                  category: str | None = Query(default=None, min_length=2, max_length=100),
                  limit: int = Query(default=10, ge=1, le=50), db: Session = Depends(get_db)):
    if query is not None:
        if len(query.strip()) < 3:
            raise HTTPException(422, detail={"code": "INVALID_QUERY", "message": "Enter at least three non-whitespace characters."})
        try:
            passages = retrieve(db, query, state, category, limit=min(limit, 5))
        except (ConfigurationError, ProviderError) as error:
            raise unavailable(error) from None
        ids = list(dict.fromkeys(p.scheme_id for p in passages))
        response.headers["X-Scheme-Retrieval"] = getattr(passages, "method", "pgvector_cosine_retrieval")
        schemes = {s.id: s for s in db.scalars(select(Scheme).where(Scheme.id.in_(ids)))}
        return [card(schemes[id]) for id in ids if id in schemes]
    response.headers["X-Scheme-Retrieval"] = "stored_records"
    result = select(Scheme).order_by(Scheme.title).limit(limit)
    if state:
        result = result.where((func.lower(Scheme.state) == state.strip().lower()) | (Scheme.state == "National"))
    if category:
        result = result.where(func.lower(Scheme.category) == category.strip().lower())
    return [card(s) for s in db.scalars(result) if official_url(s.source_url)]


@router.post("/ask", response_model=SchemeAnswer, dependencies=[Depends(model_request_budget)])
def ask_scheme(request: SchemeAsk, db: Session = Depends(get_db)):
    try:
        return answer_question(db, request)
    except (ConfigurationError, ProviderError) as error:
        raise unavailable(error) from None
