'use strict';
const { cookieNames, parseCookies } = require('../auth/cookies');
const { sameHash } = require('../services/authSessionService');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function validateCsrfRequest(req, session, authSessions) {
  if (SAFE_METHODS.has(String(req.method || 'GET').toUpperCase())) return true;
  const cookieToken = parseCookies(req.get('cookie') || '')[cookieNames().csrf] || '';
  const headerToken = String(req.get('x-csrf-token') || '');
  return Boolean(cookieToken && headerToken && sameHash(cookieToken, headerToken) && authSessions.validateCsrf(session, headerToken));
}

module.exports = { SAFE_METHODS, validateCsrfRequest };
