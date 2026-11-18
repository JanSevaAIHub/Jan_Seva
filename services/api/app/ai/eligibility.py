"""Deterministic evaluation of versioned, evidence-backed stored conditions."""
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field, ValidationError

from app.schemas import APIModel
from app.ai.scheme_rules import EligibilityProfile, RuleSet, UNKNOWN

FIELD_LABELS = {"age": "Age", "annual_income": "Annual income (INR)", "monthly_income": "Monthly income (INR)",
    "state": "State", "occupation": "Occupation", "disability_percent": "Disability percentage",
    "bpl_household": "Below-poverty-line household", "widow": "Widow status",
    "unorganised_worker": "Unorganised worker", "epf_esic_nps": "EPF, ESIC or NPS coverage",
    "income_taxpayer": "Income taxpayer", "other_government_pension": "Other government pension",
    "participating_account": "Participating bank or post-office account", "auto_debit_consent": "Auto-debit consent"}


def rule_label(rule):
    name = FIELD_LABELS[rule.field]
    value = "Yes" if rule.value is True else "No" if rule.value is False else (
        f"{rule.value:g}" if isinstance(rule.value, (float, int)) else rule.value)
    return {"gte": f"{name} must be at least {value}", "lte": f"{name} must be at most {value}",
        "eq": f"{name}: {value}", "present": f"Provide {name.lower()}",
        "coverage": f"Reviewed source coverage: {value}"}[rule.op]


class EligibilityRequest(APIModel):
    scheme_id: UUID
    profile: EligibilityProfile


class EligibilityCitation(APIModel):
    scheme_id: UUID
    title: str = Field(min_length=1)
    url: str
    reviewed_at: datetime
    excerpt: str
    evidence_kind: Literal["reviewed_paraphrase"] = "reviewed_paraphrase"


class EligibilityResult(APIModel):
    scheme_id: UUID
    status: Literal["POTENTIAL", "NOT_MATCHED", "NEEDS_INFO"]
    matched_rules: list[str] = Field(default_factory=list)
    missing_fields: list[str] = Field(default_factory=list)
    reasons: list[str] = Field(default_factory=list)
    citations: list[EligibilityCitation] = Field(default_factory=list)


def evaluate_eligibility(scheme, profile: EligibilityProfile) -> EligibilityResult:
    from app.ai.corpus import official_url
    result = EligibilityResult(scheme_id=scheme.id, status="NEEDS_INFO")
    rules = scheme.rules_json
    if not isinstance(rules, dict):
        result.reasons.append("Stored rule configuration is unavailable; official review is required.")
        return result
    evidence = rules.get("evidence_text")
    if (not isinstance(scheme.source_url, str) or not official_url(scheme.source_url)
        or not isinstance(scheme.reviewed_at, datetime) or not isinstance(evidence, str)
        or scheme.source_url not in evidence or rules.get("evidence_kind") != "reviewed_paraphrase"):
        result.reasons.append("Reviewed official source metadata is unavailable; no assessment can be made.")
        return result
    try:
        config = RuleSet.model_validate({key: rules.get(key) for key in RuleSet.model_fields})
        if not config.eligibility_rules:
            raise ValueError("No executable conditions")
        if any(rule.evidence not in evidence for rule in config.eligibility_rules):
            raise ValueError("Rule lacks evidence")
    except (ValidationError, ValueError, TypeError):
        result.reasons.append("Stored rules are incomplete or unsupported by reviewed evidence; official review is required.")
        return result
    try:
        result.citations = [EligibilityCitation(scheme_id=scheme.id, title=scheme.title,
            url=scheme.source_url, reviewed_at=scheme.reviewed_at, excerpt=excerpt)
            for excerpt in dict.fromkeys(r.evidence for r in config.eligibility_rules)]
    except ValidationError:
        result.reasons.append("Stored citation metadata is invalid; official review is required.")
        return result
    # Regional evidence must be applicable before using it for any exclusion.
    for rule in config.eligibility_rules:
        if rule.op != "coverage":
            continue
        actual = getattr(profile, rule.field)
        if actual is None or actual.casefold() in UNKNOWN:
            result.missing_fields.append(rule.field)
            result.reasons.append(f"Provide {rule.field}; the reviewed source covers {rule.value}.")
            return result
        if actual.casefold() != rule.value.casefold():
            result.reasons.append(f"This source covers {rule.value}; evidence for the supplied state is needed. Residence elsewhere is not an official exclusion.")
            return result
    excluded, unresolved = False, False
    for rule in config.eligibility_rules:
        actual = getattr(profile, rule.field)
        label = rule_label(rule)
        interval = getattr(profile, rule.field + "_range", None)
        if actual is None and interval is not None:
            if rule.op == "gte":
                matched = True if interval.min >= rule.value else False if interval.max < rule.value else None
            elif rule.op == "lte":
                matched = True if interval.max <= rule.value else False if interval.min > rule.value else None
            else:
                matched = True if interval.min == interval.max == rule.value else False if not interval.min <= rule.value <= interval.max else None
            if matched is True:
                result.matched_rules.append(label)
            elif matched is False:
                excluded = True
                result.reasons.append(f"The supplied range does not satisfy: {label}.")
            else:
                if rule.field not in result.missing_fields:
                    result.missing_fields.append(rule.field)
                result.reasons.append(f"Provide a more precise value; the supplied range crosses this condition: {label}.")
            continue
        if actual is None or isinstance(actual, str) and actual.casefold() in UNKNOWN:
            if rule.field not in result.missing_fields:
                result.missing_fields.append(rule.field)
            result.reasons.append(f"Provide {rule.field} to check: {label}.")
            continue
        if rule.op == "present":
            # Collecting free text cannot establish a notified trade or other category.
            unresolved = True
            result.reasons.append(f"{rule.field} was supplied, but its documented category requires verification.")
            continue
        elif rule.op in {"eq", "coverage"}:
            matched = actual.casefold() == rule.value.casefold() if isinstance(actual, str) else actual == rule.value
        elif rule.op == "gte":
            matched = actual >= rule.value
        else:
            matched = actual <= rule.value
        if matched:
            result.matched_rules.append(label)
        else:
            excluded = True
            result.reasons.append(f"Supplied information does not satisfy {label}.")
    result.reasons.extend(f"Official review required: {item}" for item in config.unmodeled_conditions)
    result.status = "NOT_MATCHED" if excluded else (
        "NEEDS_INFO" if result.missing_fields or config.unmodeled_conditions or unresolved else "POTENTIAL")
    result.reasons.append("Assessment covers reviewed conditions only; official eligibility is not guaranteed. Confirm current terms with the administering authority.")
    return result
