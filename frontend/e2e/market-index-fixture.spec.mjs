import { test, expect } from '@playwright/test'

test('shows a clearly labeled synthetic index card in opt-in preview', async ({ page }) => {
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
  await expect(card).toBeVisible()
  await expect(card).toContainText('INDEX fixture')
  await expect(card).toContainText('1,275')
  await expect(card).toContainText('+11 (+0.87%)')
  await expect(card).toHaveAttribute('title', /Asia\/Ho_Chi_Minh/)
})
