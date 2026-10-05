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
});
