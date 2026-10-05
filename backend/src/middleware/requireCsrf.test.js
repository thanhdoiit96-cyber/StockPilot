const { validateCsrfRequest } = require('./requireCsrf');

test('requires matching cookie, header and stored csrf for unsafe cookie requests', () => {
  const authSessions = { validateCsrf: jest.fn().mockReturnValue(true) };
  const req = { method: 'POST', get: name => name === 'cookie' ? 'sp_csrf=token' : name === 'x-csrf-token' ? 'token' : undefined };
  expect(validateCsrfRequest(req, { id: 's' }, authSessions)).toBe(true);
  expect(authSessions.validateCsrf).toHaveBeenCalledWith({ id: 's' }, 'token');
  expect(validateCsrfRequest({ ...req, get: name => name === 'cookie' ? 'sp_csrf=token' : name === 'x-csrf-token' ? 'wrong' : undefined }, {}, authSessions)).toBe(false);
  expect(validateCsrfRequest({ ...req, method: 'GET', get: () => undefined }, {}, authSessions)).toBe(true);
});
