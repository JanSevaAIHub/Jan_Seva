"""Eligibility evidence must correspond to real stored reviewed conditions."""
from copy import deepcopy

import pytest

from app.ai.eligibility import EligibilityProfile, evaluate_eligibility
from test_eligibility import MATCH, stored


@pytest.mark.parametrize("damage", ["http", "foreign_host", "host_suffix", "credentials", "fragment",
    "missing_date", "invalid_date", "empty_title", "missing_evidence", "changed_url", "changed_rule_excerpt",
    "wrong_kind", "unknown_version", "malformed_rules"])
def test_citation_metadata_cannot_support_an_assessment_when_invalid(damage):
    scheme = stored()
    scheme.rules_json = deepcopy(scheme.rules_json)
    urls = {"http": "http://www.pib.gov.in/", "foreign_host": "https://example.com/",
        "host_suffix": "https://pib.gov.in.attacker.test/", "credentials": "https://user:secret@pib.gov.in/",
        "fragment": scheme.source_url + "#unreviewed"}
    if damage in urls: scheme.source_url = urls[damage]
    if damage == "missing_date": scheme.reviewed_at = None
    if damage == "invalid_date": scheme.reviewed_at = "unreviewed"
    if damage == "empty_title": scheme.title = "   "
    if damage == "missing_evidence": scheme.rules_json.pop("evidence_text")
    if damage == "changed_url": scheme.rules_json["evidence_text"] = scheme.rules_json["evidence_text"].replace(scheme.source_url, "https://labour.gov.in/")
    if damage == "changed_rule_excerpt": scheme.rules_json["eligibility_rules"][0]["evidence"] = "An invented criterion absent from reviewed source text."
    if damage == "wrong_kind": scheme.rules_json["evidence_kind"] = "model_guess"
    if damage == "unknown_version": scheme.rules_json["rules_version"] = 2
    if damage == "malformed_rules": scheme.rules_json["eligibility_rules"] = [None]
    result = evaluate_eligibility(scheme, EligibilityProfile(**MATCH))
    assert result.status == "NEEDS_INFO" and result.reasons
    assert not result.citations and not result.matched_rules


def test_every_citation_contains_exact_stored_evidence_and_identity():
    scheme = stored()
    result = evaluate_eligibility(scheme, EligibilityProfile(**MATCH))
    assert result.citations
    for citation in result.citations:
        assert citation.scheme_id == scheme.id and citation.title == scheme.title
        assert citation.url == scheme.source_url and citation.reviewed_at == scheme.reviewed_at
        assert citation.excerpt in scheme.rules_json["evidence_text"]
