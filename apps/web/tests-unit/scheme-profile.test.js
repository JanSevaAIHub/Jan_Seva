import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseProfileDraft } from '../src/lib/schemeProfile.js'
import { eligibilityResult, schemeAnswer, schemeView } from '../src/lib/schemes.js'

test('profile parsing preserves unknowns, false, zero and distinct income periods', () => {
  assert.deepEqual(parseProfileDraft({ age: '', state: ' ', occupation: '', income_taxpayer: 'false', monthly_income: '0', annual_income: '5000' }),
    { income_taxpayer: false, monthly_income: 0, annual_income: 5000 })
  assert.deepEqual(parseProfileDraft({ age_mode: 'range', age_min: '18', age_max: '40' }), { age_range: { min: 18, max: 40 } })
})

for (const draft of [{ age: '-1' }, { age: '151' }, { age: '18.5' }, { age: 'oops' },
  { monthly_income: 'Infinity' }, { annual_income: '-1' }, { state: 'P' },
  { age_mode: 'range', age_min: '40', age_max: '18' }, { age_mode: 'range', age_min: '18' }]) {
  test(`invalid profile draft is rejected: ${JSON.stringify(draft)}`, () => assert.throws(() => parseProfileDraft(draft)))
}

const id = '2fa9a24a-4d17-5639-9e11-8d5624196722'
const excerpt = 'The complete reviewed paragraph establishes the explicit source conditions.'
const record = { id, title: 'Stored scheme', description: 'Stored reviewed description.', category: 'Insurance', state: 'National',
  eligibility: excerpt, evidence_text: excerpt, required_documents: [], document_note: 'Partial checklist.', evidence_kind: 'reviewed_paraphrase',
  reviewed_at: '2026-11-07T00:00:00Z', source_url: 'https://financialservices.gov.in/pmsby', rules_json: {} }
const scheme = schemeView(record)
const citation = { scheme_id: id, title: record.title, url: record.source_url, excerpt, reviewed_at: record.reviewed_at }
const reply = { scheme_id: id, status: 'POTENTIAL', matched_rules: ['Age must be at least 18'], missing_fields: [], reasons: ['No guarantee of official eligibility.'], citations: [citation] }

const attacks = {
  'HTTP source': c => ({ ...c, url: 'http://financialservices.gov.in/pmsby' }),
  'foreign host': c => ({ ...c, url: 'https://example.com/' }),
  'government-looking suffix': c => ({ ...c, url: 'https://pib.gov.in.attacker.test/' }),
  'credentials': c => ({ ...c, url: 'https://user:secret@pib.gov.in/' }),
  'unreviewed fragment': c => ({ ...c, url: c.url + '#new' }),
  'empty title': c => ({ ...c, title: '  ' }),
  'empty excerpt': c => ({ ...c, excerpt: '' }),
  'invalid date': c => ({ ...c, reviewed_at: 'not-a-date' }),
  'different scheme': c => ({ ...c, scheme_id: '09481061-0b5e-5022-86a3-e4a83f377ad8' }),
  'unsupported excerpt': c => ({ ...c, excerpt: 'An invented benefit.' }),
  'changed official URL': c => ({ ...c, url: 'https://labour.gov.in/' }),
  'changed review': c => ({ ...c, reviewed_at: '2026-11-08T00:00:00Z' }),
}
for (const [name, attack] of Object.entries(attacks)) {
  test(`eligibility citation validation rejects ${name}`, () => {
    assert.throws(() => eligibilityResult({ ...reply, citations: [attack(citation)] }, scheme), /invalid/)
  })
}

test('valid eligibility evidence and source-free abstention remain supported', () => {
  assert.equal(eligibilityResult(reply, scheme).status, 'POTENTIAL')
  assert.equal(eligibilityResult({ ...reply, status: 'NEEDS_INFO', matched_rules: [], citations: [] }, scheme).status, 'NEEDS_INFO')
  assert.throws(() => eligibilityResult({ ...reply, citations: [] }, scheme))
  assert.throws(() => eligibilityResult({ ...reply, missing_fields: ['age'] }, scheme))
  assert.throws(() => eligibilityResult({ ...reply, status: 'NEEDS_INFO', citations: [] }, scheme))
  assert.throws(() => eligibilityResult({ ...reply, status: 'APPROVED' }, scheme))
  assert.throws(() => schemeAnswer({ answer: 'Unsupported', mode: 'insufficient_evidence', citations: [citation] }))
})

test('application portal links use the stored verified allowlist', () => {
  assert.equal(schemeView({ ...record, rules_json: { application_url: 'https://maandhan.in/' } }).applicationUrl, 'https://maandhan.in/')
  assert.throws(() => schemeView({ ...record, rules_json: { application_url: 'javascript:alert(1)' } }))
  assert.throws(() => schemeView({ ...record, rules_json: { application_url: 'https://attacker.test/apply' } }))
})
