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
    if (path === '/api/auth/me' || path === '/api/watchlist' || path === '/api/portfolio') {
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

test('invalid stored auth is discarded before the dashboard renders', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('market-auth', JSON.stringify({ token: 'orphan-token', user: {} })))
  await page.goto('/')
  await expect(page.locator('.auth-page')).toBeVisible()
  await expect(page.locator('.dashboard-shell')).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => localStorage.getItem('market-auth'))).toBeNull()
})

test('invalid successful auth response stays on the form and is never persisted', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('market-auth'))
  await page.route('**/api/auth/login', route => route.fulfill({ json: { success: true, token: 'orphan-token', user: {} } }))
  await page.goto('/')
  const email = page.getByLabel('Email đăng nhập')
  const password = page.getByLabel('Mật khẩu đăng nhập')
  await email.fill('investor@example.com')
  await password.fill('password123')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page.locator('.auth-page')).toBeVisible()
  await expect(page.locator('.dashboard-shell')).toHaveCount(0)
  await expect(page.getByRole('alert')).toContainText('Máy chủ trả về phiên đăng nhập không hợp lệ')
  await expect(email).toHaveValue('investor@example.com')
  await expect(password).toHaveValue('password123')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('market-auth'))).toBeNull()
})

test('stored session is verified before the dashboard can render', async ({ page }) => {
  let releaseVerification
  await page.addInitScript(() => localStorage.setItem('market-auth', JSON.stringify({ token: 'valid-token', user: { email: 'investor@example.com', role: 'user' } })))
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth/me') {
      await new Promise(resolve => { releaseVerification = resolve })
      return route.fulfill({ json: { success: true, user: { email: 'investor@example.com', role: 'user' } } })
    }
    if (path === '/api/watchlist') return route.fulfill({ json: { success: true, data: [] } })
    if (path === '/api/portfolio') return route.fulfill({ json: { success: true, data: { positions: [], transactions: [] } } })
    return route.fulfill({ json: { success: true, data: path === '/api/stocks' ? [] : {} } })
  })
  await page.goto('/')
  await expect(page.getByText('Đang xác minh phiên đăng nhập...')).toBeVisible()
  await expect(page.locator('.dashboard-shell')).toHaveCount(0)
  await expect.poll(() => typeof releaseVerification).toBe('function')
  releaseVerification()
  await expect(page.locator('.dashboard-shell')).toBeVisible()
  await expect(page.getByText('Đang xác minh phiên đăng nhập...')).toHaveCount(0)
})

test('session verification failure keeps private UI hidden and can retry', async ({ page }) => {
  let attempts = 0
  await page.addInitScript(() => localStorage.setItem('market-auth', JSON.stringify({ token: 'valid-token', user: { email: 'investor@example.com', role: 'user' } })))
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth/me') {
      attempts += 1
      return attempts === 1
        ? route.fulfill({ status: 503, json: { success: false, message: 'Dịch vụ xác thực tạm thời gián đoạn' } })
        : route.fulfill({ json: { success: true, user: { email: 'investor@example.com', role: 'user' } } })
    }
    if (path === '/api/watchlist') return route.fulfill({ json: { success: true, data: [] } })
    if (path === '/api/portfolio') return route.fulfill({ json: { success: true, data: { positions: [], transactions: [] } } })
    return route.fulfill({ json: { success: true, data: path === '/api/stocks' ? [] : {} } })
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Chưa thể xác minh đăng nhập' })).toBeVisible()
  await expect(page.locator('.dashboard-shell')).toHaveCount(0)
  await expect(page.getByRole('alert')).toContainText('Dịch vụ xác thực tạm thời gián đoạn')
  await page.getByRole('button', { name: 'Thử xác minh lại' }).click()
  await expect(page.locator('.dashboard-shell')).toBeVisible()
  expect(attempts).toBe(2)
})

test('logout in one tab immediately clears private state in another tab', async ({ context, page }) => {
  await context.addInitScript(() => localStorage.setItem('market-auth', JSON.stringify({ token: 'shared-token', user: { email: 'investor@example.com', role: 'user' } })))
  await context.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth/me') return route.fulfill({ json: { success: true, user: { email: 'investor@example.com', role: 'user' } } })
    if (path === '/api/watchlist') return route.fulfill({ json: { success: true, data: [] } })
    if (path === '/api/portfolio') return route.fulfill({ json: { success: true, data: { positions: [], transactions: [] } } })
    return route.fulfill({ json: { success: true, data: path === '/api/stocks' ? [] : {} } })
  })
  const secondPage = await context.newPage()
  await Promise.all([page.goto('/'), secondPage.goto('/')])
  await expect(page.locator('.dashboard-shell')).toBeVisible()
  await expect(secondPage.locator('.dashboard-shell')).toBeVisible()
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Bạn đã đăng xuất an toàn.')
  await expect(secondPage.locator('.auth-page')).toBeVisible()
  await expect(secondPage.locator('.dashboard-shell')).toHaveCount(0)
  await expect(secondPage.getByRole('status')).toHaveText('Phiên đăng nhập đã kết thúc ở một tab khác.')
  await expect.poll(() => secondPage.evaluate(() => localStorage.getItem('market-auth'))).toBeNull()
})

test('a replacement session from another tab is verified before switching identity', async ({ context, page }) => {
  let releaseReplacement
  await context.addInitScript(() => localStorage.setItem('market-auth', JSON.stringify({ token: 'old-token', user: { email: 'old@example.com', role: 'user' } })))
  await context.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth/me') {
      const token = route.request().headers().authorization?.replace('Bearer ', '')
      if (token === 'new-token') {
        await new Promise(resolve => { releaseReplacement = resolve })
        return route.fulfill({ json: { success: true, user: { email: 'new@example.com', role: 'user' } } })
      }
      return route.fulfill({ json: { success: true, user: { email: 'old@example.com', role: 'user' } } })
    }
    if (path === '/api/watchlist') return route.fulfill({ json: { success: true, data: [] } })
    if (path === '/api/portfolio') return route.fulfill({ json: { success: true, data: { positions: [], transactions: [] } } })
    return route.fulfill({ json: { success: true, data: path === '/api/stocks' ? [] : {} } })
  })
  const secondPage = await context.newPage()
  await Promise.all([page.goto('/'), secondPage.goto('/')])
  await expect(secondPage.getByText('old@example.com').first()).toBeVisible()
  await page.evaluate(() => localStorage.setItem('market-auth', JSON.stringify({ token: 'new-token', user: { email: 'untrusted@example.com', role: 'user' } })))
  await expect(secondPage.getByText('Đang xác minh phiên đăng nhập...')).toBeVisible()
  await expect(secondPage.locator('.dashboard-shell')).toHaveCount(0)
  await expect.poll(() => typeof releaseReplacement).toBe('function')
  releaseReplacement()
  await expect(secondPage.locator('.dashboard-shell')).toBeVisible()
  await expect(secondPage.getByText('new@example.com').first()).toBeVisible()
  await page.evaluate(() => localStorage.setItem('market-auth', '{invalid-json'))
  await expect(secondPage.locator('.auth-page')).toBeVisible()
  await expect(secondPage.locator('.dashboard-shell')).toHaveCount(0)
  await expect(secondPage.getByRole('alert')).toContainText('Dữ liệu phiên từ tab khác không hợp lệ')
  await expect.poll(() => secondPage.evaluate(() => localStorage.getItem('market-auth'))).toBeNull()
})
