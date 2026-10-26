import { test, expect } from '@playwright/test'
const stocks=[{id:'a',code:'FPT',name:'FPT Corp',price:120000,industry:'technology',volume:1000}]
const list={success:true,data:stocks,pagination:{page:1,pageSize:25,total:1,totalPages:1}}

test('cash is separate and a purchase cannot exceed the available ledger balance', async ({ page }) => {
  await boot(page, [], [], [], [], null, [], null, undefined, null, null, { status: 'available', balance: 100000, available_to_buy: 100000 })
  await expect(page.locator('#portfolio-panel-overview .portfolio-cash-summary')).toContainText('100.000')
  await page.locator('#portfolio-tab-transactions').click()
  const fields = page.locator('.transaction-form input')
  await fields.nth(0).fill('FPT'); await fields.nth(1).fill('11'); await fields.nth(2).fill('10000')
  await expect(page.locator('.transaction-form button[type=submit]')).toBeDisabled()
  await expect(page.locator('.transaction-entry-panel .portfolio-cash-summary')).toContainText('Không đủ tiền')
  await fields.nth(1).fill('10')
  await expect(page.locator('.transaction-form button[type=submit]')).toBeEnabled()
  await page.getByLabel('Phí giao dịch (VND)', { exact: true }).fill('1')
  await expect(page.locator('.transaction-form button[type=submit]')).toBeDisabled()
  await page.locator('.transaction-entry-panel').getByRole('button', { name: 'Quản lý dòng tiền' }).click()
  await expect(page.locator('#portfolio-tab-cash')).toHaveAttribute('aria-selected', 'true')
})

test('portfolio layout and keyboard trade actions remain usable across screen sizes', async ({ page }) => {
  await boot(page, [{ stock_id: 'a', symbol: 'FPT', quantity: 10, avg_cost: 100000, market_price: 120000, unrealized_pnl: 200000, realized_pnl: 0 }])
  await expect(page.locator('.page-loading-overlay')).toHaveCount(0)
  await expect(page.locator('.performance-panel')).toContainText('Chưa có tổng hợp hiệu suất')
  await expect(page.locator('.performance-panel')).not.toContainText('Bắt đầu từ giao dịch đầu tiên')
  const audit = page.locator('details.portfolio-data-audit')
  await expect(audit).not.toHaveAttribute('open', '')
  await audit.locator('summary').focus()
  await page.keyboard.press('Enter')
  await expect(audit).toHaveAttribute('open', '')
  await audit.locator('summary').click()
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 900 })
    const grid = page.locator('.portfolio-overview-grid')
    expect(await grid.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: `test-results/portfolio-layout-${width}.png`, fullPage: true })
  }
  for (const [label, side] of [['Mua', 'BUY'], ['Bán', 'SELL']]) {
    const button = page.locator('.portfolio-trade-actions').getByRole('button', { name: `${label} FPT`, exact: true })
    await button.focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('.transaction-form')).toBeVisible()
    await expect(page.locator('.transaction-form input[type="number"]').first()).toBeFocused()
    await expect(page.locator('.transaction-form select').first()).toHaveValue(side)
    await expect(page.getByLabel('Mã giao dịch')).toHaveValue('FPT')
    await page.locator('#portfolio-tab-overview').click()
  }
})
test('English position actions open a focused transaction draft', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('stockpilot-language', 'en'))
  await boot(page, [{ stock_id: 'a', symbol: 'FPT', quantity: 10, avg_cost: 100000 }], [], [], [], null, [], null, { id: 'en', email: 'en@example.com', role: 'admin', preferred_language: 'en' })
  await page.locator('.portfolio-trade-actions').getByRole('button', { name: 'Sell FPT', exact: true }).click()
  await expect(page.locator('.transaction-form select').first()).toHaveValue('SELL')
  await expect(page.locator('.transaction-form input[type="number"]').first()).toBeFocused()
  await expect(page.locator('.transaction-form input[type="number"]').first()).toHaveValue('')
})

test('cash-flow create and edit fields share transaction styling on desktop and mobile', async ({ page }) => {
  await boot(page, [], [], [], [], null, [{ id: 'cf-style', type: 'DEPOSIT', amount: 1000000, occurred_at: '2026-10-01T03:00:00Z', note: '' }])
  await page.getByRole('tab', { name: /Dòng tiền/ }).click()
  const form = page.locator('.cash-flow-form')
  for (const width of [1440, 1100, 390]) {
    await page.setViewportSize({ width, height: 900 })
    for (const control of await form.locator('input, select').all()) {
      await expect(control).toHaveCSS('height', '44px')
      await expect(control).toHaveCSS('border-radius', '10px')
      await expect(control).toHaveCSS('background-color', 'rgb(13, 23, 39)')
      await expect(control).toHaveCSS('font-weight', '400')
      await expect(control).toHaveCSS('font-size', width === 390 ? '16px' : '14px')
    }
    expect(await form.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  }
  await form.getByLabel('Số tiền (VND)').focus()
  await expect(form.getByLabel('Số tiền (VND)')).toHaveCSS('outline-style', 'solid')
  await page.screenshot({ path: 'test-results/cash-flow-style-mobile.png', fullPage: true })
  await page.locator('.cash-flow-table').getByRole('button', { name: 'Sửa', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Sửa bản ghi' })
  for (const control of await dialog.locator('input, select').all()) {
    await expect(control).toHaveCSS('height', '44px')
    await expect(control).toHaveCSS('font-size', '16px')
    await expect(control).toHaveCSS('border-radius', '10px')
  }
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
})
test('cash-flow mutation error uses the localized API code and remains retryable', async ({ page }) => {
  await boot(page, [], [], [], [], null, [], null, { id: 'vi', email: 'vi@example.com', role: 'admin', preferred_language: 'vi' }, 'portfolio_cashflow_create_failed')
  await page.getByRole('tab', { name: /Dòng tiền/ }).click()
  const form = page.locator('.cash-flow-form')
  await form.getByLabel('Số tiền (VND)').fill('1000000')
  await form.locator('button[type="submit"]').click()
  await expect(page.getByRole('alert')).toContainText('Không thể tạo dòng tiền.')
  await expect(form.locator('button[type="submit"]')).toBeEnabled()
})
test('cash-flow mutation error is localized in English', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('stockpilot-language', 'en'))
  await boot(page, [], [], [], [], null, [], null, { id: 'en', email: 'en@example.com', role: 'admin', preferred_language: 'en' }, 'portfolio_cashflow_create_failed')
  await page.getByRole('tab', { name: /Cash flows/ }).click()
  const form = page.locator('.cash-flow-form')
  await form.getByLabel('Amount (VND)').fill('1000000')
  await form.locator('button[type="submit"]').click()
  await expect(page.getByRole('alert')).toContainText('Unable to create the cash flow.')
  await expect(form.locator('button[type="submit"]')).toBeEnabled()
})
test('cash-flow update and delete errors keep the mutation dialog retryable', async ({ page }) => {
  await boot(page, [], [], [], [], null, [{ id: 'cf-error', type: 'DEPOSIT', amount: 1000000, occurred_at: '2026-10-01T03:00:00Z', note: '' }], null, { id: 'vi', email: 'vi@example.com', role: 'admin' }, 'portfolio_cashflow_update_failed')
  await page.getByRole('tab', { name: /Dòng tiền/ }).click()
  const panel = page.locator('.cash-flow-panel')
  await panel.locator('.cash-flow-table').getByRole('button', { name: 'Sửa', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('button[type="submit"]').click()
  await expect(dialog.getByRole('alert')).toContainText('Không thể cập nhật dòng tiền.')
  await expect(dialog.locator('button[type="submit"]')).toBeEnabled()
})
test('cash-flow delete error keeps the confirmation dialog retryable', async ({ page }) => {
  await boot(page, [], [], [], [], null, [{ id: 'cf-delete-error', type: 'DEPOSIT', amount: 1000000, occurred_at: '2026-10-01T03:00:00Z', note: '' }], null, { id: 'vi', email: 'vi@example.com', role: 'admin' }, 'portfolio_cashflow_delete_failed')
  await page.getByRole('tab', { name: /Dòng tiền/ }).click()
  const panel = page.locator('.cash-flow-panel')
  await panel.locator('.cash-flow-table').getByRole('button', { name: 'Xóa', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Xác nhận xóa' }).click()
  await expect(dialog.getByRole('alert')).toContainText('Không thể xoá dòng tiền.')
  await expect(dialog.getByRole('button', { name: 'Xác nhận xóa' })).toBeEnabled()
})
test('portfolio tabs preserve drafts and filters with keyboard and mobile navigation', async ({ page }) => {
  const state = await boot(page, [{ stock_id: 'a', symbol: 'FPT', quantity: 10 }], [], [], [{ stock_id: 'a', Stock: { id: 'a', code: 'FPT', name: 'FPT Corp' } }])
  const tabs = page.getByRole('tablist', { name: 'Nội dung danh mục' })
  const overview = tabs.getByRole('tab', { name: /Tổng quan/ })
  await expect(overview).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel')).toHaveCount(1)
  await page.getByLabel('Tìm vị thế theo mã hoặc tên doanh nghiệp').fill('FPT')
  await expect.poll(() => state.getPerformanceHistoryRequests().length).toBe(1)
  await expect(page.locator('.page-loading-overlay')).toHaveCount(0)
  await overview.focus()
  await page.keyboard.press('ArrowRight')
  await expect(tabs.getByRole('tab', { name: /Giao dịch/ })).toBeFocused()
  await page.getByLabel('Mã giao dịch').fill('HPG')
  for (const control of await page.locator('.transaction-form input, .transaction-form select').all()) {
    await expect(control).toHaveCSS('height', '44px')
    await expect(control).toHaveCSS('border-radius', '10px')
    await expect(control).toHaveCSS('font-weight', '400')
  }
  await page.locator('.transaction-form input').nth(1).fill('25')
  await tabs.getByRole('tab', { name: /Dòng tiền/ }).click()
  await page.locator('.cash-flow-panel').getByLabel('Số tiền (VND)').fill('2500000')
  await tabs.getByRole('tab', { name: /Watchlist/ }).click()
  await page.getByLabel('Tìm trong Watchlist').fill('FPT')
  await page.getByLabel('Thêm mã theo dõi').fill('VCB')
  await tabs.getByRole('tab', { name: /Watchlist/ }).focus()
  await page.keyboard.press('Home')
  await expect(overview).toBeFocused()
  await expect(page.getByLabel('Tìm vị thế theo mã hoặc tên doanh nghiệp')).toHaveValue('FPT')
  await expect(page.locator('.transaction-form')).toBeHidden()
  expect(state.getPerformanceHistoryRequests()).toHaveLength(1)
  await tabs.getByRole('tab', { name: /Giao dịch/ }).click()
  await expect(page.getByLabel('Mã giao dịch')).toHaveValue('HPG')
  await expect(page.locator('.transaction-form input').nth(1)).toHaveValue('25')
  await tabs.getByRole('tab', { name: /Dòng tiền/ }).click()
  await expect(page.locator('.cash-flow-panel').getByLabel('Số tiền (VND)')).toHaveValue('2500000')
  await page.keyboard.press('End')
  await expect(tabs.getByRole('tab', { name: /Watchlist/ })).toBeFocused()
  await expect(page.getByLabel('Tìm trong Watchlist')).toHaveValue('FPT')
  await expect(page.getByLabel('Thêm mã theo dõi')).toHaveValue('VCB')
  await page.setViewportSize({ width: 390, height: 844 })
  for (const label of ['Tổng quan', 'Giao dịch', 'Nhật ký quyết định', 'Dòng tiền', 'Watchlist']) {
    await tabs.getByRole('tab', { name: new RegExp(label) }).click()
    await expect(page.getByRole('tabpanel')).toHaveCount(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
  await page.screenshot({ path: 'test-results/portfolio-tabs-mobile.png', fullPage: true })
})
test('searches positions without accents and keeps query across status filters', async ({ page }) => {
  await boot(page, [
    { stock_id: 'a', symbol: 'FPT', name: 'Công nghệ FPT', quantity: 10, avg_cost: 100000, market_price: 120000 },
    { stock_id: 'b', symbol: 'HPG', name: 'Hòa Phát', quantity: 5, avg_cost: 20000, market_price: 25000 }
  ], [], [{ stock_id: 'c', symbol: 'HPG', name: 'Hòa Phát', realized_pnl: 1000 }])
  const region = page.locator('.portfolio-positions')
  const search = region.getByRole('searchbox')
  await expect(region.locator('tbody tr')).toHaveCount(2)
  await search.fill('hoa phat')
  await expect(region.locator('tbody tr')).toHaveCount(1)
  await expect(region.locator('tbody')).toContainText('HPG')
  await region.getByRole('button', { name: /Đã đóng/ }).click()
  await expect(search).toHaveValue('hoa phat')
  await expect(region.locator('tbody tr')).toHaveCount(1)
  await search.fill('missing')
  await expect(region.getByText(/Không có vị thế phù hợp/)).toBeVisible()
  await expect(region.getByText('Chưa có vị thế đã đóng', { exact: true })).toHaveCount(0)
  await region.getByRole('button', { name: 'Xóa tìm kiếm' }).click()
  await expect(search).toBeFocused()
  await expect(region.locator('tbody tr')).toHaveCount(1)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(search).toBeVisible()
  expect(await region.locator('.position-search-toolbar').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
})

test('uses the same search field format for positions and Watchlist', async ({ page }) => {
  await boot(page, [{ stock_id: 'a', symbol: 'FPT', name: 'Công nghệ FPT', quantity: 10 }], [], [], [{ stock_id: 'a', Stock: { id: 'a', code: 'FPT', name: 'Công nghệ FPT' } }])
  const positionSearch = page.getByLabel('Tìm vị thế theo mã hoặc tên doanh nghiệp')
  const watchlistSearch = page.getByLabel('Tìm trong Watchlist')
  for (const search of [positionSearch, watchlistSearch]) {
    if (search === watchlistSearch) await page.getByRole('tab', { name: /Watchlist/ }).click()
    await expect(search).toHaveCSS('min-height', '42px')
    await expect(search).toHaveCSS('border-radius', '11px')
    await expect(search).toHaveCSS('padding-left', '40px')
    expect(await search.evaluate(element => getComputedStyle(element).backgroundImage)).not.toBe('none')
  }
  await page.getByRole('tab', { name: /Watchlist/ }).click()
  await watchlistSearch.fill('FPT')
  await expect(page.locator('.watchlist-search .search-result-count')).toHaveText('1/1 mã hiển thị')
  await page.getByRole('button', { name: 'Xóa tìm kiếm' }).last().click()
  await expect(watchlistSearch).toBeFocused()
})

test('sorts open positions by symbol, value and unrealized P/L', async ({ page }) => {
  await boot(page, [
    { stock_id: 'v', symbol: 'VCB', quantity: 10, market_value: 200, market_price: 20, avg_cost: 19, unrealized_pnl: 10 },
    { stock_id: 'f', symbol: 'FPT', quantity: 10, market_value: 500, market_price: 50, avg_cost: 52, unrealized_pnl: -20 },
    { stock_id: 'a', symbol: 'ACB', quantity: 10, market_value: 300, market_price: 30, avg_cost: 26, unrealized_pnl: 40 }
  ])
  const region = page.locator('.portfolio-positions')
  const rows = region.locator('table tbody tr')
  const codes = async () => rows.locator('.portfolio-detail-link').allTextContents()
  await expect.poll(codes).toEqual(['ACB', 'FPT', 'VCB'])
  const sort = region.locator('.position-sort-control select')
  await sort.selectOption('value')
  await expect.poll(codes).toEqual(['FPT', 'ACB', 'VCB'])
  await sort.selectOption('pnl')
  await expect.poll(codes).toEqual(['ACB', 'VCB', 'FPT'])
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await region.locator('.position-search-toolbar').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
})

test('separates position loading and error states from an empty portfolio', async ({ page }) => {
  await boot(page, [{ stock_id: 'a', symbol: 'FPT', quantity: 10, market_value: 100 }])
  await page.route('**/api/portfolio', route => route.fulfill({ status: 503, json: { success: false, code: 'portfolio_load_failed', message: 'Danh mục đang tạm gián đoạn.' } }))
  await page.reload()
  await page.getByRole('button', { name: 'Danh mục cá nhân', exact: true }).click()
  const region = page.locator('.portfolio-positions')
  await expect(region.locator('.portfolio-positions-state[role="alert"]')).toContainText('Không thể tải vị thế')
  await expect(region.locator('.portfolio-table')).toHaveCount(0)
  await expect(region.locator('.portfolio-positions-state')).not.toContainText('Chưa có vị thế mở')
})

test('filters and sorts Watchlist for daily review on desktop and mobile', async ({ page }) => {
  await boot(page, [], [], [], [
    { stock_id: 'v', created_at: '2026-10-01T00:00:00Z', status: 'WATCHING', Stock: { id: 'v', code: 'VCB', name: 'Vietcombank', industry: 'Ngân hàng' } },
    { stock_id: 'f', created_at: '2026-10-03T00:00:00Z', metadata_updated_at: '2026-10-04T00:00:00Z', status: 'RESEARCHING', note: 'Kiểm tra biên lợi nhuận quý tới', Stock: { id: 'f', code: 'FPT', name: 'FPT', industry: 'Công nghệ' } },
    { stock_id: 'a', created_at: '2026-10-02T00:00:00Z', metadata_updated_at: '2026-10-05T00:00:00Z', status: 'PAUSED', Stock: { id: 'a', code: 'ACB', name: 'Á Châu', industry: 'Ngân hàng' } }
  ])
  await page.getByRole('tab', { name: /Watchlist/ }).click()
  const rows = page.locator('.watchlist > li:not(.watchlist-empty)')
  const codes = async () => rows.locator('.watchlist-company strong').allTextContents()
  await expect.poll(codes).toEqual(['FPT', 'ACB', 'VCB'])
  const summary = page.getByRole('group', { name: 'Tóm tắt hàng đợi Watchlist' })
  await expect(summary.getByRole('button', { name: /Tất cả trạng thái 3/ })).toBeVisible()
  await expect(summary.getByRole('button', { name: /Đang nghiên cứu 1/ })).toBeVisible()
  const controls = page.locator('.watchlist-view-controls select')
  await controls.nth(2).selectOption('symbol')
  await expect.poll(codes).toEqual(['ACB', 'FPT', 'VCB'])
  await controls.first().selectOption('Ngân hàng')
  await expect.poll(codes).toEqual(['ACB', 'VCB'])
  await expect(page.locator('.watchlist-search .search-result-count')).toHaveText('2/3 mã hiển thị')
  await controls.first().selectOption('')
  await summary.getByRole('button', { name: /Đang nghiên cứu 1/ }).click()
  await expect.poll(codes).toEqual(['FPT'])
  await controls.nth(1).selectOption('')
  await page.getByLabel('Tìm trong Watchlist').fill('bien loi nhuan')
  await expect.poll(codes).toEqual(['FPT'])
  await page.getByRole('button', { name: 'Xóa tìm kiếm' }).last().click()
  await controls.nth(2).selectOption('updated')
  await expect.poll(codes).toEqual(['ACB', 'FPT', 'VCB'])
  const updatedTime = rows.filter({ hasText: 'ACB' }).locator('time')
  await expect(updatedTime).toHaveAttribute('datetime', '2026-10-05T00:00:00Z')
  await expect(updatedTime).toContainText('Cập nhật')
  await expect(rows.filter({ hasText: 'VCB' }).locator('time')).toHaveCount(0)
  await page.getByRole('button', { name: 'Xóa toàn bộ bộ lọc' }).click()
  await expect(page.getByLabel('Tìm trong Watchlist')).toBeFocused()
  await expect(controls.first()).toHaveValue('')
  await expect(controls.nth(1)).toHaveValue('')
  await expect(controls.nth(2)).toHaveValue('recent')
  await expect.poll(codes).toEqual(['FPT', 'ACB', 'VCB'])
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.locator('.watchlist-view-controls').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  expect(await summary.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
})

test('keeps a 500-symbol Watchlist within the render and filter budget', async ({ page }) => {
  const watch = Array.from({ length: 500 }, (_, index) => ({
    stock_id: `scale-${index}`,
    created_at: new Date(Date.UTC(2026, 9, 1, 0, index)).toISOString(),
    status: index % 3 === 0 ? 'RESEARCHING' : index % 3 === 1 ? 'PAUSED' : 'WATCHING',
    note: index === 427 ? 'scale target unique note' : `Theo dõi tổng hợp ${index}`,
    Stock: { id: `scale-${index}`, code: `S${String(index).padStart(3, '0')}`, name: `Doanh nghiệp ${index}`, industry: `Ngành ${index % 12}` }
  }))
  await boot(page, [], [], [], watch)
  const renderStart = Date.now()
  await page.getByRole('tab', { name: /Watchlist/ }).click()
  const rows = page.locator('.watchlist > li:not(.watchlist-empty)')
  await expect(rows).toHaveCount(500)
  const renderMs = Date.now() - renderStart
  const filterStart = Date.now()
  await page.getByLabel('Tìm trong Watchlist').fill('scale target unique')
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText('S427')
  const filterMs = Date.now() - filterStart
  console.log(`WATCHLIST_SCALE render_500_ms=${renderMs} filter_500_ms=${filterMs}`)
  expect(renderMs).toBeLessThan(3000)
  expect(filterMs).toBeLessThan(1000)
})

test('edits user-owned Watchlist status and note without leaving the list', async ({ page }) => {
  await boot(page, [], [], [], [{ stock_id: 'a', status: 'WATCHING', note: null, Stock: { id: 'a', code: 'FPT', name: 'FPT', industry: 'Công nghệ' } }])
  await page.getByRole('tab', { name: /Watchlist/ }).click()
  const panel = page.locator('.watchlist-panel')
  await expect(panel.locator('.watchlist-status', { hasText: 'Theo dõi' })).toBeVisible()
  await panel.getByRole('button', { name: 'Chỉnh sửa theo dõi FPT' }).click()
  const editor = page.getByRole('group', { name: 'Chỉnh sửa theo dõi FPT' })
  await editor.getByLabel('Trạng thái').selectOption('RESEARCHING')
  await editor.getByLabel('Ghi chú cá nhân').fill('Kiểm tra tăng trưởng lợi nhuận quý tới')
  await editor.getByRole('button', { name: 'Lưu' }).click()
  await expect(panel.locator('.watchlist-status', { hasText: 'Đang nghiên cứu' })).toBeVisible()
  await expect(panel.getByText('Kiểm tra tăng trưởng lợi nhuận quý tới')).toBeVisible()
  await expect(panel.locator('.watchlist-mutation')).toContainText('Đã cập nhật FPT.')
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await panel.locator('ul.watchlist').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
})

test('portfolio exposes shareable detail links and compact Watchlist actions', async ({ page }) => {
  await boot(page, [{ stock_id: 'a', symbol: 'FPT', name: 'Công nghệ FPT', quantity: 10 }])
  const row = page.locator('.portfolio-table tbody tr').filter({ hasText: 'FPT' })
  const link = row.getByRole('link', { name: 'FPT' })
  await expect(link).toHaveAttribute('href', '/?stock=a')
  const watch = row.getByRole('button', { name: 'Thêm FPT vào Watchlist' })
  await expect(watch).toHaveText('☆')
  await expect(watch).toHaveCSS('width', '34px')
  await link.click()
  await expect(page).toHaveURL(url => url.searchParams.get('stock') === 'a' && url.searchParams.get('view') === 'detail')
  await expect(page.locator('.detail-page')).toBeVisible()
  await page.reload()
  await expect(page.locator('.detail-page')).toBeVisible()
  await expect(page.locator('.detail-hero h2')).toContainText('FPT')
})
async function boot(page,initialPositions=[],initialTransactions=[],initialClosedPositions=[],initialWatch=[],initialPerformance=null,initialCashFlows=[],initialPerformanceHistory=null,initialUser={id:'e2e',email:'e2e@example.com',role:'admin'},mutationErrorCode=null,portfolioErrorCode=null,initialCash={status:'available',balance:10000000,available_to_buy:10000000}){
  let watch=initialWatch;let positions=initialPositions;let transactions=initialTransactions;let closedPositions=initialClosedPositions;let cashFlows=initialCashFlows;let transactionBody=null;const imports=[];const mutations=[];const performanceHistoryRequests=[]
  await page.route('**/api/**',async route=>{
    const req=route.request();const path=new URL(req.url()).pathname;let payload
    if(path==='/api/stocks')payload=list
    else if(path==='/api/stocks/quotes')payload={success:true,data:Object.fromEntries((positions||[]).map(item=>[item.symbol,{price:130000,volume:1000,change:2,volume_type:'session',observed_at:'2026-09-22T10:00:00+07:00',fetched_at:'2026-09-22T03:00:01Z',upstream:'VCI'}]))}
    else if(path==='/api/health')payload={success:true,data:{status:'ok'}}
    else if(path==='/api/cache/stats')payload={success:true,data:{totalEntries:1}}
    else if(path==='/api/ai-gate')payload={success:true,data:{enabled:false,reasons:[]}}
    else if(path==='/api/recommendations/latest')payload={success:true,data:{recommendations:[]}}
    else if(path==='/api/recommendations/history')payload={success:true,data:[]}
    else if(path==='/api/recommendations/readiness')payload={success:true,data:{coverage:[]}}
    else if(path.startsWith('/api/stocks/'))payload={success:true,data:{id:'a',code:'FPT',name:'FPT Corp',price:120000,price_history:[]}}
    else if(path==='/api/auth/me')payload={success:true,user:initialUser}
    else if(path==='/api/watchlist'&&req.method()==='GET')payload={success:true,data:watch}
    else if(path==='/api/watchlist'&&req.method()==='POST'){watch=[{stock_id:'a',Stock:{code:'FPT',name:'FPT Corp'}}];payload={success:true,data:watch}}
    else if(path.startsWith('/api/watchlist/')&&req.method()==='PATCH'){const code=decodeURIComponent(path.split('/').at(-1));const body=JSON.parse(req.postData()||'{}');watch=watch.map(item=>item.Stock?.code===code?{...item,...body,metadata_updated_at:'2026-10-08T03:00:00Z'}:item);payload={success:true,data:watch.find(item=>item.Stock?.code===code)}}
    else if(path.startsWith('/api/watchlist/')&&req.method()==='DELETE'){const code=decodeURIComponent(path.split('/').at(-1));watch=watch.filter(item=>item.Stock?.code!==code);return route.fulfill({status:204})}
    else if(path==='/api/portfolio/performance/history'&&req.method()==='GET'){performanceHistoryRequests.push(req.url());payload={success:true,data:initialPerformanceHistory||{status:'empty',methodology:'daily_close_twr_v1',timezone:'Asia/Ho_Chi_Minh',cash_flow_timing:'beginning_of_session',requested_sessions:30,coverage:{sessions:0,complete_sessions:0,incomplete_sessions:0},twr_available:false,cumulative_twr_pct:null,mwr:{status:'unavailable',reason:'insufficient_sign_change',annualized_mwr_pct:null},points:[],limitations:[]}}}
    else if(path==='/api/portfolio'&&req.method()==='GET'){if(portfolioErrorCode)return route.fulfill({status:503,json:{success:false,code:portfolioErrorCode,message:'portfolio resource unavailable'}});payload={success:true,data:{positions,closed_positions:closedPositions,position_counts:{open:positions.length,closed:closedPositions.length},transactions,performance:initialPerformance,cash_flows:cashFlows,cash:initialCash}}}
    else if(path==='/api/portfolio/cash-flows'&&req.method()==='POST'){if(mutationErrorCode)return route.fulfill({status:503,json:{success:false,code:mutationErrorCode,message:'backend cash flow failure'}});const body=JSON.parse(req.postData()||'{}');const entry={id:`cf-${cashFlows.length+1}`,...body,amount:Number(body.amount),created_at:'2026-10-06T03:00:00Z'};cashFlows=[...cashFlows,entry];mutations.push({method:'POST',body});payload={success:true,data:entry}}
    else if(path.startsWith('/api/portfolio/cash-flows/')&&req.method()==='PUT'){if(mutationErrorCode==='portfolio_cashflow_update_failed')return route.fulfill({status:503,json:{success:false,code:mutationErrorCode,message:'backend cash flow failure'}});const id=decodeURIComponent(path.split('/').at(-1));const body=JSON.parse(req.postData()||'{}');cashFlows=cashFlows.map(item=>item.id===id?{...item,...body,amount:Number(body.amount)}:item);mutations.push({method:'PUT',id,body});payload={success:true,data:cashFlows.find(item=>item.id===id)}}
    else if(path.startsWith('/api/portfolio/cash-flows/')&&req.method()==='DELETE'){if(mutationErrorCode==='portfolio_cashflow_delete_failed')return route.fulfill({status:503,json:{success:false,code:mutationErrorCode,message:'backend cash flow failure'}});const id=decodeURIComponent(path.split('/').at(-1));const body=JSON.parse(req.postData()||'{}');cashFlows=cashFlows.filter(item=>item.id!==id);mutations.push({method:'DELETE',id,body});payload={success:true,data:{id}}}
    else if(path==='/api/portfolio/transactions/import'){
      const body=JSON.parse(req.postData()||'{}');imports.push(body)
      if(!body.dry_run){const rows=body.rows||[];transactions=[...transactions,...rows.map((row,index)=>({id:`import-${index}`,stock_id:'a',symbol:row.symbol,name:'FPT Corp',side:row.side,quantity:Number(row.quantity),price:Number(row.price),fees:Number(row.fees||0),traded_at:row.traded_at,source:'manual'}))];positions=[{stock_id:'a',symbol:'FPT',quantity:10,market_price:120000,avg_cost:120000,unrealized_pnl:0}]}
      const errors=(body.rows||[]).filter(row=>row.symbol==='AAA').map(row=>({row:row.row_number,field:'symbol',message:'Không tìm thấy mã AAA'}));payload={success:true,data:{valid:errors.length===0,dry_run:body.dry_run,row_count:(body.rows||[]).length,errors}}
    }
    else if(path.startsWith('/api/portfolio/transactions/')&&req.method()==='PUT'){
      const id=decodeURIComponent(path.split('/').at(-1));const body=JSON.parse(req.postData()||'{}');mutations.push({method:'PUT',id,body});transactions=transactions.map(item=>item.id===id?{...item,...body,quantity:Number(body.quantity),price:Number(body.price),fees:Number(body.fees||0)}:item);payload={success:true,data:transactions.find(item=>item.id===id)}
    }
    else if(path.startsWith('/api/portfolio/transactions/')&&req.method()==='DELETE'){
      const id=decodeURIComponent(path.split('/').at(-1));const body=JSON.parse(req.postData()||'{}');mutations.push({method:'DELETE',id,body});transactions=transactions.filter(item=>item.id!==id);payload={success:true,data:{id}}
    }
    else if(path==='/api/portfolio/transactions'){transactionBody=JSON.parse(req.postData()||'{}');positions=[{stock_id:'a',symbol:'FPT',quantity:Number(transactionBody.quantity),market_price:Number(transactionBody.price),avg_cost:Number(transactionBody.price),unrealized_pnl:0}];transactions=[...transactions,{id:'created',stock_id:'a',symbol:'FPT',name:'FPT Corp',side:transactionBody.side,quantity:Number(transactionBody.quantity),price:Number(transactionBody.price),fees:0,traded_at:'2026-10-01T03:00:00Z',source:'manual'}];payload={success:true,data:{positions}}}
    else payload={success:true,data:null}
    await route.fulfill({json:payload})
  })
  await page.goto('/');await expect(page.locator('.dashboard-shell')).toBeVisible();await page.getByRole('button',{name:initialUser.preferred_language==='en'?'Portfolio':'Danh mục cá nhân',exact:true}).click();return {getTransaction:()=>transactionBody,getImports:()=>imports,getMutations:()=>mutations,getPerformanceHistoryRequests:()=>performanceHistoryRequests}
}
test('records a historical transaction and refreshes positions',async({page})=>{const state=await boot(page);await page.getByRole('tab',{name:/Giao dịch/}).click();const fields=page.locator('.transaction-form input');await fields.nth(0).fill('FPT');await fields.nth(1).fill('10');await fields.nth(2).fill('120000');await page.locator('.transaction-form button[type=submit]').click();await expect.poll(()=>state.getTransaction()).toMatchObject({symbol:'FPT',quantity:'10',price:'120000'});const row=page.locator('.portfolio-table tbody tr');await expect(row).toContainText('FPT');await expect(row).toHaveClass(/portfolio-row-clickable/);await row.hover();await expect(row).toHaveCSS('cursor','pointer');await row.click();await expect(page.getByRole('button',{name:'Chi tiết mã',exact:true})).toHaveClass(/active/)})
test('shows cost basis and realized versus unrealized P/L separately',async({page})=>{await boot(page);await expect(page.locator('.portfolio-table thead th')).toHaveCount(7);await expect(page.locator('.portfolio-table thead')).toContainText('Giá vốn');await expect(page.locator('.portfolio-table thead')).toContainText('Lãi/lỗ');await expect(page.locator('.portfolio-table thead')).toContainText('Thao tác');})
test('shows a transparent performance snapshot and remains usable on mobile',async({page})=>{await boot(page,[{stock_id:'a',symbol:'FPT',quantity:1000,avg_cost:100000,market_value:120000000,unrealized_pnl:20000000},{stock_id:'b',symbol:'VCB',quantity:400,avg_cost:100000,market_value:32000000,unrealized_pnl:-8000000}],[],[],[],{status:'complete',methodology:'weighted_average_cost_basis_v1',coverage:{priced_positions:2,open_positions:2},market_value:152000000,total_cost_basis:140000000,realized_pnl:2000000,unrealized_pnl:12000000,total_pnl:14000000,return_on_cost_pct:10,time_weighted_return_pct:null,money_weighted_return_pct:null});const panel=page.locator('.performance-panel');await expect(panel).toContainText('Kết quả theo giá vốn');await expect(panel).toContainText('44.000.000');await expect(panel).toContainText('+31,43% trên giá vốn');await expect(panel).toContainText('không phải TWR/MWR');await expect(panel).toContainText('2/2 vị thế có giá');await page.setViewportSize({width:390,height:844});expect(await panel.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true)})
test('renders a restrained performance chart with small accessible points and value area',async({page})=>{const history={status:'complete',coverage:{sessions:4,complete_sessions:4,incomplete_sessions:0},twr_available:true,cumulative_twr_pct:4,mwr:{status:'available',annualized_mwr_pct:8},points:[{date:'2026-10-01',status:'complete',portfolio_value:10000000},{date:'2026-10-02',status:'complete',portfolio_value:10200000,daily_return_pct:2},{date:'2026-10-05',status:'complete',portfolio_value:10100000,daily_return_pct:-0.98},{date:'2026-10-06',status:'complete',portfolio_value:10400000,daily_return_pct:2.97}]};await boot(page,[],[],[],[],null,[],history);const panel=page.locator('.performance-history-panel');const points=panel.locator('.performance-history-point');await expect(points).toHaveCount(4);for(const point of await points.all()){await expect(point).toHaveCSS('width','6px');await expect(point).toHaveCSS('height','6px');await expect(point).toHaveCSS('border-radius','50%')}await expect(panel.locator('.performance-history-area')).toHaveCount(1);await expect(panel.locator('.performance-history-line')).toHaveCSS('stroke-width','1.45px');await points.last().focus();await expect(points.last()).toHaveCSS('width','6px');expect(await points.last().evaluate(point=>getComputedStyle(point).boxShadow)).not.toBe('none');await page.screenshot({path:'test-results/performance-chart-professional.png',fullPage:true})})
test('shows daily valuation continuity and refetches the selected range',async({page})=>{const history={status:'complete',methodology:'daily_close_twr_v1',timezone:'Asia/Ho_Chi_Minh',cash_flow_timing:'beginning_of_session',requested_sessions:30,coverage:{sessions:3,complete_sessions:3,incomplete_sessions:0},twr_available:true,cumulative_twr_pct:5.25,mwr:{status:'available',reason:null,annualized_mwr_pct:12.3456,scope:'inception_to_terminal'},points:[{date:'2026-10-01',status:'complete',portfolio_value:10000000,cash_balance:0,external_cash_flow:10000000,daily_return_pct:null,cumulative_twr_pct:null},{date:'2026-10-02',status:'complete',portfolio_value:10200000,cash_balance:0,external_cash_flow:0,daily_return_pct:2,cumulative_twr_pct:2},{date:'2026-10-05',status:'complete',portfolio_value:10525000,cash_balance:0,external_cash_flow:0,daily_return_pct:3.186275,cumulative_twr_pct:5.25}],limitations:[]};const state=await boot(page,[],[],[],[],null,[],history);const panel=page.locator('.performance-history-panel');await expect(panel).toContainText('Giá trị và hiệu suất theo ngày');await expect(panel).toContainText('10.525.000');await expect(panel).toContainText('+5,25%');const mwr=panel.locator('.performance-mwr-card');await expect(mwr).toContainText('MWR từ khi bắt đầu');await expect(mwr).toContainText('+12,35%');await expect(mwr).toContainText('Tỷ suất thường niên hóa');await expect(panel.locator('.performance-history-chart')).toBeVisible();await expect(panel.locator('.performance-history-y-axis')).toContainText('10,5 Tr ₫');await expect(panel.locator('.performance-history-point').last()).toHaveAttribute('aria-label',/10\.525\.000/);await panel.getByRole('button',{name:'60 phiên'}).click();await expect.poll(()=>state.getPerformanceHistoryRequests().some(url=>url.includes('sessions=60'))).toBe(true);await page.setViewportSize({width:390,height:844});expect(await panel.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true)})
test('does not publish TWR or connect through incomplete valuation sessions',async({page})=>{const history={status:'partial',methodology:'daily_close_twr_v1',timezone:'Asia/Ho_Chi_Minh',cash_flow_timing:'beginning_of_session',requested_sessions:30,coverage:{sessions:3,complete_sessions:2,incomplete_sessions:1},twr_available:false,cumulative_twr_pct:null,points:[{date:'2026-10-01',status:'complete',portfolio_value:10000000},{date:'2026-10-02',status:'partial',portfolio_value:null,incomplete_reasons:['missing_prices'],missing_stock_ids:['a']},{date:'2026-10-05',status:'complete',portfolio_value:10500000}],limitations:[]};await boot(page,[],[],[],[],null,[],history);const panel=page.locator('.performance-history-panel');await expect(panel).toContainText('Chưa đủ dữ liệu');await expect(panel).toContainText('1 phiên thiếu giá đóng cửa');await expect(panel.locator('.performance-history-line')).toHaveCount(2);await expect(panel).toContainText('TWR được giữ ở trạng thái chưa công bố')})
test('explains unfunded history instead of drawing a zero-value chart',async({page})=>{const history={status:'partial',methodology:'daily_close_twr_v1',timezone:'Asia/Ho_Chi_Minh',cash_flow_timing:'beginning_of_session',first_activity_date:'2026-10-02',requested_sessions:30,coverage:{sessions:2,complete_sessions:0,incomplete_sessions:2},twr_available:false,cumulative_twr_pct:null,mwr:{status:'unavailable',reason:'partial_valuation'},points:[{date:'2026-10-02',status:'partial',portfolio_value:null,cash_balance:-100000,incomplete_reasons:['negative_cash_balance']},{date:'2026-10-03',status:'partial',portfolio_value:null,cash_balance:-100000,incomplete_reasons:['negative_cash_balance']}],limitations:[]};await boot(page,[],[],[],[],null,[],history);const panel=page.locator('.performance-history-panel');await expect(panel.locator('.performance-history-chart')).toHaveCount(0);await expect(panel.locator('.performance-history-chart-empty')).toContainText('2 phiên giao dịch làm số dư tiền âm');await expect(panel).toContainText('nạp vốn trước hoặc cùng ngày mua');await expect(panel).not.toContainText('01/10')})
test('explains unavailable, no-root and multiple-root MWR without exposing solver roots',async({page})=>{const base={status:'complete',methodology:'daily_close_twr_v1',timezone:'Asia/Ho_Chi_Minh',cash_flow_timing:'beginning_of_session',requested_sessions:30,coverage:{sessions:2,complete_sessions:2,incomplete_sessions:0},twr_available:true,cumulative_twr_pct:0,points:[{date:'2026-10-01',status:'complete',portfolio_value:10000000},{date:'2026-10-02',status:'complete',portfolio_value:10000000}],limitations:[]};await boot(page,[],[],[],[],null,[],{...base,mwr:{status:'multiple_roots',reason:'ambiguous_cash_flow_pattern',annualized_mwr_pct:null,roots_pct:[10,20]}});const card=page.locator('.performance-mwr-card');await expect(card).toContainText('Không duy nhất');await expect(card).toContainText('không chọn tùy ý');await expect(card).not.toContainText('10%');await expect(card).not.toContainText('20%');await page.route('**/api/portfolio/performance/history*',route=>route.fulfill({json:{success:true,data:{...base,mwr:{status:'no_root',reason:'no_rate_in_supported_domain',annualized_mwr_pct:null}}}}));await page.reload();await page.getByRole('button',{name:'Danh mục cá nhân',exact:true}).click();await expect(page.locator('.performance-mwr-card')).toContainText('Không xác định');await page.route('**/api/portfolio/performance/history*',route=>route.fulfill({json:{success:true,data:{...base,status:'partial',mwr:{status:'unavailable',reason:'partial_valuation',annualized_mwr_pct:null}}}}));await page.reload();await page.getByRole('button',{name:'Danh mục cá nhân',exact:true}).click();await expect(page.locator('.performance-mwr-card')).toContainText('Cần hoàn tất các phiên định giá')})
test('manages external cash flows with confirmation and mobile-safe layout',async({page})=>{const state=await boot(page,[],[],[],[],null,[{id:'cf-1',type:'DEPOSIT',amount:10000000,occurred_at:'2026-10-01T03:00:00Z',note:'Vốn đầu kỳ'}]);await page.getByRole('tab',{name:/Dòng tiền/}).click();const panel=page.locator('.cash-flow-panel');await expect(panel).toContainText('10.000.000 ₫');await panel.getByLabel('Số tiền (VND)').fill('2500000');await panel.getByLabel('Loại dòng tiền').selectOption('WITHDRAWAL');await panel.getByLabel('Ghi chú (không bắt buộc)').fill('Rút một phần');await panel.getByRole('button',{name:'Ghi nhận'}).click();await expect(panel.getByRole('status')).toContainText('Đã ghi nhận rút tiền');await expect(panel.locator('tbody tr')).toHaveCount(2);await panel.locator('tbody tr').filter({hasText:'Rút một phần'}).getByRole('button',{name:'Sửa'}).click();const edit=page.getByRole('dialog',{name:'Sửa bản ghi'});await edit.getByLabel('Số tiền (VND)').fill('2000000');await edit.getByRole('button',{name:'Lưu thay đổi'}).click();await expect(panel).toContainText('2.000.000 ₫');await panel.locator('tbody tr').filter({hasText:'Rút một phần'}).getByRole('button',{name:'Xóa'}).click();const remove=page.getByRole('dialog',{name:'Xóa dòng tiền?'});await expect(remove).toContainText('2.000.000 ₫');await remove.getByRole('button',{name:'Xác nhận xóa'}).click();await expect(panel.locator('tbody tr')).toHaveCount(1);expect(state.getMutations()).toEqual([expect.objectContaining({method:'POST'}),expect.objectContaining({method:'PUT',id:'cf-2'}),{method:'DELETE',id:'cf-2',body:{confirmed:true}}]);await page.setViewportSize({width:390,height:844});expect(await panel.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true)})
test('applies the English portfolio catalog, formatting and timezone',async({page})=>{await boot(page,[],[],[],[],null,[{id:'cf-locale',type:'DEPOSIT',amount:1000000,occurred_at:'2026-10-01T03:00:00Z',note:'Locale'}],null,{id:'locale-user',email:'locale@example.com',role:'user',preferred_language:'en',timezone:'Asia/Singapore'});await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page.locator('html')).toHaveAttribute('data-locale','en');await expect(page.locator('html')).toHaveAttribute('data-timezone','Asia/Singapore');await expect(page.getByRole('heading',{name:'Portfolio and watchlist'})).toBeVisible();const tabs=page.getByRole('tablist',{name:'Portfolio content'});await expect(tabs.getByRole('tab',{name:/Overview/})).toBeVisible();await expect(tabs.getByRole('tab',{name:/Transactions/})).toBeVisible();await expect(page.getByRole('heading',{name:'Start with your first transaction'})).toBeVisible();await expect(page.getByRole('heading',{name:'Portfolio allocation'})).toBeVisible();await expect(page.getByRole('heading',{name:'Daily value and performance'})).toBeVisible();await tabs.getByRole('tab',{name:/Transactions/}).click();await expect(page.getByRole('heading',{name:'Record transaction'})).toBeVisible();await expect(page.getByRole('heading',{name:'Transaction ledger'})).toBeVisible();await expect(page.getByText('No transactions have been recorded.')).toBeVisible();await tabs.getByRole('tab',{name:/Cash flows/}).click();await expect(page.getByRole('heading',{name:'Deposits and withdrawals'})).toBeVisible();const row=page.locator('.cash-flow-table tbody tr');await expect(row).toContainText('Deposit');await expect(row).toContainText('1,000,000 ₫');await expect(row).toContainText('10/1/26, 11:00 AM');await tabs.getByRole('tab',{name:/Watchlist/}).click();await expect(page.getByText('Quickly track symbols that interest you.')).toBeVisible()})
test('blocks duplicate cash-flow submits and keeps API failures recoverable',async({page})=>{await boot(page);await page.getByRole('tab',{name:/Dòng tiền/}).click();let calls=0;await page.route('**/api/portfolio/cash-flows',async route=>{if(route.request().method()!=='POST')return route.fallback();calls+=1;await new Promise(resolve=>setTimeout(resolve,120));return route.fulfill({status:503,json:{success:false,message:'Dòng tiền đang tạm gián đoạn.'}})});const panel=page.locator('.cash-flow-panel');await panel.getByLabel('Số tiền (VND)').fill('1000000');const submit=panel.getByRole('button',{name:'Ghi nhận'});await submit.evaluate(button=>{button.click();button.click()});await expect(panel.getByRole('button',{name:'Đang lưu…'})).toBeDisabled();await expect(panel.getByRole('alert')).toContainText('Dòng tiền đang tạm gián đoạn.');expect(calls).toBe(1);await expect(panel.getByLabel('Số tiền (VND)')).toHaveValue('1000000')})
test('filters open and fully closed positions without mixing their metrics',async({page})=>{await boot(page,[{stock_id:'a',symbol:'FPT',quantity:10,market_price:120000,avg_cost:100000,unrealized_pnl:200000,realized_pnl:0}],[],[{stock_id:'b',symbol:'VCB',name:'Vietcombank',status:'closed',quantity:0,realized_pnl:150000,closed_at:'2026-09-30T03:00:00Z'}]);const positions=page.locator('.portfolio-positions');await expect(positions.getByRole('button',{name:'Đang mở 1'})).toHaveAttribute('aria-pressed','true');await expect(positions.getByRole('table',{name:'Vị thế đang mở'})).toContainText('FPT');await positions.getByRole('button',{name:'Đã đóng 1'}).click();await expect(positions.getByRole('button',{name:'Đã đóng 1'})).toHaveAttribute('aria-pressed','true');const closed=positions.getByRole('table',{name:'Vị thế đã đóng'});await expect(closed).toContainText('VCB');await expect(closed).toContainText('Đã đóng');await expect(closed).toContainText('150.000');await expect(closed).not.toContainText('Giá hiện tại')})
test('adds a symbol to watchlist through the tracking form',async({page})=>{await boot(page);await page.getByRole('tab',{name:/Watchlist/}).click();const input=page.getByLabel('Thêm mã theo dõi');await input.fill('FPT');await page.locator('.watchlist-panel button.primary-btn').click();await expect(page.locator('.watchlist li')).toContainText('FPT')})

test('searches watchlist and separates opening from confirmed removal',async({page})=>{await boot(page,[],[],[],[{stock_id:'a',Stock:{id:'a',code:'FPT',name:'Công nghệ FPT'}},{stock_id:'b',Stock:{id:'b',code:'HPG',name:'Hòa Phát'}}]);await page.getByRole('tab',{name:/Watchlist/}).click();const panel=page.locator('.watchlist-panel');const search=panel.getByLabel('Tìm trong Watchlist');await search.fill('hoa phat');await expect(panel.locator('.watchlist li')).toHaveCount(1);await expect(panel.locator('.watchlist li')).toContainText('HPG');await panel.getByRole('button',{name:'Xóa HPG khỏi Watchlist'}).click();await expect(panel.getByRole('group',{name:'Xác nhận xóa HPG'})).toBeVisible();await panel.getByRole('button',{name:'Hủy'}).click();await expect(panel.locator('.watchlist li')).toHaveCount(1);await panel.getByRole('button',{name:'Xóa HPG khỏi Watchlist'}).click();await panel.getByRole('button',{name:'Xác nhận xóa'}).click();await expect(panel.getByText(/Không có mã phù hợp/)).toBeVisible();await panel.getByRole('button',{name:'Xóa tìm kiếm'}).click();await expect(search).toBeFocused();await expect(panel.locator('.watchlist li')).toHaveCount(1);const detailLink=panel.getByRole('link',{name:'Mở chi tiết'});await expect(detailLink).toHaveAttribute('href','/?stock=a');await detailLink.click();await expect(page.getByRole('button',{name:'Chi tiết mã',exact:true})).toHaveClass(/active/);})

test('blocks duplicate watchlist mutations and keeps recoverable failures local', async ({ page }) => {
  await boot(page, [], [], [], [{ stock_id: 'b', Stock: { id: 'b', code: 'HPG', name: 'Hòa Phát' } }]);await page.getByRole('tab',{name:/Watchlist/}).click();
  const panel = page.locator('.watchlist-panel')
  let postCount = 0
  await page.route('**/api/watchlist', async route => {
    if (route.request().method() !== 'POST') return route.fallback()
    postCount += 1
    await new Promise(resolve => setTimeout(resolve, 150))
    return route.fulfill({ status: 503, json: { success: false, message: 'Watchlist đang tạm gián đoạn.' } })
  })
  const addInput = panel.getByLabel('Thêm mã theo dõi')
  await addInput.fill('FPT')
  const addButton = panel.getByRole('button', { name: 'Thêm mã' })
  await addButton.evaluate(button => { button.click(); button.click() })
  await expect(panel.getByRole('button', { name: 'Đang thêm FPT…' })).toBeDisabled()
  await expect(panel.getByRole('alert')).toContainText('Watchlist đang tạm gián đoạn.')
  expect(postCount).toBe(1)
  await expect(addInput).toHaveValue('FPT')

  await page.route('**/api/watchlist/HPG', route => route.fulfill({ status: 503, json: { success: false, message: 'Chưa thể xóa HPG.' } }))
  await panel.getByRole('button', { name: 'Xóa HPG khỏi Watchlist' }).click()
  await panel.getByRole('button', { name: 'Xác nhận xóa' }).click()
  await expect(panel.getByRole('alert')).toContainText('Chưa thể xóa HPG.')
  await expect(panel.getByRole('group', { name: 'Xác nhận xóa HPG' })).toBeVisible()
  await expect(panel.locator('.watchlist li')).toContainText('HPG')
})

test('renders the transaction ledger and exports all rows to CSV',async({page})=>{await boot(page,[],[{id:'tx-1',stock_id:'a',symbol:'FPT',name:'FPT Corp',side:'BUY',quantity:10,price:120000,fees:1500,traded_at:'2026-10-01T03:00:00Z',source:'manual'}]);await page.getByRole('tab',{name:/Giao dịch/}).click();const panel=page.locator('.portfolio-ledger-panel');await expect(panel).toBeVisible();await expect(panel.locator('tbody tr')).toHaveCount(1);await expect(panel.locator('tbody tr')).toContainText('FPT');await expect(panel.locator('tbody tr')).toContainText('120.000');const downloadPromise=page.waitForEvent('download');await panel.getByRole('button',{name:'Xuất CSV'}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toMatch(/^stockpilot-ledger-\d{4}-\d{2}-\d{2}\.csv$/)})

test('previews then atomically imports a valid ledger CSV',async({page})=>{const state=await boot(page);await page.getByRole('tab',{name:/Giao dịch/}).click();const panel=page.locator('.portfolio-ledger-panel');await panel.locator('input[type=file]').setInputFiles({name:'ledger.csv',mimeType:'text/csv',buffer:Buffer.from('Mã,Loại,Số lượng,Giá,Phí,Thời điểm giao dịch\nFPT,Mua,10,120000,1000,2026-10-01T03:00:00.000Z')});await expect(panel.locator('.portfolio-import-status')).toContainText('Sẵn sàng nhập');await expect.poll(()=>state.getImports().length).toBe(1);expect(state.getImports()[0].dry_run).toBe(true);await panel.getByRole('button',{name:'Nhập 1 giao dịch'}).click();await expect(panel.locator('.portfolio-import-status')).toContainText('Đã nhập 1 giao dịch');await expect(panel.locator('tbody tr')).toContainText('FPT');await expect.poll(()=>state.getImports().length).toBe(2);expect(state.getImports()[1].dry_run).toBe(false)})

test('shows row errors from CSV preview and keeps commit disabled',async({page})=>{const state=await boot(page);await page.getByRole('tab',{name:/Giao dịch/}).click();const panel=page.locator('.portfolio-ledger-panel');await panel.locator('input[type=file]').setInputFiles({name:'invalid.csv',mimeType:'text/csv',buffer:Buffer.from('Mã,Loại,Số lượng,Giá,Thời điểm giao dịch\nAAA,Mua,10,120000,2026-10-01T03:00:00.000Z')});const status=panel.locator('.portfolio-import-status');await expect(status).toContainText('Chưa thể nhập');await expect(status).toContainText('Dòng 2');await expect(status).toContainText('Không tìm thấy mã AAA');await expect(panel.getByRole('button',{name:'Nhập 1 giao dịch'})).toBeDisabled();expect(state.getImports()).toHaveLength(1)})

test('edits a ledger transaction only after explicit confirmation',async({page})=>{const state=await boot(page,[],[{id:'tx-1',stock_id:'a',symbol:'FPT',name:'FPT Corp',side:'BUY',quantity:10,price:120000,fees:1500,traded_at:'2026-10-01T03:00:00Z',source:'manual'}]);await page.getByRole('tab',{name:/Giao dịch/}).click();const panel=page.locator('.portfolio-ledger-panel');await panel.getByRole('button',{name:'Sửa'}).click();const dialog=page.getByRole('dialog',{name:/Sửa giao dịch FPT/});await expect(dialog).toBeVisible();await expect(dialog.locator('input').first()).toHaveCSS('background-color','rgb(23, 36, 58)');await dialog.getByLabel('Số lượng').fill('12');await dialog.getByRole('button',{name:'Xác nhận sửa'}).click();await expect(dialog).toHaveCount(0);await expect(panel.locator('tbody tr')).toContainText('12');await expect(panel.getByRole('status')).toHaveText('Đã sửa giao dịch.');await expect.poll(()=>state.getMutations()).toHaveLength(1);expect(state.getMutations()[0]).toMatchObject({method:'PUT',id:'tx-1',body:{side:'BUY',quantity:'12',price:'120000',fees:'1500'}})})

test('deletes a ledger transaction only after confirmation and sends the confirmation flag',async({page})=>{const state=await boot(page,[],[{id:'tx-1',stock_id:'a',symbol:'FPT',name:'FPT Corp',side:'BUY',quantity:10,price:120000,fees:0,traded_at:'2026-10-01T03:00:00Z',source:'manual'}]);await page.getByRole('tab',{name:/Giao dịch/}).click();const panel=page.locator('.portfolio-ledger-panel');await panel.getByRole('button',{name:'Xóa'}).click();const dialog=page.getByRole('dialog',{name:'Xác nhận xóa giao dịch'});await expect(dialog).toContainText('Mua 10 FPT');await dialog.getByRole('button',{name:'Hủy'}).click();await expect(panel.locator('tbody tr')).toHaveCount(1);expect(state.getMutations()).toHaveLength(0);await panel.getByRole('button',{name:'Xóa'}).click();await page.getByRole('dialog',{name:'Xác nhận xóa giao dịch'}).getByRole('button',{name:'Xác nhận xóa'}).click();await expect(panel.locator('.portfolio-ledger-empty')).toBeVisible();await expect(panel.getByRole('status')).toHaveText('Đã xóa giao dịch.');await expect(page.locator('.portfolio-panel').getByText('Đã xóa giao dịch.')).toHaveCount(0);expect(state.getMutations()).toEqual([{method:'DELETE',id:'tx-1',body:{confirmed:true}}])})

test('shows stock weight tooltip across the donut shell on hover and keyboard focus',async({page})=>{await boot(page,[{stock_id:'a',symbol:'FPT',quantity:10,market_price:120000,avg_cost:100000,unrealized_pnl:200000,realized_pnl:0},{stock_id:'b',symbol:'VCB',quantity:5,market_price:80000,avg_cost:70000,unrealized_pnl:50000,realized_pnl:0}]);const donut=page.locator('.allocation-donut');const fptSlice=page.locator('.allocation-donut-interaction-svg path[data-symbol="FPT"]');const vcbSlice=page.locator('.allocation-donut-interaction-svg path[data-symbol="VCB"]');const tooltip=page.locator('.allocation-donut-tooltip');await expect(fptSlice).toHaveAttribute('aria-label',/FPT: 66\.7%/);await expect(vcbSlice).toHaveAttribute('aria-label',/VCB: 33\.3%/);await expect(page.locator('.page-loading-overlay')).toHaveCount(0);await donut.scrollIntoViewIfNeeded();const box=await donut.boundingBox();expect(box).not.toBeNull();await page.mouse.move(box.x+box.width-10,box.y+box.height/2);await expect(tooltip).toBeVisible();await expect(tooltip).toContainText('FPT');await expect(tooltip).toContainText('66.7%');await expect(tooltip).toContainText('1.300.000');await vcbSlice.focus();await expect(tooltip).toBeVisible();await expect(tooltip).toContainText('VCB');await expect(tooltip).toContainText('33.3%')})

test('shows large positive day change with the existing purple RAG tier',async({page})=>{await boot(page,[{stock_id:'a',symbol:'FPT',quantity:10,market_price:120000,previous_market_price:120000,avg_cost:100000,unrealized_pnl:200000,realized_pnl:0}]);await expect(page.locator('.portfolio-table tbody tr')).toContainText('130.000');const change=page.locator('.allocation-day-change');const value=change.locator('span');await expect(change).toContainText('So với hôm qua:');await expect(value).toHaveText('+100.000 ₫ +8,33%');await expect(change).toHaveAttribute('data-rag','purple');await expect(value).toHaveCSS('color','rgb(167, 139, 250)')})

test('shows large negative day change in the deep-red RAG tier with explicit minus signs',async({page})=>{await boot(page,[{stock_id:'a',symbol:'FPT',quantity:10,market_price:120000,previous_market_price:140000,avg_cost:100000,unrealized_pnl:200000,realized_pnl:0}]);await expect(page.locator('.portfolio-table tbody tr')).toContainText('130.000');const change=page.locator('.allocation-day-change');const value=change.locator('span');await expect(value).toHaveText('-100.000 ₫ -7,14%');await expect(change).toHaveAttribute('data-rag','deep-red');await expect(value).toHaveCSS('color','rgb(127, 29, 29)')})

test('revalues positions and allocation from the newest intraday quote',async({page})=>{await boot(page,[{stock_id:'a',symbol:'FPT',quantity:10,market_price:120000,avg_cost:100000,unrealized_pnl:200000,realized_pnl:0}]);await expect(page.locator('.portfolio-table tbody tr')).toContainText('130.000');await expect(page.locator('.portfolio-table tbody tr')).toContainText('300.000');await expect(page.locator('.portfolio-table tbody tr')).toContainText('Intraday');await expect(page.locator('.allocation-donut')).toBeVisible();await expect(page.locator('.allocation-donut')).toContainText('1.300.000');await expect(page.locator('.allocation-list')).toContainText('100.0%');await expect(page.locator('.portfolio-data-audit')).toContainText('Kiểm tra dữ liệu danh mục')})
