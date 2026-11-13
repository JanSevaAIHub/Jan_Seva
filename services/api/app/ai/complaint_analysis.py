"""Compatibility adapter: the form and agent share Developer B's classifier."""
from app.ai.complaint_classifier import analyze_complaint_submission
from app.ai.agent_schemas import ComplaintDraft


def analyze_text(db, title, description, locality, verified_user_id=None):
    # Agent proposals can be incomplete. Keep their validated text intact;
    # the public analysis and ticket-creation routes retain stricter inputs.
    request = ComplaintDraft(title=title, description=description, locality=locality or '')
    return analyze_complaint_submission(db, request, verified_user_id=verified_user_id).model_dump(mode='json')
