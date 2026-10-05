const jwt = require('jsonwebtoken');
const { createRequireAuth } = require('./requireAuth');

describe('requireAuth', () => {
  const secret = 'test-secret';
  beforeEach(() => { process.env.JWT_SECRET = secret; });

  const authSessions = { findActive: jest.fn() };
  const requireAuth = createRequireAuth({ authSessions, users: { findByPk: async () => ({ password_version: 0 }) } });

  beforeEach(() => { authSessions.findActive.mockReset(); });

  test('rejects missing and malformed tokens', async () => {
    for (const authorization of [undefined, 'Basic abc', 'Bearer invalid']) {
      const req = { get: name => name === 'authorization' ? authorization : undefined };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      await requireAuth(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    }
  });

  test('attaches verified bearer identity and rejects expired token', async () => {
    const token = jwt.sign({ sub: 'user-a', role: 'user' }, secret, { expiresIn: '1h' });
    const req = { get: name => name === 'authorization' ? `Bearer ${token}` : undefined };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await requireAuth(req, res, next);
    expect(req.user).toMatchObject({ sub: 'user-a', role: 'user' });
    expect(req.authMode).toBe('bearer');
    expect(next).toHaveBeenCalled();

    const expired = jwt.sign({ sub: 'user-a' }, secret, { expiresIn: -1 });
    const expiredReq = { get: name => name === 'authorization' ? `Bearer ${expired}` : undefined };
    await requireAuth(expiredReq, res, jest.fn());
    expect(res.status).toHaveBeenLastCalledWith(401);
  });

  test('accepts an active cookie session and rejects a revoked or unknown session', async () => {
    const token = jwt.sign({ sub: 'user-a', sid: 'session-a', role: 'user' }, secret, { expiresIn: '15m' });
    const req = { get: name => name === 'cookie' ? `sp_access_dev=${token}` : undefined };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    authSessions.findActive.mockResolvedValueOnce({ id: 'session-a' });

    await requireAuth(req, res, next);
    expect(authSessions.findActive).toHaveBeenCalledWith('session-a', 'user-a');
    expect(req.authMode).toBe('cookie');
    expect(next).toHaveBeenCalledTimes(1);

    authSessions.findActive.mockResolvedValueOnce(null);
    await requireAuth(req, res, jest.fn());
    expect(res.status).toHaveBeenLastCalledWith(401);
  });

  test('does not fall back to bearer when an access cookie is invalid', async () => {
    const bearer = jwt.sign({ sub: 'user-a' }, secret, { expiresIn: '1h' });
    const req = { get: name => name === 'cookie' ? 'sp_access_dev=invalid' : name === 'authorization' ? `Bearer ${bearer}` : undefined };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('enforces csrf only for unsafe cookie-authenticated requests', async () => {
    const token = jwt.sign({ sub: 'user-a', sid: 'session-a' }, secret, { expiresIn: '15m' });
    const session = { id: 'session-a' };
    authSessions.findActive.mockResolvedValue(session);
    authSessions.validateCsrf = jest.fn().mockReturnValue(true);
    const req = { method: 'POST', get: name => name === 'cookie' ? `sp_access_dev=${token}; sp_csrf=csrf` : name === 'x-csrf-token' ? 'csrf' : undefined };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();

    const invalid = { ...req, get: name => name === 'cookie' ? `sp_access_dev=${token}; sp_csrf=csrf` : name === 'x-csrf-token' ? 'wrong' : undefined };
    await requireAuth(invalid, res, jest.fn());
    expect(res.status).toHaveBeenLastCalledWith(403);
  });
});
