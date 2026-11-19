import { test, expect } from '@playwright/test'
import { login } from './helpers/auth.js'

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
})

test('unsafe answer citations show an error and preserve the question', async ({ page }) => {
  await page.route('**/api/schemes/ask', route => route.fulfill({ json: {
    answer: 'Synthetic unsupported promise must not display.', mode: 'grounded_extracts',
    tool_trace: [], citations: [{ title: 'Invalid source', url: 'https://attacker.invalid',
      excerpt: 'Untrusted source text.', reviewed_at: '2026-11-08T00:00:00Z' }],
  } }))
  await page.goto('/schemes')
  const input = page.getByPlaceholder('Ask a follow-up question...')
  await input.fill('Synthetic source validation question')
  await page.getByRole('button', { name: 'Send question' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'invalid answer' })).toBeVisible()
  await expect(input).toHaveValue('Synthetic source validation question')
  await expect(page.getByText('Synthetic unsupported promise must not display.', { exact: true })).toHaveCount(0)
})

test('repeated confirmation clicks during a pending save create one ticket', async ({ page }) => {
  await page.goto('/complaints/new')
  await login(page, 'citizen')
  let release
  let saved
  let posts = 0
  const gate = new Promise(resolve => { release = resolve })
  await page.route('**/api/complaints', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    posts++
    const response = await route.fetch()
    saved = await response.json()
    await gate
    await route.fulfill({ response })
  })
  await page.getByRole('button', { name: 'Load sample', exact: true }).click()
  await page.getByRole('button', { name: 'Submit Complaint', exact: true }).click()
  const confirm = page.getByRole('button', { name: 'Confirm & Create Ticket' })
  await confirm.evaluate(button => { button.click(); button.click() })
  await expect.poll(() => Boolean(saved?.id)).toBe(true)
  await expect(page.getByRole('dialog').getByRole('button', { name: /Saving/ })).toBeDisabled()
  release()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(posts).toBe(1)
})

test('a saved ticket confirmation is removed when the account changes', async ({ page }) => {
  await page.goto('/complaints/new')
  await login(page, 'citizen')
  await page.getByRole('button', { name: 'Load sample', exact: true }).click()
  await page.getByRole('button', { name: 'Submit Complaint', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm & Create Ticket' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('Internal Ticket Successfully Saved!', { exact: true })).toBeVisible()
  await login(page, 'officer')
  await expect(page.getByText('Internal Ticket Successfully Saved!', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'View Package', exact: true })).toHaveCount(0)
})

test('an older queue response cannot erase a newer ticket detail', async ({ page }) => {
  await page.goto('/requests')
  await login(page, 'citizen')
  let token
  let release
  const gate = new Promise(resolve => { release = resolve })
  let captured = false
  await page.route('**/api/complaints', async route => {
    if (route.request().method() !== 'GET' || captured) return route.continue()
    // Hold a real snapshot from before an independent API write.
    token = route.request().headers().authorization
    const response = await route.fetch()
    const older = await response.json()
    captured = true
    await gate
    await route.fulfill({ json: older })
  })
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect.poll(() => captured).toBe(true)
  const created = await page.request.post('http://127.0.0.1:8765/api/complaints', {
    headers: { Authorization: token }, data: { title: '[SYNTHETIC] Independent API write',
      description: 'Synthetic stale snapshot regression only.', category: 'streetlight', locality: 'Test Ward' },
  })
  expect(created.status()).toBe(201)
  const saved = await created.json()
  await page.locator('aside').getByRole('link', { name: 'Track Status', exact: true }).click()
  await page.getByPlaceholder('Enter the saved ticket UUID...').fill(saved.id)
  await page.getByRole('button', { name: 'Track Request', exact: true }).click()
  await expect(page.getByText(saved.title, { exact: true })).toBeVisible()
  release()
  await expect(page.getByText('Loading saved complaints', { exact: false })).toHaveCount(0)
  await expect(page.getByText(saved.title, { exact: true })).toBeVisible()
})

test('signing into another account clears scheme conversation and ignores its late reply', async ({ page }) => {
  await page.goto('/schemes')
  await login(page, 'citizen')
  let release
  const gate = new Promise(resolve => { release = resolve })
  let captured = false
  await page.route('**/api/schemes/ask', async route => {
    captured = true
    await gate
    await route.fulfill({ json: { answer: 'Synthetic prior citizen reply', citations: [], tool_trace: [], mode: 'insufficient_evidence' } })
  })
  await page.getByPlaceholder('Ask a follow-up question...').fill('Synthetic private citizen scheme question')
  await page.getByRole('button', { name: 'Send question', exact: true }).click()
  await expect.poll(() => captured).toBe(true)
  await login(page, 'officer')
  release()
  await expect(page.getByText('Synthetic private citizen scheme question', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Synthetic prior citizen reply', { exact: true })).toHaveCount(0)
  const question = page.getByPlaceholder('Ask a follow-up question...')
  await expect(question).toHaveValue('')
  await question.fill('Synthetic new officer question')
  await expect(page.getByRole('button', { name: 'Send question', exact: true })).toBeEnabled()
})

test('sign-in dialog contains keyboard focus, closes on Escape and restores focus', async ({ page }) => {
  await page.goto('/officer')
  const opener = page.locator('main').getByRole('button', { name: 'Officer Sign In', exact: true })
  await opener.click()
  const modal = page.getByRole('dialog')
  await expect(modal).toBeVisible()
  await expect.poll(() => modal.evaluate(node => node.contains(document.activeElement))).toBe(true)
  await modal.getByRole('button', { name: 'Sign in', exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect(modal.getByRole('button', { name: 'Forgot password?', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(modal.getByRole('button', { name: 'Close sign in' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(modal).toHaveCount(0)
  await expect(opener).toBeFocused()
})

test('a same-account token refresh does not discard a successfully committed complaint', async ({ page }) => {
  await page.goto('/complaints/new')
  await login(page, 'citizen')
  let release
  const gate = new Promise(resolve => { release = resolve })
  let saved
  await page.route('**/api/complaints', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    const response = await route.fetch()
    saved = await response.json()
    await gate
    await route.fulfill({ response })
  })
  await page.getByRole('button', { name: 'Load sample', exact: true }).click()
  await page.getByRole('button', { name: 'Submit Complaint', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm & Create Ticket' }).click()
  await expect.poll(() => Boolean(saved?.id)).toBe(true)
  const refreshed = await page.evaluate(async () => {
    const { supabase } = await import('/src/lib/supabase.js')
    const { error } = await supabase.auth.refreshSession()
    return !error
  })
  expect(refreshed).toBe(true)
  release()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText(saved.id, { exact: true }).first()).toBeVisible()
})

test('existing detail, review, package and officer modals support keyboard dismissal', async ({ page }) => {
  await page.goto('/schemes')
  await page.getByRole('button', { name: /View Details & Citation/ }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.locator('aside').getByRole('link', { name: 'Raise Complaint', exact: true }).click()
  await login(page, 'citizen')
  await page.getByRole('button', { name: 'Load sample', exact: true }).click()
  await page.getByRole('button', { name: 'Submit Complaint', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByPlaceholder('e.g. Streetlight not working near City Park')).toHaveValue('[SYNTHETIC] Streetlight needs repair')
  await page.getByRole('button', { name: 'Submit Complaint', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm & Create Ticket' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'View & Copy Official Package' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await login(page, 'officer')
  await page.locator('aside').getByRole('link', { name: 'Officer demo', exact: true }).click()
  await page.getByRole('button', { name: 'Audit / Review', exact: true }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('sidebar navigation, browser history, refresh and unknown-route fallback work', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await page.locator('aside').getByRole('link', { name: 'Find Schemes', exact: true }).click()
  await expect(page).toHaveURL(/\/schemes$/)
  await page.locator('aside').getByRole('link', { name: 'Raise Complaint', exact: true }).click()
  await expect(page).toHaveURL(/\/complaints\/new$/)
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Discover Government Schemes with AI' })).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('heading', { name: 'Raise a Civic Grievance' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Raise a Civic Grievance' })).toBeVisible()
  await page.goto('/unknown-audit-route')
  await expect(page).toHaveURL('http://127.0.0.1:5174/')
  await expect(page.getByRole('heading', { name: /Citizen Services Assistant/ })).toBeVisible()
  expect(errors).toEqual([])
})
