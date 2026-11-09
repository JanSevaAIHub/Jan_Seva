"""Read-only adapters. Developer B owns complaint analysis and every mutation."""
from uuid import UUID

from app.ai.agent_schemas import ComplaintDraft
from app.ai.eligibility import EligibilityProfile, evaluate_eligibility
from app.ai.rag import answer_question
from app.ai.scheme_schemas import SchemeAsk, SchemeProfile
from app.models import Profile, Scheme
from app.routers.complaints import list_complaints
from app.schemas import ComplaintDetail


def search_schemes(db, request, answer_service=answer_question):
    profile = request.profile
    return answer_service(db, SchemeAsk(message=request.message,
        profile=SchemeProfile(state=profile.state, occupation=profile.occupation) if profile else None))


def check_eligibility(db, scheme_id: UUID, profile: EligibilityProfile | None):
    scheme = db.get(Scheme, scheme_id)
    return evaluate_eligibility(scheme, profile or EligibilityProfile()) if scheme is not None else None


def analyze_complaint(_db, _request):
    # No category classifier/analysis endpoint exists in this combined checkout.
    # This explicit capability result is the Developer B integration boundary.
    return {"available": False, "detail": "Complaint analysis is not implemented in this backend. No category, department or duplicate prediction was produced."}


def draft_complaint(request) -> ComplaintDraft:
    # An editable copy of supplied text, not a fabricated/generated complaint.
    supplied = request.complaint or ComplaintDraft()
    return ComplaintDraft(title=supplied.title, description=supplied.description or request.message,
        category=supplied.category, locality=supplied.locality)


def get_my_complaints(db, verified_user_id: UUID | None):
    if verified_user_id is None:
        return None
    user = db.get(Profile, verified_user_id)
    if user is None:
        return None
    # Reuse the existing route's server-owned role/ownership/assignment scope.
    records = list_complaints(status=None, user=user, db=db)
    return [ComplaintDetail.model_validate(row) for row in records[:10]]
