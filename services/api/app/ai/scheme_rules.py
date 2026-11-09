"""Shared validation for curated scheme rule data; no eligibility decisions."""
from typing import Literal

from pydantic import Field, StrictBool, model_validator

from app.schemas import APIModel


class EligibilityProfile(APIModel):
    age: int | None = Field(default=None, strict=True, ge=0, le=150)
    state: str | None = Field(default=None, min_length=2, max_length=100)
    occupation: str | None = Field(default=None, min_length=2, max_length=100)
    annual_income: float | None = Field(default=None, strict=True, ge=0, allow_inf_nan=False)
    monthly_income: float | None = Field(default=None, strict=True, ge=0, allow_inf_nan=False)
    disability_percent: float | None = Field(default=None, strict=True, ge=0, le=100, allow_inf_nan=False)
    bpl_household: StrictBool | None = None
    widow: StrictBool | None = None
    unorganised_worker: StrictBool | None = None
    epf_esic_nps: StrictBool | None = None
    income_taxpayer: StrictBool | None = None
    other_government_pension: StrictBool | None = None
    participating_account: StrictBool | None = None
    auto_debit_consent: StrictBool | None = None


NUMERIC = {"age", "annual_income", "monthly_income", "disability_percent"}
TEXT = {"state", "occupation"}
BOOLEAN = set(EligibilityProfile.model_fields) - NUMERIC - TEXT
UNKNOWN = {"unknown", "unsure", "not sure", "n/a", "prefer not to say"}


class EligibilityRule(APIModel):
    field: str
    op: Literal["gte", "lte", "eq", "present", "coverage"]
    value: float | str | bool | None = None
    evidence: str = Field(min_length=20, max_length=3000)

    @model_validator(mode="after")
    def valid_condition(self):
        if self.field not in EligibilityProfile.model_fields:
            raise ValueError("Unsupported rule field")
        if self.op == "present":
            if self.field not in TEXT or self.value is not None:
                raise ValueError("Only documented text information can use present")
        elif self.op == "coverage":
            if self.field != "state" or not isinstance(self.value, str) or not self.value.strip():
                raise ValueError("Coverage requires a reviewed state")
        elif self.field in NUMERIC:
            if self.op not in {"gte", "lte", "eq"} or type(self.value) not in {int, float}:
                raise ValueError("Numeric condition required")
            # Reuse the exact input constraints, including finite numbers and age bounds.
            value = int(self.value) if self.field == "age" and self.value.is_integer() else self.value
            EligibilityProfile.model_validate({self.field: value})
        elif self.field in TEXT:
            if self.op != "eq" or not isinstance(self.value, str) or not self.value.strip() or self.value.casefold() in UNKNOWN:
                raise ValueError("Text equality required")
        elif self.op != "eq" or type(self.value) is not bool:
            raise ValueError("Boolean equality required")
        return self


class RuleSet(APIModel):
    rules_version: Literal[1]
    eligibility_rules: list[EligibilityRule] = Field(max_length=40)
    unmodeled_conditions: list[str] = Field(max_length=30)
