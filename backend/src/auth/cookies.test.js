const { cookieNames, parseCookies, cookieOptions, setSessionCookies, clearSessionCookies } = require('./cookies');

describe('auth cookie helpers', () => {
  const previousEnv = process.env.NODE_ENV;
  afterEach(() => { process.env.NODE_ENV = previousEnv; });

  test('uses host-prefixed secure production cookies and development-only names locally', () => {
    expect(cookieNames('production')).toEqual({ access: '__Host-sp_access', refresh: '__Host-sp_refresh', csrf: 'sp_csrf' });
    expect(cookieNames('test').access).toBe('sp_access_dev');
    process.env.NODE_ENV = 'production';
    expect(cookieOptions()).toMatchObject({ httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
    expect(cookieOptions()).not.toHaveProperty('domain');
  });

  test('parses encoded cookies and ignores malformed segments', () => {
    expect(parseCookies('a=one%20two; malformed; b=three')).toEqual({ a: 'one two', b: 'three' });
  });

  test('sets and clears access, refresh and readable csrf cookies consistently', () => {
    process.env.NODE_ENV = 'test';
    const res = { cookie: jest.fn(), clearCookie: jest.fn() };
    setSessionCookies(res, { accessToken: 'access', refreshToken: 'refresh', csrfToken: 'csrf' });
    expect(res.cookie).toHaveBeenCalledTimes(3);
    expect(res.cookie).toHaveBeenCalledWith('sp_access_dev', 'access', expect.objectContaining({ httpOnly: true }));
    expect(res.cookie).toHaveBeenCalledWith('sp_csrf', 'csrf', expect.objectContaining({ httpOnly: false }));
    clearSessionCookies(res);
    expect(res.clearCookie).toHaveBeenCalledTimes(3);
  });
});
