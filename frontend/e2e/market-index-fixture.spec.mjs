import { test, expect } from '@playwright/test'

test('does not expose the synthetic index card in production preview', async ({ page }) => {
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth/me') return route.fulfill({ json: { success: true, user: { id: 'fixture-ui', email: 'fixture@example.com', role: 'user' } } })
    if (path === '/api/stocks') return route.fulfill({ json: { success: true, data: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 1 } } })
    return route.fulfill({ json: { success: true, data: [] } })
  })
  await page.goto('/')
  await expect(page.locator('.dashboard-shell')).toBeVisible()
  await page.getByRole('button', { name: /Bảng giá/ }).click()
  const card = page.locator('.market-index-fixture')
  await expect(card).toHaveCount(0)
})
