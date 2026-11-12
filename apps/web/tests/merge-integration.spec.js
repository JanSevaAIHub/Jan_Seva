import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test('debounced related suggestions use authentication and preserve a manually chosen category', async ({ page }) => {
  await page.goto('/complaints/new')
  await login(page, 'citizen')
  await page.getByRole('button', { name: 'Load sample', exact: true }).click()
  await page.getByRole('button', { name: 'Submit Complaint', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm & Create Ticket' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  const analyzed = page.waitForResponse(r => r.url().endsWith('/api/complaints/analyze') && r.status() === 200)
  await page.getByRole('button', { name: 'Load sample', exact: true }).click()
  await page.locator('main select').selectOption('Roads & Potholes')
  const response = await analyzed
  expect(response.request().headers().authorization?.startsWith('Bearer ')).toBe(true)
  const body = await response.json()
  expect(body.duplicates.length).toBeGreaterThan(0)
  expect(body.related_complaints.map(item => item.id)).toEqual(body.duplicates.map(item => item.id))
  await expect(page.getByText('May be related to your own saved grievances', { exact: false })).toBeVisible()
  await expect(page.locator('main select')).toHaveValue('Roads & Potholes')
  await expect(page.getByText('Heuristic similarity:', { exact: false }).first()).toBeVisible()
})
