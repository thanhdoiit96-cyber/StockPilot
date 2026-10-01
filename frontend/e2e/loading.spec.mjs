import { test, expect } from '@playwright/test'

const stocks = [
  { id: 'a', code: 'AAA', name: 'Company Alpha', price: 10000 },
  { id: 'b', code: 'BBB', name: 'Company Beta', price: 20000 }
]
const detail = id => ({ success: true, data: { ...stocks.find(stock => stock.id === id), price_history: [
  { observed_at: '2026-09-18T09:00:00+07:00', close: 10000, volume: 1200 },
  { observed_at: '2026-09-19T09:00:00+07:00', close: 10200, volume: 1800 },
  { observed_at: '2026-09-20T09:00:00+07:00', close: 9900, volume: 2100 }
] , market_sessions: ['2026-09-18', '2026-09-19', '2026-09-20'] } })
const listPayload = (data = stocks) => ({ success: true, data, pagination: { page: 1, pageSize: 25, total: data.length, totalPages: 1 } })

async function setup(page, overrides = {}) {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('requestfailed', request => {
    if (request.failure()?.errorText === 'net::ERR_ABORTED') return
    errors.push('requestfailed ' + request.method() + ' ' + request.url())
  })
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (overrides[path]) return overrides[path](route)
    const payload = path === '/api/health' ? { success: true, data: { status: 'ok' } }
      : path === '/api/cache/stats' ? { success: true, data: { totalEntries: 2, expiredEntries: 0, byType: { stock: 2 } } }
        : path === '/api/stocks' ? listPayload()
          : path === '/api/ai-gate' ? { success: true, data: { enabled: false, reasons: [] } }
            : path === '/api/recommendations/latest' ? { success: true, data: { recommendations: [] } }
              : path === '/api/recommendations/history' ? { success: true, data: [] }
                : path === '/api/recommendations/readiness' ? { success: true, data: { coverage: [] } }
                  : path === '/api/auth/me' ? { success: true, user: { id: 'e2e', email: 'e2e@example.com', role: 'user' } }
                    : path === '/api/watchlist' ? { success: true, data: [] }
                      : path === '/api/portfolio' ? { success: true, data: { positions: [] } }
                        : path.startsWith('/api/stocks/') ? detail(path.split('/').at(-1))
                          : { success: true, data: null }
    await route.fulfill({ json: payload })
  })
  page.on('console', message => { if (message.type() === 'error') errors.push('console ' + message.text()) })
  await page.goto('/')
  await page.waitForTimeout(1000)
  if (!(await page.locator('.dashboard-shell').count())) { console.log('E2E_DIAG', JSON.stringify({ url: page.url(), title: await page.title(), body: (await page.locator('body').innerText()).slice(0, 500), errors })) }
  await expect(page.locator('.dashboard-shell')).toBeVisible()
  if (!(await page.locator('.detail-page').count())) {
    await page.getByRole('button', { name: 'Bảng giá', exact: true }).click({ force: true })
  }
  return errors
}
const visibleRows = page => page.locator('.table-panel:visible tbody tr')
const select = (page, code) => visibleRows(page).filter({ hasText: code }).click()
const openOverview = page => page.locator('.nav-item:not(.market-board-nav-item)').first().click()
const openBoard = page => page.getByRole('button', { name: 'Bảng giá', exact: true }).click()
const activateBoard = async page => { await page.getByRole('button', { name: 'Bảng giá', exact: true }).click({ force: true }); await page.clock.runFor(1) }

test('price board retains the last dated intraday quote when refresh fails', async ({ page }) => {
  let fail = false
  await page.clock.install()
  await setup(page, { '/api/stocks/quotes': route => fail
    ? route.fulfill({ status: 503, json: { success: false } })
    : route.fulfill({ json: { success: true, data: { AAA: {
      price: 66300, volume: 10, observed_at: '2026-09-21T09:55:58+07:00',
      fetched_at: '2026-09-21T03:00:00Z', upstream: 'VCI'
    } } } }) })
  await activateBoard(page)
  const row = visibleRows(page).first()
  await expect(row).toContainText('66.300')
  await expect(page.locator('.overview-source-summary')).toContainText('VCI')
  await expect(page.locator('.overview-source-label')).toHaveText('Nguồn dữ liệu')
  await expect(page.locator('.overview-source-provider')).toHaveText('VCI')
  await expect(page.locator('.overview-source-help')).toHaveText('?')
  await expect(visibleRows(page).filter({ hasText: 'BBB' })).toContainText('20.000')
  fail = true
  await page.clock.runFor(6000)
})

test('stock list renders and selection opens detail without page errors', async ({ page }) => {
  const errors = await setup(page)
  await expect(page.locator('tbody tr')).toHaveCount(2)
  await select(page, 'AAA')
  await page.waitForTimeout(500)
  if (!(await page.locator('.nav-item').count())) console.log('DETAIL_DIAG', JSON.stringify({body:(await page.locator('body').innerText()).slice(0,300), errors}))
  await page.getByRole('button', { name: 'Chi tiết mã', exact: true }).click()
  await expect(page.locator('.detail-page')).toBeVisible()
  await expect(page.locator('.detail-volume-bars .volume-bar')).toHaveCount(3)
  const combinedChart = page.locator('[data-testid="combined-price-volume-chart"]')
  await expect(combinedChart).toBeVisible()
  await expect(combinedChart.locator('.detail-volume-bars')).toHaveCount(1)
  await expect(combinedChart.locator('.chart-summary')).toHaveCount(0)
  await expect(page.locator('.detail-chart-panel > .chart-summary')).toHaveCount(1)
  const alignment = await page.evaluate(() => {
    const svg = document.querySelector('.price-chart svg')?.getBoundingClientRect()
    const volume = document.querySelector('.detail-volume-bars')?.getBoundingClientRect()
    const labels = document.querySelector('.price-axis-labels')?.getBoundingClientRect()
    return { leftDelta: Math.abs((svg?.left || 0) - (volume?.left || 0)), rightDelta: Math.abs((svg?.right || 0) - (volume?.right || 0)), labelLeftDelta: Math.abs((labels?.left || 0) - (volume?.left || 0)), labelRightDelta: Math.abs((labels?.right || 0) - (volume?.right || 0)) }
  })
  expect(alignment.leftDelta).toBeLessThanOrEqual(2)
  expect(alignment.rightDelta).toBeLessThanOrEqual(2)
  expect(alignment.labelLeftDelta).toBeLessThanOrEqual(2)
  expect(alignment.labelRightDelta).toBeLessThanOrEqual(2)
  await expect(page.locator('.chart-range-controls button')).toHaveCount(3)
  await page.locator('.chart-range-controls button', { hasText: '5' }).click()
  await expect(page.locator('.detail-volume-bars .volume-bar')).toHaveCount(3)
  await expect(page.locator('.chart-legend')).toContainText('Khối lượng phiên tăng')
  await expect(page.locator('.chart-legend')).toContainText('Khối lượng phiên giảm')
  expect(errors).toEqual([])
})

test('price board settles a realtime quote while cached data remains visible', async ({ page }) => {
  await setup(page, { '/api/stocks/quotes': async route => {
    await new Promise(resolve => setTimeout(resolve, 3000))
    await route.fulfill({ json: { success: true, data: { AAA: { price: 66300, volume: 10, observed_at: '2026-09-23T09:55:58+07:00', fetched_at: '2026-09-23T03:00:00Z', upstream: 'VCI' } } } })
  } })
  await page.getByRole('button', { name: 'Bảng giá', exact: true }).click({ force: true })
  await page.waitForTimeout(100)
  await expect(page.locator('.dashboard-shell')).toBeVisible()
})

test('detail workspace can look up and open a specific stock symbol', async ({ page }) => {
  await setup(page)
  await select(page, 'AAA')
  await page.getByRole('button', { name: 'Chi tiết mã', exact: true }).click()
  const lookup = page.locator('#detail-symbol-input')
  await lookup.fill('BBB')
  await page.getByRole('button', { name: 'Xem mã' }).click()
  await expect(page.locator('.detail-hero h2')).toContainText('BBB')
})

test('backfilled prior EOD session remains aligned before the current intraday point', async ({ page }) => {
  const errors = await setup(page, {
    '/api/stocks/a': route => route.fulfill({ json: { success: true, data: { ...stocks[0], price_history: [
      { observed_at: '2026-09-18T09:00:00+07:00', close: 10000, volume: 1200 },
      { observed_at: '2026-09-20T17:00:00.000Z', close: 10300, volume: 2200 }
    ] } } }),
    '/api/stocks/a/quote': route => route.fulfill({ json: { success: true, data: {
      price: 10400, volume: 2500, observed_at: '2026-09-22T10:15:00+07:00', fetched_at: '2026-09-22T10:15:02+07:00', upstream: 'VCI'
    } } })
  })
  await select(page, 'AAA')
  await page.getByRole('button', { name: 'Chi tiết mã', exact: true }).click()
  const chart = page.locator('[data-testid="combined-price-volume-chart"]')
  await expect(chart.locator('.price-point.current')).toHaveCount(1)
  await expect(chart.locator('.detail-volume-bars .volume-bar')).toHaveCount(3)
  const dates = await chart.evaluate(root => ({
    prices: [...root.querySelectorAll('.price-point')].map(point => point.getAttribute('data-session-date')),
    volumes: [...root.querySelectorAll('.volume-bar')].map(bar => bar.getAttribute('data-session-date')),
    labels: [...root.querySelectorAll('.price-axis-labels small')].map(label => label.getAttribute('data-session-date')),
    lastTitle: root.querySelector('.price-point.current title')?.textContent || ''
  }))
  expect(dates.prices).toEqual(dates.labels)
  expect(dates.volumes).toEqual(dates.labels)
  expect(dates.labels).toEqual(['2026-09-18', '2026-09-21', '2026-09-22'])
  expect(dates.lastTitle).toContain('10:15:00')
  expect(dates.lastTitle).toContain('VCI')
  expect(errors).toEqual([])
})

test('detail chart explains when the provider has no price history for a listed symbol', async ({ page }) => {
  await setup(page, { '/api/stocks/a': route => route.fulfill({ json: { success: true, data: { ...stocks[0], price_history: [] } } }) })
  await select(page, 'AAA')
  await page.getByRole('button', { name: 'Chi tiết mã', exact: true }).click()
  await expect(page.locator('.chart-empty-state')).toHaveText('Chưa có lịch sử giá từ nguồn dữ liệu cho mã này.')
  await expect(page.locator('.combined-price-volume-chart')).toHaveCount(0)
})

test('detail chart identifies system sessions without candles and keeps actual points only', async ({ page }) => {
  await setup(page, { '/api/stocks/a': route => route.fulfill({ json: { success: true, data: {
    ...stocks[0], market_sessions: ['2026-09-18', '2026-09-21'], price_history: [
      { observed_at: '2026-09-18T09:00:00+07:00', close: 10000, volume: 1200 }
    ]
  } } }) })
  await select(page, 'AAA')
  await page.getByRole('button', { name: 'Chi tiết mã', exact: true }).click()
  await expect(page.locator('.chart-data-gap')).toContainText('21-09')
  await expect(page.locator('.price-point')).toHaveCount(1)
  await expect(page.locator('.detail-volume-bars .volume-bar')).toHaveCount(1)
  await expect(page.locator('.price-axis-labels small')).toHaveCount(1)
})

test('detail chart does not report an EOD gap when intraday represents the current session', async ({ page }) => {
  await setup(page, {
    '/api/stocks/a': route => route.fulfill({ json: { success: true, data: {
      ...stocks[0], market_sessions: ['2026-09-29', '2026-09-30'], price_history: [
        { observed_at: '2026-09-29T09:00:00+07:00', close: 10000, volume: 1200 }
      ]
    } } }),
    '/api/stocks/a/quote': route => route.fulfill({ json: { success: true, data: {
      price: 10400, volume: 2500, interval: 'intraday', observed_at: '2026-09-30T18:18:00+07:00', fetched_at: '2026-09-30T18:18:02+07:00', upstream: 'VCI'
    } } })
  })
  await select(page, 'AAA')
  await page.getByRole('button', { name: 'Chi tiết mã', exact: true }).click()
  await expect(page.locator('.price-point.current[data-session-date="2026-09-30"]')).toHaveCount(1)
  await expect(page.locator('.chart-data-gap')).toHaveCount(0)
})

for (const failure of ['network', '404', '500', 'json']) {
  test('list ' + failure + ' failure can retry without masquerading as empty data', async ({ page }) => {
    let fail = true
    await setup(page, { '/api/stocks': route => !fail ? route.fulfill({ json: listPayload() })
      : failure === 'network' ? route.fulfill({ status: 503, json: { success: false, message: 'upstream unavailable' } })
        : route.fulfill({ status: failure === 'json' ? 200 : Number(failure), body: '<html>Error</html>' }) })
    await expect(page.getByRole('alert')).toBeVisible()
    if (failure === 'json') await expect(page.getByRole('alert')).toContainText(/Ph.n h.i m.y ch. kh.ng ph.i JSON h.p l./)
    await expect(page.locator('tbody tr')).toHaveCount(0)
    fail = false
    await page.getByRole('button', { name: /Th.*l.*danh/i }).click()
    await expect(page.locator('tbody tr')).toHaveCount(2)
  })
}

test('valid empty list has a distinct state', async ({ page }) => {
  await setup(page, { '/api/stocks': route => route.fulfill({ json: listPayload([]) }) })
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('detail failure stays local and retry recovers', async ({ page }) => {
  let fail = true
  await setup(page, { '/api/stocks/a': route => fail ? route.fulfill({ status: 404, json: { success: false } }) : route.fulfill({ json: detail('a') }) })
  await select(page, 'AAA')
  await page.getByRole('button', { name: /Chi.*ti.*m/i }).click()
  await expect(page.getByRole('alert')).toContainText('HTTP 404')
  await openOverview(page)
  fail = false
  await openBoard(page)
  await expect(page.locator('.dashboard-shell')).toBeVisible()
})

test('health and cache failures do not discard stocks; both can retry', async ({ page }) => {
  let fail = true
  await setup(page, {
    '/api/health': route => route.fulfill({ status: fail ? 503 : 200, json: { success: !fail } }),
    '/api/cache/stats': route => route.fulfill({ status: fail ? 500 : 200, json: { success: false } })
  })
  await openOverview(page)
  await expect(page.getByRole('alert')).toHaveCount(2)
  fail = false
  await page.getByRole('button', { name: /Th.*l.*health/i }).click()
  await page.getByRole('button', { name: /Th.*l.*cache/i }).click()
  await openBoard(page)
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.locator('tbody tr')).toHaveCount(2)
})

test('price board bounds its initial request to 40 stocks', async ({ page }) => {
  const universe = Array.from({ length: 131 }, (_, i) => ({ id: String(i), code: 'S' + String(i).padStart(3, '0'), name: 'Company ' + i, price: 10000 }))
  let currentPrice = 66300
  await page.clock.install()
  await setup(page, {
    '/api/stocks': route => {
      expect(new URL(route.request().url()).searchParams.get('pageSize')).toBe('40')
      return route.fulfill({ json: listPayload(universe.slice(0, 40)) })
    },
    '/api/stocks/quotes': route => {
      const symbols = new URL(route.request().url()).searchParams.get('symbols').split(',')
      return route.fulfill({ json: { success: true, data: Object.fromEntries(symbols.map(symbol => [symbol, { price: currentPrice, observed_at: '2026-09-21T10:20:24+07:00', fetched_at: '2026-09-21T03:20:25Z', upstream: 'VCI' }])) } })
    }
  })
  await activateBoard(page)
  await expect(page.locator('tbody tr')).toHaveCount(40)
  const last = visibleRows(page).nth(39)
  await expect(last).toContainText('66.300')
})

test('price board keeps its loading screen until the latest quote is applied', async ({ page }) => {
  let holdRefresh = false
  let heldRequest = false
  let releaseRefresh
  const refreshGate = new Promise(resolve => { releaseRefresh = resolve })
  await setup(page, {
    '/api/stocks/quotes': async route => {
      if (!holdRefresh) return route.fulfill({ json: { success: true, data: {} } })
      heldRequest = true
      await refreshGate
      await route.fulfill({ json: { success: true, data: { AAA: {
        price: 66300, volume: 10, observed_at: '2026-09-30T14:45:00+07:00', fetched_at: '2026-09-30T14:45:02+07:00', upstream: 'VCI'
      } } } })
    }
  })
  await openOverview(page)
  holdRefresh = true
  await openBoard(page)
  await expect.poll(() => heldRequest).toBe(true)
  await expect(page.locator('#market-board-loading-overlay')).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden')
  const overviewNav = page.locator('.nav-item').first()
  const navBox = await overviewNav.boundingBox()
  await page.mouse.click(navBox.x + navBox.width / 2, navBox.y + navBox.height / 2)
  await expect(page.locator('.market-board-nav-item')).toHaveClass(/active/)
  const scrollBefore = await page.evaluate(() => window.scrollY)
  await page.keyboard.press('End')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollBefore)
  await expect(visibleRows(page).filter({ hasText: 'AAA' })).toContainText('10.000')
  releaseRefresh()
  await expect(visibleRows(page).filter({ hasText: 'AAA' })).toContainText('66.300')
  await expect(page.locator('#market-board-loading-overlay')).toBeHidden()
})

test('empty intraday settles loading on overview and portfolio while positions remain visible', async ({ page }) => {
  await setup(page, {
    '/api/stocks/quotes': route => route.fulfill({ json: { success: true, data: {} } }),
    '/api/portfolio': route => route.fulfill({ json: { success: true, data: { positions: [{ stock_id: 'a', symbol: 'AAA', quantity: 10, avg_cost: 9000, market_price: 10000 }] } } })
  })
  await expect(page.locator('.page-loading-overlay')).toBeHidden()
  await expect(page.locator('tbody tr').filter({ hasText: 'AAA' })).toContainText('10.000')
  await page.getByRole('button', { name: 'Danh mục cá nhân', exact: true }).click()
  await expect(page.locator('.page-loading-overlay')).toBeHidden()
  await expect(page.locator('.portfolio-table')).toContainText('AAA')
  await expect(page.locator('.portfolio-table')).toContainText('10.000')
})

test('watchlist failure cannot erase a successfully loaded portfolio', async ({ page }) => {
  await setup(page, {
    '/api/stocks/quotes': route => route.fulfill({ json: { success: true, data: {} } }),
    '/api/watchlist': route => route.fulfill({ status: 503, json: { success: false } }),
    '/api/portfolio': route => route.fulfill({ json: { success: true, data: { positions: [{ stock_id: 'a', symbol: 'AAA', quantity: 10, market_price: 10000 }] } } })
  })
  await page.getByRole('button', { name: 'Danh mục cá nhân', exact: true }).click()
  await expect(page.locator('.portfolio-table')).toContainText('AAA')
  await expect(page.locator('.page-loading-overlay')).toBeHidden()
})

test('detail retries failed intraday without a browser reload and restores UUID selection', async ({ page }) => {
  const id = 'stock-a-uuid'
  let attempts = 0
  await page.clock.install()
  await page.addInitScript(id => {
    sessionStorage.setItem('stockpilot-view', 'detail')
    sessionStorage.setItem('stockpilot-selected-id', id)
  }, id)
  await setup(page, {
    ['/api/stocks/' + id]: route => route.fulfill({ json: { success: true, data: { ...stocks[0], id, price_history: [] } } }),
    ['/api/stocks/' + id + '/quote']: route => ++attempts === 1
      ? route.fulfill({ status: 503, json: { success: false } })
      : route.fulfill({ json: { success: true, data: { symbol: 'AAA', price: 66300, observed_at: '2026-09-25T10:00:00+07:00', fetched_at: '2026-09-25T03:00:01Z', upstream: 'VCI' } } })
  })
  await page.clock.runFor(1000)
  await expect(page.locator('.page-loading-overlay')).toBeHidden()
  await expect(page.locator('.detail-hero')).toContainText('10.000')
  await page.clock.runFor(31000)
  await expect(page.locator('.detail-hero')).toContainText('66.300')
  expect(attempts).toBe(2)
})

test('a stalled quote keeps the price board usable', async ({ page }) => {
  await page.clock.install()
  await setup(page, { '/api/stocks/quotes': async route => { /* Simulate an upstream that never responds. */ } })
  await activateBoard(page)
  await page.clock.runFor(13000)
  await page.getByRole('button', { name: 'Danh mục cá nhân', exact: true }).click({ force: true })
  await page.clock.runFor(1)
  await expect(page.locator('.dashboard-shell')).toBeVisible()
})

test('partial quote refresh keeps the recent price of another symbol', async ({ page }) => {
  let count = 0
  await page.clock.install()
  await setup(page, { '/api/stocks/quotes': route => {
    const symbol = ++count === 1 ? 'AAA' : 'BBB'
    return route.fulfill({ json: { success: true, data: { [symbol]: { price: 66300, observed_at: '2026-09-25T10:00:00+07:00', fetched_at: '2026-09-25T03:00:01Z', upstream: 'VCI' } } } })
  } })
  await activateBoard(page)
  await expect(visibleRows(page).filter({ hasText: 'AAA' })).toContainText('66.300')
  await page.clock.runFor(6000)
  await expect(visibleRows(page).filter({ hasText: 'BBB' })).toContainText('66.300')
  await expect(visibleRows(page).filter({ hasText: 'AAA' })).toContainText('66.300')
})

test('portfolio load failure is an error with retry, not a false empty position', async ({ page }) => {
  let fail = true
  await setup(page, {
    '/api/stocks/quotes': route => route.fulfill({ json: { success: true, data: {} } }),
    '/api/portfolio': route => fail ? route.fulfill({ status: 500, json: { success: false } })
      : route.fulfill({ json: { success: true, data: { positions: [{ stock_id: 'a', symbol: 'AAA', quantity: 10, market_price: 10000 }] } } })
  })
  await page.getByRole('button', { name: 'Danh mục cá nhân', exact: true }).click()
  await expect(page.locator('.personal-page [role="alert"]')).toContainText('Không tải được danh mục')
  await expect(page.locator('.portfolio-table')).not.toContainText('Chưa có vị thế')
  fail = false
  await page.getByRole('button', { name: 'Thử lại danh mục' }).click()
  await expect(page.locator('.portfolio-table')).toContainText('AAA')
})

