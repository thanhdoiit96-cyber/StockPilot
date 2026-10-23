import { test, expect } from '@playwright/test'
import { performance } from 'node:perf_hooks'

test('measures recommendation rendering with local read APIs and isolated account state', async ({ page }) => {
  test.skip(process.env.MEASURE_PREDICTION_READS !== 'true', 'Explicit local measurement only')
  test.setTimeout(90000)
  if (process.env.MEASURE_MOBILE === 'true') await page.setViewportSize({ width: 390, height: 844 })
  const allowed = new Set(['/api/recommendations/latest', '/api/recommendations/history', '/api/recommendations/history/summary', '/api/recommendations/lifecycle-readiness'])
  const calls = []
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (route.request().method() === 'GET' && allowed.has(path)) {
      const url = new URL(route.request().url())
      const response = await route.fetch({ url: `http://127.0.0.1:5000${url.pathname}${url.search}` })
      calls.push({ path, status: response.status() })
      return route.fulfill({ response })
    }
    if (path === '/api/auth/me') return route.fulfill({ json: { success: true, user: { id: 'performance-isolated', email: 'fixture@example.com', role: 'user', preferred_language: 'vi' } } })
    return route.fulfill({ json: { success: true, data: path === '/api/portfolio' ? { positions: [], recommendation_entries: [] } : [] } })
  })
  const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const samples = []
  for (let index = 0; index < 5; index++) {
    await page.goto('/')
    await expect(page.locator('.dashboard-shell')).toBeVisible()
    const start = performance.now()
    await page.getByRole('button', { name: 'Đề xuất', exact: true }).click()
    await expect(page.locator('.recommendation-signal').first()).toBeVisible()
    await frames()
    const ideasMs = performance.now() - start
    const historyStart = performance.now()
    await page.locator('#recommendation-tab-history').click()
    await expect(page.locator('.recommendation-cohort-progress')).toBeVisible()
    await frames()
    const historyMs = performance.now() - historyStart
    const summaries = calls.filter(item => item.path === '/api/recommendations/history/summary').length
    await page.locator('#recommendation-tab-ideas').click()
    await page.locator('#recommendation-tab-history').click()
    await expect(page.locator('.recommendation-cohort-progress')).toBeVisible()
    await frames()
    expect(calls.filter(item => item.path === '/api/recommendations/history/summary').length).toBe(summaries)
    samples.push({ ideas_ms: Math.round(ideasMs), history_ms: Math.round(historyMs) })
  }
  const percentile = (key, p) => samples.map(sample => sample[key]).sort((a,b) => a-b)[Math.ceil(samples.length*p)-1]
  console.log(JSON.stringify({ measurement: 'isolated_browser_local_read_api', viewport: page.viewportSize(), samples, p50: { ideas_ms: percentile('ideas_ms', .5), history_ms: percentile('history_ms', .5) }, p95: { ideas_ms: percentile('ideas_ms', .95), history_ms: percentile('history_ms', .95) }, requests: Object.fromEntries([...allowed].map(path => [path, calls.filter(item => item.path === path).length])), all_read_responses_ok: calls.every(item => item.status === 200) }))
  expect(calls.every(item => item.status === 200)).toBe(true)
})
