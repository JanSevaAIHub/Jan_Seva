"""Conservative, deterministic screening of conditions in the curated corpus.

No model decides eligibility. POTENTIAL only means the encoded conditions match.
Unencoded exclusions and application currency always require official review.
"""

from pydantic import Field

from app.schemas import APIModel


class EligibilityProfile(APIModel):
    state: str | None = Field(default=None, min_length=2, max_length=100)
    age: int | None = Field(default=None, ge=0, le=120, strict=True)
    annual_income: int | None = Field(default=None, ge=0, le=1000000000, strict=True)
    bank_account: bool | None = Field(default=None, strict=True)
    auto_debit_consent: bool | None = Field(default=None, strict=True)
    income_tax_payer: bool | None = Field(default=None, strict=True)
    landholding_farmer: bool | None = Field(default=None, strict=True)
    government_employee_family: bool | None = Field(default=None, strict=True)
    indian_citizen: bool | None = Field(default=None, strict=True)
    girl_child: bool | None = Field(default=None, strict=True)
    punjab_domicile: bool | None = Field(default=None, strict=True)
    covered_social_category: bool | None = Field(default=None, strict=True)
    notified_artisan_trade: bool | None = Field(default=None, strict=True)
    recent_similar_credit: bool | None = Field(default=None, strict=True)
    school_type: str | None = Field(default=None, pattern="^(government|aided|local_body|private)$")
    class_level: int | None = Field(default=None, ge=1, le=12, strict=True)
    selected_state_exam: bool | None = Field(default=None, strict=True)
    class_vii_marks: float | None = Field(default=None, ge=0, le=100, strict=True)
    sc_st: bool | None = Field(default=None, strict=True)


# IDs refer to the existing reviewed records, not titles supplied by a client.
IDS = {
    "pm-kisan": "0fa0266a-41ae-59cd-a130-47eb2474f35a", "nmmss": "30546a8a-6225-5d33-90cf-4d58a46a986b",
    "pmsby": "2fa9a24a-4d17-5639-9e11-8d5624196722", "pmjjby": "13f9e6b2-8511-5c4e-bd92-28e7447ce40f",
    "apy": "24a51098-4b30-59a3-aa06-c50c58ecb311", "ssy": "8bb35ca0-ed59-5cac-a939-8cbf4830cf03",
    "pm-vishwakarma": "70c52a78-edfb-5db7-b903-5a83e12b3c59", "punjab-ashirwad": "09481061-0b5e-5022-86a3-e4a83f377ad8",
}


def screen(scheme_id, profile: EligibilityProfile) -> dict:
    slug = next((key for key, value in IDS.items() if value == str(scheme_id)), None)
    missing, failed, matched = [], [], []

    def check(field, predicate, explanation):
        value = getattr(profile, field)
        if value is None:
            missing.append(field)
        elif not predicate(value):
            failed.append(explanation)
        else:
            matched.append(explanation)

    def yes(field, explanation):
        check(field, lambda v: v is True, explanation)

    def no(field, explanation):
        check(field, lambda v: v is False, explanation)

    if slug in ("pmsby", "pmjjby", "apy"):
        upper = {"pmsby": 70, "pmjjby": 50, "apy": 40}[slug]
        check("age", lambda v: 18 <= v <= upper, f"New enrolment age must be 18–{upper}.")
        yes("bank_account", "A participating bank/post-office account is required.")
        if slug != "apy":
            yes("auto_debit_consent", "Premium auto-debit consent is required.")
        else:
            yes("indian_citizen", "Indian citizenship is required.")
            no("income_tax_payer", "Income-tax payers cannot newly join APY from October 2022.")
    elif slug == "pm-kisan":
        yes("landholding_farmer", "Cultivable landholding farmer-family condition must be met.")
        no("income_tax_payer", "Income-tax payer exclusion must not apply.")
        no("government_employee_family", "Specified government employee exclusions require official review.")
    elif slug == "ssy":
        check("age", lambda v: v < 10, "The girl child must be under 10 when the account is opened.")
        yes("girl_child", "The beneficiary must be a girl child.")
        yes("indian_citizen", "The girl child must be Indian.")
    elif slug == "punjab-ashirwad":
        check("age", lambda v: v >= 18, "The girl must be at least 18.")
        yes("girl_child", "The reviewed scheme covers girls in specified marriage categories.")
        yes("punjab_domicile", "Parents/guardians must meet Punjab domicile conditions.")
        yes("covered_social_category", "A source-listed social or family category must apply.")
    elif slug == "pm-vishwakarma":
        check("age", lambda v: v >= 18, "The artisan must be at least 18.")
        yes("notified_artisan_trade", "A notified self-employed traditional artisan trade is required.")
        no("government_employee_family", "Government employees and their families are excluded.")
        no("recent_similar_credit", "Similar recent credit needs official exceptions/repaid-loan review.")
    elif slug == "nmmss":
        check("annual_income", lambda v: v <= 350000, "Parental annual income must not exceed Rs. 3.50 lakh.")
        check("school_type", lambda v: v in ("government", "aided", "local_body"), "School must be government, aided or local-body.")
        check("class_level", lambda v: v == 9, "This screening covers new Class IX awards.")
        yes("selected_state_exam", "Selection through the State/UT examination is required.")
        check("sc_st", lambda _: True, "SC/ST status determines the marks relaxation.")
        if profile.sc_st is not None:
            minimum = 50 if profile.sc_st else 55
            check("class_vii_marks", lambda v: v >= minimum, f"Class VII marks must be at least {minimum}%.")
    else:
        missing.append("reviewed_deterministic_rules")
    return {"scheme_id": str(scheme_id), "status": "NOT_MATCHED" if failed else "NEEDS_INFO" if missing else "POTENTIAL",
        "missing_fields": missing, "reasons": failed or (["Provide the missing information to screen the reviewed conditions."] if missing else matched),
        "notice": "Limited deterministic screening, not an eligibility guarantee. Other exclusions, documents, family limits and current terms require official verification."}
