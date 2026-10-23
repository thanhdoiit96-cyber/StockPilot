import { test, expect } from '@playwright/test'
import { forecastBreadthTarget } from '../src/services/forecastBreadth.mjs'

for (const width of [1280, 390]) test(`compact forecast discloses partial inputs and supports retry (${width})`, async ({ page }) => {
  let requests = 0
  await page.setViewportSize({ width, height: 900 })
  await page.addInitScript(() => { globalThis.__VITE_ENABLE_FORECAST_LIVE__ = 'true' })
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url()), path = url.pathname
    if (path === '/api/auth/me') return route.fulfill({ json: { success: true, user: { email: 'fixture@example.com', role: 'user', preferred_language: 'vi' } } })
    if (path === '/api/forecast/live-preview') {
      requests++
      if (requests === 1) return route.fulfill({ status: 503, json: { success: false } })
      return route.fulfill({ json: { success: true, data: { status: 'live_preview', mode: 'live', live: true, synthetic: false, research_only: false, market_accuracy_verified: false, provider: 'vnstock', as_of: '2026-10-22T08:00:00Z', staleness_days: 1, maximum_staleness_days: 7, horizon_sessions: Number(url.searchParams.get('horizon')), breadth_target: forecastBreadthTarget, probabilities: [{ class: 'advancing', value: .5 }, { class: 'balanced', value: .3 }, { class: 'declining', value: .2 }], validation: { status: 'monitoring', market_accuracy_verified: false, current_data_ready: true, evidence_integrity: true, coverage_ok: true, minimum_samples_ok: true, staleness_ok: true, calibration_validated: false, independent_audit_validated: false, provider_validation_completed: false }, current_data: { input_scope: { requested_symbols: ['FPT','HPG','VHM'], used_symbols: ['FPT'], missing_symbols: ['HPG','VHM'] } } } } })
    }
    return route.fulfill({ json: { success: true, data: path === '/api/portfolio' ? { positions: [], recommendation_entries: [] } : path === '/api/recommendations/latest' ? { recommendations: [] } : [] } })
  })
  await page.goto('/')
  const status = page.locator('.forecast-data-status')
  await expect(status).toContainText('Chưa có dữ liệu dự báo hợp lệ')
  await status.getByRole('button', { name: 'Thử lại' }).click()
  await expect(status).toContainText('1/3 mã được dùng')
  await expect(status).toContainText('HPG, VHM')
  await expect(status).toContainText('không đại diện toàn thị trường')
  expect(await status.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  expect(requests).toBe(2)
  await page.getByRole('button', { name: 'Mở rộng', exact: true }).click()
  await expect(status).toContainText('1/3 mã được dùng')
  expect(requests).toBe(2)
})
