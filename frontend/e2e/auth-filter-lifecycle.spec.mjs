import { test, expect } from '@playwright/test'

test('clears portfolio view filters across logout lifecycle', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('market-auth', JSON.stringify({ token: 'lifecycle-token', user: { email: 'lifecycle@example.com', role: 'user' } })))
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth/me') return route.fulfill({ json: { success: true, user: { email: 'lifecycle@example.com', role: 'user' } } })
    if (path === '/api/watchlist') return route.fulfill({ json: { success: true, data: [] } })
    if (path === '/api/portfolio') return route.fulfill({ json: { success: true, data: { positions: [], transactions: [], cash_flows: [] } } })
    if (path === '/api/stocks') return route.fulfill({ json: { success: true, data: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 1 } } })
    return route.fulfill({ json: { success: true, data: [] } })
  })
  await page.goto('/')
  await expect(page.locator('.dashboard-shell')).toBeVisible()
  await page.evaluate(() => { sessionStorage.setItem('stockpilot-watchlist-query', 'FPT'); sessionStorage.setItem('stockpilot-portfolio-position-sort', 'pnl') })
  await page.getByRole('button', { name: /Tài khoản và thông tin cá nhân/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Đăng xuất', exact: true }).click()
  const confirm = page.getByRole('button', { name: /Bỏ thay đổi và đăng xuất/ })
  if (await confirm.isVisible()) await confirm.click()
  await expect(page.locator('.auth-page')).toBeVisible()
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('stockpilot-watchlist-query'))).toBeNull()
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('stockpilot-portfolio-position-sort'))).toBeNull()
})
