import { test, expect } from '@playwright/test'

for (const width of [1280, 390]) test(`recommendation freshness distinguishes session and issuance at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  const mutations = []
  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (request.method() !== 'GET') mutations.push(path)
    if (path === '/api/auth/me') return route.fulfill({ json: { success: true, user: { email: 'fixture@example.com', role: 'user', preferred_language: 'vi' } } })
    let data = []
    if (path === '/api/recommendations/latest') data = {
      run: { as_of: '2026-10-21', created_at: '2026-10-21T10:11:05Z', horizon_days: 20 },
      recommendations: [{ id: 'old', rank: 1, score: 75, entry_price: 10000, stock: { code: 'FPT' }, rationale: { reference_plan: { price_source: 'eod', observed_at: '2026-10-21T00:00:00Z' } } }]
    }
    if (path === '/api/recommendations/lifecycle-readiness') data = { status: 'awaiting_coverage', expected_session: '2026-10-23', latest_eod_session: '2026-10-23', can_generate: false, coverage: { symbols: 123, covered: 114, missing_symbols: Array(9).fill('MISSING') } }
    if (path === '/api/portfolio') data = { positions: [], recommendation_entries: [] }
    if (path === '/api/recommendations/history') data = [{ id: 'pending-run', as_of: '2026-10-21', measured_count: 0, pending_count: 5 }]
    await route.fulfill({ json: { success: true, data } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Đề xuất', exact: true }).click()
  await expect(page.locator('.recommendation-lifecycle-status')).toContainText('114/123')
  await expect(page.locator('.recommendation-lifecycle-status')).toContainText('thiếu 9 mã')
  await expect(page.locator('.recommendation-workbench')).toContainText('Tạo bản đề xuất: 17:11')
  const summary = page.locator('.recommendation-summary-strip')
  await expect(summary).toContainText('Mã đề xuất')
  await expect(summary).toContainText('Đợt lịch sử')
  await expect(summary).not.toContainText('Đợt đã đo')
  await expect(summary.locator('.recommendation-summary-tile').nth(2).locator('strong')).toHaveText('1')
  await page.locator('#recommendation-tab-learning').click()
  await expect(page.locator('.learning-stat-grid > div').first().locator('strong')).toHaveText('0')
  await page.locator('#recommendation-tab-ideas').click()
  await expect(page.locator('.saved-proposal-picker')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Tạo đề xuất cá nhân', exact: true })).toBeEnabled()
  const evidence = page.locator('.recommendation-signal')
  await expect(evidence).toContainText('Phiên giá tham chiếu EOD: 21/10/26')
  await expect(evidence).not.toContainText('07:00')
  await page.locator('.recommendation-lifecycle-status').getByRole('button', { name: 'Làm mới' }).click()
  expect(mutations.filter(path => path.includes('recommendations'))).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
