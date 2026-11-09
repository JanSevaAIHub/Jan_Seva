"""Corpus identity, provenance association and malformed-record regression gates."""
import csv
import hashlib
import json
import shutil

import pytest

from app.ai.corpus import DATA, official_url, read_corpus


def test_original_eight_records_are_preserved_exactly():
    # Canonical digest of all original CSV fields at c4fa4dc; additive columns excluded.
    keys = "id slug title state category description source_url eligibility required_documents_json reviewed_at evidence_file".split()
    with (DATA / "schemes.csv").open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    original = [{key: row[key] for key in keys} for row in rows[:8]]
    assert hashlib.sha256(json.dumps(original, sort_keys=True).encode()).hexdigest() == "4c545cb35ea9876ec33522fbf5ea37084f092ecd85d0f5bda8f88ebf679b1f82"


def test_complete_dataset_and_one_note_per_scheme():
    records, failures = read_corpus()
    assert not failures and len(records) >= 12
    assert len({r.id for r in records}) == len({r.slug for r in records}) == len(records)
    assert {r.evidence_file for r in records} == {p.name for p in (DATA / "scheme_sources").glob("*.txt")}
    assert len({r.evidence_file for r in records}) == len(records)
    for r in records:
        assert all(getattr(r, key) for key in ("title", "department", "scope", "state", "category", "source_url", "eligibility", "reviewed_at"))
        assert official_url(r.source_url)
        assert r.eligibility_rules
        assert all(rule.evidence in r.evidence_text for rule in r.eligibility_rules)
        assert json.loads(json.dumps(r.rules()))["rules_version"] == 1


@pytest.mark.parametrize("damage", ["json", "operator", "field", "evidence", "missing_note", "duplicate_note", "orphan", "blank_title", "documents", "rule_override"])
def test_malformed_corpus_is_rejected_without_crashing(tmp_path, damage):
    shutil.copytree(DATA / "scheme_sources", tmp_path / "scheme_sources")
    with (DATA / "schemes.csv").open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        fields, rows = reader.fieldnames, list(reader)
    row = rows[-1]
    config = json.loads(row["eligibility_rules_json"])
    if damage == "json": row["eligibility_rules_json"] = "{bad"
    if damage == "operator": config["eligibility_rules"][0]["op"] = "exec"
    if damage == "field": config["eligibility_rules"][0]["field"] = "invented"
    if damage == "evidence": config["eligibility_rules"][0]["evidence"] = "This condition was never in the reviewed source."
    if damage == "missing_note": (tmp_path / "scheme_sources" / row["evidence_file"]).unlink()
    if damage == "duplicate_note": row["evidence_file"] = rows[0]["evidence_file"]
    if damage == "orphan": (tmp_path / "scheme_sources" / "orphan.txt").write_text("Unassociated source", encoding="utf-8")
    if damage == "blank_title": row["title"] = "   "
    if damage == "documents": row["required_documents_json"] = "{}"
    if damage == "rule_override": config["id"] = rows[0]["id"]
    if damage in {"operator", "field", "evidence", "rule_override"}: row["eligibility_rules_json"] = json.dumps(config)
    path = tmp_path / "schemes.csv"
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    _, failures = read_corpus(path)
    assert failures
