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
  await expect(card.first()).toBeVisible()
  await expect(card.first()).toContainText('VNINDEX')
  await expect(page.locator('.market-index-fixture')).toHaveCount(2)
  await expect(page.locator('.market-index-fixture-selector')).toContainText('HNX30')
  await expect(card.first()).toContainText('1,275')
  await expect(card.first()).toContainText('+11 (+0.87%)')
  await expect(card.first()).toHaveAttribute('title', /Asia\/Ho_Chi_Minh/)
  await page.getByRole('button', { name: 'Đưa VN30 sang trái' }).click()
  await expect(card.first()).toContainText('VN30')
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('stockpilot-index-fixtures'))).toBe('["VN30","VNINDEX"]')
  await page.reload()
  await page.getByRole('button', { name: /Bảng giá/ }).click()
  await expect(page.locator('.market-index-fixture').first()).toContainText('VN30')
})
