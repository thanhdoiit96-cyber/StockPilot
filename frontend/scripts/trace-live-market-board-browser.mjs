import { chromium } from '@playwright/test'

const uiUrl = (process.env.MARKET_UI_URL || 'http://127.0.0.1:4173').replace(/\/$/, '')
const token = process.env.MARKET_AUTH_TOKEN || ''
const timeoutMs = Math.max(5_000, Number.parseInt(process.env.MARKET_TRACE_TIMEOUT_MS || '45000', 10) || 45000)

if (!token) {
  console.log(JSON.stringify({
    skipped: true,
    reason: 'MARKET_AUTH_TOKEN is required for an authenticated browser trace and is never written to disk.',
    ui_url: uiUrl
  }, null, 2))
  process.exit(0)
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const requests = new Map()
const events = []
const startedAt = performance.now()

page.on('request', request => {
  const path = new URL(request.url()).pathname
  if (path === '/api/stocks' || path === '/api/stocks/quotes' || path === '/api/stocks/quotes/status') {
    requests.set(request, { path, started_ms: Math.round(performance.now() - startedAt) })
  }
})
page.on('response', response => {
  const entry = requests.get(response.request())
  if (entry) events.push({ ...entry, ended_ms: Math.round(performance.now() - startedAt), duration_ms: Math.round(performance.now() - startedAt - entry.started_ms), status: response.status() })
})
page.on('requestfailed', request => {
  const entry = requests.get(request)
  if (entry) events.push({ ...entry, ended_ms: Math.round(performance.now() - startedAt), duration_ms: Math.round(performance.now() - startedAt - entry.started_ms), status: null, error: request.failure()?.errorText || 'request_failed' })
})

try {
  await page.addInitScript(value => {
    localStorage.setItem('market-auth', JSON.stringify({ token: value }))
  }, token)
  await page.goto(uiUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs })
  await page.locator('.page-loading-overlay').waitFor({ state: 'hidden', timeout: timeoutMs }).catch(() => {})
  const boardButton = page.locator('.market-board-nav-item')
  await boardButton.click({ timeout: timeoutMs })
  await page.locator('.table-panel:visible').waitFor({ state: 'visible', timeout: timeoutMs })
  await page.locator('.page-loading-overlay').waitFor({ state: 'hidden', timeout: timeoutMs })
  console.log(JSON.stringify({
    skipped: false,
    measured_at: new Date().toISOString(),
    ui_url: uiUrl,
    navigation_ms: Math.round(performance.now() - startedAt),
    api_events: events
  }, null, 2))
} finally {
  await browser.close()
}
