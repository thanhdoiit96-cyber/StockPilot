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
