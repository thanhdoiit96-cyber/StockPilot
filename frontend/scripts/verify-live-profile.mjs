import { chromium, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// Creates one isolated development account; never logs or persists its credentials.
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext();
  const origin = 'http://127.0.0.1:4173';
  const response = await context.request.post(origin + '/api/auth/register', {
    headers: { 'X-Auth-Mode': 'cookie-v1' },
    data: { email: 'profile-smoke-' + randomUUID() + '@example.invalid', password: randomUUID() }
  });
  if (response.status() !== 201) throw new Error('Development registration failed: HTTP ' + response.status());
  const page = await context.newPage();
  await page.goto(origin);
  const trigger = page.getByRole('button', { name: 'Tài khoản và thông tin cá nhân', exact: true });
  await trigger.click();
  // Expire only the access cookie; refresh and CSRF cookies remain real.
  await context.clearCookies({ name: 'sp_access_dev' });
  await page.getByLabel('Tên hiển thị').fill('Kiểm thử hồ sơ');
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(page.getByText('Đã lưu thông tin cá nhân.')).toBeVisible();
  await page.reload();
  await expect(trigger).toContainText('Kiểm thử hồ sơ');
  await trigger.click();
  await expect(page.getByLabel('Tên hiển thị')).toHaveValue('Kiểm thử hồ sơ');
  await page.getByRole('dialog').getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page.locator('.auth-form')).toBeVisible();
  const me = await context.request.get(origin + '/api/auth/me');
  if (me.status() !== 401) throw new Error('Logout did not invalidate session');
  console.log('Real development profile: cookie registration, save after access-cookie expiry, reload persistence and logout passed. One isolated smoke account retained.');
} finally { await browser.close(); }
