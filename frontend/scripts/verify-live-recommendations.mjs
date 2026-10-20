import { chromium } from '@playwright/test'

const baseUrl = process.env.UI_BASE_URL || 'http://127.0.0.1:4173'
const backendUrl = (process.env.BACKEND_URL || 'http://127.0.0.1:5000').replace(/\/$/, '')

async function readApi(path) {
  const response = await fetch(`${backendUrl}${path}`, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`)
  return response.json()
}

const latest = await readApi('/api/recommendations/latest')
const history = await readApi('/api/recommendations/history?limit=50')
const firstRunId = history.data?.[0]?.id
if (!firstRunId) throw new Error('recommendation history has no runs')
const [readiness, historySummary, firstReport, forecastPreview, forecastCohort] = await Promise.all([
  readApi('/api/recommendations/lifecycle-readiness'),
  readApi('/api/recommendations/history/summary'),
  readApi(`/api/recommendations/history/${encodeURIComponent(firstRunId)}`),
  readApi('/api/forecast/live-preview?symbols=FPT,HPG,VHM&horizon=5'),
  readApi('/api/forecast/live-cohort?horizon=5&minimum_samples=20'),
])

const browser = await chromium.launch({ channel: 'chrome', headless: true })

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

try {
  const page = await browser.newPage()
  await page.addInitScript(() => localStorage.setItem('market-auth', JSON.stringify({ token: 'local-ui-smoke', user: { email: 'local-smoke@example.com', role: 'user' } })))
  await page.route('**/api/auth/me', route => route.fulfill({ json: { success: true, user: { email: 'local-smoke@example.com', role: 'user' } } }))
  await page.route('**/api/watchlist', route => route.fulfill({ json: { success: true, data: [] } }))
  await page.route('**/api/portfolio', route => route.fulfill({ json: { success: true, data: { positions: [] } } }))
  await page.route('**/api/recommendations/latest', route => route.fulfill({ json: latest }))
  await page.route('**/api/recommendations/lifecycle-readiness', route => route.fulfill({ json: readiness }))
  await page.route('**/api/recommendations/history*', route => route.fulfill({ json: route.request().url().includes(firstRunId) ? firstReport : history }))
  await page.route('**/api/recommendations/history/summary', route => route.fulfill({ json: historySummary }))
  await page.route('**/api/recommendations/saved', route => route.fulfill({ json: { success: true, data: [] } }))
  await page.route('**/api/forecast/live-preview*', route => route.fulfill({ json: forecastPreview }))
  await page.route('**/api/forecast/live-cohort*', route => route.fulfill({ json: forecastCohort }))
  await page.goto(`${baseUrl}/?view=recommendations`, { waitUntil: 'domcontentloaded' })
  await page.locator('.recommendations-page').waitFor()
  await page.locator('.personalized-list > li').first().waitFor()
  const recommendationCount = await page.locator('.personalized-list > li').count()
  const staleNoticeVisible = await page.locator('.recommendation-stale-notice').isVisible()
  assert(recommendationCount > 0, 'latest EOD recommendations are not rendered')
  assert(staleNoticeVisible, 'latest EOD snapshot does not disclose its prior-session status')

  await page.locator('#recommendation-tab-history').click()
  await page.locator('.recommendation-history-report').waitFor()
  const historyRuns = await page.locator('.recommendation-history-table tbody tr').count()
  assert(historyRuns > 0, 'recommendation history is not rendered')
  await page.locator('.recommendation-history-table button').first().click()
  await page.locator('.snapshot-report-detail').waitFor()

  await page.locator('#recommendation-tab-learning').click()
  await page.locator('.learning-status').waitFor()
  const learningState = await page.locator('.learning-status').innerText()
  assert(/chưa áp dụng|collecting|not applied|collecting evaluation/i.test(learningState), 'calibration state is not disclosed')

  await page.goto(`${baseUrl}/?view=overview`, { waitUntil: 'domcontentloaded' })
  await page.locator('.short-term-outlook').waitFor()
  await page.locator('.outlook-compact-badge').waitFor()
  await page.waitForFunction(() => document.querySelector('.outlook-compact-badge')?.textContent?.trim().toLowerCase() === 'live')
  const forecastBadge = await page.locator('.outlook-compact-badge').innerText()
  assert(forecastBadge.trim().toLowerCase() === 'live', `forecast preview is not live: ${forecastBadge}`)

  console.log(JSON.stringify({
    baseUrl,
    backendUrl,
    recommendationCount,
    staleNoticeVisible,
    historyRuns,
    learningState,
    forecastBadge,
    checked_at: new Date().toISOString(),
  }))
} finally {
  await browser.close()
}
