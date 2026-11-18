import { test } from 'node:test'
import assert from 'node:assert/strict'
import { agentReply } from '../src/lib/agent.js'

const reply = { session_id: '2fa9a24a-4d17-5639-9e11-8d5624196722', intent: 'complaint', status: 'partial',
  response: 'Your text can be reviewed; nothing has been filed.', citations: [], tool_trace: [], eligibility: [], actions: [{
    tool: 'draft_complaint', status: 'ok', detail: 'Nothing created.', label: 'Review complaint draft', path: '/complaints/new',
    requires_confirmation: true, draft: { title: '', description: 'Broken streetlight at the park.', locality: '', category: null } }] }

test('confirmation action carries supplied text without executing a write', () => {
  assert.equal(agentReply(reply).actions[0].requires_confirmation, true)
})
for (const patch of [{ path: 'https://attacker.test' }, { path: '/officer' }, { requires_confirmation: false },
  { draft: { description: 'Text', category: 'invented' } }]) {
  test(`unsafe suggested action is rejected: ${JSON.stringify(patch)}`, () => {
    assert.throws(() => agentReply({ ...reply, actions: [{ ...reply.actions[0], ...patch }] }))
  })
}
test('unsafe citations, invented intent and empty responses are rejected', () => {
  assert.throws(() => agentReply({ ...reply, citations: [{ url: 'javascript:alert(1)' }] }))
  assert.throws(() => agentReply({ ...reply, intent: 'admin' }))
  assert.throws(() => agentReply({ ...reply, response: ' ' }))
})
