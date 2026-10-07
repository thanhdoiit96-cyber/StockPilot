import { chromium, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// Creates one isolated development account; never logs or persists its credentials.
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext();
  const origin = 'http://localhost:4173';
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
  await page.getByLabel('Họ và tên', { exact: true }).fill('Nguyễn Kiểm Thử');
  await page.getByLabel('Ngày sinh', { exact: true }).fill('2000-02-29');
  await page.getByLabel('Số điện thoại', { exact: true }).fill('+84 900 000 000');
  await page.getByLabel('Ngôn ngữ và định dạng', { exact: true }).selectOption('en');
  await page.getByLabel('Múi giờ', { exact: true }).selectOption('Asia/Singapore');
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  try { await expect(page.getByText('Đã lưu thông tin cá nhân.')).toBeVisible(); }
  catch { throw new Error('Profile save failed: ' + await page.locator('.account-error').allTextContents()); }
  await page.reload();
  await expect(trigger).toContainText('Kiểm thử hồ sơ');
  await trigger.click();
  await expect(page.getByLabel('Tên hiển thị')).toHaveValue('Kiểm thử hồ sơ');
  await expect(page.getByLabel('Họ và tên', { exact: true })).toHaveValue('Nguyễn Kiểm Thử');
  await expect(page.getByLabel('Ngày sinh', { exact: true })).toHaveValue('2000-02-29');
  await expect(page.getByLabel('Số điện thoại', { exact: true })).toHaveValue('+84900000000');
  await expect(page.getByLabel('Ngôn ngữ và định dạng', { exact: true })).toHaveValue('en');
  await expect(page.getByLabel('Múi giờ', { exact: true })).toHaveValue('Asia/Singapore');
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await expect(page.locator('html')).toHaveAttribute('data-locale', 'en');
  const cookies = await context.cookies();
  const csrf = cookies.find(cookie => cookie.name === 'sp_csrf')?.value;
  const invalid = await context.request.patch(origin + '/api/auth/profile', {
    headers: { 'X-CSRF-Token': decodeURIComponent(csrf || '') }, data: {}
  });
  if (invalid.status() !== 400) throw new Error('Empty PATCH must not clear profile');
  const persisted = await context.request.get(origin + '/api/auth/me');
  if ((await persisted.json()).user.display_name !== 'Kiểm thử hồ sơ') throw new Error('Invalid PATCH changed profile');
  await page.getByRole('dialog').getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page.locator('.auth-form')).toBeVisible();
  const me = await context.request.get(origin + '/api/auth/me');
  if (me.status() !== 401) throw new Error('Logout did not invalidate session');
  console.log('Real development profile: cookie registration, save after access-cookie expiry, reload persistence and logout passed. One isolated smoke account retained.');
} finally { await browser.close(); }
