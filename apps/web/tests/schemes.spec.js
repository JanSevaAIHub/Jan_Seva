import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const url = 'https://www.pib.gov.in/PressNoteDetails.aspx?ModuleId=3&NoteId=157019&lang=1&reg=44'
const text = readFileSync(fileURLToPath(new URL('../../../data/scheme_sources/ssy.txt', import.meta.url)), 'utf8')
const record = {
  id: 'c1260767-8d0a-4cb2-bcbe-c3395583b9ee', title: 'Sukanya Samriddhi Yojana (SSY)', state: 'National',
  category: 'Savings', description: 'Government small-savings account for a girl child.', source_url: url,
  reviewed_at: '2026-11-07T00:00:00+05:30', rules_json: {},
  eligibility: text.split('\n\n')[2], required_documents: ['Girl child birth certificate'],
  evidence_text: text, evidence_kind: 'reviewed_paraphrase', document_note: 'Only verified source records are listed.',
}

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
})

test('scheme UI displays real API contracts, source modal and grounded chat (HTTP response doubles)', async ({ page }) => {
  const requests = []
  await page.route('**/api/schemes**', async route => {
    const request = route.request()
    requests.push(request.url())
    if (request.method() === 'POST') {
      expect(request.postDataJSON().message).toContain('documents')
      await route.fulfill({ json: { answer: 'Reviewed evidence summary: ' + text.split('\n\n')[3],
        mode: 'grounded_extracts', tool_trace: [], citations: [{ title: record.title, url,
        scheme_id: record.id, chunk_id: 'c238f148-6900-4212-bbcb-cfd640cf8b8d', excerpt: text.split('\n\n')[3], reviewed_at: record.reviewed_at }] } })
    } else {
      const query = new URL(request.url()).searchParams.get('query')
      await route.fulfill({ json: query === 'unfindable' ? [] : [record] })
    }
  })
  await page.goto('/schemes')
  await expect(page.getByRole('heading', { name: record.title })).toBeVisible()
  await page.getByRole('button', { name: 'View Details & Citation' }).click()
  await expect(page.getByRole('dialog').getByText('Published Eligibility Conditions')).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('link', { name: /Check Official Source/ })).toHaveAttribute('href', url)
  await expect(page.getByRole('dialog').getByText('Girl child birth certificate', { exact: true })).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByLabel('Scheme category').selectOption('Savings')
  await expect.poll(() => requests.some(r => r.includes('category=Savings'))).toBe(true)
  await page.getByPlaceholder('Ask a follow-up question...').fill('What documents are required for Sukanya Samriddhi?')
  await page.locator('form').getByRole('button', { name: 'Send question' }).click()
  await expect(page.getByText('Reviewed evidence summary:', { exact: false })).toBeVisible()
  await expect(page.getByRole('link', { name: record.title, exact: true })).toHaveAttribute('href', url)
  await page.getByPlaceholder('Search scheme name or keyword...').fill('unfindable')
  await expect(page.getByText('No schemes match the selected filters or search query.')).toBeVisible()
})

test('scheme service errors are visible and chat draft is kept (HTTP failure double)', async ({ page }) => {
  await page.route('**/api/schemes**', route => route.fulfill({ status: 503,
    json: { detail: { code: 'MODEL_UNAVAILABLE', message: 'Synthetic scheme service failure' } } }))
  await page.goto('/schemes')
  await expect(page.getByRole('alert').filter({ hasText: 'Synthetic scheme service failure' })).toBeVisible()
  const input = page.getByPlaceholder('Ask a follow-up question...')
  await input.fill('Show verified student schemes')
  await page.getByRole('button', { name: 'Send question' }).click()
  await expect(input).toHaveValue('Show verified student schemes')
  await expect(page.getByText('Your question is kept so you can retry.', { exact: false })).toBeVisible()
})
