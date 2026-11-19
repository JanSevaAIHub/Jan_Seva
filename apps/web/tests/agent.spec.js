import { test, expect } from '@playwright/test'
import { login } from './helpers/auth.js'

const api = 'http://127.0.0.1:8765/api'
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
})

async function ask(page, message) {
  await page.getByLabel('Message JanSeva AI').fill(message)
  await page.getByRole('button', { name: 'Send message', exact: true }).click()
}

test('Journey A: actual stored scheme tools, profile eligibility and official source', async ({ page }) => {
  await page.goto('/')
  await ask(page, 'What are the PMSBY scheme eligibility conditions?')
  const log = page.getByRole('log', { name: 'Assistant conversation' })
  await expect(log.getByText('Eligibility assessment (NEEDS_INFO)', { exact: false })).toBeVisible()
  await expect(log.getByRole('link', { name: /Pradhan Mantri Suraksha/ }).first()).toHaveAttribute('href', 'https://financialservices.gov.in/pmsby')
  await log.getByRole('button', { name: 'Open Scheme Discovery', exact: true }).click()
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click()
  const form = page.getByRole('form', { name: 'Scheme profile' })
  await form.getByLabel('Age', { exact: true }).fill('22')
  await form.getByText('Additional conditions', { exact: true }).click()
  await form.getByLabel('Participating bank or post-office account', { exact: true }).selectOption('true')
  await form.getByLabel('Auto-debit consent', { exact: true }).selectOption('true')
  await form.getByRole('button', { name: 'Use profile for checks' }).click()
  const card = page.locator('[data-scheme-id="2fa9a24a-4d17-5639-9e11-8d5624196722"]')
  await card.getByRole('button', { name: 'Check eligibility', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Scheme details' }).getByText('Potential match', { exact: true })).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('link', { name: /Check Official Source/ })).toHaveAttribute('href', 'https://financialservices.gov.in/pmsby')
})

test('Journey B: keyword analysis is labelled, draft transfer requires explicit authenticated confirmation', async ({ page }) => {
  await page.goto('/')
  await login(page, 'citizen')
  let creates = 0
  page.on('request', r => { if (r.method() === 'POST' && r.url().endsWith('/api/complaints')) creates++ })
  const before = await (await page.request.get(`${api}/health`)).json()
  expect(before.status).toBe('ok')
  await ask(page, 'Help prepare a complaint about a broken streetlight near the park')
  const log = page.getByRole('log')
  await expect(log.getByText('Complaint analysis: editable keyword suggestion', { exact: false })).toBeVisible()
  await expect(log.getByText('Your draft text (not submitted)', { exact: true })).toBeVisible()
  expect(creates).toBe(0)
  await log.getByRole('button', { name: 'Review complaint draft', exact: true }).click()
  await expect(page).toHaveURL(/\/complaints\/new$/)
  await expect(page.getByPlaceholder('Describe what happened, exact location landmark, and when it started...')).toHaveValue('Help prepare a complaint about a broken streetlight near the park')
  expect(creates).toBe(0)
  await page.getByPlaceholder('e.g. Streetlight not working near City Park').fill('Broken streetlight near park')
  await page.getByLabel('Locality', { exact: true }).fill('Park locality')
  await page.getByRole('button', { name: 'Submit Complaint', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('button', { name: /Confirm/ })).toBeVisible()
  expect(creates).toBe(0)
  await page.getByRole('dialog').getByRole('button', { name: /Confirm/ }).click()
  await expect.poll(() => creates).toBe(1)
})

test('Journey C: mixed request invokes scheme path and reports labelled keyword analysis with a safe draft', async ({ page }) => {
  let reply
  page.on('response', async response => { if (response.url().endsWith('/api/agent/message') && response.status() === 200) reply = await response.json() })
  await page.goto('/')
  await ask(page, 'Show government pension schemes and help prepare a water complaint')
  await expect(page.getByRole('log').getByRole('button', { name: 'Open Scheme Discovery' })).toBeVisible()
  await expect(page.getByRole('log').getByRole('button', { name: 'Review complaint draft' })).toBeVisible()
  await expect.poll(() => reply?.intent).toBe('mixed')
  expect(reply.tool_trace.some(t => t.tool === 'search_schemes')).toBe(true)
  expect(reply.tool_trace.some(t => t.tool === 'analyze_complaint' && t.status === 'ok')).toBe(true)
  expect(reply.citations.length).toBeGreaterThan(0)
})

test('editable quick prompts do not send until confirmation; keyboard composer sends one request', async ({ page }) => {
  let sends = 0
  page.on('request', r => { if (r.url().endsWith('/api/agent/message')) sends++ })
  await page.goto('/')
  await page.getByRole('button', { name: 'Scholarship for students', exact: true }).click()
  const input = page.getByLabel('Message JanSeva AI')
  await expect(input).toHaveValue('Scholarship for students')
  expect(sends).toBe(0)
  await input.fill('What government scholarships help students?')
  await input.press('Enter')
  await expect(page.getByRole('log').getByRole('button', { name: 'Open Scheme Discovery' })).toBeVisible()
  expect(sends).toBe(1)
})

test('agent failure, loading and retry preserve draft and block duplicate requests (HTTP timing/failure double)', async ({ page }) => {
  let release, sends = 0, failed = true
  await page.route('**/api/agent/message', async route => {
    sends++
    if (failed) {
      await new Promise(resolve => { release = resolve })
      await route.fulfill({ status: 503, json: { detail: { message: 'Temporary assistant outage' } } })
    } else await route.continue()
  })
  await page.goto('/')
  await ask(page, 'Show government schemes')
  await expect(page.getByRole('status').filter({ hasText: 'checking the available tools' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send message' })).toBeDisabled()
  await page.getByLabel('Message JanSeva AI').press('Enter')
  expect(sends).toBe(1)
  await expect.poll(() => Boolean(release)).toBe(true)
  release()
  await expect(page.getByRole('alert').filter({ hasText: 'Temporary assistant outage' })).toBeVisible()
  await expect(page.getByLabel('Message JanSeva AI')).toHaveValue('Show government schemes')
  failed = false
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByRole('log').getByRole('button', { name: 'Open Scheme Discovery' })).toBeVisible()
})

test('account change clears agent history and rejects a late completion (HTTP timing double)', async ({ page }) => {
  let release
  await page.route('**/api/agent/message', async route => {
    const response = await route.fetch()
    await new Promise(resolve => { release = resolve })
    await route.fulfill({ response })
  })
  await page.goto('/')
  await ask(page, 'Show government schemes')
  await expect.poll(() => Boolean(release)).toBe(true)
  await login(page, 'citizen')
  release()
  await expect(page.getByRole('log')).toHaveCount(0)
  await expect(page.getByLabel('Message JanSeva AI')).toHaveValue('')
})

for (const width of [320, 768, 1280]) {
  test(`homepage assistant composer remains usable at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await page.getByLabel('Message JanSeva AI').fill('Can you help me?')
    await page.getByLabel('Message JanSeva AI').press('Enter')
    await expect(page.getByRole('log').getByText('Would you like help', { exact: false })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('homepage-agent.png') })
  })
}
