import { chromium } from '@playwright/test'
import fs from 'node:fs'

const frontendBase = process.env.FRONTEND_URL || 'http://127.0.0.1:4173'
const backendBase = process.env.BACKEND_URL || 'http://127.0.0.1:5000'
const samples = Math.max(1, Number(process.env.LIVE_PERF_SAMPLES || 5))

const percentile = (values, ratio) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)]
}
const summary = values => ({ samples: values.length, p50Ms: percentile(values, 0.5), p95Ms: percentile(values, 0.95), minMs: Math.min(...values), maxMs: Math.max(...values) })
const timedFetch = async url => {
  const started = performance.now()
  const response = await fetch(url, { cache: 'no-store' })
  const body = await response.json().catch(() => null)
  return { ms: Math.round(performance.now() - started), status: response.status, body }
}
const waitForBoardRows = async (page, timeoutMs = 30_000) => {
  const started = performance.now()
  const symbols = page.locator('.table-panel tbody tr .symbol')
  const errors = page.locator('.table-panel [role="alert"], .table-panel .error-text')
  while (performance.now() - started < timeoutMs) {
    const rowCount = await symbols.count()
    if (rowCount > 0) return rowCount
    if (await errors.count()) {
      const error = await errors.first().textContent()
      if (error?.trim()) throw new Error(`Market board failed to load: ${error.trim()}`)
    }
    await page.waitForTimeout(50)
  }
  throw new Error(`Market board did not attach a row within ${timeoutMs}ms`)
}

const health = await timedFetch(`${backendBase}/api/health`)
if (health.status !== 200) throw new Error(`Backend health HTTP ${health.status}`)

const listTimes = []
let symbols = []
for (let index = 0; index < samples; index += 1) {
  const result = await timedFetch(`${backendBase}/api/stocks?page=1&pageSize=500&sort=code&direction=asc`)
  if (result.status !== 200 || !Array.isArray(result.body?.data)) throw new Error(`Stock list sample ${index + 1} HTTP ${result.status}`)
  listTimes.push(result.ms)
  if (!symbols.length) symbols = result.body.data.slice(0, 40).map(stock => stock.code || stock.symbol).filter(Boolean)
}

const quoteTimes = []
const quoteStatuses = []
for (let index = 0; index < samples; index += 1) {
  const result = await timedFetch(`${backendBase}/api/stocks/quotes?symbols=${encodeURIComponent(symbols.join(','))}`)
  quoteTimes.push(result.ms)
  quoteStatuses.push({ status: result.status, quotes: Object.keys(result.body?.data || {}).length })
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const contextOptions = {}
const storageStatePath = new URL('../e2e/auth.storage.json', import.meta.url)
const context = await browser.newContext(contextOptions)
if (fs.existsSync(storageStatePath)) {
  const stored = JSON.parse(fs.readFileSync(storageStatePath, 'utf8'))
  const auth = stored.origins?.flatMap(origin => origin.localStorage || []).find(entry => entry.name === 'market-auth')
  if (auth) await context.addInitScript(value => localStorage.setItem('market-auth', value), auth.value)
}
await context.route('**/api/auth/me', route => route.fulfill({
  json: { success: true, user: { id: 'live-perf', email: 'live-perf@local', role: 'user' } }
}))
await context.route('**/api/portfolio**', route => route.fulfill({ json: { success: true, data: { positions: [] } } }))
await context.route('**/api/watchlist**', route => route.fulfill({ json: { success: true, data: [] } }))
await context.route('**/api/recommendations/saved**', route => route.fulfill({ json: { success: true, data: [] } }))
await context.route('**/api/health', route => route.fulfill({ json: { success: true, data: { status: 'ok' } } }))
await context.route('**/api/cache/stats', route => route.fulfill({ json: { success: true, data: { totalEntries: 0 } } }))
await context.route('**/api/ai-gate', route => route.fulfill({ json: { success: true, data: { enabled: false, reasons: [] } } }))
await context.route('**/api/recommendations/latest', route => route.fulfill({ json: { success: true, data: { recommendations: [] } } }))
await context.route('**/api/recommendations/history**', route => route.fulfill({ json: { success: true, data: [] } }))
await context.route('**/api/recommendations/readiness', route => route.fulfill({ json: { success: true, data: { coverage: [] } } }))
const firstUsable = []
const boardNavClick = []
const boardPanelVisible = []
const boardRowsVisible = []
const quoteSettlement = []
const boardRequests = []
const boardSnapshots = []
try {
  for (let index = 0; index < samples; index += 1) {
    const page = await context.newPage()
    const requests = new Map()
    const requestEvents = []
    const isBoardRequest = url => {
      const path = new URL(url).pathname
      return path === '/api/stocks' || path === '/api/stocks/quotes' || path === '/api/stocks/quotes/status'
    }
    page.on('request', request => {
      if (!isBoardRequest(request.url())) return
      requests.set(request, { path: new URL(request.url()).pathname, started: performance.now() })
    })
    page.on('response', response => {
      const request = response.request()
      const metadata = requests.get(request)
      if (!metadata) return
      requestEvents.push({ path: metadata.path, status: response.status(), ms: Math.round(performance.now() - metadata.started) })
      requests.delete(request)
    })
    page.on('requestfailed', request => {
      const metadata = requests.get(request)
      if (!metadata) return
      requestEvents.push({ path: metadata.path, failed: true, ms: Math.round(performance.now() - metadata.started) })
      requests.delete(request)
    })
    const started = performance.now()
    await page.goto(`${frontendBase}/?perf=${Date.now()}-${index}`, { waitUntil: 'domcontentloaded' })
    await page.locator('.market-breadth-panel').waitFor({ state: 'visible', timeout: 30_000 })
    firstUsable.push(Math.round(performance.now() - started))
    const navStarted = performance.now()
    await page.locator('.market-board-nav-item').click()
    boardNavClick.push(Math.round(performance.now() - navStarted))
    const panelStarted = performance.now()
    await page.locator('[data-react-market-board]').waitFor({ state: 'visible', timeout: 30_000 })
    boardPanelVisible.push(Math.round(performance.now() - panelStarted))
    const rowsStarted = performance.now()
    await waitForBoardRows(page)
    boardRowsVisible.push(Math.round(performance.now() - rowsStarted))
    boardSnapshots.push(await page.locator('[data-react-market-board]').evaluate(panel => ({
      rows: panel.querySelectorAll('tbody tr .symbol').length,
      busy: panel.querySelector('.table-wrap')?.getAttribute('aria-busy') || null,
      status: panel.querySelector('.overview-data-status')?.textContent?.trim() || '',
      hidden: panel.hidden,
      display: getComputedStyle(panel).display
    })))
    boardRequests.push(requestEvents)
    const quoteStarted = performance.now()
    await page.locator('#market-board-loading-overlay').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {})
    await page.locator('.overview-data-status').filter({ hasNotText: 'Äang cáº­p nháº­t' }).waitFor({ state: 'visible', timeout: 30_000 })
    quoteSettlement.push(Math.round(performance.now() - quoteStarted))
    await page.close()
  }
} finally {
  await context.close()
  await browser.close()
}

const report = {
  measuredAt: new Date().toISOString(),
  frontendBase,
  backendBase,
  sampleCount: samples,
  api: { healthMs: health.ms, stocks500: summary(listTimes), quotes40: summary(quoteTimes), quoteStatuses },
  ui: {
    firstUsable: summary(firstUsable),
    boardNavClick: summary(boardNavClick),
    boardPanelVisible: summary(boardPanelVisible),
    boardRowsVisible: summary(boardRowsVisible),
    quoteSettlement: summary(quoteSettlement),
    boardSnapshots,
    boardRequests
  }
}
if (process.env.LIVE_PERF_OUTPUT) fs.writeFileSync(process.env.LIVE_PERF_OUTPUT, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
