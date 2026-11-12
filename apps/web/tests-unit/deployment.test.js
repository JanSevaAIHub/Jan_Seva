import test from 'node:test'
import assert from 'node:assert/strict'
import { deploymentIssues } from '../scripts/check-deployment.mjs'

const ready = { VITE_API_BASE_URL: 'https://api.example.test', VITE_SUPABASE_URL: 'https://project.example.test', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic-public-key' }
const jwt = role => `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.synthetic`
test('deployment accepts public credentials and legacy anon key without claiming connectivity', () => {
  assert.deepEqual(deploymentIssues(ready), [])
  assert.deepEqual(deploymentIssues({ ...ready, VITE_SUPABASE_PUBLISHABLE_KEY: jwt('anon') }), [])
})
test('missing frontend configuration reports names without values', () => {
  assert.equal(deploymentIssues({}).length, 3)
  assert.ok(deploymentIssues({}).every(i => i.code === 'MISSING'))
})
for (const [label, patch] of [
  ['secret key', { VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_synthetic-private-marker' }],
  ['service role key', { VITE_SUPABASE_PUBLISHABLE_KEY: jwt('service_role') }],
  ['private key under another name', { VITE_EXTRA: jwt('service_role') }],
  ['private variable', { VITE_DATABASE_URL: 'postgresql://synthetic:private@database.invalid/db' }],
  ['credential URL', { VITE_API_BASE_URL: 'https://private@api.example.test' }],
  ['HTTP deployment', { VITE_API_BASE_URL: 'http://api.example.test' }],
  ['URL query', { VITE_SUPABASE_URL: 'https://project.example.test/?private=value' }],
]) test(`deployment rejects ${label} without exposing the value`, () => {
  const issues = deploymentIssues({ ...ready, ...patch })
  assert.ok(issues.length)
  for (const value of Object.values(patch)) assert.ok(!JSON.stringify(issues).includes(value))
})
test('HTTP loopback requires explicit local mode', () => {
  const env = { ...ready, VITE_API_BASE_URL: 'http://127.0.0.1:8000' }
  assert.ok(deploymentIssues(env).length)
  assert.deepEqual(deploymentIssues(env, { allowLocal: true }), [])
})
