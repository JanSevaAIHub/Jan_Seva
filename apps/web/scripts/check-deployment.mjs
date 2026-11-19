// Read-only deployment gate. Never print environment values or credentials.
import { loadEnv } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

function jwtRole(value) {
  try { return value.split('.').length === 3 ? JSON.parse(Buffer.from(value.split('.')[1], 'base64url')).role : null }
  catch { return null }
}

function safeOrigin(value, allowLocal) {
  try {
    const url = new URL(value)
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    return !url.username && !url.password && !url.search && !url.hash && url.pathname === '/' &&
      (url.protocol === 'https:' || (allowLocal && local && url.protocol === 'http:'))
  } catch { return false }
}

export function deploymentIssues(env, { allowLocal = false } = {}) {
  const issues = []
  for (const name of ['VITE_API_BASE_URL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']) {
    if (!env[name]?.trim()) issues.push({ variable: name, code: 'MISSING' })
  }
  for (const name of ['VITE_API_BASE_URL', 'VITE_SUPABASE_URL']) {
    if (env[name] && !safeOrigin(env[name], allowLocal)) issues.push({ variable: name, code: 'INVALID_ORIGIN' })
  }
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith('VITE_') || !value) continue
    if (/SECRET|PASSWORD|TOKEN|SERVICE_ROLE|DATABASE|OPENAI/i.test(name) ||
        /sb_secret_|\bsk-(?:proj-)?|postgres(?:ql)?(?:\+psycopg)?:\/\//i.test(value) ||
        ['service_role', 'authenticated'].includes(jwtRole(value))) {
      issues.push({ variable: name, code: 'SERVER_SECRET_IN_BROWSER' })
    }
  }
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (key) {
    // Classification only, never JWT authentication. The API still verifies JWTs.
    const legacyAnon = jwtRole(key) === 'anon'
    if (!key.startsWith('sb_publishable_') && !legacyAnon) issues.push({ variable: 'VITE_SUPABASE_PUBLISHABLE_KEY', code: 'PUBLIC_KEY_REQUIRED' })
  }
  return issues
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const env = loadEnv('production', fileURLToPath(new URL('..', import.meta.url)), 'VITE_')
  const issues = deploymentIssues(env, { allowLocal: process.argv.includes('--allow-local') })
  console.log(JSON.stringify({ status: issues.length ? 'BLOCKED' : 'PASS', issues }))
  process.exitCode = issues.length ? 1 : 0
}
