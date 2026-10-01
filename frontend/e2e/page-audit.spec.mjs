import { test, expect } from '@playwright/test'

const stocks = [
  { id: 'fpt', code: 'FPT', name: 'FPT Corporation', price: 128000, industry: 'technology', exchange: 'HSX', volume: 3250000 },
  { id: 'vcb', code: 'VCB', name: 'Vietcombank', price: 91500, industry: 'banking_finance', exchange: 'HSX', volume: 2100000 },
  { id: 'hpg', code: 'HPG', name: 'Hoa Phat Group', price: 28600, industry: 'manufacturing', exchange: 'HSX', volume: 14800000 },
  { id: 'ssi', code: 'SSI', name: 'SSI Securities', price: 34800, industry: 'banking_finance', exchange: 'HSX', volume: 8700000 }
]

const recommendations = stocks.slice(0, 3).map((stock, index) => ({
  stock_id: stock.id,
  symbol: stock.code,
  name: stock.name,
  rank: index + 1,
  score: 82 - index * 6,
  entry_price: stock.price,
  price_source: 'intraday',
  rationale: { indicators: { rsi14: 55 + index } },
  technical_confirmation: {
    technical_score: 78 - index * 4,
    ichimoku: { state: 'bullish' },
    macd: { state: 'bullish' },
    bollinger: { state: 'upper_half' }
  }
}))

async function boot(page) {
  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    let payload = { success: true, data: null }
    if (path === '/api/stocks') payload = { success: true, data: stocks, pagination: { page: 1, pageSize: 40, total: stocks.length, totalPages: 1 } }
    else if (path === '/api/stocks/quotes') payload.data = Object.fromEntries(stocks.map((stock, index) => [stock.code, { price: stock.price + (index - 1) * 500, change: [1.8, -0.7, 0.4, 2.1][index], volume: stock.volume, volume_type: 'session', observed_at: '2026-10-01T10:20:00+07:00', fetched_at: '2026-10-01T03:20:02Z', upstream: 'VCI' }]))
    else if (path === '/api/stocks/quotes/status') payload.data = { status: 'ready' }
    else if (path === '/api/stocks/data-quality') payload.data = { session_date: '2026-09-30', listed: 551, covered: 436, missing: 115, missing_symbols: ['ABC'], ready: false, provider: { vnstock: 436 } }
    else if (path.endsWith('/quote')) { const stock = stocks.find(item => item.id === path.split('/').at(-2)) || stocks[0]; payload.data = { symbol: stock.code, price: stock.price, observed_at: '2026-10-01T10:20:00+07:00', fetched_at: '2026-10-01T03:20:02Z', upstream: 'VCI' } }
    else if (path.endsWith('/analysis')) payload.data = { observations: 90, as_of: '2026-09-30', indicators: { rsi14: 56, sma20: 124000, sma50: 118000, ema12: 126000, ema26: 121000, macd: { line: 1.2, histogram: 0.4, state: 'bullish' }, bollinger: { lower: 116000, upper: 132000, position: 'upper_half' }, ichimoku: { conversion: 126000, base: 121000, cloud: 'above_cloud' } }, insight: { label: 'Xu hướng tích cực', generated_at: '2026-10-01T03:20:00Z' }, quality: { score: 88 }, risk_plan: { horizons: {} }, expert_guidance: { technical_score: 78, stance: 'Tích cực', confirmation: 'Xu hướng và động lượng đồng thuận.', score_breakdown: [], watch: ['Thanh khoản'], avoid: ['Mua đuổi'], forecast: {}, risk_note: 'Tham khảo, không phải khuyến nghị.' }, evaluation_factors: [], horizon_advice: {}, external_factors: { status: 'unavailable', factors: [] } }
    else if (/^\/api\/stocks\/[^/]+$/.test(path)) { const stock = stocks.find(item => item.id === path.split('/').at(-1)) || stocks[0]; payload.data = { ...stock, price_history: [0, 1, 2, 3, 4].map(day => ({ date: `2026-09-${26 + day}`, close: stock.price - 4000 + day * 1000, volume: 1000000 + day * 150000 })) } }
    else if (path === '/api/health') payload.data = { status: 'ok' }
    else if (path === '/api/cache/stats') payload.data = { totalEntries: 42 }
    else if (path === '/api/ai-gate') payload.data = { enabled: false, reasons: ['Chưa cấu hình nhà cung cấp AI'] }
    else if (path === '/api/recommendations/latest') payload.data = { run: { id: 'run-1' }, recommendations, risk: { concentration_warning: true, max_sector_share_pct: 55, pending: 2 } }
    else if (path === '/api/recommendations/history') payload.data = []
    else if (path === '/api/recommendations/readiness') payload.data = { coverage: [] }
    else if (path === '/api/recommendations/saved') payload.data = []
    else if (path === '/api/auth/me') payload = { success: true, user: { id: 'audit', email: 'audit@example.com', role: 'user' } }
    else if (path === '/api/watchlist') payload.data = [{ stock_id: 'vcb', Stock: { code: 'VCB', name: 'Vietcombank' } }]
    else if (path === '/api/portfolio') payload.data = { positions: [{ stock_id: 'fpt', symbol: 'FPT', quantity: 100, market_price: 126000, previous_market_price: 125000, avg_cost: 112000, unrealized_pnl: 1400000, realized_pnl: 250000 }] }
    await route.fulfill({ json: payload })
  })
  await page.goto('/')
  await expect(page.locator('.dashboard-shell')).toBeVisible()
}

const pages = [
  ['Tổng quan', '.market-breadth-panel', 'Tổng quan'],
  ['Bảng giá', '.table-panel', 'Bảng giá'],
  ['Danh mục cá nhân', '.personal-page', 'Danh mục'],
  ['Chi tiết mã', '.detail-page', 'Chi tiết mã'],
  ['Đề xuất', '.recommendations-page', 'Đề xuất'],
  ['AI Advisor', '.advisor-page', 'AI Advisor']
]

for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`all investor pages remain usable on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await boot(page)
    for (const [label, surface, heading] of pages) {
      await page.getByRole('button', { name: label, exact: true }).click()
      await expect(page.locator(surface)).toBeVisible()
      await expect(page.locator('.topbar h1')).toHaveText(heading)
      await expect(page.locator('.nav-item.active')).toHaveCount(1)
      await expect(page.getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-current', 'page')
      await expect(page.locator('.loading-overlay')).toHaveCount(0)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `${label} should not overflow the viewport`).toBeLessThanOrEqual(1)
      if (label === 'Tổng quan') await expect(page.locator('.market-breadth-header')).toContainText('4 mã trong vũ trụ · 4/4 mã có quote intraday')
      if (label === 'Bảng giá' && viewport.name === 'mobile') await expect(page.locator('.table-scroll-hint')).toBeVisible()
      if (label === 'Danh mục cá nhân') await expect(page.locator('.allocation-footnote')).toContainText('1/1 mã có quote intraday')
      if (label === 'AI Advisor') {
        const input = page.getByLabel('Câu hỏi cho AI Advisor')
        const send = page.getByRole('button', { name: 'Gửi', exact: true })
        await expect(page.locator('.chat-shell')).toHaveAttribute('role', 'log')
        await expect(send).toBeDisabled()
        await input.fill('Phân tích FPT')
        await expect(send).toBeEnabled()
      }
      await page.screenshot({ path: `test-results/ui-audit/${viewport.name}-${label.toLowerCase().replaceAll(' ', '-')}.png`, fullPage: true })
    }
    await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click()
    await expect(page.locator('.auth-page')).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    await page.screenshot({ path: `test-results/ui-audit/${viewport.name}-đăng-nhập.png`, fullPage: true })
  })
}
