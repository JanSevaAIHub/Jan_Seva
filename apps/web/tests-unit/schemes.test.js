import { test } from 'node:test'
import assert from 'node:assert/strict'
import { schemeAnswer } from '../src/lib/schemes.js'

const citation = { title: 'Synthetic stored source', url: 'https://example.gov.in/scheme',
  excerpt: 'An unchanged paragraph from stored evidence.', reviewed_at: '2026-11-08T00:00:00Z' }

test('a grounded answer with missing or unsafe citations is rejected rather than displayed without evidence', () => {
  for (const citations of [[], [{ ...citation, url: 'https://attacker.invalid' }], [citation, null]]) {
    assert.throws(() => schemeAnswer({ answer: 'Synthetic answer', mode: 'grounded_extracts', citations }), /invalid answer/)
  }
})

test('a fully valid cited answer and an explicit insufficient-evidence response remain supported', () => {
  assert.equal(schemeAnswer({ answer: 'Synthetic answer', mode: 'grounded_extracts', citations: [citation] }).citations.length, 1)
  assert.equal(schemeAnswer({ answer: 'Insufficient evidence.', mode: 'insufficient_evidence', citations: [] }).citations.length, 0)
})
