import { chromium } from '@playwright/test'
import fs from 'node:fs'

const frontendBase = process.env.FRONTEND_URL || 'http://127.0.0.1:4173'
const backendBase = process.env.BACKEND_URL || 'http://127.0.0.1:5000'
const samples = Math.max(5, Number(process.env.LIVE_PERF_SAMPLES || 10))

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
const boardSwitch = []
const quoteSettlement = []
try {
  for (let index = 0; index < samples; index += 1) {
    const page = await context.newPage()
    const started = performance.now()
    await page.goto(`${frontendBase}/?perf=${Date.now()}-${index}`, { waitUntil: 'domcontentloaded' })
    await page.locator('.market-breadth-panel').waitFor({ state: 'visible', timeout: 30_000 })
    firstUsable.push(Math.round(performance.now() - started))
    const switchStarted = performance.now()
    await page.getByRole('button', { name: 'Bảng giá', exact: true }).evaluate(button => button.click())
    await page.waitForFunction(() => document.querySelector('.table-panel tbody tr .symbol') || document.querySelector('.table-panel [role="alert"], .table-panel .error-text'), null, { timeout: 30_000 })
    const boardError = await page.locator('.table-panel [role="alert"], .table-panel .error-text').first().textContent().catch(() => '')
    if (boardError) throw new Error(`Bảng giá live không tải được: ${boardError.trim()}`)
    await page.locator('.table-panel tbody tr .symbol').first().waitFor({ state: 'visible' })
    boardSwitch.push(Math.round(performance.now() - switchStarted))
    const quoteStarted = performance.now()
    await page.locator('#market-board-loading-overlay').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {})
    await page.locator('.overview-data-status').filter({ hasNotText: 'Đang cập nhật' }).waitFor({ state: 'visible', timeout: 30_000 })
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
  ui: { firstUsable: summary(firstUsable), boardSwitch: summary(boardSwitch), quoteSettlement: summary(quoteSettlement) }
}
if (process.env.LIVE_PERF_OUTPUT) fs.writeFileSync(process.env.LIVE_PERF_OUTPUT, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
