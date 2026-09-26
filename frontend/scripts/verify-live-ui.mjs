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
  const evidence = { checked_at: new Date().toISOString(), account_apis_mocked: true, stock_apis_mocked: false,
    rows: await page.locator('.table-panel tbody tr').count(),
    first_row: await page.locator('.table-panel tbody tr').first().innerText(),
    coverage: await page.locator('[role=status]').allTextContents() }
  await mkdir('../backend/evidence', { recursive: true })
  await page.screenshot({ path: '../backend/evidence/live-overview-2026-09-21.png' })
  await writeFile('../backend/evidence/live-overview-2026-09-21.json', JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify(evidence))
} finally { await browser.close() }
