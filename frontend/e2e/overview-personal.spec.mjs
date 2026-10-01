import { test, expect } from '@playwright/test'

const stocks = ['AAA', 'BBB', 'FPT', 'ZZZ'].map(code => ({ id: code, code, name: `${code} Company`, price: 60000,
  exchange: code === 'AAA' ? 'DELISTED' : 'HSX', listing_status: code === 'AAA' ? 'delisted' : 'listed', listing_checked_at: '2026-09-22T08:00:00Z',
  website_url: code === 'AAA' ? 'javascript:alert(1)' : 'https://example.test/company/' + code }))

async function setup(page, { rejectTransaction = false, board = true } = {}) {
  let positions = [{ stock_id: 'ZZZ', symbol: 'ZZZ', quantity: 10 }, { stock_id: 'BBB', symbol: 'BBB', quantity: 0 }]
  let watch = [{ stock_id: 'FPT', Stock: { code: 'FPT' } }]
  const transactions = []
  const listRequests = []
  await page.route('**/api/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    let payload = { success: true, data: null }
    if (path === '/api/stocks') {
      listRequests.push(url.searchParams)
      const pins = new Set((url.searchParams.get('pinned') || '').split(','))
      const direction = url.searchParams.get('direction') === 'desc' ? -1 : 1
      const sorted = [...stocks].sort((a, b) => Number(pins.has(b.code)) - Number(pins.has(a.code)) || direction * a.code.localeCompare(b.code))
      payload = { success: true, data: sorted, pagination: { page: 1, pageSize: 200, total: 4, totalPages: 1 } }
    } else if (path === '/api/stocks/quotes') {
      const changes = { AAA: 2, BBB: -1, FPT: 0, ZZZ: 3 }
      payload.data = Object.fromEntries(stocks.map((stock, index) => [stock.code, { price: 66300, change: changes[stock.code], volume: (index + 1) * 100, volume_type: 'session', observed_at: '2026-09-21T10:00:00+07:00', fetched_at: '2026-09-21T03:00:01Z', upstream: 'VCI', license_url: 'https://example.test/license' }]))
    } else if (path === '/api/portfolio') payload.data = { positions }
    else if (path === '/api/watchlist') payload.data = watch
    else if (path === '/api/watchlist/FPT' && request.method() === 'DELETE') { watch = []; return route.fulfill({ status: 204 }) }
    else if (path === '/api/portfolio/transactions') {
      transactions.push(request.postDataJSON())
      if (rejectTransaction) return route.fulfill({ status: 400, json: { success: false, message: 'Không thể lưu giao dịch' } })
      const tx = request.postDataJSON()
      positions = [...positions, { stock_id: tx.symbol, symbol: tx.symbol, quantity: Number(tx.quantity) }]
    } else if (path === '/api/auth/me') payload = { success: true, user: { email: 'e2e@example.com', role: 'user' } }
    else if (path === '/api/ai-gate') payload.data = { enabled: false, reasons: [] }
    else if (path === '/api/recommendations/latest') payload.data = { recommendations: [] }
    else if (path === '/api/recommendations/history') payload.data = []
    else if (path === '/api/recommendations/readiness') payload.data = { coverage: [] }
    else if (path.endsWith('/analysis')) payload.data = { observations: 50, indicators: {}, quality: {}, risk_plan: { horizons: {} }, expert_guidance: { score_breakdown: [] }, external_factors: { status: 'available', factors: [{ type: 'macro', title: 'Economic data', source: 'Provider', source_url: 'https://example.test/data', published_at: '2026-09-21' }] } }
    else if (path.startsWith('/api/stocks/')) payload.data = { ...stocks.find(stock => stock.id === path.split('/').at(-1)), price_history: [] }
    await route.fulfill({ json: payload })
  })
  await page.goto('/')
  if (board) await page.getByRole('button', { name: 'Bảng giá', exact: true }).click()
  // The product defaults to volume descending; this suite verifies symbol
  // ordering, so select that sort explicitly rather than assuming a default.
  if (board) {
    await page.locator('.table-sort-btn').first().click()
    await expect(page.locator('.table-panel tbody tr').first()).toContainText('FPT')
  }
  return { transactions, listRequests }
}

const symbols = page => page.locator('.table-panel tbody .symbol').evaluateAll(cells => cells.map(cell => cell.firstChild.textContent))

test('overview focuses on real market coverage and leaves recommendation history and demo allocation to their own tabs', async ({ page }) => {
  const state = await setup(page, { board: false })
  await expect(page.locator('.overview-metrics .overview-metric')).toHaveCount(4)
  await expect(page.locator('.overview-metrics')).toContainText('Quote intraday')
  await expect(page.locator('.overview-metrics')).toContainText('Mã cá nhân')
  await expect(page.locator('.overview-data-status')).toContainText('Có dữ liệu intraday')
  await expect(page.locator('.market-breadth-panel')).toBeVisible()
  await expect(page.locator('.table-panel')).toHaveCount(1)
  await expect(page.locator('.table-panel')).toBeHidden()
  await expect(page.locator('.breadth-count.up strong')).toHaveText('2')
  await expect(page.locator('.breadth-count.down strong')).toHaveText('1')
  await expect(page.locator('.breadth-count.flat strong')).toHaveText('1')
  await expect(page.locator('.breadth-snapshot')).toContainText('A/D ratio')
  await expect(page.locator('.breadth-snapshot strong').nth(0)).toHaveText('2.00')
  await expect(page.locator('.breadth-snapshot strong').nth(1)).toHaveText('+1')
  await expect(page.locator('.breadth-snapshot strong').nth(2)).toHaveText('100.0%')
  await expect(page.locator('.breadth-leaders .breadth-leader')).toHaveCount(3)
  await expect(page.locator('.breadth-disclaimer')).toContainText('không tách khối lượng chủ động')
  await expect(page.locator('.chart-panel, .portfolio-panel')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Lịch sử hiệu quả đề xuất' })).toHaveCount(0)
  await expect(page.locator('.overview-next')).toBeHidden()
  await expect(page.locator('#overview-data-guide')).toHaveCount(0)
  await page.getByRole('button', { name: 'Bảng giá', exact: true }).click()
  await expect(page.getByLabel('Giải thích Intraday, EOD và dữ liệu cũ')).toHaveAttribute('title', /Intraday:.*EOD:.*Dữ liệu cũ:/)
  await expect(page.getByLabel('Giải thích Intraday, EOD và dữ liệu cũ')).toHaveAttribute('tabindex', '0')
  await expect(page.locator('.volume-context').first()).toHaveAttribute('title', /Khối lượng (giao dịch Intraday|EOD)/)
  await expect(page.locator('.volume-context').first()).toHaveAttribute('tabindex', '0')
  await page.getByRole('button', { name: 'Danh mục cá nhân', exact: true }).click()
  await expect(page.locator('#overview-data-guide')).toHaveCount(0)
  await page.getByRole('button', { name: 'Tổng quan', exact: true }).click()
  await expect(page.locator('.market-breadth-panel')).toBeVisible()
})

test('portfolio and watchlist remain pinned across sorting and page-size changes', async ({ page }) => {
  const state = await setup(page)
  expect(await symbols(page)).toEqual(['FPT', 'ZZZ', 'AAA', 'BBB'])
  await page.locator('.table-sort-btn').first().click()
  await expect.poll(() => symbols(page)).toEqual(['ZZZ', 'FPT', 'BBB', 'AAA'])
  const bottomPageSize = page.locator('.table-pagination .overview-page-size-control')
  const bottomResultCount = page.locator('.table-pagination .overview-pagination-count')
  await expect(bottomPageSize).toBeVisible()
  await expect(bottomResultCount).toHaveText('Hiển thị 4/4 mã')
  await expect(page.locator('.overview-original-result-count')).toBeHidden()
  await expect(page.locator('.page-size-control:not(.overview-page-size-control)')).toBeHidden()
  await expect(bottomPageSize.locator('select')).toHaveValue('40')
  await expect(bottomPageSize.locator('option[value="40"]')).toHaveText('40')
  await bottomPageSize.locator('select').selectOption('25')
  await expect.poll(() => state.listRequests.at(-1).get('pageSize')).toBe('25')
  expect(state.listRequests.at(-1).get('pinned')).toBe('FPT,ZZZ')
  await page.getByRole('button', { name: 'Danh mục cá nhân', exact: true }).click()
  await page.locator('.watchlist button').click()
  await expect(page.locator('.watchlist')).not.toContainText('FPT')
  await page.getByRole('button', { name: 'Bảng giá', exact: true }).click()
  await expect(page.locator('.table-panel')).toBeVisible()
  await expect.poll(() => symbols(page)).toEqual(['ZZZ', 'FPT', 'BBB', 'AAA'])
  await expect(page.locator('.table-panel .pinned-stock')).toHaveCount(1)
})

test('overview add opens a prefilled form, writes only on save and then pins the stock', async ({ page }) => {
  const state = await setup(page)
  await expect(page.locator('.table-panel tbody tr').filter({ hasText: 'AAA Company' })).toContainText('66.300')
  await page.getByRole('button', { name: 'Thêm AAA vào danh mục', exact: true }).click()
  await expect(page.locator('.personal-page')).toBeVisible()
  const fields = page.locator('.transaction-form input')
  await expect(fields.nth(0)).toHaveValue('AAA')
  await expect(fields.nth(1)).toHaveValue('')
  await expect(fields.nth(2)).toHaveValue('66300')
  expect(state.transactions).toHaveLength(0)
  await fields.nth(1).fill('5')
  await page.getByRole('button', { name: 'Lưu giao dịch', exact: true }).click()
  await expect.poll(() => state.transactions.length).toBe(1)
  await expect(page.locator('.portfolio-table')).toContainText('AAA')
  await page.getByRole('button', { name: 'Bảng giá', exact: true }).click()
  await expect.poll(() => symbols(page)).toEqual(['AAA', 'FPT', 'ZZZ', 'BBB'])
})

test('failed save does not pin a stock', async ({ page }) => {
  await setup(page, { rejectTransaction: true })
  await page.getByRole('button', { name: 'Thêm AAA vào danh mục', exact: true }).click()
  await page.locator('.transaction-form input').nth(1).fill('5')
  await page.getByRole('button', { name: 'Lưu giao dịch', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Không thể lưu' })).toContainText('Không thể lưu')
  await page.getByRole('button', { name: 'Bảng giá', exact: true }).click()
  await expect(page.locator('.table-panel')).toBeVisible()
  await expect(page.locator('.table-panel .pinned-stock')).toHaveCount(2)
})

test('URL data exposes hover titles and external links without selecting the row', async ({ page }) => {
  await setup(page)
  const fpt = page.locator('.table-panel tbody tr').filter({ hasText: 'FPT Company' })
  const website = fpt.getByRole('link', { name: /FPT Company/ })
  await website.hover()
  await expect(website).toHaveAttribute('title', 'https://example.test/company/FPT')
  await expect(page.locator('.overview-source-summary')).toContainText('Nguồn dữ liệu')
  await expect(page.locator('.table-panel tbody tr').filter({ hasText: 'AAA Company' }).getByRole('link', { name: /AAA Company/ })).toHaveCount(0)
  await page.route('https://example.test/**', route => route.fulfill({ body: 'Source' }))
  const popupPromise = page.waitForEvent('popup')
  await website.click()
  const popup = await popupPromise
  await popup.close()
  await expect(page.locator('.table-panel')).toBeVisible()
  await fpt.locator('.symbol').click()
  await page.locator('.detail-analysis-btn').click()
  await expect(page.getByRole('link', { name: /Economic data/ })).toHaveAttribute('title', 'https://example.test/data')
})

test('portfolio add action remains readable on narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await setup(page)
  const addButton = page.locator('.table-panel .add-portfolio-btn').first()
  await expect(addButton).toBeVisible()
  await expect(addButton).toContainText('Thêm')
  const box = await addButton.boundingBox()
  expect(box).not.toBeNull()
  expect(box.width).toBeGreaterThanOrEqual(70)
  await expect(page.locator('.table-wrap')).toHaveCSS('overflow-x', 'auto')
})
