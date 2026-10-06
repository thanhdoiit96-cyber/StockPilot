import { chromium, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'

// Creates one isolated development account; never logs or persists its credentials.
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const origin = 'http://127.0.0.1:4173'
try {
  const context = await browser.newContext()
  const response = await context.request.post(origin + '/api/auth/register', {
    headers: { 'X-Auth-Mode': 'cookie-v1' },
    data: { email: 'watchlist-smoke-' + randomUUID() + '@example.invalid', password: randomUUID() }
  })
  if (response.status() !== 201) throw new Error('Development registration failed: HTTP ' + response.status())
  const page = await context.newPage()
  await page.goto(origin)
  await page.getByRole('button', { name: 'Danh mục cá nhân', exact: true }).click()
  const panel = page.locator('.watchlist-panel')
  await panel.getByLabel('Thêm mã theo dõi').fill('FPT')
  await panel.getByRole('button', { name: 'Thêm mã' }).click()
  await expect(panel.getByRole('status').filter({ hasText: 'Đã thêm FPT' })).toBeVisible()
  await expect(panel.locator('.watchlist li')).toContainText('FPT')
  await page.reload()
  await page.getByRole('button', { name: 'Danh mục cá nhân', exact: true }).click()
  await expect(panel.locator('.watchlist li')).toContainText('FPT')
  await panel.getByRole('button', { name: 'Xóa FPT khỏi Watchlist' }).click()
  await panel.getByRole('button', { name: 'Xác nhận xóa' }).click()
  await expect(panel.getByRole('status').filter({ hasText: 'Đã xóa FPT' })).toBeVisible()
  await expect(panel.locator('.watchlist li')).not.toContainText('FPT')
  await page.reload()
  await page.getByRole('button', { name: 'Danh mục cá nhân', exact: true }).click()
  await expect(panel.locator('.watchlist li')).not.toContainText('FPT')
  console.log('Live Watchlist passed: add, persisted reload, confirmed removal and persisted removal. One isolated development account retained; credentials not persisted.')
} finally { await browser.close() }
