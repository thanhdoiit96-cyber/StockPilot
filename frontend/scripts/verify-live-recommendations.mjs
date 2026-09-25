import { chromium } from '@playwright/test'

const baseUrl = process.env.UI_BASE_URL || 'http://127.0.0.1:4180'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage()
  await page.addInitScript(() => localStorage.setItem('market-auth', JSON.stringify({ token: 'local-ui-smoke', user: { email: 'local-smoke@example.com', role: 'user' } })))
  await page.route('**/api/auth/me', route => route.fulfill({ json: { success: true, user: { email: 'local-smoke@example.com', role: 'user' } } }))
  await page.route('**/api/watchlist', route => route.fulfill({ json: { success: true, data: [] } }))
  await page.route('**/api/portfolio', route => route.fulfill({ json: { success: true, data: { positions: [] } } }))
  await page.goto(baseUrl)
  await page.locator('.nav-item').nth(3).click()
  await page.locator('.recommendations-page').waitFor()
  const plans = await page.locator('.recommendation-plan').count()
  const charts = await page.locator('.recommendation-chart').count()
  if (!plans || charts) throw new Error(`recommendation plan/chart state invalid: plans=${plans}, charts=${charts}`)
  console.log(JSON.stringify({ baseUrl, plans, charts, checked_at: new Date().toISOString() }))
} finally { await browser.close() }
