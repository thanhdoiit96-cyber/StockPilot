const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');

let mockSessionRow;
const mockUser = { findOne: jest.fn(), findByPk: jest.fn(), create: jest.fn() };
const mockAuthSession = {
  create: jest.fn(async values => {
    mockSessionRow = { id: 'session-a', ...values, revoked_at: null, update: jest.fn(async function (next) { Object.assign(this, next); }) };
    return mockSessionRow;
  }),
  findOne: jest.fn(async () => mockSessionRow),
  findByPk: jest.fn(async () => mockSessionRow)
};
jest.mock('../models', () => ({ User: mockUser, AuthSession: mockAuthSession, sequelize: null }));
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
