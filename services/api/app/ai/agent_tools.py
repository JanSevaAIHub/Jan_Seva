"""Read-only adapters. Developer B owns complaint analysis and every mutation."""
from uuid import UUID

from app.ai.agent_schemas import ComplaintDraft
from app.ai.complaint_analysis import analyze_text
from app.ai.eligibility import EligibilityProfile, evaluate_eligibility
from app.ai.rag import answer_question
from app.ai.scheme_schemas import SchemeAsk, SchemeProfile
from app.models import Profile, Scheme
from app.routers.complaints import list_complaints
from app.schemas import ComplaintDetail
from app.ai.assistant import analyze_complaint as analyze_civic_problem
from app.ai.provider import ProviderError
from app.config import ConfigurationError


def search_schemes(db, request, answer_service=answer_question):
    profile = request.profile
    return answer_service(db, SchemeAsk(message=request.message,
        profile=SchemeProfile(state=profile.state, occupation=profile.occupation) if profile else None))


def check_eligibility(db, scheme_id: UUID, profile: EligibilityProfile | None):
    scheme = db.get(Scheme, scheme_id)
    return evaluate_eligibility(scheme, profile or EligibilityProfile()) if scheme is not None else None


def analyze_complaint(db, request, verified_user_id=None):
    supplied = request.complaint or ComplaintDraft()
    result = analyze_text(db, supplied.title, supplied.description or request.message,
                          supplied.locality, verified_user_id)
    return {"available": True, "detail": result["notice"], **result}


def draft_complaint(request, advice=None) -> ComplaintDraft:
    # An editable copy of supplied text, not a fabricated/generated complaint.
    supplied = request.complaint or ComplaintDraft()
    return ComplaintDraft(title=supplied.title, description=supplied.description or (advice['draft'] if advice else request.message),
        category=supplied.category or (advice['category'] if advice else None), locality=supplied.locality)


def get_my_complaints(db, verified_user_id: UUID | None):
    if verified_user_id is None:
        return None
    user = db.get(Profile, verified_user_id)
    if user is None:
        return None
    # Reuse the existing route's server-owned role/ownership/assignment scope.
    records = list_complaints(status=None, user=user, db=db, limit=10, offset=0)
    return [ComplaintDetail.model_validate(row) for row in records[:10]]


def optional_ai_advice(request):
    supplied=request.complaint or ComplaintDraft()
    try:
        return {'available':True,'advice':analyze_civic_problem(supplied.title or 'Citizen civic issue',supplied.description or request.message,supplied.locality or 'Not provided')}
    except (ConfigurationError,ProviderError,TimeoutError):
        return {'available':False,'detail':'Complaint AI is unavailable. Your supplied text is retained.'}
