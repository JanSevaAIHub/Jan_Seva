import { test, expect } from '@playwright/test'
import { login } from './helpers/auth.js'

const api = 'http://127.0.0.1:8765/api'
let records
test.beforeEach(async ({ page, request }) => {
  records = await (await request.get(`${api}/schemes?limit=50`)).json()
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
})
const pmsby = () => records.find(r => r.rules_json.slug === 'pmsby')
const card = (page, record) => page.locator(`[data-scheme-id="${record.id}"]`)
async function editProfile(page, age = '22') {
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click()
  const form = page.getByRole('form', { name: 'Scheme profile' })
  await form.getByLabel('Age', { exact: true }).fill(age)
  await form.getByText('Additional conditions', { exact: true }).click()
  await form.getByLabel('Participating bank or post-office account', { exact: true }).selectOption('true')
  await form.getByLabel('Auto-debit consent', { exact: true }).selectOption('true')
  await form.getByRole('button', { name: 'Use profile for checks' }).click()
}

test('real API: edit local profile, check potential and contradictory conditions, inspect evidence', async ({ page }) => {
  await page.goto('/schemes')
  await expect(card(page, pmsby())).toBeVisible()
  await editProfile(page)
  await card(page, pmsby()).getByRole('button', { name: 'Check eligibility', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Scheme details' })
  await expect(dialog.getByText('Potential match', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Age must be at least 18', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('link', { name: 'Check Official Source' })).toHaveAttribute('href', pmsby().source_url)
  await dialog.getByRole('button', { name: /View evidence for/ }).click()
  const drawer = page.getByRole('dialog', { name: 'Source evidence' })
  await expect(drawer.getByRole('blockquote')).toHaveText(pmsby().eligibility)
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await editProfile(page, '17')
  await expect(card(page, pmsby()).getByText('Not checked', { exact: true })).toBeVisible()
  await card(page, pmsby()).getByRole('button', { name: 'Check eligibility', exact: true }).click()
  await expect(dialog.getByText('Conditions not matched', { exact: true })).toBeVisible()
})

test('real API: absent profile produces missing fields and navigation keeps tab-local edits', async ({ page }) => {
  await page.goto('/schemes')
  await card(page, pmsby()).getByRole('button', { name: 'Check eligibility', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Scheme details' })
  await expect(dialog.getByText('More information needed', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Missing: Age, Participating bank or post-office account, Auto-debit consent')).toBeVisible()
  await dialog.getByRole('button', { name: 'Edit profile', exact: true }).click()
  const form = page.getByRole('form', { name: 'Scheme profile' })
  await form.getByLabel('Occupation', { exact: true }).fill('Student')
  await form.getByRole('button', { name: 'Use profile for checks' }).click()
  await page.getByRole('navigation').getByRole('link', { name: 'Home', exact: true }).click()
  await page.getByRole('navigation').getByRole('link', { name: 'Find Schemes' }).click()
  await expect(page.getByTestId('scheme-profile-summary')).toContainText('Student')
  await page.reload()
  await expect(page.getByTestId('scheme-profile-summary')).not.toContainText('Student')
})

test('real API: age ranges do not turn unknown age into a false match', async ({ page }) => {
  await page.goto('/schemes')
  await editProfile(page)
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click()
  const form = page.getByRole('form', { name: 'Scheme profile' })
  await form.getByLabel('Age format').selectOption('range')
  await form.getByLabel('Minimum Age').fill('16')
  await form.getByLabel('Maximum Age').fill('20')
  await form.getByRole('button', { name: 'Use profile for checks' }).click()
  await card(page, pmsby()).getByRole('button', { name: 'Check eligibility', exact: true }).click()
  await expect(page.getByRole('dialog').getByText('More information needed', { exact: true })).toBeVisible()
  await expect(page.getByRole('dialog').getByText(/range crosses this condition/)).toBeVisible()
})

test('real API with explicit catalog double: stored-text search, filters and cited ask', async ({ page }) => {
  await page.goto('/schemes')
  const search = page.getByPlaceholder('Search scheme name or keyword...')
  await search.fill('Sukanya Samriddhi')
  await expect(page.getByRole('heading', { name: 'Sukanya Samriddhi Yojana (SSY)', exact: true })).toBeVisible()
  await page.getByLabel('Scheme category').selectOption('Education')
  await expect(page.getByText('No schemes match the selected filters or search query.')).toBeVisible()
  await page.getByRole('button', { name: 'Reset filters' }).click()
  await search.fill('Galactic Farming')
  await expect(page.getByText('No schemes match the selected filters or search query.')).toBeVisible()
  await page.getByPlaceholder('Ask a follow-up question...').fill('What are the PMSBY conditions?')
  await page.getByRole('button', { name: 'Send question' }).click()
  await expect(page.getByText('Lexical retrieval fallback', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: `View evidence for ${pmsby().title}`, exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Source evidence' }).getByRole('blockquote')).toContainText(pmsby().eligibility)
})

test('keyword, category, state and reset send current filters (query HTTP double over real records)', async ({ page }) => {
  const calls = []
  await page.route('**/api/schemes?**', async route => {
    const params = new URL(route.request().url()).searchParams
    calls.push(Object.fromEntries(params))
    await route.fulfill({ json: records.filter(r => (!params.get('query') || r.title.toLowerCase().includes(params.get('query').toLowerCase())) &&
      (!params.get('category') || r.category === params.get('category')) && (!params.get('state') || r.state === 'National' || r.state === params.get('state'))) })
  })
  await page.goto('/schemes')
  await page.getByLabel('Scheme state').selectOption('Ladakh')
  await page.getByLabel('Scheme category').selectOption('Social Welfare')
  await page.getByPlaceholder('Search scheme name or keyword...').fill('Widow')
  await expect.poll(() => calls.some(c => c.query === 'Widow' && c.state === 'Ladakh' && c.category === 'Social Welfare')).toBe(true)
  await expect(page.getByRole('heading', { name: /Indira Gandhi National Widow/ })).toBeVisible()
  await page.getByRole('button', { name: 'Reset filters' }).click()
  await expect(page.getByLabel('Scheme state')).toHaveValue('All')
  await expect(page.getByLabel('Scheme category')).toHaveValue('All')
  await expect(page.getByPlaceholder('Search scheme name or keyword...')).toHaveValue('')
  await expect.poll(() => calls.at(-1).query === undefined && calls.at(-1).state === undefined && calls.at(-1).category === undefined).toBe(true)
})

test('new input invalidates older search responses, even during debounce (HTTP timing double)', async ({ page }) => {
  let releaseOld
  await page.route('**/api/schemes?**', async route => {
    const query = new URL(route.request().url()).searchParams.get('query')
    if (query === 'older') await new Promise(resolve => { releaseOld = resolve })
    await route.fulfill({ json: query === 'newer' ? [] : [pmsby()] })
  })
  await page.goto('/schemes')
  const input = page.getByPlaceholder('Search scheme name or keyword...')
  await input.fill('older')
  await expect.poll(() => Boolean(releaseOld)).toBe(true)
  await input.fill('newer')
  await expect(page.getByText('No schemes match the selected filters or search query.')).toBeVisible()
  releaseOld()
  await expect(card(page, pmsby())).toHaveCount(0)
  await input.fill('ab')
  await expect(page.getByText('Enter at least three characters to search.')).toBeVisible()
  await expect(card(page, pmsby())).toHaveCount(0)
})

test('search loading, failure and retry remain usable (HTTP double)', async ({ page }) => {
  let release, failed = true
  await page.route('**/api/schemes?**', async route => {
    await new Promise(resolve => { release = resolve })
    await route.fulfill(failed ? { status: 503, json: { detail: { message: 'Temporary search outage' } } } : { json: [pmsby()] })
  })
  await page.goto('/schemes')
  await expect(page.getByRole('status').filter({ hasText: 'Loading schemes' })).toBeVisible()
  await expect.poll(() => Boolean(release)).toBe(true)
  release()
  await expect(page.getByRole('alert')).toContainText('Temporary search outage')
  failed = false
  release = null
  await page.getByRole('button', { name: 'Retry search' }).click()
  await expect.poll(() => Boolean(release)).toBe(true)
  release()
  await expect(card(page, pmsby())).toBeVisible()
})

test('eligibility error supports retry and never shows an old result (HTTP failure double)', async ({ page }) => {
  let failed = true
  await page.route('**/api/schemes/eligibility', route => failed ? route.fulfill({ status: 503, json: { detail: { message: 'Eligibility temporarily unavailable' } } }) : route.continue())
  await page.goto('/schemes')
  await card(page, pmsby()).getByRole('button', { name: 'Check eligibility', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Scheme details' })
  await expect(dialog.getByRole('alert')).toContainText('Eligibility temporarily unavailable')
  failed = false
  await dialog.getByRole('button', { name: 'Retry eligibility' }).click()
  await expect(dialog.getByText('More information needed', { exact: true })).toBeVisible()
})

test('profile edits invalidate pending eligibility results and show loading (HTTP timing double)', async ({ page }) => {
  let release
  await page.route('**/api/schemes/eligibility', async route => {
    const response = await route.fetch()
    await new Promise(resolve => { release = resolve })
    await route.fulfill({ response })
  })
  await page.goto('/schemes')
  await editProfile(page)
  await card(page, pmsby()).getByRole('button', { name: 'Check eligibility', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Scheme details' })
  await expect(dialog.getByRole('status')).toContainText('Checking your supplied information')
  await expect.poll(() => Boolean(release)).toBe(true)
  await dialog.getByRole('button', { name: 'Edit profile', exact: true }).click()
  const form = page.getByRole('form', { name: 'Scheme profile' })
  await form.getByLabel('Age', { exact: true }).fill('17')
  await form.getByRole('button', { name: 'Use profile for checks' }).click()
  release()
  await expect(card(page, pmsby()).getByText('Not checked', { exact: true })).toBeVisible()
  await expect(card(page, pmsby()).getByText('Potential match', { exact: true })).toHaveCount(0)
})

test('ask retries preserve text and citation drawer uses actual evidence (HTTP answer double)', async ({ page }) => {
  let failed = true
  const record = pmsby()
  await page.route('**/api/schemes/ask', route => route.fulfill(failed ? { status: 503, json: { detail: { message: 'Temporary answer outage' } } } :
    { json: { answer: record.eligibility, mode: 'grounded_extracts', tool_trace: [], citations: [{ scheme_id: record.id,
      chunk_id: '4f6d7fc3-a227-40bc-92e1-358ba462ad98', title: record.title, url: record.source_url, excerpt: record.eligibility, reviewed_at: record.reviewed_at }] } }))
  await page.goto('/schemes')
  const input = page.getByPlaceholder('Ask a follow-up question...')
  await input.fill('What are the PMSBY conditions?')
  await page.getByRole('button', { name: 'Send question' }).click()
  await expect(input).toHaveValue('What are the PMSBY conditions?')
  await expect(page.getByRole('alert')).toContainText('Temporary answer outage')
  failed = false
  await page.getByRole('button', { name: 'Send question' }).click()
  const button = page.getByRole('button', { name: `View evidence for ${record.title}`, exact: true })
  await button.click()
  const drawer = page.getByRole('dialog', { name: 'Source evidence' })
  await expect(drawer.getByRole('blockquote')).toHaveText(record.eligibility)
  await expect(drawer.getByRole('link', { name: 'Open official source' })).toHaveAttribute('href', record.source_url)
  await page.keyboard.press('Escape')
  await expect(button).toBeFocused()
})

test('authenticated scheme requests use the shared bearer client and account change clears profile', async ({ page }) => {
  await page.goto('/schemes')
  await login(page, 'citizen')
  await editProfile(page)
  const pending = page.waitForRequest(r => r.url().endsWith('/api/schemes/eligibility'))
  await card(page, pmsby()).getByRole('button', { name: 'Check eligibility', exact: true }).click()
  expect((await pending).headers().authorization).toMatch(/^Bearer /)
  await page.getByRole('dialog', { name: 'Scheme details' }).getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: /Arjun Mishra/ }).click()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByTestId('scheme-profile-summary')).toContainText('No information supplied')
  await expect(card(page, pmsby()).getByText('Not checked', { exact: true })).toBeVisible()
})

for (const width of [320, 375, 768, 1280]) {
  test(`scheme module retains responsive layout and focus at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/schemes')
    await editProfile(page)
    await card(page, pmsby()).getByRole('button', { name: 'View Details & Citation' }).click()
    const dialog = page.getByRole('dialog', { name: 'Scheme details' })
    await expect(dialog).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.locator('aside.sidebar')).toHaveCSS('background-color', width > 768 ? 'rgb(23, 26, 69)' : 'rgb(255, 255, 255)')
    await expect(card(page, pmsby()).getByRole('link', { name: 'Official Source', exact: true })).toHaveCSS('background-color', 'rgb(101, 82, 206)')
    await page.screenshot({ path: testInfo.outputPath('scheme-discovery.png') })
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(card(page, pmsby()).getByRole('button', { name: 'View Details & Citation' })).toBeFocused()
  })
}
