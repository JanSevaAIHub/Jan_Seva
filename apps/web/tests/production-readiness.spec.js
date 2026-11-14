import { test, expect } from '@playwright/test'
import { login } from './helpers/auth.js'

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
})

async function pngFile(page) {
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 8
    canvas.getContext('2d').fillRect(0, 0, 8, 8)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  return { name: 'evidence.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64') }
}

test('new named citizen saves private evidence, retries failure, refreshes and assigned officer can view it', async ({ page }) => {
  test.setTimeout(120000)
  const email = `evidence-${Date.now()}@example.test`
  await page.goto('/complaints/new')
  await page.locator('header').getByRole('button', { name: 'Guest', exact: true }).click()
  await page.getByRole('button', { name: 'Citizen Sign In', exact: true }).last().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Sign up', exact: true }).click()
  await dialog.getByLabel('Name', { exact: true }).fill('Evidence Citizen')
  await dialog.getByLabel('State (optional)').fill('Punjab')
  await dialog.getByLabel('Occupation (optional)').fill('Farmer')
  await dialog.getByLabel('Email', { exact: true }).fill(email)
  await dialog.getByLabel('Password', { exact: true }).fill('synthetic-evidence-password')
  await dialog.getByLabel('Confirm password', { exact: true }).fill('synthetic-evidence-password')
  const profileSaved = page.waitForResponse(r => r.url().endsWith('/api/me') && r.request().method() === 'PATCH' && r.status() === 200)
  await dialog.getByRole('button', { name: 'Create account' }).click()
  const profile = await (await profileSaved).json()
  expect(profile).toMatchObject({ name: 'Evidence Citizen', state: 'Punjab', occupation: 'Farmer', role: 'citizen' })
  await page.goto('/complaints/new')
  await page.getByRole('button', { name: 'Load sample', exact: true }).click()
  const title = page.getByPlaceholder('e.g. Streetlight not working near City Park')
  const original = await title.inputValue()
  await page.getByLabel('Evidence images (optional)').setInputFiles(await pngFile(page))
  await expect(page.getByAltText('Selected evidence: evidence.png')).toBeVisible()
  let fail = true
  await page.route('**/api/complaints/*/evidence', route => route.request().method() === 'POST' && fail
    ? route.fulfill({ status: 503, json: { detail: { message: 'Synthetic storage outage' } } }) : route.continue())
  await page.getByRole('button', { name: 'Submit Complaint', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('1 selected images')
  const saved = page.waitForResponse(r => r.url().endsWith('/api/complaints') && r.request().method() === 'POST' && r.status() === 201)
  await page.getByRole('button', { name: 'Confirm & Create Ticket' }).click()
  const ticket = await (await saved).json()
  expect(ticket.assigned_officer_id).toBeTruthy()
  await expect(page.getByRole('alert').filter({ hasText: 'Ticket already saved' })).toBeVisible()
  await expect(title).toHaveValue(original)
  fail = false
  await page.getByRole('button', { name: 'Retry image uploads' }).click()
  await expect(page.getByAltText('Saved complaint evidence')).toBeVisible()
  await expect(title).toHaveValue('')
  await page.goto(`/track?id=${ticket.id}`)
  await expect(page.getByAltText('Saved complaint evidence')).toBeVisible()
  await page.reload()
  await expect(page.getByAltText('Saved complaint evidence')).toBeVisible()
  await page.locator('header').getByRole('button', { name: 'Evidence Citizen', exact: true }).click()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await page.locator('header').getByRole('button', { name: 'Guest', exact: true }).click()
  await page.getByRole('button', { name: 'Citizen Sign In', exact: true }).last().click()
  await page.getByRole('dialog').getByLabel('Email', { exact: true }).fill(email)
  await page.getByRole('dialog').getByLabel('Password', { exact: true }).fill('synthetic-evidence-password')
  await page.getByRole('dialog').getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByAltText('Saved complaint evidence')).toBeVisible()
  await login(page, 'citizen')
  // Direct request uses the currently signed-in second citizen, not the prior session.
  let token
  page.on('request', request => { if (request.url().endsWith('/api/me')) token = request.headers().authorization })
  await page.reload()
  await expect.poll(() => Boolean(token)).toBe(true)
  expect((await page.request.get(`http://127.0.0.1:8765/api/complaints/${ticket.id}/evidence`, { headers: { Authorization: token } })).status()).toBe(404)
  // The inaccessible ticket is not rendered, so no image-bearing UI is mounted.
  await expect(page.getByAltText('Saved complaint evidence')).toHaveCount(0)
  await login(page, 'officer')
  await page.goto('/officer')
  await page.getByRole('row').filter({ hasText: ticket.id }).getByRole('button', { name: 'Audit / Review' }).click()
  await expect(page.getByRole('dialog').getByAltText('Saved complaint evidence')).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('button', { name: /^Remove evidence/ })).toHaveCount(0)
})

test('lost complaint response retries with the same key and creates exactly one ticket', async ({ page }) => {
  await page.goto('/complaints/new')
  await login(page, 'citizen')
  await page.getByRole('button', { name: 'Load sample', exact: true }).click()
  const keys = []
  let committed
  await page.route('**/api/complaints', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    keys.push(route.request().headers()['idempotency-key'])
    if (!committed) {
      const response = await route.fetch()
      committed = await response.json()
      return route.abort('failed')
    }
    await route.continue()
  })
  await page.getByRole('button', { name: 'Submit Complaint', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm & Create Ticket' }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Cannot reach the API')
  const retried = page.waitForResponse(r => r.url().endsWith('/api/complaints') && r.request().method() === 'POST' && r.status() === 201)
  await page.getByRole('button', { name: 'Confirm & Create Ticket' }).click()
  expect((await (await retried).json()).id).toBe(committed.id)
  expect(keys.length).toBe(2)
  expect(keys[0]).toBeTruthy()
  expect(keys[0]).toBe(keys[1])
})

test('image validation and removal remain usable at mobile, tablet and desktop widths', async ({ page }) => {
  await page.goto('/complaints/new')
  await login(page, 'citizen')
  const picker = page.getByLabel('Evidence images (optional)')
  await picker.setInputFiles({ name: 'invalid.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') })
  await expect(page.getByRole('alert').filter({ hasText: 'Choose JPEG' })).toBeVisible()
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await picker.setInputFiles(await pngFile(page))
    await expect(page.getByAltText('Selected evidence: evidence.png')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    await page.getByRole('button', { name: 'Remove selected evidence.png' }).click()
    await expect(page.getByAltText('Selected evidence: evidence.png')).toHaveCount(0)
  }
})

test('late evidence refresh from a prior account cannot erase the current account draft', async ({ page }) => {
  await page.goto('/complaints/new')
  await login(page, 'citizen')
  await page.getByRole('button', { name: 'Load sample', exact: true }).click()
  await page.getByLabel('Evidence images (optional)').setInputFiles(await pngFile(page))
  let finishedUpload = false, captured = false, release
  const gate = new Promise(resolve => { release = resolve })
  page.on('response', response => {
    if (response.url().endsWith('/evidence') && response.request().method() === 'POST' && response.status() === 201) finishedUpload = true
  })
  await page.route('**/api/complaints/*/evidence', async route => {
    if (route.request().method() === 'GET' && finishedUpload && !captured) {
      captured = true
      const response = await route.fetch()
      await gate
      await route.fulfill({ response })
    } else await route.continue()
  })
  try {
    await page.getByRole('button', { name: 'Submit Complaint', exact: true }).click()
    await page.getByRole('button', { name: 'Confirm & Create Ticket' }).click()
    await expect.poll(() => captured).toBe(true)
    await login(page, 'officer')
    const title = page.getByPlaceholder('e.g. Streetlight not working near City Park')
    await title.fill('Keep the current account draft')
    release()
    await page.waitForLoadState('networkidle')
    await expect(title).toHaveValue('Keep the current account draft')
  } finally { release() }
})
