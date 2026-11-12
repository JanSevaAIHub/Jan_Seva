"""Compatibility adapter: the form and agent share Developer B's classifier."""
from app.ai.complaint_classifier import analyze_complaint_submission
from app.schemas import ComplaintAnalyzeRequest


def analyze_text(db, title, description, locality, verified_user_id=None):
    request = ComplaintAnalyzeRequest(title=title, description=description, locality=locality or '')
    return analyze_complaint_submission(db, request, verified_user_id=verified_user_id).model_dump(mode='json')
