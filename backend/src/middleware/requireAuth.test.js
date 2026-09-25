const jwt = require('jsonwebtoken');
const requireAuth = require('./requireAuth');

describe('requireAuth', () => {
  const secret = 'test-secret';
  beforeEach(() => { process.env.JWT_SECRET = secret; });

  test('rejects missing and malformed tokens', () => {
    for (const authorization of [undefined, 'Basic abc', 'Bearer invalid']) {
      const req = { get: () => authorization };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      requireAuth(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    }
  });

  test('attaches verified identity and rejects expired token', () => {
    const token = jwt.sign({ sub: 'user-a', role: 'user' }, secret, { expiresIn: '1h' });
    const req = { get: () => `Bearer ${token}` };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(req.user).toMatchObject({ sub: 'user-a', role: 'user' });
    expect(next).toHaveBeenCalled();

    const expired = jwt.sign({ sub: 'user-a' }, secret, { expiresIn: -1 });
    const expiredReq = { get: () => `Bearer ${expired}` };
    requireAuth(expiredReq, res, jest.fn());
    expect(res.status).toHaveBeenLastCalledWith(401);
  });
});
