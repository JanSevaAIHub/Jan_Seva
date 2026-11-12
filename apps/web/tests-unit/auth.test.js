import test from 'node:test'
import assert from 'node:assert/strict'
import { createCitizenAccount, sendResetEmail, changePassword, friendlyAuthError } from '../src/lib/auth.js'

test('signup sends credentials and fixed callback without roles or identity metadata', async () => {
  let request
  const client = { auth: { signUp: async body => { request = body; return { data: { session: null } } } } }
  const result = await createCitizenAccount(client, ' citizen@example.test ', 'test-password', 'https://janseva.example')
  assert.deepEqual(request, { email: 'citizen@example.test', password: 'test-password', options: { emailRedirectTo: 'https://janseva.example/auth/callback' } })
  assert.equal(result.signedIn, false)
  assert.match(result.message, /confirmation/)
})
test('signup also handles providers with email confirmation disabled', async () => {
  const result = await createCitizenAccount({ auth: { signUp: async () => ({ data: { session: {} } }) } }, 'user@example.test', 'test-password', 'https://janseva.example')
  assert.equal(result.signedIn, true)
})
test('recovery uses fixed same-origin redirect and an enumeration-safe notice', async () => {
  let request
  const client = { auth: { resetPasswordForEmail: async (...args) => { request = args; return {} } } }
  const result = await sendResetEmail(client, 'citizen@example.test', 'https://janseva.example')
  assert.deepEqual(request, ['citizen@example.test', { redirectTo: 'https://janseva.example/auth/reset' }])
  assert.match(result.message, /If an account exists/)
})
test('password changes use the existing authenticated provider session', async () => {
  let request
  await changePassword({ auth: { updateUser: async body => { request = body; return {} } } }, 'new-test-password')
  assert.deepEqual(request, { password: 'new-test-password' })
})
test('invalid signup input cannot reach provider', async () => {
  const client = { auth: { signUp: () => assert.fail('provider should not be called') } }
  await assert.rejects(createCitizenAccount(client, 'bad-email', 'test-password', 'https://janseva.example'))
  await assert.rejects(createCitizenAccount(client, 'user@example.test', 'short', 'https://janseva.example'))
})
test('auth failures are friendly and never show raw provider internals', () => {
  assert.match(friendlyAuthError({ code: 'invalid_credentials' }), /incorrect/)
  assert.match(friendlyAuthError({ code: 'email_not_confirmed' }), /Verify/)
  assert.match(friendlyAuthError({ status: 429 }), /wait/)
  assert.doesNotMatch(friendlyAuthError({ message: 'private-provider-secret' }), /private-provider-secret/)
})
