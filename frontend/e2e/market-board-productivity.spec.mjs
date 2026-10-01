import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const buildStocks = count => Array.from({ length: count }, (_, index) => {
  const symbol = index === 0 ? 'FPT' : `S${String(index).padStart(3, '0')}`
  return {
    id: `stock-${index}`,
    code: symbol,
    name: index === 0 ? 'FPT Corporation' : `Doanh nghiệp ${index}`,
    price: 100000 + index * 100,
    industry: index % 2 ? 'banking_finance' : 'technology',
    exchange: 'HSX',
    volume: 1000000 + index * 1000
  }
})

async function boot(page, count = 4) {
  const stocks = buildStocks(count)
  let boardRefreshRequests = 0
  await page.route('**/api/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    let payload = { success: true, data: null }
    if (path === '/api/stocks') payload = { success: true, data: stocks, pagination: { page: 1, pageSize: count, total: count, totalPages: 1 } }
    else if (path === '/api/stocks/quotes') {
      const isBoardRefresh = url.searchParams.has('board_refresh')
      if (isBoardRefresh) boardRefreshRequests += 1
      payload.data = Object.fromEntries(stocks.map((stock, index) => [stock.code, {
        price: stock.price + (isBoardRefresh ? 1000 : 0),
        change: index % 3 === 0 ? 1.2 : index % 3 === 1 ? -0.4 : 0,
        volume: stock.volume,
        volume_type: 'session',
        observed_at: '2026-10-01T10:20:00+07:00',
        fetched_at: '2026-10-01T03:20:02Z',
        upstream: 'VCI'
      }]))
    } else if (path === '/api/stocks/quotes/status') payload.data = { status: 'ready' }
    else if (path === '/api/stocks/data-quality') payload.data = { session_date: '2026-09-30', listed: count, covered: count, missing: 0, missing_symbols: [], ready: true, provider: { vnstock: count } }
    else if (path.endsWith('/quote')) {
      const stock = stocks.find(item => item.id === path.split('/').at(-2)) || stocks[0]
      payload.data = { symbol: stock.code, price: stock.price, observed_at: '2026-10-01T10:20:00+07:00', fetched_at: '2026-10-01T03:20:02Z', upstream: 'VCI' }
    } else if (path.endsWith('/analysis')) payload.data = { observations: 90, as_of: '2026-09-30', indicators: {}, insight: {}, quality: { score: 88 }, risk_plan: { horizons: {} }, evaluation_factors: [], horizon_advice: {}, external_factors: { status: 'unavailable', factors: [] } }
    else if (/^\/api\/stocks\/[^/]+$/.test(path)) {
      const stock = stocks.find(item => item.id === path.split('/').at(-1)) || stocks[0]
      payload.data = { ...stock, price_history: [] }
    } else if (path === '/api/health') payload.data = { status: 'ok' }
    else if (path === '/api/cache/stats') payload.data = { totalEntries: count }
    else if (path === '/api/ai-gate') payload.data = { enabled: false, reasons: ['Chưa cấu hình nhà cung cấp AI'] }
    else if (path === '/api/recommendations/latest') payload.data = { run: null, recommendations: [], risk: {} }
    else if (path === '/api/recommendations/history' || path === '/api/recommendations/readiness' || path === '/api/recommendations/saved') payload.data = []
    else if (path === '/api/auth/me') payload = { success: true, user: { id: 'audit', email: 'audit@example.com', role: 'user' } }
    else if (path === '/api/watchlist') payload.data = []
    else if (path === '/api/portfolio') payload.data = { positions: [] }
    await route.fulfill({ json: payload })
  })
  const startedAt = Date.now()
  await page.goto('/')
  await expect(page.locator('.dashboard-shell')).toBeVisible()
  await expect(page.locator('.table-panel tbody tr .symbol')).toHaveCount(count)
  await expect(page.locator('.market-breadth-header')).toContainText(`${count} mã`)
  return { firstUsableMs: Date.now() - startedAt, boardRefreshRequests: () => boardRefreshRequests }
}

test('market board keeps the symbol visible, saves column preferences and exports the current scope', async ({ page }) => {
  await boot(page)
  await page.getByRole('button', { name: 'Bảng giá', exact: true }).click()
  await expect(page.locator('.table-panel')).toBeVisible()
  await expect(page.locator('.market-board-export')).toHaveText('Xuất CSV (4)')
  await expect(page.locator('.table-panel thead th').first()).toHaveCSS('position', 'sticky')

  await page.locator('.market-board-column-picker > summary').click()
  await page.getByLabel('Doanh nghiệp', { exact: true }).uncheck()
  await expect(page.locator('.table-panel')).toHaveClass(/market-board-hide-name/)
  await expect(page.locator('.table-panel thead th').nth(1)).toBeHidden()

  await page.reload()
  await expect(page.locator('.table-panel')).toBeVisible()
  await expect(page.locator('.table-panel')).toHaveClass(/market-board-hide-name/)

  const downloadPromise = page.waitForEvent('download')
  await page.locator('.market-board-export').click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^stockpilot-bang-gia-\d{4}-\d{2}-\d{2}\.csv$/)
  const content = await readFile(await download.path(), 'utf8')
  expect(content).toContain('FPT')
  expect(content).not.toContain('FPT Corporation')
  expect(content).not.toContain('Phân tích chuyên sâu')

  await page.locator('.market-board-column-picker > summary').click()
  await page.getByRole('button', { name: 'Khôi phục mặc định' }).click()
  await expect(page.locator('.table-panel')).not.toHaveClass(/market-board-hide-name/)
})

for (const count of [300, 500]) {
  test(`market board remains within interaction budgets for a ${count}-symbol universe`, async ({ page }) => {
    test.setTimeout(60000)
    const metrics = await boot(page, count)
    const switchStarted = Date.now()
    await page.getByRole('button', { name: 'Bảng giá', exact: true }).click()
    await expect(page.locator('.table-panel')).toBeVisible()
    const pageSwitchMs = Date.now() - switchStarted
    const quoteStarted = Date.now()
    await expect.poll(metrics.boardRefreshRequests).toBeGreaterThan(0)
    await expect(page.locator('.market-board-loading-overlay')).toHaveCount(0)
    await expect(page.locator('.market-board-export')).toHaveText(`Xuất CSV (${count})`)
    const quoteSettlementMs = Date.now() - quoteStarted
    const result = { symbols: count, firstUsableMs: metrics.firstUsableMs, pageSwitchMs, quoteSettlementMs }
    console.log(`MARKET_BOARD_PERF ${JSON.stringify(result)}`)
    expect(metrics.firstUsableMs).toBeLessThan(10000)
    expect(pageSwitchMs).toBeLessThan(2000)
    expect(quoteSettlementMs).toBeLessThan(3000)
  })
}
