"""Stored-rule eligibility, including abstention and public API boundaries."""
from copy import deepcopy
from uuid import uuid4

import pytest

from app.ai.corpus import read_corpus
from app.ai.eligibility import EligibilityProfile, evaluate_eligibility
from app.models import Scheme


def stored(slug="pm-sym"):
    records, failures = read_corpus()
    assert not failures
    r = next(r for r in records if r.slug == slug)
    return Scheme(id=r.id, title=r.title, state=r.state, category=r.category,
                  description=r.description, source_url=r.source_url,
                  reviewed_at=r.reviewed_at, rules_json=r.rules())


MATCH = dict(age=25, monthly_income=15000, unorganised_worker=True,
             epf_esic_nps=False, income_taxpayer=False, other_government_pension=False)


@pytest.mark.parametrize("patch,status,missing", [
    ({}, "POTENTIAL", []),
    ({"age": 17}, "NOT_MATCHED", []),
    ({"age": None}, "NEEDS_INFO", ["age"]),
    ({"monthly_income": None}, "NEEDS_INFO", ["monthly_income"]),
    ({"age": 18}, "POTENTIAL", []),
    ({"age": 40}, "POTENTIAL", []),
    ({"age": 41}, "NOT_MATCHED", []),
    ({"monthly_income": 15001}, "NOT_MATCHED", []),
    ({"income_taxpayer": True}, "NOT_MATCHED", []),
    ({"epf_esic_nps": True}, "NOT_MATCHED", []),
    ({"unorganised_worker": None}, "NEEDS_INFO", ["unorganised_worker"]),
    ({"age": 17, "monthly_income": None}, "NOT_MATCHED", ["monthly_income"]),
])
def test_combined_conditions_and_boundaries(patch, status, missing):
    result = evaluate_eligibility(stored(), EligibilityProfile(**(MATCH | patch)))
    assert result.status == status and result.missing_fields == missing
    assert result.reasons and result.citations


@pytest.mark.parametrize("profile,status,missing", [
    ({"age": 60, "bpl_household": True}, "NEEDS_INFO", ["state"]),
    ({"age": 60, "bpl_household": True, "state": "Punjab"}, "NEEDS_INFO", []),
    ({"age": 20, "bpl_household": False, "state": "Punjab"}, "NEEDS_INFO", []),
    ({"age": 60, "bpl_household": True, "state": "Unknown"}, "NEEDS_INFO", ["state"]),
    ({"age": 60, "bpl_household": True, "state": " ladakh "}, "POTENTIAL", []),
])
def test_source_coverage_state(profile, status, missing):
    result = evaluate_eligibility(stored("ignoaps"), EligibilityProfile(**profile))
    assert result.status == status and result.missing_fields == missing


def test_missing_occupation_does_not_infer_artisan_trade():
    result = evaluate_eligibility(stored("pm-vishwakarma"), EligibilityProfile(age=22))
    assert result.status == "NEEDS_INFO" and "occupation" in result.missing_fields


@pytest.mark.parametrize("damage", ["source", "review", "rules", "evidence", "empty", "version"])
def test_untrusted_or_incomplete_stored_rules_abstain(damage):
    scheme = stored()
    scheme.rules_json = deepcopy(scheme.rules_json)
    if damage == "source": scheme.source_url = "https://example.com"
    if damage == "review": scheme.reviewed_at = None
    if damage == "rules": scheme.rules_json["eligibility_rules"][0]["op"] = "execute"
    if damage == "evidence": scheme.rules_json["eligibility_rules"][0]["evidence"] = "Invented condition"
    if damage == "empty": scheme.rules_json["eligibility_rules"] = []
    if damage == "version": scheme.rules_json["rules_version"] = 999
    result = evaluate_eligibility(scheme, EligibilityProfile(**MATCH))
    assert result.status == "NEEDS_INFO" and result.reasons
    assert result.matched_rules == []


def test_legacy_prose_only_is_not_approval():
    scheme = stored()
    scheme.rules_json = {"eligibility": "Existing prose"}
    assert evaluate_eligibility(scheme, EligibilityProfile(**MATCH)).status == "NEEDS_INFO"


def test_free_text_presence_alone_cannot_approve_a_notified_trade():
    scheme = stored("pm-vishwakarma")
    scheme.rules_json = deepcopy(scheme.rules_json)
    scheme.rules_json["unmodeled_conditions"] = []
    result = evaluate_eligibility(scheme, EligibilityProfile(age=22, occupation="Student"))
    assert result.status == "NEEDS_INFO"


@pytest.mark.parametrize("slug,profile", [
    ("pmsby", {"age": 70, "participating_account": True, "auto_debit_consent": True}),
    ("ignwps", {"state": "Ladakh", "age": 40, "widow": True, "bpl_household": True}),
    ("igndps", {"state": "Ladakh", "age": 18, "disability_percent": 80, "bpl_household": True}),
])
def test_other_scheme_rules_are_executable(slug, profile):
    assert evaluate_eligibility(stored(slug), EligibilityProfile(**profile)).status == "POTENTIAL"


def test_api_uses_database_scheme_and_returns_citations(client, db_session):
    scheme = stored()
    db_session.add(scheme)
    db_session.commit()
    response = client.post("/api/schemes/eligibility", json={"scheme_id": str(scheme.id), "profile": MATCH})
    assert response.status_code == 200
    data = response.json()
    assert data["scheme_id"] == str(scheme.id) and data["status"] == "POTENTIAL"
    assert data["matched_rules"] and data["citations"][0]["url"] == scheme.source_url
    assert "not guaranteed" in " ".join(data["reasons"])


@pytest.mark.parametrize("profile", [{"age": -1}, {"age": 151}, {"age": "22"}, {"age": True},
    {"age": 22.5}, {"monthly_income": -1}, {"income_taxpayer": "false"}, {"invented": True}])
def test_invalid_profile(client, profile):
    response = client.post("/api/schemes/eligibility", json={"scheme_id": str(uuid4()), "profile": profile})
    assert response.status_code == 422


def test_missing_and_invalid_id(client):
    assert client.post("/api/schemes/eligibility", json={"scheme_id": str(uuid4()), "profile": {}}).status_code == 404
    assert client.post("/api/schemes/eligibility", json={"scheme_id": "S001", "profile": {}}).status_code == 422


def test_database_configuration_unavailable(monkeypatch):
    from fastapi.testclient import TestClient
    from app.config import get_settings
    from app.db import get_engine
    from app.main import app
    monkeypatch.delenv("DATABASE_URL", raising=False)
    get_settings.cache_clear()
    get_engine.cache_clear()
    try:
        with TestClient(app) as client:
            response = client.post("/api/schemes/eligibility", json={"scheme_id": str(uuid4()), "profile": {}})
        assert response.status_code == 503
        assert response.json()["detail"]["code"] == "DATABASE_NOT_CONFIGURED"
    finally:
        get_settings.cache_clear()
        get_engine.cache_clear()


@pytest.mark.parametrize("patch,status,missing", [
    ({"age": None, "age_range": {"min": 18, "max": 40}}, "POTENTIAL", []),
    ({"age": None, "age_range": {"min": 16, "max": 17}}, "NOT_MATCHED", []),
    ({"age": None, "age_range": {"min": 16, "max": 20}}, "NEEDS_INFO", ["age"]),
    ({"age": None, "age_range": {"min": 40, "max": 42}}, "NEEDS_INFO", ["age"]),
    ({"monthly_income": None, "monthly_income_range": {"min": 0, "max": 15000}}, "POTENTIAL", []),
    ({"monthly_income": None, "monthly_income_range": {"min": 15001, "max": 20000}}, "NOT_MATCHED", []),
    ({"monthly_income": None, "monthly_income_range": {"min": 10000, "max": 20000}}, "NEEDS_INFO", ["monthly_income"]),
    ({"age": 17, "monthly_income": None, "monthly_income_range": {"min": 10000, "max": 20000}}, "NOT_MATCHED", ["monthly_income"]),
])
def test_ranges_never_infer_a_match_across_a_boundary(patch, status, missing):
    result = evaluate_eligibility(stored(), EligibilityProfile(**(MATCH | patch)))
    assert result.status == status and result.missing_fields == missing


@pytest.mark.parametrize("profile", [{"age_range": {"min": 40, "max": 18}},
    {"age": 22, "age_range": {"min": 18, "max": 40}},
    {"age_range": {"min": "18", "max": 40}},
    {"monthly_income_range": {"min": -1, "max": 5000}}])
def test_invalid_or_conflicting_ranges(client, profile):
    assert client.post("/api/schemes/eligibility", json={"scheme_id": str(uuid4()), "profile": profile}).status_code == 422
