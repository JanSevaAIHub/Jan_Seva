import test from 'node:test'
import assert from 'node:assert/strict'
import { selectEvidence, MAX_IMAGE_BYTES } from '../src/lib/evidence.js'

test('picker accepts supported images and retains stable retry keys on existing selections', () => {
  const files = ['image/jpeg', 'image/png', 'image/webp'].map(type => new File(['synthetic'], 'evidence', { type }))
  const selected = selectEvidence(files.slice(0, 1))
  assert.equal(selectEvidence(files.slice(1), selected)[0].key, selected[0].key)
  assert.equal(selectEvidence(files).length, 3)
})

test('picker enforces type, size and combined attachment count', () => {
  assert.throws(() => selectEvidence([new File(['x'], 'evidence.svg', { type: 'image/svg+xml' })]))
  assert.throws(() => selectEvidence([new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], 'large.png', { type: 'image/png' })]))
  assert.throws(() => selectEvidence([new File([], 'empty.png', { type: 'image/png' })]))
  const files = [new File(['synthetic'], 'evidence.png', { type: 'image/png' })]
  assert.throws(() => selectEvidence(files, [], 3))
})
