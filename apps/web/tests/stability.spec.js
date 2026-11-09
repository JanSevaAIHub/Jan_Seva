import { test, expect } from '@playwright/test'
import { login } from './helpers/auth.js'

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
})

test('Home navigation is honest and scheme listing comes from the actual isolated database', async ({ page, context }) => {
  let agentRequests = 0
  page.on('request', r => { if (r.url().endsWith('/api/agent/message')) agentRequests++ })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Citizen Services Assistant/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ask JanSeva AI', exact: true })).toBeVisible()
  await expect(page.getByText('12.8 L+', { exact: true })).toHaveCount(0)
  await expect(page.getByText('96%', { exact: true })).toHaveCount(0)
  await expect(page.locator('main').getByRole('link', { name: /^Raise Complaint/ })).toHaveAttribute('href', '/complaints/new')
  await expect(page.getByRole('link', { name: /^Track Requests/ })).toHaveAttribute('href', '/track')
  await page.getByLabel('Message JanSeva AI').fill('Show farmer schemes')
  await page.getByRole('button', { name: 'Send message', exact: true }).click()
  await page.getByRole('log').getByRole('button', { name: 'Open Scheme Discovery', exact: true }).click()
  await expect(page).toHaveURL(/\/schemes$/)
  expect(agentRequests).toBe(1)
  await page.getByPlaceholder('Search scheme name or keyword...').fill('')
  await expect(page.getByRole('heading', { name: 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)' })).toBeVisible()
  const link = page.getByRole('link', { name: 'Official Source', exact: true }).first()
  const destination = await link.getAttribute('href')
  expect(new URL(destination).hostname).toMatch(/\.gov\.in$|\.nic\.in$|^sansad\.in$/)
  // Check actual new-tab navigation to the stored official URL. The navigation
  // fixture does not claim to fetch or verify the external page's live content.
  await context.route(destination, route => route.fulfill({ contentType: 'text/html', body: '<p>Official URL navigation test only</p>' }))
  const popupEvent = page.waitForEvent('popup')
  await link.click()
  const popup = await popupEvent
  await expect(popup).toHaveURL(destination)
  await popup.close()
})

test('network and malformed backend responses do not crash React or erase the question', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/api/schemes**', route => route.request().method() === 'POST'
    ? route.fulfill({ json: { answer: { invalid: true }, citations: [] } })
    : route.fulfill({ json: [{ title: 'Malformed record' }] }))
  await page.goto('/schemes')
  await expect(page.getByRole('alert').filter({ hasText: 'invalid record' })).toBeVisible()
  const input = page.getByPlaceholder('Ask a follow-up question...')
  await input.fill('Show verified student schemes')
  await page.getByRole('button', { name: 'Send question' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'invalid answer' })).toBeVisible()
  await expect(input).toHaveValue('Show verified student schemes')
  await page.unroute('**/api/schemes**')
  await page.route('**/api/schemes**', route => route.abort('failed'))
  await page.getByRole('button', { name: 'Retry search' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Cannot reach the API' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Discover Government Schemes with AI' })).toBeVisible()
  expect(errors).toEqual([])
})

test('401 clears account data, keeps drafts, and logout survives reload', async ({ page }) => {
  await page.goto('/complaints/new')
  await login(page, 'citizen')
  const title = page.getByPlaceholder('e.g. Streetlight not working near City Park')
  await title.fill('Keep this unsaved draft after expiry')
  await page.route('**/api/complaints', route => route.request().method() === 'GET'
    ? route.fulfill({ status: 401, json: { detail: { code: 'INVALID_TOKEN', message: 'Expired test token' } } })
    : route.continue())
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.locator('header').getByRole('button', { name: 'Guest', exact: true })).toBeVisible()
  await expect(page.getByRole('alert').filter({ hasText: 'session expired' })).toBeVisible()
  await expect(title).toHaveValue('Keep this unsaved draft after expiry')
  await page.unroute('**/api/complaints')
  await login(page, 'citizen')
  await page.locator('header').getByRole('button', { name: 'Arjun Mishra', exact: true }).click()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.locator('header').getByRole('button', { name: 'Guest', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.locator('header').getByRole('button', { name: 'Guest', exact: true })).toBeVisible()
})

test('a late 401 from the prior account cannot sign out the newly logged-in officer', async ({ page }) => {
  await page.goto('/requests')
  let citizenToken
  page.on('request', request => {
    if (!citizenToken && request.url().endsWith('/api/complaints')) citizenToken = request.headers().authorization
  })
  await login(page, 'citizen')
  await expect.poll(() => Boolean(citizenToken)).toBe(true)
  let release
  let captured = false
  const gate = new Promise(resolve => { release = resolve })
  await page.route('**/api/complaints', async route => {
    if (!captured && route.request().headers().authorization === citizenToken) {
      captured = true
      await gate
      await route.fulfill({ status: 401, json: { detail: { code: 'INVALID_TOKEN' } } })
    } else await route.continue()
  })
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect.poll(() => captured).toBe(true)
  await login(page, 'officer')
  release()
  await expect(page.locator('header').getByRole('button', { name: 'R. Singh', exact: true })).toBeVisible()
  await page.goto('/officer')
  await expect(page.getByRole('table')).toBeVisible()
})

test('a queue outage preserves the verified officer role and supports a real retry', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/api/complaints', route => route.fulfill({ status: 503,
    json: { detail: { code: 'DATABASE_UNAVAILABLE', message: 'Synthetic queue outage' } } }))
  await page.goto('/officer')
  await login(page, 'officer')
  await expect(page.getByRole('alert').filter({ hasText: 'Synthetic queue outage' })).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
  await page.unroute('**/api/complaints')
  const retried = page.waitForResponse(r => r.url().endsWith('/api/complaints') && r.status() === 200)
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await retried
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('tracking the same ID again reloads the saved timeline', async ({ page }) => {
  await page.goto('/requests')
  await login(page, 'citizen')
  const detailLink = page.getByRole('link', { name: 'View details & audit history' }).first()
  // The preceding journey creates the shared isolated citizen's ticket. Create
  // another through the actual API if this test is run on its own.
  if (await detailLink.count() === 0) {
    await page.goto('/complaints/new')
    await page.getByRole('button', { name: 'Load sample', exact: true }).click()
    await page.getByRole('button', { name: 'Submit Complaint', exact: true }).click()
    await page.getByRole('button', { name: 'Confirm & Create Ticket' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.goto('/requests')
  }
  await page.getByRole('link', { name: 'View details & audit history' }).first().click()
  const id = new URL(page.url()).searchParams.get('id')
  await expect(page.getByText(id, { exact: true }).first()).toBeVisible()
  const reloaded = page.waitForResponse(response => response.url().endsWith(`/api/complaints/${id}`) && response.status() === 200)
  await page.getByRole('button', { name: 'Track Request', exact: true }).click()
  await reloaded
  await expect(page.getByRole('heading', { name: 'Milestone Progress & Audit Timeline' })).toBeVisible()
})

test('P0 pages and modals stay usable at phone and desktop widths', async ({ page }, testInfo) => {
  test.setTimeout(90000)
  await page.goto('/complaints/new')
  await login(page, 'citizen')
  await page.getByRole('button', { name: 'Load sample', exact: true }).click()
  await page.getByRole('button', { name: 'Submit Complaint', exact: true }).click()
  const savedResponse = page.waitForResponse(r => r.url().endsWith('/api/complaints') && r.request().method() === 'POST' && r.status() === 201)
  await page.getByRole('button', { name: 'Confirm & Create Ticket' }).click()
  const saved = await (await savedResponse).json()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await login(page, 'officer')
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  for (const width of [320, 375, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/', '/schemes', '/complaints/new', '/requests', '/track', '/officer']) {
      await page.goto(route)
      await expect(page.locator('main h1')).toBeVisible()
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), { message: `Page overflow at ${width}px: ${route}` }).toBe(true)
      if (width === 375 && route === '/') await page.screenshot({ path: testInfo.outputPath('mobile-home.png'), fullPage: true })
    }
  }
  await page.setViewportSize({ width: 375, height: 900 })
  await page.goto('/officer')
  const row = page.getByRole('row').filter({ hasText: saved.id })
  await expect(row).toBeVisible()
  expect(await page.getByRole('table').evaluate(table => table.getBoundingClientRect().width)).toBeGreaterThanOrEqual(760)
  await row.getByRole('button', { name: 'Audit / Review' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await page.getByRole('dialog').screenshot({ path: testInfo.outputPath('mobile-officer-audit.png') })
  expect(errors).toEqual([])
})
