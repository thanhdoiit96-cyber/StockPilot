import { test, expect } from '@playwright/test'

test('authentication failure receives focus, keeps input and clears when mode changes', async ({ page }) => {
  let releaseRequest
  let requestCount = 0
  await page.addInitScript(() => localStorage.removeItem('market-auth'))
  await page.route('**/api/auth/login', async route => {
    requestCount += 1
    await new Promise(resolve => { releaseRequest = resolve })
    await route.fulfill({ status: 401, json: { success: false, message: 'Email hoặc mật khẩu không đúng' } })
  })
  await page.goto('/')
  const email = page.getByLabel('Email đăng nhập')
  const password = page.getByLabel('Mật khẩu đăng nhập')
  await email.fill('investor@example.com')
  await password.fill('password123')
  const form = page.locator('.auth-form')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(form).toHaveAttribute('aria-busy', 'true')
  await expect(page.getByRole('button', { name: 'Đang đăng nhập…' })).toBeDisabled()
  await expect(email).toBeDisabled()
  await expect(password).toBeDisabled()
  await expect(page.getByRole('status')).toHaveText('Đang xác thực thông tin đăng nhập…')
  await expect.poll(() => requestCount).toBe(1)
  releaseRequest()
  const alert = page.getByRole('alert')
  await expect(form).toHaveAttribute('aria-busy', 'false')
  await expect(alert).toBeFocused()
  await expect(alert).toContainText('Không thể đăng nhập')
  await expect(alert).toContainText('Email hoặc mật khẩu không đúng')
  await expect(email).toHaveValue('investor@example.com')
  await expect(password).toHaveValue('password123')
  await page.getByRole('button', { name: 'Chưa có tài khoản? Đăng ký' }).click()
  await expect(alert).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Tạo tài khoản' })).toBeVisible()
})

test('expired session clears stored credentials and explains why login is required', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('market-auth', JSON.stringify({ token: 'expired-token', user: { email: 'investor@example.com', role: 'user' } })))
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/watchlist' || path === '/api/portfolio') {
      return route.fulfill({ status: 401, json: { success: false, message: 'Invalid or expired token' } })
    }
    return route.fulfill({ json: { success: true, data: path === '/api/stocks' ? [] : {} } })
  })
  await page.goto('/')
  await expect(page.locator('.auth-page')).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('Phiên đăng nhập đã hết hạn hoặc không hợp lệ')
  await expect(page.getByRole('alert')).toContainText('Thông tin xác thực cũ đã được xóa an toàn')
  await expect(page.getByLabel('Email đăng nhập')).toHaveValue('')
  await expect(page.getByLabel('Mật khẩu đăng nhập')).toHaveValue('')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('market-auth'))).toBeNull()
  await page.reload()
  await expect(page.locator('.auth-page')).toBeVisible()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('market-auth'))).toBeNull()
})
