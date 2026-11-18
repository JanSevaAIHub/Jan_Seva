"""Public/read-only agent; verified tokens alone authorize private tools."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.ai.agent import run_agent
from app.ai.agent_schemas import AgentMessage, AgentResponse
from app.auth import bearer, get_verified_user_id
from app.db import get_db
from app.routers.schemes import model_request_budget

router = APIRouter(prefix="/agent", tags=["agent"])


def optional_verified_identity(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> UUID | None:
    return get_verified_user_id(credentials) if credentials is not None else None


@router.post("/message", response_model=AgentResponse, dependencies=[Depends(model_request_budget)])
def message(request: AgentMessage, user_id: UUID | None = Depends(optional_verified_identity), db: Session = Depends(get_db)):
    result = run_agent(db, request, user_id)
    if result.status == "unavailable":
        raise HTTPException(503, detail={"code": "AGENT_TOOLS_UNAVAILABLE", "message": "The scheme tools are unavailable. No supported answer was confirmed. Please retry."})
    return result
