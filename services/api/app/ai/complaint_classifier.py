"""Civic complaint classification, department routing and duplicate ticket detection."""

import os
import re
from uuid import UUID
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Complaint, ComplaintCategory, InternalStatus
from app.schemas import (
    ComplaintAnalyzeRequest,
    ComplaintAnalyzeResponse,
    DuplicateComplaintMatch,
)

DEPT_MAP: dict[ComplaintCategory, str] = {
    ComplaintCategory.STREETLIGHT: "Urban Infrastructure Dept",
    ComplaintCategory.ROAD: "Roads & Transport Dept",
    ComplaintCategory.SANITATION: "Sanitation Dept",
    ComplaintCategory.WATER: "Water Supply Dept",
    ComplaintCategory.OTHER: "Municipal Grievance Cell",
}

URGENCY_KEYWORDS = {
    "urgent", "emergency", "danger", "dangerous", "hazardous", "hazard",
    "accident", "burst", "sparking", "shock", "overflowing", "critical",
    "severe", "fatal", "sinkhole", "flooding", "life-threatening", "exposed wire",
    "khatra", "emergency", "turant"
}

CATEGORY_KEYWORDS: dict[ComplaintCategory, dict[str, float]] = {
    ComplaintCategory.STREETLIGHT: {
        "streetlight": 3.5, "street light": 3.5, "street-light": 3.5, "lighting": 2.5,
        "lamp": 2.5, "lamppost": 3.0, "pole": 2.0, "light": 1.5, "darkness": 2.0,
        "dark": 1.5, "fused": 2.5, "sparking": 3.0, "bulb": 2.5, "illumination": 2.5,
        "wire": 1.5, "transformer": 2.5, "bijli": 2.5, "batti": 2.5, "andhera": 2.5,
        "led light": 3.0, "pole damaged": 3.0, "blackout": 2.5
    },
    ComplaintCategory.ROAD: {
        "pothole": 3.5, "potholes": 3.5, "road": 2.5, "roads": 2.5, "asphalt": 2.5,
        "tar": 2.0, "pavement": 2.5, "footpath": 2.5, "sidewalk": 2.5, "divider": 2.5,
        "speed breaker": 3.0, "crater": 2.5, "resurfacing": 3.0, "sadak": 3.5,
        "gaddha": 3.5, "traffic signal": 2.5, "traffic light": 2.5, "street surface": 2.5,
        "highway": 2.0, "flyover": 2.0, "broken pavement": 3.0, "broken road": 3.5
    },
    ComplaintCategory.WATER: {
        "water": 2.5, "pipeline": 3.5, "pipe": 2.5, "leakage": 3.0, "leaking": 3.0,
        "contamination": 3.0, "contaminated": 3.0, "sewer": 2.5, "sewage": 2.5,
        "drain": 2.0, "drainage": 2.0, "pressure": 2.5, "tap": 2.5, "paani": 3.5,
        "nal": 3.0, "drinking water": 3.5, "potable": 3.0, "dirty water": 3.5,
        "booster pump": 3.0, "motor": 2.0, "plumbing": 2.5, "tanker": 2.5, "water logging": 2.0
    },
    ComplaintCategory.SANITATION: {
        "garbage": 3.5, "waste": 2.5, "dump": 3.0, "dumping": 3.0, "rubbish": 2.5,
        "trash": 3.0, "dustbin": 3.0, "smell": 2.5, "stench": 3.0, "cleanliness": 2.5,
        "sweeper": 2.5, "safai": 3.5, "kachra": 3.5, "litter": 2.5, "stagnant": 2.5,
        "overflow": 2.0, "mosquito": 2.5, "debris": 2.5, "sanitation": 3.5,
        "foul smell": 3.0, "rotting": 2.5, "solid waste": 3.0, "drain blockage": 2.5
    },
    ComplaintCategory.OTHER: {
        "stray animal": 3.5, "dog": 2.5, "cow": 2.5, "cattle": 2.5, "park": 2.5,
        "tree": 2.5, "pruning": 2.5, "encroachment": 3.0, "vendor": 2.5, "noise": 2.5,
        "nuisance": 2.5, "tax": 2.5, "certificate": 2.5, "facility": 2.0,
        "amenity": 2.0, "building": 2.0, "illegal construction": 3.0, "playground": 2.0
    },
}

STOPWORDS = {
    "the", "and", "for", "with", "this", "that", "from", "near", "please",
    "help", "need", "needs", "area", "issue", "complaint", "there", "have",
    "synthetic", "demonstration", "only", "example", "fictional", "incident",
    "personal", "information", "about", "been", "being", "very", "much"
}


def _tokenize(text: str) -> set[str]:
    words = re.findall(r"[a-z0-9]{3,}", text.lower())
    return {w for w in words if w not in STOPWORDS}


def classify_text(text: str) -> tuple[ComplaintCategory, str, float, str, str]:
    """
    Classifies text into ComplaintCategory, department, confidence, urgency, mode.
    Returns: (category, department, confidence, urgency_level, mode)
    """
    lower = text.lower()

    # Determine urgency
    urgency = "High" if any(k in lower for k in URGENCY_KEYWORDS) else "Medium"

    # Score each category
    scores: dict[ComplaintCategory, float] = {cat: 0.0 for cat in ComplaintCategory}
    for cat, kw_dict in CATEGORY_KEYWORDS.items():
        for kw, weight in kw_dict.items():
            if kw in lower:
                scores[cat] += weight

    best_cat, top_score = max(scores.items(), key=lambda item: item[1])

    if top_score >= 4.0:
        confidence = 0.95
    elif top_score >= 2.5:
        confidence = 0.88
    elif top_score >= 1.0:
        confidence = 0.72
    else:
        best_cat = ComplaintCategory.OTHER
        confidence = 0.50

    department = DEPT_MAP[best_cat]
    return best_cat, department, confidence, urgency, "keyword_classifier"


def find_duplicates(
    db: Session,
    title: str,
    description: str,
    locality: str | None,
    category: ComplaintCategory,
    limit: int = 3,
) -> list[DuplicateComplaintMatch]:
    """
    Calculates semantic & textual similarity to find existing related/duplicate tickets.
    """
    target_title_tokens = _tokenize(title)
    target_desc_tokens = _tokenize(description)
    target_loc_clean = locality.lower().strip() if locality else ""

    # Fetch recent active complaints matching category
    query = (
        select(Complaint)
        .where(
            Complaint.category == category,
            Complaint.status != InternalStatus.RESOLVED,
        )
        .order_by(Complaint.created_at.desc())
        .limit(50)
    )
    candidates = db.scalars(query).all()
    if not candidates:
        # Also check all complaints if none active
        query_all = select(Complaint).where(Complaint.category == category).limit(50)
        candidates = db.scalars(query_all).all()

    matches: list[DuplicateComplaintMatch] = []
    for cand in candidates:
        cand_title_tokens = _tokenize(cand.title)
        cand_desc_tokens = _tokenize(cand.description)
        cand_loc_clean = cand.locality.lower().strip() if cand.locality else ""

        # Title similarity (Jaccard)
        t_union = len(target_title_tokens | cand_title_tokens)
        title_sim = (len(target_title_tokens & cand_title_tokens) / t_union) if t_union else 0.0

        # Description similarity (Jaccard)
        d_union = len(target_desc_tokens | cand_desc_tokens)
        desc_sim = (len(target_desc_tokens & cand_desc_tokens) / d_union) if d_union else 0.0

        # Locality match
        loc_match = 0.0
        if target_loc_clean and cand_loc_clean:
            if target_loc_clean == cand_loc_clean or target_loc_clean in cand_loc_clean or cand_loc_clean in target_loc_clean:
                loc_match = 1.0
            else:
                loc_tokens = _tokenize(target_loc_clean) & _tokenize(cand_loc_clean)
                if loc_tokens:
                    loc_match = 0.7

        # Composite similarity score
        # Locality match is crucial for civic grievances
        similarity = (title_sim * 0.45) + (desc_sim * 0.25) + (loc_match * 0.30)

        # High title overlap even without locality is significant
        if title_sim >= 0.65:
            similarity = max(similarity, title_sim * 0.9)

        if similarity >= 0.50:
            matches.append(
                DuplicateComplaintMatch(
                    id=cand.id,
                    title=cand.title,
                    locality=cand.locality,
                    category=cand.category,
                    status=cand.status,
                    similarity_score=round(similarity, 3),
                    created_at=cand.created_at,
                )
            )

    matches.sort(key=lambda m: m.similarity_score, reverse=True)
    return matches[:limit]


def analyze_complaint_submission(
    db: Session, request: ComplaintAnalyzeRequest
) -> ComplaintAnalyzeResponse:
    """End-to-end classification, department routing and duplicate search."""
    full_text = f"{request.title} {request.description}"
    category, department, confidence, urgency, mode = classify_text(full_text)

    duplicates = find_duplicates(
        db=db,
        title=request.title,
        description=request.description,
        locality=request.locality,
        category=category,
        limit=3,
    )

    return ComplaintAnalyzeResponse(
        category=category,
        department=department,
        confidence=confidence,
        urgency_level=urgency,  # type: ignore
        duplicates=duplicates,
        mode=mode,
    )

