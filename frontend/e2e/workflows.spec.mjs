import { test, expect } from '@playwright/test'
const stocks=[{id:'a',code:'FPT',name:'FPT Corp',price:120000,industry:'technology',exchange:'HSX',listing_status:'listed',volume:1000},{id:'b',code:'VCB',name:'Vietcombank',price:90000,industry:'banking_finance',exchange:'HSX',listing_status:'listed',volume:2000}]
const list=(data=stocks)=>({success:true,data,pagination:{page:1,pageSize:25,total:data.length,totalPages:2}})
async function boot(page, options = {}) {
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    let payload = { success: true, data: null }
    if (path === '/api/stocks') payload = list()
    else if (path === '/api/stocks/data-quality') payload = { success: true, data: { session_date: '2026-09-25', listed: 551, covered: 204, missing: 347, missing_symbols: ['VPB'], ready: false, provider: {}, eod_retry: { last_run_at: '2026-09-25T12:45:00.000Z', last_run_mode: 'gap_retry', last_run_complete: false, last_run_failed: false, last_run_requested: 347, last_run_selected: 25, last_run_selected_traded: 18, last_run_trade_priority: { enabled: true, probed: 347, batches: 2, failed_batches: 0, matched: 18, had_error: false }, runtime: { running: false, phase: 'idle' } } } }
    else if (path.endsWith('/analysis')) payload = { success: true, data: { observations: 90, indicators: {}, quality: { score: 100 }, risk_plan: { horizons: { short_term: { label: 'Ngắn hạn', expectation_pct: { min: 3, max: 8 }, allocation_pct: 25, take_profit: 119000, stop_loss: 121000 } }, disclaimer: 'Kịch bản kiểm thử' }, expert_guidance: { technical_score: 75, stance: 'Tích cực', confirmation: 'Dữ liệu kiểm thử', score_breakdown: [] }, external_factors: { status: 'available', disclaimer: 'Nguồn kiểm thử', factors: [{ type: 'macro', title: 'Economic data', source: 'Provider', source_url: 'https://example.test/data', published_at: '2026-10-01T03:20:00Z' }] } } }
    else if (/^\/api\/stocks\/[^/]+$/.test(path)) {
      const stock = stocks.find(item => item.id === decodeURIComponent(path.split('/').pop())) || stocks[0]
      payload = { success: true, data: { ...stock, price_history: [] } }
    } else if (path === '/api/health') payload = { success: true, data: { status: 'ok' } }
    else if (path === '/api/cache/stats') payload = { success: true, data: { totalEntries: 2 } }
    else if (path === '/api/ai-gate') payload = { success: true, data: { enabled: false, reasons: [] } }
    else if (path === '/api/recommendations/latest') payload = options.recommendations || { success: true, data: { recommendations: [] } }
    else if (path === '/api/recommendations/history') payload = { success: true, data: [] }
    else if (path === '/api/recommendations/readiness') payload = { success: true, data: { coverage: [] } }
    else if (path === '/api/auth/me') payload = { success: true, user: { id: 'e2e', email: 'e2e@example.com', role: 'admin' } }
    else if (path === '/api/watchlist') payload = { success: true, data: [] }
    else if (path === '/api/portfolio') payload = { success: true, data: { positions: [] } }
    await route.fulfill({ json: payload })
  })
  await page.goto('/')
  await expect(page.locator('.dashboard-shell')).toBeVisible()
  await page.getByRole('button', { name: 'Bảng giá', exact: true }).click()
}
for (const width of [390, 800, 900]) {
  test(`mobile navigation stays in flow at ${width}px with a collapsed desktop preference`, async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('stockpilot-sidebar-collapsed', '1'))
    await page.setViewportSize({ width, height: 844 })
    await boot(page)
    const sidebar = page.locator('.sidebar')
    await expect(page.locator('.sidebar-toggle')).toBeHidden()
    await expect(page.locator('.nav-label').first()).toBeVisible()
    const geometry = () => page.evaluate(() => {
      const nav = document.querySelector('.sidebar').getBoundingClientRect()
      const main = document.querySelector('.main-panel').getBoundingClientRect()
      return { separate: nav.bottom <= main.top + 1, compact: nav.height < 180, fits: document.documentElement.scrollWidth <= innerWidth, top: nav.top }
    })
    expect(await geometry()).toMatchObject({ separate: true, compact: true, fits: true })
    const account = page.getByRole('button', { name: 'Tài khoản và thông tin cá nhân', exact: true })
    await account.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(account).toBeFocused()
    await page.keyboard.press('Enter')
    await page.locator('#account-display-name').fill('Unsaved name')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('alert', { name: 'Thay đổi chưa lưu' })).toBeVisible()
    await page.getByRole('button', { name: 'Bỏ thay đổi và đóng', exact: true }).click()
    await expect(account).toBeFocused()
    await page.evaluate(() => window.scrollTo(0, 450))
    await expect.poll(async () => (await geometry()).top).toBeLessThan(0)
    expect(await geometry()).toMatchObject({ separate: true, fits: true })
    await page.screenshot({ path: `test-results/navigation-${width}.png` })
    await page.setViewportSize({ width: 1280, height: 900 })
    await expect(page.locator('.sidebar-toggle')).toBeVisible()
    await expect(page.locator('.dashboard-shell')).toHaveClass(/sidebar-collapsed/)
    await expect(page.locator('.nav-label').first()).toBeHidden()
    expect(await sidebar.evaluate(node => getComputedStyle(node).position)).toBe('sticky')
  })
}

test('overview keeps search and sector filter on one row', async ({ page }) => {
  await boot(page)
  await expect(page.locator('tbody tr')).toHaveCount(2)
  await expect(page.locator('.sector-select option')).toHaveCount(10)
  await expect(page.locator('.table-tools')).toHaveClass(/overview-filter-row/)
  const aligned = () => page.locator('.overview-filter-row').evaluate(row => {
    const sector = row.querySelector('.sector-select').getBoundingClientRect()
    const search = row.querySelector('.table-search').getBoundingClientRect()
    return Math.abs(sector.top - search.top)
  })
  await expect.poll(aligned).toBeLessThanOrEqual(1)
  await page.setViewportSize({ width: 520, height: 900 })
  await expect.poll(aligned).toBeLessThanOrEqual(1)
  await page.locator('.table-sort-btn').first().click()
  await expect(page.locator('tbody tr')).toHaveCount(2)
  await page.locator('.sector-select').selectOption('technology')
  await expect(page.locator('tbody tr')).toHaveCount(2)
  await expect(page.locator('.market-board-nav-item')).toHaveClass(/active/)
})
test('market overview and price board are separate views', async ({ page }) => {
  await boot(page)
  await expect(page.locator('.market-board-nav-item')).toHaveAttribute('aria-current', 'page')
  await expect(page.locator('.table-panel')).toBeVisible()
  await page.getByRole('button', { name: 'Tổng quan', exact: true }).click()
  await expect(page.locator('.table-panel')).toBeHidden()
  await expect(page.locator('.market-breadth-panel')).toBeVisible()
  await page.getByRole('button', { name: 'Bảng giá', exact: true }).click()
  await expect(page.locator('.table-panel')).toBeVisible()
})
test('sidebar marks only the current page as active', async ({ page }) => {
  await boot(page)
  for (const label of ['Tổng quan', 'Danh mục cá nhân', 'Chi tiết mã', 'Đề xuất', 'AI Advisor']) {
    const target = page.getByRole('button', { name: label, exact: true })
    await target.click()
    await expect(target).toHaveClass(/active/)
    await expect(target).toHaveAttribute('aria-current', 'page')
    await expect(page.locator('.nav-item.active')).toHaveCount(1)
  }
  await page.getByRole('button', { name: 'Bảng giá', exact: true }).click()
  await expect(page.locator('.market-board-nav-item')).toHaveClass(/active/)
  await expect(page.locator('.market-board-nav-item')).toHaveAttribute('aria-current', 'page')
  await expect(page.locator('.nav-item.active')).toHaveCount(1)
})
test('market breadth exchange and sector scopes update snapshot and history context', async ({ page }) => {
  await boot(page)
  const historyScopes = []
  await page.route('**/api/stocks**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/stocks/breadth/history') {
      historyScopes.push({ exchange: url.searchParams.get('exchange'), sector: url.searchParams.get('sector') })
      return route.fulfill({ json: { success: true, data: { requested_sessions: 5, returned_sessions: 5, exchange: url.searchParams.get('exchange'), sector: url.searchParams.get('sector'), continuity: { status: 'continuous', gaps: [] }, points: [1, 2, 3, 4, 5].map(day => ({ session_date: `2026-09-0${day}`, advances: 1, declines: 0, unchanged: 0, classified: 1, covered: 1, universe: 1, ad_ratio: null, spread: 1, coverage_pct: 100, volume: { observations: 1, net_pct: 100, signal: 'confirmation' } })) } } })
    }
    if (url.pathname !== '/api/stocks' || url.searchParams.get('exchange') !== 'HSX') return route.fallback()
    await route.fulfill({ json: { ...list([stocks[0]]), pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 } } })
  })
  await page.getByRole('button', { name: 'Tổng quan', exact: true }).click()
  const exchange = page.getByRole('combobox', { name: /Sàn/ }).first()
  await expect(exchange).toBeVisible()
  await exchange.selectOption('HSX')
  await expect(page.locator('.market-breadth-header')).toContainText('1 mã thuộc HSX')
  const sector = page.getByRole('combobox', { name: /Ngành cho độ rộng/ })
  await sector.selectOption('technology')
  await expect(page.locator('.market-breadth-header')).toContainText('1 mã · HSX · Công nghệ')
  await expect(page.locator('.breadth-disclaimer')).toContainText('HSX')
  await expect(page.locator('.breadth-disclaimer')).toContainText('Công nghệ')
  await expect.poll(() => historyScopes.at(-1)).toEqual({ exchange: 'HSX', sector: 'technology' })
  await page.reload()
  await expect(page.getByRole('combobox', { name: /Sàn cho độ rộng/ })).toHaveValue('HSX')
  await expect(page.getByRole('combobox', { name: /Ngành cho độ rộng/ })).toHaveValue('technology')

  await page.evaluate(() => window.dispatchEvent(new StorageEvent('storage', { key: 'stockpilot-market-breadth-scope-v1', newValue: '{malformed' })))
  await expect(page.getByRole('combobox', { name: /Sàn cho độ rộng/ })).toHaveValue('HSX')
  await page.evaluate(() => window.dispatchEvent(new StorageEvent('storage', { key: 'stockpilot-market-breadth-scope-v1', newValue: null })))
  await expect(page.getByRole('combobox', { name: /Sàn cho độ rộng/ })).toHaveValue('')
  await expect(page.getByRole('combobox', { name: /Ngành cho độ rộng/ })).toHaveValue('')
})
test('market breadth leader symbols open stock detail', async ({ page }) => {
  await boot(page)
  await page.getByRole('button', { name: 'Tổng quan', exact: true }).click()
  const symbol = page.locator('[data-breadth-symbol="FPT"]').first()
  await expect(symbol).toHaveAttribute('title', 'Mở Chi tiết mã FPT · EOD fallback')
  await expect(symbol.locator('.breadth-leader-source')).toHaveText('EOD')
  await symbol.click()
  await expect(page.getByRole('button', { name: 'Chi tiết mã', exact: true })).toHaveClass(/active/)
})
test('price board separates a targeted board from the stock list and navigation icon', async ({ page }) => {
  await boot(page)
  await expect(page.locator('.market-board-nav-item .nav-icon')).toBeVisible()
  const indexSection = page.locator('.market-index-fixture-section')
  await expect(indexSection).toBeVisible()
  await expect(indexSection.getByRole('heading', { name: 'Chỉ số thị trường' })).toBeVisible()
  await expect(page.locator('.table-panel .market-index-fixture-section')).toHaveCount(0)
  await expect(indexSection.locator('.market-index-fixture-chart')).toHaveCount(2)
  await expect(indexSection.locator('.market-index-fixture-baseline')).toHaveCount(2)
  await expect(indexSection.locator('.market-index-fixture-times').first()).toContainText('09:00')
  await expect(indexSection.locator('.market-index-fixture-times').first()).toContainText('15:00')
  await indexSection.getByRole('button', { name: 'Buổi sáng' }).click()
  await expect(indexSection.getByRole('button', { name: 'Buổi sáng' })).toHaveAttribute('aria-pressed', 'true')
  const targetedBoard = page.locator('.targeted-market-board')
  await expect(targetedBoard).toBeVisible()
  await expect(targetedBoard.getByRole('heading', { name: 'Mã trọng tâm' })).toBeVisible()
  expect(await targetedBoard.locator('.targeted-market-card').count()).toBeGreaterThan(0)
  await expect(page.locator('.market-session-timeline')).toHaveCount(0)
  await targetedBoard.locator('.targeted-market-card').first().click()
  await expect(page.getByRole('button', { name: 'Chi tiết mã', exact: true })).toHaveClass(/active/)
})
test('price board remains selected after refresh', async ({ page }) => {
  await boot(page)
  await page.reload()
  await expect(page.locator('.market-board-nav-item')).toHaveAttribute('aria-current', 'page')
  await expect(page.locator('.table-panel')).toBeVisible()
})
test('quote requests are coalesced within the short cache window', async ({ page }) => {
  await boot(page)
  let requests = 0
  await page.route('**/api/stocks/quotes?symbols=COALESCE', async route => {
    requests += 1
    await route.fulfill({ json: { success: true, data: {} } })
  })
  await page.evaluate(() => Promise.all([
    fetch('/api/stocks/quotes?symbols=COALESCE'),
    fetch('/api/stocks/quotes?symbols=COALESCE')
  ]))
  expect(requests).toBe(1)
})
test('overview table controls expose keyboard focus states', async ({ page }) => {
  await boot(page)
  await expect(page.locator('tbody tr')).toHaveCount(2)
  const search = page.getByRole('searchbox', { name: 'Tìm cổ phiếu' })
  const sector = page.getByRole('combobox', { name: 'Nhóm ngành' })
  const sort = page.locator('.table-sort-btn').first()
  await search.focus()
  await expect.poll(() => search.evaluate(element => getComputedStyle(element).outlineWidth)).not.toBe('0px')
  await sector.focus()
  await expect.poll(() => sector.evaluate(element => getComputedStyle(element).outlineWidth)).not.toBe('0px')
  await sort.focus()
  await expect.poll(() => sort.evaluate(element => getComputedStyle(element).outlineWidth)).not.toBe('0px')
  await expect(sort).toHaveAttribute('type', 'button')
  await expect(sort).toHaveAttribute('title')
})
test('overview analysis action opens detail and requests the analysis', async ({ page }) => {
  let analysisRequests = 0
  page.on('request', request => {
    if (new URL(request.url()).pathname.endsWith('/analysis')) analysisRequests += 1
  })
  await boot(page)
  await expect(page.getByRole('columnheader', { name: 'Phân tích', exact: true })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Nhận định', exact: true })).toHaveCount(0)
  await expect(page.locator('.overview-assessment .rating-badge:visible')).toHaveCount(0)
  await expect(page.locator('.overview-assessment > small:visible')).toHaveCount(0)
  const action = page.getByRole('button', { name: 'Mở phân tích chuyên sâu' }).first()
  await expect(action).toBeVisible()
  await action.click()
  await expect(page.getByRole('button', { name: 'Chi tiết mã', exact: true })).toHaveClass(/active/)
  await expect(page.locator('.technical-panel .analysis-status-row')).toContainText('Đã phân tích')
  await expect(page.locator('.expert-guidance-panel')).toBeVisible()
  await expect(page.locator('.expert-guidance-panel')).toContainText('Dữ liệu kiểm thử')
  await expect(page.locator('.risk-table')).toBeVisible()
  await expect(page.locator('.risk-table')).toContainText('Ngắn hạn')
  await expect(page.locator('.risk-table')).toContainText('điều chỉnh theo giá hiện tại')
  await expect(page.locator('.external-factors-panel')).toContainText('Economic data')
  await expect(page.locator('.external-factors-panel .source-link')).toHaveAttribute('href', 'https://example.test/data')
  await expect.poll(() => analysisRequests).toBe(1)
  await expect.poll(() => page.evaluate(() => Object.entries(sessionStorage).some(([key, value]) => key.startsWith('analysis-requested:') && value === '1'))).toBe(true)
})
test('price board hides the empty source column and centers analysis actions', async ({ page }) => {
  await boot(page)
  await expect(page.locator('.table-panel thead th').filter({ hasText: 'Nguồn dữ liệu' })).toBeHidden()
  const analysisCell = page.locator('.overview-analysis-action').first()
  const action = analysisCell.getByRole('button', { name: 'Mở phân tích chuyên sâu' })
  await expect(action).toBeVisible()
  const geometry = await analysisCell.evaluate(cell => {
    const row = cell.closest('tr').getBoundingClientRect()
    const cellRect = cell.getBoundingClientRect()
    const button = cell.querySelector('button').getBoundingClientRect()
    return {
      display: getComputedStyle(cell).display,
      rowCenter: row.top + row.height / 2,
      cellCenter: cellRect.top + cellRect.height / 2,
      buttonCenter: button.top + button.height / 2
    }
  })
  expect(geometry.display).toBe('table-cell')
  expect(Math.abs(geometry.buttonCenter - geometry.cellCenter)).toBeLessThanOrEqual(1)
  expect(Math.abs(geometry.buttonCenter - geometry.rowCenter)).toBeLessThanOrEqual(1)
})
test('opening stock detail does not auto-request advanced analysis', async ({ page }) => {
  let analysisRequests = 0
  page.on('request', request => {
    if (new URL(request.url()).pathname.endsWith('/analysis')) analysisRequests += 1
  })
  await boot(page)
  await page.locator('.table-panel tbody tr').first().locator('.symbol').click()
  await expect(page.getByRole('button', { name: 'Chi tiết mã', exact: true })).toHaveClass(/active/)
  await page.waitForTimeout(250)
  expect(analysisRequests).toBe(0)
})
test('portfolio navigation ignores stale analysis request flags', async ({ page }) => {
  let analysisRequests = 0
  page.on('request', request => {
    if (new URL(request.url()).pathname.endsWith('/analysis')) analysisRequests += 1
  })
  await boot(page)
  await page.getByRole('button', { name: 'Danh mục cá nhân', exact: true }).click()
  await page.evaluate(() => {
    sessionStorage.setItem('analysis-requested:a', '1')
    sessionStorage.setItem('analysis-requested:FPT', '1')
  })
  await page.getByRole('button', { name: 'Chi tiết mã', exact: true }).click()
  await expect(page.locator('.detail-analysis-btn')).toHaveText('Phân tích chuyên sâu')
  await expect(page.locator('.technical-panel .analysis-status-row')).toContainText('Chưa phân tích')
  await page.waitForTimeout(300)
  expect(analysisRequests).toBe(0)
  await expect.poll(() => page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith('analysis-requested:')).length)).toBe(0)
})
test('data quality footer stays compact below the topbar across pages and expands on demand',async({page})=>{await boot(page);const footer=page.locator('#market-data-quality-overlay');await expect(footer).toHaveClass(/market-data-quality-footer/);await expect(footer).toContainText('204/551');await expect(footer).not.toHaveAttribute('open','');expect(await footer.evaluate(element=>element.previousElementSibling?.classList.contains('topbar'))).toBe(true);await footer.locator('summary').click();await expect(footer).toHaveAttribute('open','');await expect(footer).toContainText('347 mã còn thiếu');await page.getByRole('button',{name:'Danh mục cá nhân',exact:true}).click();await expect(footer).toBeVisible();await page.getByRole('button',{name:'Chi tiết mã',exact:true}).click();await expect(footer).toBeVisible()})
test('sidebar collapses to labelled icons while overview headers and symbols stay pinned', async ({ page }) => {
  await boot(page)
  const sidebarToggle = page.locator('.sidebar-toggle')
  const toggleIsInsideSidebar = () => sidebarToggle.evaluate(button => {
    const toggle = button.getBoundingClientRect()
    const sidebar = button.closest('.sidebar').getBoundingClientRect()
    return toggle.width >= 32 && toggle.height >= 32 && toggle.left >= sidebar.left && toggle.right <= sidebar.right + 13.5
  })
  await expect(sidebarToggle).toHaveAttribute('aria-label', 'Thu gọn thanh điều hướng')
  await expect(sidebarToggle.locator('.sidebar-toggle-icon')).toHaveAttribute('data-sidebar-direction', 'left')
  await expect.poll(toggleIsInsideSidebar).toBe(true)
  const expandedBackground = await sidebarToggle.evaluate(button => getComputedStyle(button).backgroundColor)
  const expandedColumns = await page.locator('.dashboard-shell').evaluate(shell => getComputedStyle(shell).gridTemplateColumns)
  await sidebarToggle.focus()
  await expect.poll(() => sidebarToggle.evaluate(button => getComputedStyle(button).outlineWidth)).not.toBe('0px')
  await sidebarToggle.click()
  await expect(page.locator('.dashboard-shell')).toHaveClass(/sidebar-collapsed/)
  await expect.poll(() => page.locator('.dashboard-shell').evaluate(shell => getComputedStyle(shell).gridTemplateColumns)).not.toBe(expandedColumns)
  await expect(sidebarToggle).toHaveAttribute('aria-label', 'Mở rộng thanh điều hướng')
  await expect(sidebarToggle.locator('.sidebar-toggle-icon')).toHaveAttribute('data-sidebar-direction', 'right')
  await expect.poll(toggleIsInsideSidebar).toBe(true)
  const collapsedBackground = await sidebarToggle.evaluate(button => getComputedStyle(button).backgroundColor)
  expect(collapsedBackground).not.toBe(expandedBackground)
  await expect(page.locator('.nav-label').first()).toBeHidden()
  await expect(page.locator('.nav-icon').first()).toBeVisible()
  await expect(page.locator('.nav-item').first()).toHaveAttribute('aria-label', 'Tổng quan')
  await sidebarToggle.click()
  await expect(page.locator('.dashboard-shell')).not.toHaveClass(/sidebar-collapsed/)
  await expect(sidebarToggle).toHaveAttribute('aria-label', 'Thu gọn thanh điều hướng')
  await expect(sidebarToggle.locator('.sidebar-toggle-icon')).toHaveAttribute('data-sidebar-direction', 'left')
  const sticky = await page.locator('.table-panel thead th').first().evaluate(node => ({
    header: getComputedStyle(node).position,
    symbol: getComputedStyle(document.querySelector('.table-panel tbody td')).position,
    sidebar: getComputedStyle(document.querySelector('.sidebar')).position,
    sidebarOverflow: getComputedStyle(document.querySelector('.sidebar')).overflowX,
    navOverflow: getComputedStyle(document.querySelector('.nav')).overflowX,
    tableOverflow: getComputedStyle(document.querySelector('.table-panel .table-wrap')).overflowX,
    pageOverflow: getComputedStyle(document.documentElement).overflowX
  }))
  expect(sticky.header).toBe('sticky')
  expect(sticky.symbol).toBe('sticky')
  expect(sticky.sidebar).toBe('sticky')
  expect(['visible', 'hidden']).toContain(sticky.sidebarOverflow)
  expect(sticky.navOverflow).toBe('hidden')
  expect(sticky.tableOverflow).toBe('visible')
  expect(sticky.pageOverflow).not.toBe('scroll')
  await page.evaluate(() => { document.querySelector('.dashboard-shell').style.minHeight = '2200px'; window.scrollTo(0, 640) })
  await expect.poll(() => page.evaluate(() => Math.round(document.querySelector('.sidebar').getBoundingClientRect().top))).toBe(0)
})
test('personal tab renders portfolio and watchlist',async({page})=>{await boot(page);await page.getByRole('button',{name:'Danh mục cá nhân',exact:true}).click();await expect(page.locator('.portfolio-positions')).toBeVisible();await page.getByRole('tab',{name:/Giao dịch/}).click();await expect(page.locator('.transaction-form')).toBeVisible();await page.getByRole('tab',{name:/Watchlist/}).click();await expect(page.getByRole('heading', { name: 'Watchlist' })).toBeVisible()})

test('recommendations live in a dedicated workspace', async ({ page }) => {
  await boot(page)
  await page.getByRole('button', { name: 'Đề xuất', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Đề xuất theo tiêu chí của bạn' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Bạn muốn ưu tiên điều gì?' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Danh sách cổ phiếu' })).toHaveCount(0)
})

test('recommendations show concentration risk from the snapshot monitor', async ({ page }) => {
  await boot(page, { recommendations: { success: true, data: { risk: { concentration_warning: 'sector_concentration_at_or_above_60_pct', max_sector_share_pct: 60, pending: 5 }, recommendations: [] } } })
  await page.getByRole('button', { name: 'Đề xuất', exact: true }).click()
  await expect(page.locator('.recommendation-risk-banner')).toContainText('60%')
  await expect(page.locator('.recommendation-risk-banner')).toBeVisible()
})

test('sort, sector and pagination preserve the current scroll position',async({page})=>{await boot(page);await page.evaluate(()=>{document.body.style.minHeight='2000px';window.scrollTo(0,640)});const before=await page.evaluate(()=>window.scrollY);await page.locator('.table-sort-btn').first().click();await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(0);await page.locator('.sector-select').selectOption('technology');await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(0);await page.getByRole('button',{name:'Sau'}).click();await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(0)})





