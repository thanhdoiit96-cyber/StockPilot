import { test, expect } from '@playwright/test'
const stocks=[{id:'a',code:'FPT',name:'FPT Corp',price:120000,industry:'technology',volume:1000},{id:'b',code:'VCB',name:'Vietcombank',price:90000,industry:'banking_finance',volume:2000}]
const list=(data=stocks)=>({success:true,data,pagination:{page:1,pageSize:25,total:data.length,totalPages:2}})
async function boot(page, options = {}){await page.route('**/api/**',async route=>{const path=new URL(route.request().url()).pathname;const payload=path==='/api/stocks'?list():path==='/api/health'?{success:true,data:{status:'ok'}}:path==='/api/cache/stats'?{success:true,data:{totalEntries:2}}:path==='/api/ai-gate'?{success:true,data:{enabled:false,reasons:[]}}:path==='/api/recommendations/latest'?(options.recommendations || {success:true,data:{recommendations:[]}}):path==='/api/recommendations/history'?{success:true,data:[]}:path==='/api/recommendations/readiness'?{success:true,data:{coverage:[]}}:path==='/api/auth/me'?{success:true,user:{id:'e2e',email:'e2e@example.com',role:'admin'}}:path==='/api/watchlist'?{success:true,data:[]}:path==='/api/portfolio'?{success:true,data:{positions:[]}}:{success:true,data:null};await route.fulfill({json:payload})});await page.goto('/');await expect(page.locator('.dashboard-shell')).toBeVisible()}
test('overview supports sort and sector filter',async({page})=>{await boot(page);await expect(page.locator('tbody tr')).toHaveCount(2);await expect(page.locator('.sector-select option')).toHaveCount(10);await page.locator('.table-sort-btn').first().click();await expect(page.locator('tbody tr')).toHaveCount(2);await page.locator('.sector-select').selectOption('technology');await expect(page.locator('tbody tr')).toHaveCount(2);await expect(page.locator('.nav-item').first()).toHaveClass(/active/)})
test('sidebar collapses to labelled icons and overview headers stay pinned', async ({ page }) => {
  await boot(page)
  await page.locator('.sidebar-toggle').click()
  await expect(page.locator('.dashboard-shell')).toHaveClass(/sidebar-collapsed/)
  await expect(page.locator('.nav-label').first()).toBeHidden()
  await expect(page.locator('.nav-icon').first()).toBeVisible()
  await expect(page.locator('.nav-item').first()).toHaveAttribute('aria-label', 'Tổng quan')
  await page.locator('.sidebar-toggle').click()
  await expect(page.locator('.dashboard-shell')).not.toHaveClass(/sidebar-collapsed/)
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
  expect(sticky.symbol).toBe('static')
  expect(sticky.sidebar).toBe('sticky')
  expect(sticky.sidebarOverflow).toBe('hidden')
  expect(sticky.navOverflow).toBe('hidden')
  expect(sticky.tableOverflow).toBe('visible')
  expect(sticky.pageOverflow).not.toBe('scroll')
  await page.evaluate(() => { document.body.style.minHeight = '2200px'; window.scrollTo(0, 640) })
  await expect.poll(() => page.evaluate(() => Math.round(document.querySelector('.sidebar').getBoundingClientRect().top))).toBe(0)
})
test('personal tab renders portfolio and watchlist',async({page})=>{await boot(page);await page.locator('.nav-item').nth(1).click();await expect(page.locator('.transaction-form')).toBeVisible();await expect(page.getByRole('heading', { name: 'Watchlist' })).toBeVisible()})

test('recommendations live in a dedicated workspace', async ({ page }) => {
  await boot(page)
  await page.getByRole('button', { name: 'Đề xuất', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Đề xuất theo tiêu chí của bạn' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Bạn muốn ưu tiên điều gì?' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Danh sách cổ phiếu' })).toHaveCount(0)
})

test('recommendations show concentration risk from the snapshot monitor', async ({ page }) => {
  await boot(page, { recommendations: { success: true, data: { risk: { concentration_warning: 'sector_concentration_at_or_above_60_pct', max_sector_share_pct: 60, pending: 5 }, recommendations: [] } } })
  await page.locator('.nav-item').nth(3).click()
  await expect(page.locator('.recommendation-risk-banner')).toContainText('60%')
  await expect(page.locator('.recommendation-risk-banner')).toBeVisible()
})

test('sort, sector and pagination preserve the current scroll position',async({page})=>{await boot(page);await page.evaluate(()=>{document.body.style.minHeight='2000px';window.scrollTo(0,640)});const before=await page.evaluate(()=>window.scrollY);await page.locator('.table-sort-btn').first().click();await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(0);await page.locator('.sector-select').selectOption('technology');await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(0);await page.getByRole('button',{name:'Sau'}).click();await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(0)})





