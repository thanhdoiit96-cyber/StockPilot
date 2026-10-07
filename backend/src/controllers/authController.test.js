const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');

let mockSessionRow;
const mockUser = { findOne: jest.fn(), findByPk: jest.fn(), create: jest.fn() };
const mockAuthSession = {
  findAll: jest.fn(async () => []),
  update: jest.fn(async () => [1]),
  create: jest.fn(async values => {
    mockSessionRow = { id: 'session-a', ...values, revoked_at: null, update: jest.fn(async function (next) { Object.assign(this, next); }) };
    return mockSessionRow;
  }),
  findOne: jest.fn(async () => mockSessionRow),
  findByPk: jest.fn(async () => mockSessionRow)
};
jest.mock('../models', () => ({ User: mockUser, AuthSession: mockAuthSession, sequelize: { transaction: async callback => callback({ LOCK: { UPDATE: 'UPDATE' } }) } }));
const router = require('./authController');

const app = express();
app.use(express.json());
app.use('/api/auth', router);

const cookieMap = response => Object.fromEntries((response.headers['set-cookie'] || []).map(value => {
  const [pair] = value.split(';');
  const index = pair.indexOf('=');
  return [pair.slice(0, index), pair.slice(index + 1)];
}));
const cookieHeader = cookies => Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join('; ');

describe('cookie auth controller', () => {
  test('updates only the authenticated profile and round-trips optional details', async () => {
    const login = await request(app).post('/api/auth/login').set('X-Auth-Mode', 'cookie-v1').send({ email: 'investor@example.com', password: 'password123' });
    const cookies = cookieMap(login);
    const send = body => request(app).patch('/api/auth/profile').set('Cookie', cookieHeader(cookies)).set('X-CSRF-Token', cookies.sp_csrf).send(body);
    const updated = await send({ full_name: ' Nguyễn An ', phone: '+84 912 345 678', date_of_birth: '2000-02-29', id: 'other', role: 'admin', email_verified_at: new Date() });
    expect(updated.status).toBe(200);
    expect(updated.body.user).toMatchObject({ id: 'user-a', full_name: 'Nguyễn An', phone: '+84912345678', date_of_birth: '2000-02-29' });
    expect(updated.body.user.role).not.toBe('admin');
    const me = await request(app).get('/api/auth/me').set('Cookie', cookieHeader(cookies));
    expect(me.body.user.full_name).toBe('Nguyễn An');
    expect((await send({ phone: null })).body.user).toMatchObject({ full_name: 'Nguyễn An', phone: null });
    expect(mockUser.findByPk).toHaveBeenLastCalledWith('user-a');
  });
  test('pages sessions with an immutable creation cursor and rejects malformed cursors', async () => {
    const { Op } = require('sequelize');
    const { readCursor } = require('../services/sessionPagination');
    const login = await request(app).post('/api/auth/login').set('X-Auth-Mode', 'cookie-v1').send({ email: 'investor@example.com', password: 'password123' });
    const cookies = cookieMap(login);
    const rows = Array.from({ length: 51 }, (_, i) => ({
      id: '00000000-0000-4000-8000-' + String(i + 1).padStart(12, '0'),
      created_at: new Date('2026-10-05T00:00:00Z'), last_used_at: new Date(),
      expires_at: new Date(Date.now() + 20000), idle_expires_at: new Date(Date.now() + 10000)
    }));
    mockAuthSession.findAll.mockResolvedValueOnce(rows);
    const first = await request(app).get('/api/auth/sessions').set('Cookie', cookieHeader(cookies));
    expect(first.body.data.sessions).toHaveLength(51);
    expect(first.body.data.has_more).toBe(true);
    expect(readCursor(first.body.data.next_cursor).id).toBe(rows[49].id);
    mockAuthSession.findAll.mockResolvedValueOnce([rows[50]]);
    const second = await request(app).get('/api/auth/sessions').query({ cursor: first.body.data.next_cursor }).set('Cookie', cookieHeader(cookies));
    expect(second.body.data.sessions).toHaveLength(2);
    expect(second.body.data.has_more).toBe(false);
    expect(second.body.data.next_cursor).toBeNull();
    const query = mockAuthSession.findAll.mock.calls.at(-1)[0];
    expect(query.where.user_id).toBe('user-a');
    expect(query.where[Op.or][1].id[Op.gt]).toBe(rows[49].id);
    expect(query.order).toEqual([['created_at', 'DESC'], ['id', 'ASC']]);
    for (const cursor of ['invalid', '', 'x'.repeat(513), Buffer.from('{"id":"bad","created_at":"tomorrow"}').toString('base64url')]) {
      expect((await request(app).get('/api/auth/sessions').query({ cursor }).set('Cookie', cookieHeader(cookies))).status).toBe(400);
    }
  });
  test('session label validates input, enforces ownership/expiry/csrf and supports clearing', async () => {
    const { Op } = require('sequelize');
    const login = await request(app).post('/api/auth/login').set('X-Auth-Mode', 'cookie-v1').send({ email: 'investor@example.com', password: 'password123' });
    const cookies = cookieMap(login);
    const id = 'c785cda2-65cc-4a88-b71c-61907c8109f6';
    const send = body => request(app).patch('/api/auth/sessions/label').set('Cookie', cookieHeader(cookies)).set('X-CSRF-Token', cookies.sp_csrf).send(body);
    expect((await request(app).patch('/api/auth/sessions/label').set('Cookie', cookieHeader(cookies)).send({ session_id: id, label: 'PC' })).status).toBe(403);
    for (const label of [123, {}, 'a'.repeat(81), 'bad\nlabel']) expect((await send({ session_id: id, label })).status).toBe(400);
    expect((await send({ session_id: id })).status).toBe(400);
    expect((await send({ session_id: 'bad', label: 'PC' })).status).toBe(400);
    expect(mockAuthSession.update).not.toHaveBeenCalled();
    const response = await send({ session_id: id, label: '  Laptop cá nhân  ' });
    expect(response.status).toBe(200);
    expect(response.body.data.label).toBe('Laptop cá nhân');
    const where = mockAuthSession.update.mock.calls.at(-1)[1].where;
    expect(where).toMatchObject({ id, user_id: 'user-a', revoked_at: null });
    expect(where.expires_at[Op.gt]).toBeInstanceOf(Date);
    expect(where.idle_expires_at[Op.gt]).toBeInstanceOf(Date);
    expect((await send({ session_id: id, label: null })).body.data.label).toBeNull();
    mockAuthSession.update.mockResolvedValueOnce([0]);
    expect((await send({ session_id: id, label: 'PC' })).status).toBe(404);
  });
  test('single-session revoke requires csrf, excludes current session and enforces ownership', async () => {
    const { Op } = require('sequelize');
    const login = await request(app).post('/api/auth/login').set('X-Auth-Mode', 'cookie-v1').send({ email: 'investor@example.com', password: 'password123' });
    const cookies = cookieMap(login);
    const send = id => request(app).post('/api/auth/sessions/revoke').set('Cookie', cookieHeader(cookies)).set('X-CSRF-Token', cookies.sp_csrf).send({ session_id: id });
    const target = 'c785cda2-65cc-4a88-b71c-61907c8109f6';
    expect((await request(app).post('/api/auth/sessions/revoke').set('Cookie', cookieHeader(cookies)).send({ session_id: target })).status).toBe(403);
    expect((await send('session-a')).status).toBe(409);
    expect((await send('not-a-uuid')).status).toBe(400);
    expect(mockAuthSession.update).not.toHaveBeenCalled();
    expect((await send(target)).status).toBe(200);
    const where = mockAuthSession.update.mock.calls.at(-1)[1].where;
    expect(where.user_id).toBe('user-a');
    expect(where.id[Op.eq]).toBe(target);
    expect(where.id[Op.ne]).toBe('session-a');
    expect(where.revoked_at).toBeNull();
    mockAuthSession.update.mockResolvedValueOnce([0]);
    expect((await send(target)).status).toBe(404);
  });
  test('lists only owned active sessions and never exposes session credential hashes', async () => {
    const { Op } = require('sequelize');
    const login = await request(app).post('/api/auth/login').set('X-Auth-Mode', 'cookie-v1').send({ email: 'investor@example.com', password: 'password123' });
    const cookies = cookieMap(login);
    mockAuthSession.findAll.mockResolvedValueOnce([{ id: 'other', created_at: new Date(), last_used_at: new Date(), expires_at: new Date(Date.now() + 20000), idle_expires_at: new Date(Date.now() + 10000), refresh_token_hash: 'secret', csrf_token_hash: 'secret' }]);
    const response = await request(app).get('/api/auth/sessions').set('Cookie', cookieHeader(cookies));
    expect(response.status).toBe(200);
    expect(response.body.data.sessions[0]).toMatchObject({ id: 'session-a', current: true });
    expect(response.body.data.sessions[1]).toMatchObject({ id: 'other', current: false });
    expect(JSON.stringify(response.body)).not.toMatch(/secret|token_hash/);
    const options = mockAuthSession.findAll.mock.calls.at(-1)[0];
    expect(options.where.user_id).toBe('user-a');
    expect(options.where.id[Op.ne]).toBe('session-a');
    expect(options.where.expires_at[Op.gt]).toBeInstanceOf(Date);
    expect(options.where.idle_expires_at[Op.gt]).toBeInstanceOf(Date);
    expect(options.where.revoked_at).toBeNull();
    expect(options.limit).toBe(51);
  });

  test('revokes only other owned sessions, requires csrf and rejects legacy callers', async () => {
    const { Op } = require('sequelize');
    const login = await request(app).post('/api/auth/login').set('X-Auth-Mode', 'cookie-v1').send({ email: 'investor@example.com', password: 'password123' });
    const cookies = cookieMap(login);
    expect((await request(app).post('/api/auth/sessions/revoke-others').set('Cookie', cookieHeader(cookies))).status).toBe(403);
    expect(mockAuthSession.update).not.toHaveBeenCalled();
    const response = await request(app).post('/api/auth/sessions/revoke-others').set('Cookie', cookieHeader(cookies)).set('X-CSRF-Token', cookies.sp_csrf);
    expect(response.status).toBe(200);
    const options = mockAuthSession.update.mock.calls.at(-1)[1];
    expect(options.where).toMatchObject({ user_id: 'user-a', revoked_at: null });
    expect(options.where.id[Op.ne]).toBe('session-a');
    const legacy = await request(app).post('/api/auth/login').send({ email: 'investor@example.com', password: 'password123' });
    expect((await request(app).post('/api/auth/sessions/revoke-others').set('Authorization', 'Bearer ' + legacy.body.token)).status).toBe(409);
    expect((await request(app).get('/api/auth/sessions')).status).toBe(401);
  });
  test('rejects short, oversized, reused and non-string new passwords without writes', async () => {
    const user = await mockUser.findByPk('user-a');
    user.id = 'validation-user';
    const login = await request(app).post('/api/auth/login').send({ email: 'investor@example.com', password: 'password123' });
    for (const password of ['short', 'á'.repeat(40), 'password123', {}]) {
      const response = await request(app).post('/api/auth/password').set('Authorization', 'Bearer ' + login.body.token).send({ current_password: 'password123', new_password: password });
      expect(response.status).toBe(400);
    }
    expect(user.update).not.toHaveBeenCalled();
    expect(mockAuthSession.update).not.toHaveBeenCalled();
  });
  test('changes password, rejects wrong password, revokes sessions and old bearer', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'investor@example.com', password: 'password123' });
    const token = login.body.token;
    const wrong = await request(app).post('/api/auth/password').set('Authorization', 'Bearer ' + token).send({ current_password: 'wrong', new_password: 'new-long-password' });
    expect(wrong.status).toBe(400);
    expect(mockAuthSession.update).not.toHaveBeenCalled();
    const changed = await request(app).post('/api/auth/password').set('Authorization', 'Bearer ' + token).send({ current_password: 'password123', new_password: 'new-long-password' });
    expect(changed.status).toBe(200);
    const user = await mockUser.findByPk('user-a');
    expect(await bcrypt.compare('new-long-password', user.password_hash)).toBe(true);
    expect(user.password_version).toBe(1);
    expect(mockAuthSession.update).toHaveBeenCalledWith(expect.objectContaining({ revoke_reason: 'password_changed' }), expect.objectContaining({ where: { user_id: 'user-a', revoked_at: null }, transaction: expect.any(Object) }));
    expect((await request(app).get('/api/auth/me').set('Authorization', 'Bearer ' + token)).status).toBe(401);
  });

  test('limits repeated password attempts for the same account', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'investor@example.com', password: 'password123' });
    let response;
    for (let i = 0; i < 6; i++) response = await request(app).post('/api/auth/password').set('Authorization', 'Bearer ' + login.body.token).send({ current_password: 'wrong', new_password: 'new-long-password' });
    expect(response.status).toBe(429);
    expect(mockAuthSession.update).not.toHaveBeenCalled();
  });
  test.each([{}, { display_name: 42 }, { display_name: false }, { display_name: {} }, { display_name: [] }, { display_name: '   ' }, { display_name: 'a'.repeat(121) }])('rejects invalid profile payload without mutating saved name: %j', async payload => {
    const login = await request(app).post('/api/auth/login').set('X-Auth-Mode', 'cookie-v1').send({ email: 'investor@example.com', password: 'password123' });
    const cookies = cookieMap(login);
    const user = await mockUser.findByPk('user-a');
    user.display_name = 'Tên đã lưu';
    const response = await request(app).patch('/api/auth/profile').set('Cookie', cookieHeader(cookies)).set('X-CSRF-Token', cookies.sp_csrf).send(payload);
    expect(response.status).toBe(400);
    expect(user.update).not.toHaveBeenCalled();
    expect(user.display_name).toBe('Tên đã lưu');
  });

  test('only explicit null clears a saved name and missing csrf rejects mutation', async () => {
    const login = await request(app).post('/api/auth/login').set('X-Auth-Mode', 'cookie-v1').send({ email: 'investor@example.com', password: 'password123' });
    const cookies = cookieMap(login);
    const user = await mockUser.findByPk('user-a');
    user.display_name = 'Tên đã lưu';
    const rejected = await request(app).patch('/api/auth/profile').set('Cookie', cookieHeader(cookies)).send({ display_name: null });
    expect(rejected.status).toBe(403);
    expect(user.update).not.toHaveBeenCalled();
    const cleared = await request(app).patch('/api/auth/profile').set('Cookie', cookieHeader(cookies)).set('X-CSRF-Token', cookies.sp_csrf).send({ display_name: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body.user.display_name).toBeNull();
  });
  beforeEach(async () => {
    jest.clearAllMocks();
    mockSessionRow = null;
    const user = { id: 'user-a', email: 'investor@example.com', role: 'user', password_hash: await bcrypt.hash('password123', 4), update: jest.fn(async function (next) { Object.assign(this, next); }) };
    mockUser.findOne.mockResolvedValue(user);
    mockUser.findByPk.mockResolvedValue(user);
  });

  test('opts into cookies without returning a bearer token, rotates once and revokes on logout', async () => {
    const login = await request(app).post('/api/auth/login').set('X-Auth-Mode', 'cookie-v1').send({ email: 'investor@example.com', password: 'password123' });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeUndefined();
    let cookies = cookieMap(login);
    expect(cookies).toMatchObject({ sp_access_dev: expect.any(String), sp_refresh_dev: expect.any(String), sp_csrf: expect.any(String) });

    const refresh = await request(app).post('/api/auth/refresh').set('Cookie', cookieHeader(cookies)).set('X-CSRF-Token', cookies.sp_csrf);
    expect(refresh.status).toBe(200);
    const rotated = cookieMap(refresh);
    expect(rotated.sp_refresh_dev).not.toBe(cookies.sp_refresh_dev);
    cookies = rotated;

    const logout = await request(app).post('/api/auth/logout').set('Cookie', cookieHeader(cookies)).set('X-CSRF-Token', cookies.sp_csrf);
    expect(logout.status).toBe(204);
    expect(mockSessionRow).toMatchObject({ revoke_reason: 'logout', revoked_at: expect.any(Date) });
  });

  test('rejects refresh when double-submit csrf does not match', async () => {
    const login = await request(app).post('/api/auth/login').set('X-Auth-Mode', 'cookie-v1').send({ email: 'investor@example.com', password: 'password123' });
    const cookies = cookieMap(login);
    const refresh = await request(app).post('/api/auth/refresh').set('Cookie', cookieHeader(cookies)).set('X-CSRF-Token', 'wrong');
    expect(refresh.status).toBe(403);
    expect(refresh.body.code).toBe('CSRF_INVALID');
  });

  test('updates display name with cookie auth and csrf without allowing email changes', async () => {
    const login = await request(app).post('/api/auth/login').set('X-Auth-Mode', 'cookie-v1').send({ email: 'investor@example.com', password: 'password123' });
    const cookies = cookieMap(login);
    const update = await request(app).patch('/api/auth/profile').set('Cookie', cookieHeader(cookies)).set('X-CSRF-Token', cookies.sp_csrf).send({ display_name: 'Nhà đầu tư mẫu', email: 'attacker@example.com' });
    expect(update.status).toBe(200);
    expect(update.body.user).toMatchObject({ display_name: 'Nhà đầu tư mẫu', email: 'investor@example.com' });
    expect(mockUser.findByPk.mock.results.at(-1).value).toBeDefined();
  });
  test('persists supported language and timezone without changing protected identity fields', async () => {
    const login = await request(app).post('/api/auth/login').set('X-Auth-Mode', 'cookie-v1').send({ email: 'investor@example.com', password: 'password123' });
    const cookies = cookieMap(login);
    const update = await request(app).patch('/api/auth/profile').set('Cookie', cookieHeader(cookies)).set('X-CSRF-Token', cookies.sp_csrf).send({ preferred_language: 'en', timezone: 'Asia/Singapore', role: 'admin' });
    expect(update.status).toBe(200);
    expect(update.body.user).toMatchObject({ preferred_language: 'en', timezone: 'Asia/Singapore', role: 'user' });
    expect((await request(app).patch('/api/auth/profile').set('Cookie', cookieHeader(cookies)).set('X-CSRF-Token', cookies.sp_csrf).send({ timezone: 'Europe/London' })).status).toBe(400);
  });
});
