import { test, expect } from '@playwright/test'
import { forecastBreadthTarget } from '../src/services/forecastBreadth.mjs'
for (const width of [1280, 390, 1024]) test(`OfficialVN30 never falls back to legacy inputs (${width})`, async ({ page }, testInfo) => {
  let requests = 0, legacy = 0
  await page.setViewportSize({ width, height: 900 })
  await page.addInitScript(() => { globalThis.__VITE_ENABLE_FORECAST_LIVE__ = 'true' })
  if (width === 1024) await page.addInitScript(() => localStorage.setItem('stockpilot-theme', 'light'))
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url()), path = url.pathname
    if (/forecast\/(live-preview|live-cohort|research-preview)/.test(path)) legacy++
    if (path === '/api/auth/me') return route.fulfill({ json: { success: true, user: { email: 'fixture@example.com', role: 'user', preferred_language: 'vi' } } })
    if (path === '/api/forecast/official-vn30-preview') {
      requests++
      if (requests >= 3) await new Promise(resolve => setTimeout(resolve, 300))
      const data = { version: 'official_vn30_preview_v1', universe: 'OfficialVN30', mode: 'internal_research', research_only: true, synthetic: false, live: false, publication_permitted: false, market_accuracy_verified: false, horizon_sessions: Number(url.searchParams.get('horizon')), as_of: '2026-10-26' }
      return route.fulfill({ json: { success: true, data: requests === 1 ? { ...data, status: 'unavailable', reason: 'membership_snapshot_unavailable' } : { ...data, status: 'official_vn30_preview', coverage: { observed: 29, universe: 30, history_sessions: 60 }, membership: { membership_sha256: 'a'.repeat(64), source_identifier: 'test-only', effective_from: '2026-08-03' }, input_sha256: 'b'.repeat(64), rights_verification: 'owner_attested_pending', breadth_target: forecastBreadthTarget, probabilities: [{ class: 'advancing', value: .5 }, { class: 'balanced', value: .3 }, { class: 'declining', value: .2 }] } } })
    }
    return route.fulfill({ json: { success: true, data: path === '/api/portfolio' ? { positions: [], recommendation_entries: [] } : path === '/api/recommendations/latest' ? { recommendations: [] } : [] } })
  })
  await page.goto('/')
  const panel = page.locator('.short-term-outlook'), status = panel.locator('.forecast-data-status')
  await expect(status).toContainText('Chưa có danh sách OfficialVN30')
  await expect(panel.locator('.outlook-compact-grid')).toHaveCount(0)
  await status.getByRole('button', { name: 'Thử lại' }).click()
  await expect(status).toContainText('29/30 mã')
  await expect(status).toContainText('26/10/2026')
  await expect(status.getByRole('button', { name: 'Làm mới', exact: true })).toBeEnabled()
  await expect(status.getByRole('button', { name: 'Thử lại', exact: true })).toHaveCount(0)
  await expect(panel).toContainText('Không phát hành công khai hoặc thương mại')
  await expect(panel.locator('.official-outlook-caution')).toContainText('chưa kiểm chứng')
  if (width === 1024) expect(await panel.evaluate(el => getComputedStyle(el).backgroundColor)).toContain('255, 255, 255')
  await panel.screenshot({ path: testInfo.outputPath('forecast-compact.png') })
  const detail = panel.locator('details')
  await detail.locator('summary').focus()
  await page.keyboard.press('Enter')
  await expect(detail).toHaveAttribute('open', '')
  await expect(detail).toContainText('chờ xác minh quyền')
  expect(requests).toBe(2)
  expect(legacy).toBe(0)
  expect(await panel.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  await panel.screenshot({ path: testInfo.outputPath('forecast-expanded.png') })
  await panel.getByRole('button', { name: '1 phiên', exact: true }).click()
  await expect(status.getByRole('button', { name: 'Đang tải…' })).toBeDisabled()
  await expect.poll(() => requests).toBe(3)
  await expect(status.getByRole('button', { name: 'Làm mới', exact: true })).toBeEnabled()
  await status.getByRole('button', { name: 'Làm mới', exact: true }).click()
  await expect(status.getByRole('button', { name: 'Đang tải…' })).toBeDisabled()
  await expect.poll(() => requests).toBe(4)
  await expect(status.getByRole('button', { name: 'Làm mới', exact: true })).toBeEnabled()
  expect(legacy).toBe(0)
  await panel.getByRole('button', { name: 'Mở Đề xuất' }).click()
  await expect(page.locator('.recommendation-workbench')).toBeVisible()
})
