import { expect } from '@playwright/test'

export async function login(page, role) {
  await page.locator('header').getByRole('button', { name: /Guest|Arjun Mishra|R. Singh/ }).click()
  await page.getByRole('button', { name: role === 'officer' ? 'Officer Sign In' : 'Citizen Sign In', exact: true }).last().click()
  const modal = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: /Sign in/ }) })
  await modal.getByLabel('Email').fill(role === 'officer' ? 'singh@example.test' : 'arjun@example.test')
  await modal.getByLabel('Password').fill(process.env.E2E_AUTH_PASSWORD)
  await modal.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(modal).toBeHidden()
  await expect(page.locator('header').getByRole('button', { name: role === 'officer' ? 'R. Singh' : 'Arjun Mishra', exact: true })).toBeVisible()
}
