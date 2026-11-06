import { test, expect } from '@playwright/test'
import { login } from './helpers/auth.js'

test('independent citizen and officer sessions share persistent authorized ticket history', async ({ browser }) => {
  const citizenContext = await browser.newContext({ baseURL: 'http://127.0.0.1:5174' })
  const officerContext = await browser.newContext({ baseURL: 'http://127.0.0.1:5174' })
  for (const context of [citizenContext, officerContext]) {
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
  }
  try {
    const citizen = await citizenContext.newPage()
    const officer = await officerContext.newPage()
    await citizen.goto('/complaints/new')
    await login(citizen, 'citizen')
    await officer.goto('/officer')
    await login(officer, 'officer')
    await expect(citizen.locator('header').getByRole('button', { name: 'Arjun Mishra', exact: true })).toBeVisible()
    await citizen.getByRole('button', { name: 'Load sample', exact: true }).click()
    await citizen.getByRole('button', { name: 'Submit Complaint', exact: true }).click()
    const savedResponse = citizen.waitForResponse(r => r.url().endsWith('/api/complaints') && r.request().method() === 'POST' && r.status() === 201)
    await citizen.getByRole('button', { name: 'Confirm & Create Ticket' }).click()
    const saved = await (await savedResponse).json()
    await expect(citizen.getByRole('dialog')).toHaveCount(0)
    await officer.getByRole('button', { name: /Refresh queue/ }).click()
    const row = officer.getByRole('row').filter({ hasText: saved.id })
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: 'Audit / Review' }).click()
    await officer.getByRole('dialog').getByRole('textbox').fill('Synthetic independent-session release review.')
    await officer.getByRole('button', { name: 'Apply Status Update' }).click()
    await expect(officer.getByRole('dialog').getByText('UNDER_REVIEW', { exact: true }).first()).toBeVisible()
    await citizen.goto(`/track?id=${saved.id}`)
    await expect(citizen.getByText('UNDER REVIEW', { exact: true }).first()).toBeVisible()
    await expect(citizen.getByText('Synthetic independent-session release review.', { exact: false }).last()).toBeVisible()
    await citizen.reload()
    await expect(citizen.getByText(saved.id, { exact: true }).first()).toBeVisible()
    await expect(citizen.getByText('Synthetic independent-session release review.', { exact: false }).last()).toBeVisible()
    await expect(officer.locator('header').getByRole('button', { name: 'R. Singh', exact: true })).toBeVisible()
  } finally {
    await citizenContext.close()
    await officerContext.close()
  }
})
