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

async function boot(page, count = 4, language = 'vi', listError = false) {
  const stocks = buildStocks(count)
  let user = { id: 'audit', email: 'audit@example.com', role: 'user', preferred_language: language }
  let boardRefreshRequests = 0
  let stockListRequests = 0
  await page.route('**/api/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    let payload = { success: true, data: null }
    if (path === '/api/stocks/export.csv') {
      return route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="stockpilot-bang-gia-full.csv"', 'X-Export-Count': '4', 'X-Export-Limit': '2000', 'X-Export-Truncated': 'false' },
        body: '\uFEFF"Mã","Giá EOD","Khối lượng","Nguồn dữ liệu"\r\n"FPT","100000","1200","vnstock"\r\n'
      })
    } else if (path === '/api/stocks') {
      stockListRequests += 1
      if (listError) return route.fulfill({ status: 503, json: { success: false, code: 'market_list_failed', message: 'backend list failure' } })
      payload = { success: true, data: stocks, pagination: { page: 1, pageSize: count, total: count, totalPages: 1 } }
    }
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
    else if (path === '/api/auth/me') payload = { success: true, user }
    else if (path === '/api/auth/profile') { user = { ...user, ...request.postDataJSON() }; payload = { success: true, user } }
    else if (path === '/api/watchlist') payload.data = []
    else if (path === '/api/portfolio') payload.data = { positions: [] }
    await route.fulfill({ json: payload })
  })
  const startedAt = Date.now()
  await page.goto('/')
  await expect(page.locator('.dashboard-shell')).toBeVisible()
  if (listError) return { firstUsableMs: Date.now() - startedAt, boardRefreshRequests: () => boardRefreshRequests, stockListRequests: () => stockListRequests }
  await expect(page.locator('.table-panel tbody tr .symbol')).toHaveCount(count)
  await expect(page.locator('.market-breadth-header')).toContainText(language === 'en' ? `${count} symbols` : `${count} mã`)
  return { firstUsableMs: Date.now() - startedAt, boardRefreshRequests: () => boardRefreshRequests, stockListRequests: () => stockListRequests }
}

test('localized market list errors render safely in Vietnamese and English', async ({ page }) => {
  await boot(page, 4, 'vi', true)
  await page.locator('.nav-item').filter({ hasText: 'Bảng giá' }).click()
  await expect(page.locator('.table-panel p.error-text')).toContainText('Không tải được danh sách thị trường.')
})

test('localized market list errors render safely in English', async ({ page }) => {
  await boot(page, 4, 'en', true)
  await page.getByRole('button', { name: 'Market Board', exact: true }).click()
  await expect(page.locator('.table-panel p.error-text')).toContainText('Unable to load the market list.')
})

test('English market and detail screens preserve filters and chart range when changing language', async ({ page }) => {
  const metrics = await boot(page, 4, 'en')
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.getByRole('button', { name: 'Market Board', exact: true }).click()
  const board = page.locator('[data-react-market-board]')
  await expect(board).toHaveAttribute('lang', 'en')
  const filteredResponse = page.waitForResponse(response => {
    const url = new URL(response.url())
    return url.pathname === '/api/stocks' && url.searchParams.get('q') === 'FPT' && url.searchParams.get('sector') === 'technology'
  })
  await board.getByRole('searchbox', { name: 'Search stocks' }).fill('FPT')
  await board.getByRole('combobox', { name: 'Sector', exact: true }).selectOption('technology')
  await board.getByRole('button', { name: 'Watch', exact: true }).click()
  await filteredResponse
  await expect(board.locator('.market-board-loading-overlay')).toHaveCount(0)
  await expect(board.getByRole('button', { name: 'Export CSV (4)' })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/market-en-mobile.png', fullPage: true })
  const switchLanguage = async value => {
    const currentLanguage = await page.locator('html').getAttribute('data-locale')
    await page.getByRole('button', { name: currentLanguage === 'en' ? 'Account and personal details' : 'Tài khoản và thông tin cá nhân', exact: true }).click()
    await page.locator('#account-language').selectOption(value)
    const saveButton = page.getByRole('dialog').locator('form:has(#account-language) button[type="submit"]')
    await saveButton.click()
    await expect(saveButton).toBeDisabled()
    await page.keyboard.press('Escape')
  }
  const requests = metrics.stockListRequests()
  await switchLanguage('vi')
  await expect(board.getByRole('searchbox', { name: 'Tìm cổ phiếu' })).toHaveValue('FPT')
  await expect(board.getByRole('combobox', { name: 'Nhóm ngành', exact: true })).toHaveValue('technology')
  await expect(board.getByRole('button', { name: 'Theo dõi', exact: true })).toHaveAttribute('aria-pressed', 'true')
  expect(metrics.stockListRequests()).toBe(requests)
  await switchLanguage('en')
  await board.getByRole('button', { name: 'FPT', exact: true }).click()
  const detail = page.locator('.detail-page')
  await expect(detail).toHaveAttribute('lang', 'en')
  await expect(detail.getByRole('button', { name: 'View stock', exact: true })).toBeVisible()
  await expect(detail.getByRole('button', { name: 'Add to portfolio', exact: true })).toBeVisible()
  await expect(detail.getByRole('button', { name: 'Add FPT to Watchlist', exact: true })).toBeVisible()
  await detail.getByRole('button', { name: 'Chart', exact: true }).click()
  await detail.getByRole('group', { name: 'Displayed sessions' }).getByRole('button', { name: '5', exact: true }).click()
  await switchLanguage('vi')
  await expect(detail.getByRole('group', { name: 'Số phiên hiển thị' }).getByRole('button', { name: '5', exact: true })).toHaveClass('active')
  await switchLanguage('en')
  await detail.getByRole('button', { name: 'Chart', exact: true }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/detail-en-mobile.png', fullPage: true })
  expect(errors).toEqual([])
})

test('market board keeps the symbol visible, saves column preferences and exports the current scope', async ({ page }) => {
  const metrics = await boot(page)
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

  const fullDownloadPromise = page.waitForEvent('download')
  await page.getByLabel('Phạm vi xuất CSV').selectOption('all')
  const fullRequestPromise = page.waitForRequest(request => request.url().includes('/api/stocks/export.csv'))
  await page.getByRole('button', { name: 'Xuất toàn bộ CSV' }).click()
  const [fullDownload, exportRequest] = await Promise.all([fullDownloadPromise, fullRequestPromise])
  expect(fullDownload.suggestedFilename()).toBe('stockpilot-bang-gia-full.csv')
  const fullContent = await readFile(await fullDownload.path(), 'utf8')
  expect(fullContent).toContain('Giá EOD')
  expect(new URL(exportRequest.url()).searchParams.get('columns')).toBe('volume')
  await expect(page.locator('.market-board-export-notice')).toContainText('Đã xuất 4 mã EOD')

  await expect(page.getByText('Tùy chỉnh', { exact: true })).toBeVisible()
  const requestsBeforePresets = metrics.stockListRequests()
  await page.getByRole('button', { name: 'Theo dõi', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Theo dõi', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.table-panel')).toHaveClass(/market-board-hide-analysis/)
  await expect(page.locator('.table-panel')).toHaveClass(/market-board-hide-actions/)
  await expect(page.locator('.table-panel')).not.toHaveClass(/market-board-hide-name/)
  await page.getByRole('button', { name: 'Giao dịch', exact: true }).click()
  await expect(page.locator('.table-panel')).toHaveClass(/market-board-hide-name/)
  await expect(page.locator('.table-panel')).toHaveClass(/market-board-hide-analysis/)
  await expect(page.locator('.table-panel')).not.toHaveClass(/market-board-hide-actions/)
  await expect.poll(metrics.stockListRequests).toBe(requestsBeforePresets)

  await page.reload()
  await expect(page.getByRole('button', { name: 'Giao dịch', exact: true })).toHaveAttribute('aria-pressed', 'true')

  await page.locator('.market-board-column-picker > summary').click()
  await page.getByRole('button', { name: 'Khôi phục mặc định' }).click()
  await expect(page.locator('.table-panel')).not.toHaveClass(/market-board-hide-name/)
  await expect(page.getByRole('button', { name: 'Đầy đủ', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('market board synchronizes valid column preferences across tabs and ignores malformed storage', async ({ page, context }) => {
  await boot(page)
  const secondPage = await context.newPage()
  await boot(secondPage)
  await page.getByRole('button', { name: 'Bảng giá', exact: true }).click()
  await secondPage.getByRole('button', { name: 'Bảng giá', exact: true }).click()

  await page.getByRole('button', { name: 'Theo dõi', exact: true }).click()
  await expect(secondPage.getByRole('button', { name: 'Theo dõi', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(secondPage.locator('.table-panel')).toHaveClass(/market-board-hide-analysis/)
  await expect(secondPage.locator('.table-panel')).toHaveClass(/market-board-hide-actions/)

  await page.evaluate(() => localStorage.setItem('stockpilot-market-columns-v1', '{malformed'))
  await expect(secondPage.getByRole('button', { name: 'Theo dõi', exact: true })).toHaveAttribute('aria-pressed', 'true')

  await page.evaluate(() => localStorage.removeItem('stockpilot-market-columns-v1'))
  await expect(secondPage.getByRole('button', { name: 'Đầy đủ', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await secondPage.close()
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

test('recommendation language switch preserves criteria and result state', async ({ page }) => {
  await boot(page, 4, 'en')
  await page.getByRole('button', { name: 'Ideas', exact: true }).click()
  const workbench = page.locator('.recommendation-workbench')
  await expect(workbench).toHaveAttribute('lang', 'en')
  const trend = workbench.getByRole('slider', { name: 'Weight Price trend' })
  await trend.fill('45')
  await expect(trend).toHaveValue('45')
  await expect(workbench).toBeVisible()
  const switchLanguage = async value => {
    const currentLanguage = await page.locator('html').getAttribute('data-locale')
    await page.getByRole('button', { name: currentLanguage === 'en' ? 'Account and personal details' : 'Tài khoản và thông tin cá nhân', exact: true }).click()
    await page.locator('#account-language').selectOption(value)
    const saveButton = page.getByRole('dialog').locator('form:has(#account-language) button[type="submit"]')
    await saveButton.click()
    await expect(saveButton).toBeDisabled()
    await page.keyboard.press('Escape')
  }
  await switchLanguage('vi')
  await expect(workbench).toHaveAttribute('lang', 'vi')
  await expect(workbench.getByRole('slider', { name: 'Trọng số Xu hướng giá' })).toHaveValue('45')
  await switchLanguage('en')
  await expect(workbench).toHaveAttribute('lang', 'en')
  await expect(workbench.getByRole('slider', { name: 'Weight Price trend' })).toHaveValue('45')
})

test('recommendation workbench remains usable on mobile and by keyboard', async ({ page }) => {
  await boot(page, 4, 'en')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Ideas', exact: true }).click()
  const workbench = page.locator('.recommendation-workbench')
  await expect(workbench).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const slider = workbench.getByRole('slider', { name: 'Weight Price trend' })
  await slider.focus()
  await expect.poll(() => slider.evaluate(element => getComputedStyle(element).outlineWidth)).not.toBe('0px')
  const collapse = workbench.getByRole('button', { name: 'Collapse criteria', exact: true })
  await collapse.focus()
  await expect.poll(() => collapse.evaluate(element => getComputedStyle(element).outlineWidth)).not.toBe('0px')
  await collapse.click()
  await expect(workbench.locator('#recommendation-criteria-form')).toBeHidden()
  await expect(workbench.getByRole('button', { name: 'Open criteria', exact: true })).toBeVisible()
  await page.screenshot({ path: 'test-results/recommendations-en-mobile.png', fullPage: true })
})
