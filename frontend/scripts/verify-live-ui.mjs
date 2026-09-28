import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  // Only isolate account data; stock lists and quotes use the real running API.
  await page.addInitScript(() => localStorage.setItem('market-auth', JSON.stringify({ token: 'local-ui-smoke', user: { email: 'local-smoke@example.com', role: 'user' } })))
  await page.route('**/api/watchlist', route => route.fulfill({ json: { success: true, data: [] } }))
  await page.route('**/api/portfolio', route => route.fulfill({ json: { success: true, data: { positions: [] } } }))
  await page.route('**/api/auth/me', route => route.fulfill({ json: { success: true, user: { email: 'local-smoke@example.com', role: 'user' } } }))
  await page.goto('http://127.0.0.1:4173')
  await page.waitForFunction(() => document.querySelectorAll('.table-panel tbody tr').length > 0)
  await page.waitForFunction(() => [...document.querySelectorAll('.table-panel tbody tr')].some(row => row.querySelector('.symbol')?.textContent?.trim()), null, { timeout: 45000 })
  const bottomPageSize = page.locator('.table-pagination .overview-page-size-control')
  const bottomResultCount = page.locator('.table-pagination .overview-pagination-count')
  await bottomPageSize.waitFor({ state: 'visible' })
  await bottomResultCount.waitFor({ state: 'visible' })
  if (await page.locator('.page-size-control:not(.overview-page-size-control)').isVisible()) {
    throw new Error('The original page-size control is still visible above the table.')
  }
  const firstRow = await page.locator('.table-panel tbody tr').first().innerText()
  let inspectedPage = 1
  while (await page.locator('[data-stale-volume]').count() === 0 && inspectedPage < 4) {
    const previousSymbol = await page.locator('.table-panel tbody tr .symbol').first().innerText()
    const next = page.getByRole('button', { name: 'Sau', exact: true })
    if (await next.isDisabled()) break
    await next.click()
    await page.waitForFunction(symbol => document.querySelector('.table-panel tbody tr .symbol')?.textContent?.trim() !== symbol, previousSymbol)
    await page.waitForTimeout(500)
    inspectedPage += 1
  }
  const overlayDiagnostic = await page.evaluate(async () => {
    const qualityResponse = await fetch('/api/stocks/data-quality', { cache: 'no-store' })
    const qualityPayload = await qualityResponse.json()
    const missing = new Set((qualityPayload.data?.missing_symbols || []).map(symbol => String(symbol).toUpperCase()))
    const symbols = [...document.querySelectorAll('.table-panel tbody tr')]
      .map(row => {
        const cell = row.querySelector('td.symbol') || row.cells?.[0]
        const node = [...(cell?.childNodes || [])].find(child => child.nodeType === 3 && child.textContent.trim())
          || cell?.firstElementChild
        return node?.textContent?.trim().toUpperCase()
      })
      .filter(Boolean)
    return {
      overlayLoaded: Boolean(document.querySelector('script[src*="stale-volume-overlay"]')),
      qualityStatus: qualityResponse.status,
      visibleSymbols: symbols,
      visibleMissing: symbols.filter(symbol => missing.has(symbol)),
      stockRequests: performance.getEntriesByType('resource')
        .map(entry => entry.name)
        .filter(name => name.includes('/api/stocks?'))
    }
  })
  const staleVolumeBadges = await page.locator('[data-stale-volume]').count()
  if (overlayDiagnostic.visibleMissing.length && staleVolumeBadges !== overlayDiagnostic.visibleMissing.length) {
    throw new Error(`Expected ${overlayDiagnostic.visibleMissing.length} stale volume badges, found ${staleVolumeBadges}.`)
  }
  const evidence = { checked_at: new Date().toISOString(), account_apis_mocked: true, stock_apis_mocked: false,
    rows: await page.locator('.table-panel tbody tr').count(),
    first_row: firstRow,
    stale_volume_inspected_page: inspectedPage,
    stale_volume_badges: staleVolumeBadges,
    page_size_control: {
      location: 'table-pagination',
      label: await bottomPageSize.locator('span').innerText(),
      value: await bottomPageSize.locator('select').inputValue(),
      result_count: await bottomResultCount.innerText()
    },
    stale_volume_diagnostic: overlayDiagnostic,
    coverage: await page.locator('[role=status]').allTextContents() }
  await mkdir('../backend/evidence', { recursive: true })
  await page.locator('.loading-overlay').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {})
  await page.locator('.table-pagination').scrollIntoViewIfNeeded()
  await page.screenshot({ path: '../backend/evidence/live-overview-2026-09-21.png' })
  await writeFile('../backend/evidence/live-overview-2026-09-21.json', JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify(evidence))
} finally { await browser.close() }
