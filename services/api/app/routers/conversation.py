"""Assistant tools only return information; mutation endpoints remain explicit."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import Field

from app.ai.assistant import analyze_complaint, classify_intent
from app.ai.provider import ProviderError
from app.ai.rag import answer_question
from app.ai.scheme_schemas import SchemeAsk, SchemeProfile
from app.config import ConfigurationError
from app.db import get_db
from app.routers.schemes import model_request_budget
from app.schemas import APIModel
from contextlib import contextmanager

router = APIRouter(prefix="/agent", tags=["assistant"])


class ChatTurn(APIModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=5000)


class AgentMessage(APIModel):
    message: str = Field(min_length=3, max_length=1000)
    history: list[ChatTurn] = Field(default_factory=list, max_length=10)
    profile: SchemeProfile | None = None


def ai_unavailable(error):
    message = "AI assistance is not configured. Keep editing your draft and retry later." if isinstance(error, ConfigurationError) else "The AI provider is unavailable. Your draft is kept; please retry."
    return HTTPException(503, detail={"code": "AI_NOT_CONFIGURED" if isinstance(error, ConfigurationError) else "AI_UNAVAILABLE", "message": message})


@router.post("/conversation", dependencies=[Depends(model_request_budget)])
def agent_message(data: AgentMessage):
    intent = classify_intent(data.message, data.history)
    response = {"intent": intent, "answer": "", "citations": [], "tool_trace": [], "mode": "clarification", "complaint": None}
    if intent == "unknown":
        response["answer"] = "Would you like help finding a government scheme or drafting a civic complaint? Please name the scheme or describe the local issue."
        return response
    parts, errors = [], []
    if intent in ("scheme", "mixed"):
        try:
            with contextmanager(get_db)() as db:
                reply = answer_question(db, SchemeAsk(message=data.message, profile=data.profile,
                    history=[turn.content[:1000] for turn in data.history if turn.role == 'user'][-5:]))
            response.update(citations=[c.model_dump(mode="json") for c in reply.citations],
                tool_trace=[t.model_dump() for t in reply.tool_trace], mode=reply.mode)
            parts.append("Scheme information\n" + reply.answer)
        except HTTPException as error:
            errors.append(error)
            response['tool_trace'].append({"tool": "scheme_retrieval", "status": "error", "detail": "Scheme information unavailable; retry this part."})
        except (ConfigurationError, ProviderError) as error:
            errors.append(ai_unavailable(error))
    if intent in ("complaint", "mixed"):
        try:
            advice = analyze_complaint("Citizen's civic issue", data.message, "Not provided")
            response["complaint"] = advice
            response["tool_trace"].append({"tool": "complaint_analysis", "status": "ok", "detail": "Read-only editable advice; no complaint created."})
            parts.append(f"Complaint suggestion ({advice['category']})\n{advice['draft']}\n\n{advice['department']}\n{advice['next_action']}\n{advice['notice']}")
            if not response['citations']:
                response["mode"] = "ai_suggestion"
        except (ConfigurationError, ProviderError) as error:
            errors.append(ai_unavailable(error))
            response["tool_trace"].append({"tool": "complaint_analysis", "status": "error", "detail": "Retry the unavailable part; nothing was submitted."})
    if errors and not parts:
        raise errors[0]
    for error in errors:
        parts.append("Part of this request is unavailable: " + error.detail["message"])
    response["answer"] = "\n\n".join(parts)
    return response
