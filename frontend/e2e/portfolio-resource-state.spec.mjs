import { test, expect } from '@playwright/test'

test('keeps ledger and cash failures distinct from empty state on mobile', async ({ page }) => {
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth/me') return route.fulfill({ json: { success: true, user: { id: 'resource-state', email: 'resource@example.com', role: 'admin' } } })
    if (path === '/api/portfolio') return route.fulfill({ status: 503, json: { success: false, code: 'portfolio_load_failed', message: 'portfolio resource unavailable' } })
    if (path === '/api/stocks') return route.fulfill({ json: { success: true, data: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 1 } } })
    return route.fulfill({ json: { success: true, data: [] } })
  })
  await page.goto('/')
  await expect(page.locator('.dashboard-shell')).toBeVisible()
  await page.getByRole('button', { name: 'Danh mục cá nhân', exact: true }).click()
  const tabs = page.getByRole('tablist', { name: 'Nội dung danh mục' })
  await tabs.getByRole('tab', { name: /Giao dịch/ }).click()
  const ledger = page.locator('.portfolio-ledger-panel')
  await expect(ledger.locator('.portfolio-resource-state[role="alert"]')).toBeVisible()
  await expect(ledger.locator('.portfolio-ledger-empty')).not.toBeVisible()
  await tabs.getByRole('tab', { name: /Dòng tiền/ }).click()
  const cash = page.locator('.cash-flow-panel')
  await expect(cash.locator('.portfolio-resource-state[role="alert"]')).toBeVisible()
  await expect(cash.locator('.cash-flow-empty')).not.toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await ledger.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  expect(await cash.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
})
