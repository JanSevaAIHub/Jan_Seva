import { test, expect } from '@playwright/test'
import { login } from './helpers/auth.js'
import { mkdirSync } from 'node:fs'

// Test-only Auth and Storage service doubles are installed by e2e_server.py.
// Complaint, eligibility, ownership and metadata routes are the real FastAPI code.
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAI0lEQVR4nGNkaGhgIAUwkaSaYVQDcYCJSHVwMKqBGEByKAEAQb0BIODbncoAAAAASUVORK5CYII=', 'base64')
const photo = { name: 'test-civic-photo.png', mimeType: 'image/png', buffer: image }
const evidenceDir = '../../docs/screenshots/final'

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
})

async function fillComplaint(page, title = '[SYNTHETIC] Final road photo journey') {
  await page.getByPlaceholder('e.g. Streetlight not working near City Park').fill(title)
  await page.getByPlaceholder('Describe what happened, exact location landmark, and when it started...').fill('Synthetic test only: potholes near the test school need inspection.')
  await page.getByLabel('Locality', { exact: true }).fill('[SYNTHETIC] Final Test Ward')
}

async function confirmComplaint(page) {
  await page.getByRole('button', { name: 'Submit Complaint', exact: true }).click()
  const response = page.waitForResponse(r => r.url().endsWith('/api/complaints') && r.request().method() === 'POST' && r.status() === 201)
  await page.getByRole('button', { name: 'Confirm & Create Ticket' }).click()
  return (await response).json()
}

test('homepage agent sends to real backend, handles multiple messages, keyboard and route history', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/complaints/new')
  const chat = page.getByRole('region', { name: 'Citizen AI Assistant' })
  const input = chat.getByLabel('Message the citizen assistant')
  await expect(chat.getByRole('button', { name: 'Send assistant message' })).toBeDisabled()
  await input.fill('Hello there')
  await input.press('Shift+Enter')
  await expect(input).toHaveValue('Hello there\n')
  const response = page.waitForResponse(r => r.url().endsWith('/api/agent/conversation'))
  await input.press('Enter')
  expect((await response).status()).toBe(200)
  await expect(chat.getByText('Would you like help finding', { exact: false })).toBeVisible()
  await input.fill('Please clarify')
  await input.press('Enter')
  await expect(chat.getByText('Would you like help finding', { exact: false })).toHaveCount(2)
  await input.fill('Keep my editable message')
  await page.locator('aside').getByRole('link', { name: 'My Requests', exact: true }).click()
  await page.locator('aside').getByRole('link', { name: 'Raise Complaint', exact: true }).click()
  await expect(page.getByLabel('Message the citizen assistant')).toHaveValue('Keep my editable message')
  await expect(page.getByRole('log')).toContainText('Please clarify')
  expect(errors).toEqual([])
})

test('missing provider configuration returns usable retry and preserves the actual homepage input', async ({ page }) => {
  await page.goto('/complaints/new')
  const chat = page.getByRole('region', { name: 'Citizen AI Assistant' })
  const input = chat.getByLabel('Message the citizen assistant')
  await input.fill('Potholes near the test park')
  const response = page.waitForResponse(r => r.url().endsWith('/api/agent/conversation'))
  await input.press('Enter')
  expect((await response).status()).toBe(503)
  await expect(input).toHaveValue('Potholes near the test park')
  await expect(chat.getByRole('alert')).toContainText('not configured')
  await expect(chat.getByRole('button', { name: 'Retry message' })).toBeEnabled()
})

for (const mobile of [false, true]) {
  test(`complaint photo preview, review, persistence and private reload (${mobile ? 'mobile' : 'desktop'})`, async ({ page }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('/complaints/new')
    await login(page, 'citizen')
    await fillComplaint(page, `[SYNTHETIC] ${mobile ? 'Mobile' : 'Desktop'} evidence`)
    await page.getByLabel('Select complaint photo').setInputFiles(photo)
    await expect(page.getByAltText('Selected evidence preview')).toBeVisible()
    await expect(page.getByText(photo.name, { exact: true })).toBeVisible()
    const saved = await confirmComplaint(page)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByText('Evidence uploaded successfully.')).toBeVisible()
    await page.goto(`/track?id=${saved.id}`)
    const uploaded = page.getByAltText('Uploaded complaint evidence')
    await expect(uploaded).toBeVisible()
    await expect.poll(() => uploaded.evaluate(img => img.complete && img.naturalWidth)).toBeGreaterThan(0)
    await page.reload()
    await expect(uploaded).toBeVisible()
    await expect.poll(() => uploaded.evaluate(img => img.complete && img.naturalWidth)).toBeGreaterThan(0)
    const signed = await uploaded.getAttribute('src')
    const privateUrl = new URL(signed)
    privateUrl.search = ''
    expect((await page.request.get(privateUrl.toString())).status()).toBe(403)
    if (mobile) {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      mkdirSync(evidenceDir, { recursive: true })
      await page.screenshot({ path: `${evidenceDir}/mobile-evidence.png`, fullPage: true })
    }
    expect(errors).toEqual([])
  })
}

test('photo failure keeps the saved ticket and selected file; retry uploads without a second complaint', async ({ page }) => {
  await page.goto('/complaints/new')
  await login(page, 'citizen')
  await fillComplaint(page, '[SYNTHETIC] Partial upload recovery')
  await page.getByLabel('Select complaint photo').setInputFiles(photo)
  let creations = 0
  page.on('request', r => { if (r.url().endsWith('/api/complaints') && r.method() === 'POST') creations++ })
  await page.route('**/api/complaints/*/evidence', route => route.request().method() === 'POST'
    ? route.fulfill({ status: 503, json: { detail: { message: 'Synthetic Storage permission failure' } } }) : route.continue())
  const saved = await confirmComplaint(page)
  await expect(page.getByRole('button', { name: 'Retry photo upload' })).toBeVisible()
  await expect(page.getByText('Internal Ticket Successfully Saved!')).toBeVisible()
  await page.unroute('**/api/complaints/*/evidence')
  await page.getByRole('button', { name: 'Retry photo upload' }).click()
  await expect(page.getByText('Evidence uploaded successfully.')).toBeVisible()
  expect(creations).toBe(1)
  await page.goto(`/track?id=${saved.id}`)
  await expect(page.getByAltText('Uploaded complaint evidence')).toBeVisible()
})

test('mobile image picker rejects invalid types and size, supports removal and replacement', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/complaints/new')
  const picker = page.getByLabel('Select complaint photo')
  await picker.setInputFiles({ name: 'test.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') })
  await expect(page.getByRole('alert')).toContainText('JPEG, PNG or WebP')
  await picker.setInputFiles({ name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(5242881) })
  await expect(page.getByRole('alert')).toContainText('at most 5 MB')
  await picker.setInputFiles(photo)
  await expect(page.getByAltText('Selected evidence preview')).toBeVisible()
  await page.getByRole('button', { name: 'Remove photo' }).click()
  await expect(page.getByAltText('Selected evidence preview')).toHaveCount(0)
  await picker.setInputFiles({ ...photo, name: 'replacement.png' })
  await expect(page.getByText('replacement.png', { exact: true })).toBeVisible()
})

test('real keyword search, reset and deterministic eligibility work without an AI key', async ({ page }) => {
  await page.goto('/schemes')
  const search = page.getByPlaceholder('Search scheme name or keyword...')
  await search.fill('Suraksha')
  await expect(page.getByRole('heading', { name: 'Pradhan Mantri Suraksha Bima Yojana (PMSBY)' })).toBeVisible()
  await page.getByLabel('Eligibility scheme').selectOption('2fa9a24a-4d17-5639-9e11-8d5624196722')
  const profile = page.getByRole('form', { name: 'Eligibility profile' })
  await profile.getByLabel('Beneficiary age').fill('71')
  await profile.getByRole('button', { name: 'Screen reviewed conditions' }).click()
  await expect(profile.getByRole('status')).toContainText('NOT_MATCHED')
  await profile.getByLabel('Beneficiary age').fill('30')
  await profile.getByRole('button', { name: 'Screen reviewed conditions' }).click()
  await expect(profile.getByRole('status')).toContainText('NEEDS_INFO')
  await search.fill('')
  await expect(page.getByRole('heading', { name: 'Atal Pension Yojana (APY)' })).toBeVisible()
})

test('complaint draft and selected image survive in-app navigation before submission', async ({ page }) => {
  await page.goto('/complaints/new')
  await fillComplaint(page, '[SYNTHETIC] Keep draft across routes')
  await page.getByLabel('Select complaint photo').setInputFiles(photo)
  await page.locator('aside').getByRole('link', { name: 'Find Schemes' }).click()
  await page.locator('aside').getByRole('link', { name: 'Raise Complaint' }).click()
  await expect(page.getByPlaceholder('e.g. Streetlight not working near City Park')).toHaveValue('[SYNTHETIC] Keep draft across routes')
  await expect(page.getByAltText('Selected evidence preview')).toBeVisible()
})

test('citizen signup gives confirmation guidance and never grants officer access', async ({ page }) => {
  await page.goto('/complaints/new')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  const modal = page.getByRole('dialog')
  await modal.getByRole('button', { name: 'New citizen? Create account' }).click()
  await modal.getByLabel('Email').fill(`fresh-${Date.now()}@example.test`)
  await modal.getByLabel('Password').fill(process.env.E2E_AUTH_PASSWORD)
  await modal.getByRole('button', { name: 'Create citizen account' }).click()
  await expect(modal.getByRole('status')).toContainText('Check your email')
  await modal.getByLabel('Password').fill(process.env.E2E_AUTH_PASSWORD)
  await modal.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.locator('header').getByRole('button', { name: 'Citizen', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.locator('header').getByRole('button', { name: 'Citizen', exact: true })).toBeVisible()
  await page.goto('/officer')
  await expect(page.getByText('A verified officer account is required')).toBeVisible()
})

test('AI network failure preserves input and a recovered response renders validated citations (response double)', async ({ page }) => {
  await page.goto('/complaints/new')
  const chat = page.getByRole('region', { name: 'Citizen AI Assistant' })
  await page.route('**/api/agent/conversation', route => route.abort('failed'))
  await chat.getByLabel('Message the citizen assistant').fill('PM Kisan scheme information')
  await chat.getByRole('button', { name: 'Send assistant message' }).click()
  await expect(chat.getByRole('alert')).toContainText('Cannot reach the API')
  await page.unroute('**/api/agent/conversation')
  await page.route('**/api/agent/conversation', route => route.fulfill({ json: {
    intent: 'scheme', answer: 'Isolated citation rendering fixture.', mode: 'grounded_extracts', tool_trace: [],
    citations: [{ title: 'Official scheme source', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2191651', excerpt: 'Reviewed test evidence summary.', reviewed_at: '2026-11-07T00:00:00+05:30' }],
  } }))
  await chat.getByRole('button', { name: 'Retry message' }).click()
  await expect(chat.getByRole('link', { name: 'Official scheme source' })).toBeVisible()
  await expect(chat.getByLabel('Message the citizen assistant')).toHaveValue('')
})

test('second citizen is denied complaint details, evidence and officer writes over real HTTP', async ({ page }) => {
  await page.goto('/complaints/new')
  await login(page, 'citizen')
  await fillComplaint(page, '[SYNTHETIC] Private evidence access control')
  await page.getByLabel('Select complaint photo').setInputFiles(photo)
  const saved = await confirmComplaint(page)
  await expect(page.getByText('Evidence uploaded successfully.')).toBeVisible()
  await page.locator('header').getByRole('button', { name: 'Arjun Mishra', exact: true }).click()
  await page.getByRole('button', { name: 'Citizen Sign In', exact: true }).last().click()
  const modal = page.getByRole('dialog')
  await modal.getByLabel('Email').fill('other@example.test')
  await modal.getByLabel('Password').fill(process.env.E2E_AUTH_PASSWORD)
  let authorization
  page.on('request', r => { if (r.url().endsWith('/api/me')) authorization = r.headers().authorization })
  await modal.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.locator('header').getByRole('button', { name: 'Other Citizen', exact: true })).toBeVisible()
  const headers = { Authorization: authorization }
  for (const path of [`/complaints/${saved.id}`, `/complaints/${saved.id}/evidence`, `/complaints/${saved.id}/evidence/00000000-0000-0000-0000-000000000000/access`]) {
    expect((await page.request.get(`http://127.0.0.1:8765/api${path}`, { headers })).status()).toBe(404)
  }
  expect((await page.request.patch(`http://127.0.0.1:8765/api/officer/complaints/${saved.id}`, { headers, data: { status: 'UNDER_REVIEW' } })).status()).toBe(403)
})

test('officer routing updates persist in the citizen timeline and activity notifications', async ({ page }) => {
  await page.goto('/complaints/new')
  await login(page, 'citizen')
  await fillComplaint(page, '[SYNTHETIC] Internal routing and notifications')
  const saved = await confirmComplaint(page)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await login(page, 'officer')
  await page.goto('/officer')
  const row = page.getByRole('row').filter({ hasText: saved.id })
  await row.getByRole('button', { name: 'Audit / Review' }).click()
  const modal = page.getByRole('dialog')
  await modal.getByText('Review department routing', { exact: true }).click()
  await modal.getByLabel('Routing category').selectOption('water')
  await modal.getByRole('button', { name: 'Save internal routing' }).click()
  await expect(modal.getByText('Officer changed internal category', { exact: false })).toBeVisible()
  await modal.getByRole('button', { name: 'Cancel', exact: true }).click()
  await login(page, 'citizen')
  await page.goto(`/track?id=${saved.id}`)
  await expect(page.getByText('Internal ticket update', { exact: true })).toBeVisible()
  await expect(page.getByText('No government referral or filing occurred.', { exact: false })).toBeVisible()
  await page.goto('/notifications')
  const update = page.locator('main').getByText('Officer changed internal category', { exact: false })
  await expect(update).toBeVisible()
  const card = update.locator('..').locator('..').locator('..')
  await card.getByRole('button', { name: 'Track', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`id=${saved.id}`))
})
