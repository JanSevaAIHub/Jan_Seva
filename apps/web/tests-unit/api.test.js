import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { apiRequest, publicApiRequest, getHealth, onUnauthorized } from '../src/lib/api.js'

const realFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = realFetch })

test('binary evidence and authenticated image reads share the bearer boundary', async () => {
  const file = new Blob(['synthetic pixels'], { type: 'image/png' })
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer test-access-token')
    if (options.method === 'POST') {
      assert.equal(options.body, file)
      assert.equal(options.headers['Content-Type'], 'image/png')
      assert.equal(options.headers['Idempotency-Key'], 'stable-key')
      return Response.json({ state: 'READY' })
    }
    return new Response(file, { headers: { 'Content-Type': 'image/png' } })
  }
  await apiRequest('/complaints/id/evidence', 'test-access-token', { method: 'POST', body: file, headers: { 'Idempotency-Key': 'stable-key' } })
  const result = await apiRequest('/complaints/id/evidence/image/content', 'test-access-token', { responseType: 'blob' })
  assert.equal(await result.text(), 'synthetic pixels')
  // A 204 deletion does not require a JSON response body.
  globalThis.fetch = async () => new Response(null, { status: 204 })
  assert.equal(await apiRequest('/complaints/id/evidence/image', 'test-access-token', { method: 'DELETE' }), null)
})

test('one transport sends JSON and the actual bearer token for POST and PATCH', async () => {
  const calls = []
  globalThis.fetch = async (url, options) => { calls.push({ url, ...options }); return Response.json({ id: 'saved-ticket' }) }
  assert.deepEqual(await apiRequest('/complaints', 'test-access-token', { method: 'POST', body: { title: 'Test' } }), { id: 'saved-ticket' })
  await apiRequest('/officer/complaints/test', 'test-access-token', { method: 'PATCH', body: JSON.stringify({ status: 'UNDER_REVIEW' }) })
  assert.equal(calls[0].headers.Authorization, 'Bearer test-access-token')
  assert.equal(calls[0].headers['Content-Type'], 'application/json')
  assert.equal(calls[0].body, '{"title":"Test"}')
  assert.equal(calls[1].method, 'PATCH')
})

test('public GET and health share transport without authorization or unnecessary JSON content type', async () => {
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.Authorization, undefined)
    assert.equal(options.headers['Content-Type'], undefined)
    return Response.json({ status: 'ok' })
  }
  assert.equal((await getHealth()).status, 'ok')
  assert.equal((await publicApiRequest('/schemes')).status, 'ok')
})

test('401 notifies with the failed token and does not replay the mutation', async () => {
  let calls = 0
  const tokens = []
  const unsubscribe = onUnauthorized(token => tokens.push(token))
  globalThis.fetch = async () => { calls++; return Response.json({ detail: { message: 'Private upstream message' } }, { status: 401 }) }
  try {
    await assert.rejects(apiRequest('/complaints', 'expired-token', { method: 'POST', body: {} }), error => error.status === 401 && error.message.includes('sign in again'))
    assert.deepEqual(tokens, ['expired-token'])
    assert.equal(calls, 1)
  } finally { unsubscribe() }
})

test('missing token is rejected before any network request', async () => {
  globalThis.fetch = () => assert.fail('No anonymous private request should be sent')
  await assert.rejects(apiRequest('/complaints', null), error => error.code === 'AUTH_REQUIRED')
})

test('structured, plain and HTML errors have usable messages without raw server output', async () => {
  globalThis.fetch = async () => Response.json({ detail: { code: 'INVALID_STATUS_TRANSITION', message: 'Next permitted status: UNDER_REVIEW.' } }, { status: 409 })
  await assert.rejects(apiRequest('/officer/complaints/test', 'token'), error => error.code === 'INVALID_STATUS_TRANSITION' && error.message.includes('UNDER_REVIEW'))
  globalThis.fetch = async () => new Response('<html>private stack trace</html>', { status: 502 })
  await assert.rejects(publicApiRequest('/schemes'), error => error.status === 502 && !error.message.includes('private'))
})

test('empty and non-JSON success responses are rejected; 204 is supported', async () => {
  globalThis.fetch = async () => new Response('not json')
  await assert.rejects(publicApiRequest('/schemes'), error => error.code === 'INVALID_RESPONSE')
  globalThis.fetch = async () => new Response(null, { status: 204 })
  assert.equal(await apiRequest('/complaints/test', 'token', { method: 'PATCH', body: {} }), null)
})

test('network errors are sanitized and timeouts cancel a single request', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed at secret-credential@private-host') }
  await assert.rejects(publicApiRequest('/schemes'), error => error.code === 'NETWORK_ERROR' && !error.message.includes('secret'))
  globalThis.fetch = (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))
  await assert.rejects(publicApiRequest('/schemes', { timeoutMs: 5 }), error => error.code === 'REQUEST_TIMEOUT')
})

test('external URL paths cannot receive an authorization header', async () => {
  globalThis.fetch = () => assert.fail('External request must not be sent')
  await assert.rejects(apiRequest('//attacker.invalid', 'token'), error => error.code === 'INVALID_PATH')
})

test('binary evidence preserves bytes, MIME and encoded filename with the actual bearer token', async () => {
  const file = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' })
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.body, file)
    assert.equal(options.headers['Content-Type'], 'image/png')
    assert.equal(options.headers.Authorization, 'Bearer test-token')
    assert.equal(options.headers['X-Filename'], 'photo.png')
    return Response.json({ id: 'test-evidence' })
  }
  assert.deepEqual(await apiRequest('/complaints/id/evidence', 'test-token', {
    method: 'POST', body: file, headers: { 'Content-Type': file.type, 'X-Filename': 'photo.png' },
  }), { id: 'test-evidence' })
})


test('complaint retries forward a durable submission key without automatically replaying the write', async () => {
  let calls = 0
  globalThis.fetch = async (_url, options) => {
    calls++
    assert.equal(options.headers['Idempotency-Key'], 'test-submission-key')
    throw new Error('Synthetic connection interruption')
  }
  await assert.rejects(apiRequest('/complaints', 'token', { method: 'POST', body: {}, headers: { 'Idempotency-Key': 'test-submission-key' } }), error => error.code === 'NETWORK_ERROR')
  assert.equal(calls, 1)
})
