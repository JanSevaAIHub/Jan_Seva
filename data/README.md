# Curated scheme evidence

Reviewed on 2026-11-07 (Asia/Calcutta). `schemes.csv` contains eight actual schemes; `scheme_sources/*.txt` contains concise, manually reviewed paraphrases of the linked official sources. These are **not verbatim government quotations**, a complete policy corpus, live deadline verification or personalized eligibility decisions. No mockData.js facts were imported.

| Slug | Official source inspected | Deliberate limits |
|---|---|---|
| `pm-kisan` | [PIB PM-KISAN backgrounder](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2191651&lang=2&reg=48) | Records verified enrolment information and exclusions; no future instalment date or exhaustive checklist |
| `nmmss` | [Ministry of Education release hosted by PIB](https://www.pib.gov.in/newsite/erelcontent.aspx?lang=2&reg=48&relid=294184) | The announced September 2026 application deadline has passed; no currently open window or complete document list asserted |
| `pmsby` | [Department of Financial Services FAQ](https://financialservices.gov.in/pmsby) | Coverage and enrolment conditions retained; no claim that any user is insured |
| `pmjjby` | [Department of Financial Services FAQ](https://www.financialservices.gov.in/pmjjby) | Includes the new-entrant waiting condition and age/renewal distinction; official content was available in indexed results despite intermittent direct-fetch failures |
| `apy` | [Finance Ministry parliamentary answer, 5 August 2024](https://sansad.in/getFile/loksabhaquestions/annex/182/AU2081_we23z8.pdf?source=pqals) | Historical source explicitly dated; includes the tax-payer restriction missed by an older FAQ; subsequent changes/document checklist not verified |
| `ssy` | [PIB Sukanya Samriddhi backgrounder, January 2026](https://www.pib.gov.in/PressNoteDetails.aspx?ModuleId=3&NoteId=157019&lang=1&reg=44) | Account-opening records verified; no current interest rate asserted |
| `pm-vishwakarma` | [PIB artisan support backgrounder, September 2026](https://www.pib.gov.in/PressNoteDetails.aspx?ModuleId=3&NoteId=159998&lang=1&reg=20) | Registration conditions and verification retained; no complete document checklist or approval promise |
| `punjab-ashirwad` | [District Faridkot, Government of Punjab](https://faridkot.nic.in/department-of-social-justice-empowerment-minorities/) | Punjab domicile condition verified; source has an older benefit amount, so numeric amount/income/deadline claims were deliberately excluded pending reconciliation |

Resource UUIDs are deterministic from corpus slugs, not invented authentication identities. Empty document arrays mean the consulted evidence does not establish a complete checklist. Application links are never invented: the UI links to the reviewed source and tells applicants to check current terms there.

Validation: `python -m app.scripts.ingest_schemes --validate-only` with `PYTHONPATH=services/api`. This checks file/CSV consistency and boundaries; it does not pretend to verify that an official page has not changed since review. Changes require manual source review and rerunning ingestion. See [Phase 3 setup](../docs/phase-3-setup.md) for migration/provider configuration and actual execution limits.
