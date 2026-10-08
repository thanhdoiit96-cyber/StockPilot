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

test('keeps available positions visible when ledger and cash resources are empty', async ({ page }) => {
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth/me') return route.fulfill({ json: { success: true, user: { id: 'partial-state', email: 'partial@example.com', role: 'admin' } } })
    if (path === '/api/portfolio') return route.fulfill({ json: { success: true, data: { positions: [{ stock_id: 'a', symbol: 'FPT', quantity: 10, market_price: 120000, avg_cost: 100000, unrealized_pnl: 200000 }], closed_positions: [], position_counts: { open: 1, closed: 0 }, transactions: [], cash_flows: [] } } })
    if (path === '/api/stocks') return route.fulfill({ json: { success: true, data: [{ id: 'a', code: 'FPT', name: 'FPT Corp', price: 120000, industry: 'technology', volume: 1000 }], pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 } } })
    if (path === '/api/stocks/quotes') return route.fulfill({ json: { success: true, data: { FPT: { price: 120000, volume: 1000, change: 0, volume_type: 'session', observed_at: '2026-10-08T10:00:00+07:00' } } } })
    return route.fulfill({ json: { success: true, data: [] } })
  })
  await page.goto('/')
  await expect(page.locator('.dashboard-shell')).toBeVisible()
  await page.getByRole('button', { name: 'Danh mục cá nhân', exact: true }).click()
  const tabs = page.getByRole('tablist', { name: 'Nội dung danh mục' })
  await expect(page.locator('.portfolio-positions')).toContainText('FPT')
  await tabs.getByRole('tab', { name: /Giao dịch/ }).click()
  await expect(page.locator('.portfolio-ledger-empty')).toBeVisible()
  await expect(page.locator('.portfolio-ledger-panel')).toContainText('Chưa có giao dịch nào')
  await tabs.getByRole('tab', { name: /Dòng tiền/ }).click()
  await expect(page.locator('.cash-flow-empty')).toBeVisible()
  await expect(page.locator('.cash-flow-panel')).toContainText('Chưa có dòng tiền')
})

test('recovers portfolio resource after a local retry without page reload', async ({ page }) => {
  let portfolioCalls = 0
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth/me') return route.fulfill({ json: { success: true, user: { id: 'retry-state', email: 'retry@example.com', role: 'admin' } } })
    if (path === '/api/portfolio') {
      portfolioCalls += 1
      if (portfolioCalls === 1) return route.fulfill({ status: 503, json: { success: false, code: 'portfolio_load_failed', message: 'temporary portfolio failure' } })
      return route.fulfill({ json: { success: true, data: { positions: [{ stock_id: 'a', symbol: 'FPT', quantity: 10, market_price: 120000, avg_cost: 100000, unrealized_pnl: 200000 }], closed_positions: [], position_counts: { open: 1, closed: 0 }, transactions: [], cash_flows: [] } } })
    }
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
  await ledger.getByRole('button', { name: 'Thử lại' }).click()
  await expect(ledger.locator('.portfolio-resource-state[role="alert"]')).toHaveCount(0)
  await expect(ledger.locator('.portfolio-ledger-empty')).toBeVisible()
  await expect(page.locator('.portfolio-positions')).toContainText('FPT')
  expect(portfolioCalls).toBe(2)
})
