"""Conservative, read-only suggestions; no provider or government-status claims."""
import re
from sqlalchemy import select
from app.models import Complaint

KEYWORDS = {
    'streetlight': {'streetlight', 'streetlights', 'lamp', 'lamps', 'lighting'},
    'road': {'pothole', 'potholes', 'road', 'roads', 'pavement'},
    'water': {'water', 'pipe', 'pipes', 'drain', 'drains', 'drainage', 'sewage', 'leaking'},
    'sanitation': {'garbage', 'waste', 'rubbish', 'trash', 'sanitation'},
}
DEPARTMENTS = {'streetlight': 'Local public-lighting authority', 'road': 'Local roads authority',
               'water': 'Local water or drainage authority', 'sanitation': 'Local sanitation authority',
               'other': 'Confirm the responsible authority for your locality'}
STOP = {'the', 'and', 'has', 'have', 'this', 'that', 'there', 'near', 'been', 'with', 'outside'}


def words(text):
    return {w for w in re.findall(r'[^\W_]+', text.casefold()) if len(w) > 2 and w not in STOP}


def analyze_text(db, title, description, locality, verified_user_id=None):
    terms = words(title + ' ' + description)
    scores = {category: len(terms & keys) for category, keys in KEYWORDS.items()}
    highest = max(scores.values())
    winners = [category for category, score in scores.items() if score == highest and score > 0]
    category = winners[0] if len(winners) == 1 else 'other'
    related = []
    if verified_user_id is not None and terms:
        # Never query another citizen's records, even when suggesting duplicates.
        rows = db.scalars(select(Complaint).where(Complaint.user_id == verified_user_id,
            Complaint.category == category).order_by(Complaint.created_at.desc(), Complaint.id).limit(50))
        for row in rows:
            if not locality.strip() or row.locality.strip().casefold() != locality.strip().casefold():
                continue
            previous = words(row.title + ' ' + row.description)
            overlap = len(terms & previous) / max(1, len(terms | previous))
            if overlap >= 0.65:
                related.append({'id': str(row.id), 'title': row.title,
                    'reason': 'Similar wording in one of your saved complaints at the same locality. Review it; this is not a confirmed duplicate.'})
            if len(related) == 3:
                break
    return {'category': category, 'description': description, 'suggested_department': DEPARTMENTS[category],
        'method': 'deterministic_keywords', 'related_complaints': related,
        'notice': 'Keyword suggestion only; edit the category and confirm the responsible authority. Your text is unchanged. Nothing was submitted.'}
