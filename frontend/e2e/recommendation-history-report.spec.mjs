import { test, expect } from '@playwright/test'

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`snapshot report excludes legacy returns and has one history table (${viewport.width}px)`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const run = { id: 'run-legacy', as_of: '2026-09-01', selected_count: 1, measured_count: 0, excluded_count: 1, pending_count: 0, hit_rate_pct: null, average_forward_return_pct: null }
    let summaryRequests = 0
    let reportRequests = 0
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/recommendations/history/summary') summaryRequests++
      if (path === '/api/recommendations/history/run-legacy') reportRequests++
      if (path === '/api/auth/me') return route.fulfill({ json: { success: true, user: { email: 'fixture@example.com', role: 'user', preferred_language: 'vi' } } })
      let data = []
      if (path === '/api/recommendations/history') data = [run]
      else if (path === '/api/recommendations/history/summary') data = { cohorts: [], sector_cohorts: [] }
      else if (path === '/api/recommendations/history/run-legacy') data = { ...run, horizon_days: 20, summary: run, recommendations: [{ id: 'rec', rank: 1, stock: { code: 'FPT' }, score: 80, entry_price: 100, outcome: 'positive', forward_return_pct: 99, statistics_eligible: false, measurement_status: 'excluded', exclusion_reasons: ['snapshot_unverified', 'insufficient_observed_sessions'] }] }
      else if (path === '/api/recommendations/latest') data = { recommendations: [] }
      else if (path === '/api/portfolio') data = { positions: [], recommendation_entries: [] }
      else if (path === '/api/ai-gate') data = { enabled: false, reasons: [] }
      await route.fulfill({ json: { success: true, data } })
    })
    await page.goto('/')
    await page.getByRole('button', { name: 'Đề xuất', exact: true }).click()
    expect(summaryRequests).toBe(0)
    await expect(page.getByRole('tabpanel')).toHaveCount(1)
    const weight = page.locator('.criteria-control input[type="range"]').first()
    await weight.fill('45')
    const firstTab = page.locator('#recommendation-tab-ideas')
    await firstTab.focus()
    await firstTab.press('End')
    await expect(page.locator('#recommendation-tab-learning')).toBeFocused()
    await expect(page.locator('#recommendation-tab-learning')).toHaveAttribute('aria-selected', 'true')
    await page.locator('#recommendation-tab-learning').press('Home')
    await expect(firstTab).toBeFocused()
    await firstTab.press('ArrowRight')
    await expect(page.locator('#recommendation-tab-history')).toBeFocused()
    await page.getByRole('tab', { name: /Lịch sử & báo cáo/ }).click()
    await expect(page.getByRole('heading', { name: 'Lịch sử các đợt đề xuất chung' })).toHaveCount(0)
    await expect(page.locator('.recommendation-history-table')).toHaveCount(1)
    await page.getByRole('button', { name: 'Xem báo cáo', exact: true }).click()
    const detail = page.locator('.snapshot-report-detail')
    await expect(detail.getByText('Không tính thống kê', { exact: true })).toBeVisible()
    await expect(detail).toContainText('Chưa xác minh bản chụp gốc')
    await expect(detail).not.toContainText('99.00%')
    await expect(page.locator('.recommendation-aggregate')).not.toHaveAttribute('open', '')
    await firstTab.click()
    await expect(weight).toHaveValue('45')
    await page.locator('#recommendation-tab-history').click()
    await expect(detail).toBeVisible()
    expect(summaryRequests).toBe(1)
    expect(reportRequests).toBe(1)
    const tabs = page.locator('.recommendation-section-tabs')
    expect(await tabs.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true)
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Xuất CSV báo cáo' }).click()
    expect((await download).suggestedFilename()).toContain('2026-09-01.csv')
  })
}
