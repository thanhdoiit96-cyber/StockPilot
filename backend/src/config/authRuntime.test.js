const { parseAllowedOrigins, assertSecureAuthConfig, buildCorsOptions } = require('./authRuntime');

test('normalizes exact origins and rejects wildcard, paths and non-http schemes', () => {
  expect(parseAllowedOrigins('https://app.example.com, http://localhost:5173/,https://app.example.com')).toEqual(['https://app.example.com', 'http://localhost:5173']);
  for (const value of ['*', 'https://app.example.com/path', 'javascript:alert(1)']) expect(() => parseAllowedOrigins(value)).toThrow();
});

test('production fails fast for weak secrets, absent origins and non-https origins', () => {
  const base = { NODE_ENV: 'production', JWT_SECRET: 'a-secure-production-secret-that-is-long-enough', CORS_ORIGIN: 'https://app.example.com' };
  expect(() => assertSecureAuthConfig(base)).not.toThrow();
  expect(() => assertSecureAuthConfig({ ...base, JWT_SECRET: 'development-only-change-me' })).toThrow(/JWT_SECRET/);
  expect(() => assertSecureAuthConfig({ ...base, CORS_ORIGIN: '' })).toThrow(/CORS_ORIGIN/);
  expect(() => assertSecureAuthConfig({ ...base, CORS_ORIGIN: 'http://app.example.com' })).toThrow(/HTTPS/);
  expect(() => assertSecureAuthConfig({ NODE_ENV: 'development' })).not.toThrow();
});

test('credential cors allows only configured origins and non-browser requests', () => {
  const options = buildCorsOptions({ CORS_ORIGIN: 'https://app.example.com' });
  expect(options.credentials).toBe(true);
  const allowed = jest.fn();
  options.origin('https://app.example.com', allowed);
  expect(allowed).toHaveBeenCalledWith(null, true);
  const serverSide = jest.fn();
  options.origin(undefined, serverSide);
  expect(serverSide).toHaveBeenCalledWith(null, true);
  const denied = jest.fn();
  options.origin('https://evil.example', denied);
  expect(denied.mock.calls[0][0]).toMatchObject({ status: 403 });
  expect(buildCorsOptions({}).credentials).toBe(false);
});
