import { chromium, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'

// Creates one isolated development account; never logs or persists its credentials.
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const origin = 'http://localhost:4173'
try {
  const context = await browser.newContext()
  const response = await context.request.post(origin + '/api/auth/register', {
    headers: { 'X-Auth-Mode': 'cookie-v1' },
    data: { email: 'watchlist-smoke-' + randomUUID() + '@example.invalid', password: randomUUID() }
  })
  if (response.status() !== 201) throw new Error('Development registration failed: HTTP ' + response.status())
  const page = await context.newPage()
  await page.goto(origin)
  await page.getByRole('button', { name: 'Bảng giá', exact: true }).click()
  await page.getByLabel('Tìm cổ phiếu').fill('FPT')
  const quickAdd = page.getByRole('button', { name: 'Thêm FPT vào Watchlist' }).first()
  await quickAdd.click()
  await expect(page.getByRole('button', { name: 'FPT đã có trong Watchlist' }).first()).toBeDisabled()
  await page.getByRole('button', { name: 'Danh mục cá nhân', exact: true }).click()
  await page.getByRole('tab', { name: /Watchlist/ }).click()
  const panel = page.locator('.watchlist-panel')
  await expect(panel.locator('.watchlist li')).toContainText('FPT')
  await panel.getByRole('button', { name: 'Chỉnh sửa theo dõi FPT' }).click()
  const editor = panel.getByRole('group', { name: 'Chỉnh sửa theo dõi FPT' })
  await editor.getByLabel('Trạng thái').selectOption('RESEARCHING')
  await editor.getByLabel('Ghi chú cá nhân').fill('Live persistence smoke')
  await editor.getByRole('button', { name: 'Lưu' }).click()
  await expect(panel.locator('.watchlist-status', { hasText: 'Đang nghiên cứu' })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Danh mục cá nhân', exact: true }).click()
  await page.getByRole('tab', { name: /Watchlist/ }).click()
  await expect(panel.locator('.watchlist li')).toContainText('FPT')
  await expect(panel.getByText('Live persistence smoke')).toBeVisible()
  const controls = panel.locator('.watchlist-view-controls select')
  await controls.nth(1).selectOption('RESEARCHING')
  await expect(panel.locator('ul.watchlist > li')).toContainText('FPT')
  await panel.getByRole('button', { name: 'Xóa FPT khỏi Watchlist' }).click()
  await panel.getByRole('button', { name: 'Xác nhận xóa' }).click()
  await expect(panel.getByRole('status').filter({ hasText: 'Đã xóa FPT' })).toBeVisible()
  await expect(panel.locator('.watchlist li')).not.toContainText('FPT')
  await page.reload()
  await page.getByRole('button', { name: 'Danh mục cá nhân', exact: true }).click()
  await page.getByRole('tab', { name: /Watchlist/ }).click()
  await expect(panel.locator('.watchlist li')).not.toContainText('FPT')
  console.log('Live Watchlist passed: quick-add, metadata persistence/reload, status filtering, confirmed removal and persisted removal. One isolated development account retained; credentials not persisted.')
} finally { await browser.close() }
