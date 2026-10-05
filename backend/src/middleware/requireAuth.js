'use strict';
const jwt = require('jsonwebtoken');
const { AuthSession } = require('../models');
const { cookieNames, parseCookies } = require('../auth/cookies');
const { sessionService } = require('../services/authSessionService');

function createRequireAuth({ authSessions, verify = jwt.verify } = {}) {
  return async function requireAuth(req, res, next) {
  const cookies = parseCookies(req.get('cookie') || '');
  const cookieToken = cookies[cookieNames().access] || '';
  const header = req.get('authorization') || '';
  const bearerToken = header.startsWith('Bearer ') ? header.slice(7) : '';
  const token = cookieToken || bearerToken;
  if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });
  try {
    req.user = verify(token, process.env.JWT_SECRET || 'development-only-change-me');
    req.authMode = cookieToken ? 'cookie' : 'bearer';
    if (cookieToken) {
      const sessionStore = authSessions || sessionService({ AuthSession });
      if (!req.user.sid || !await sessionStore.findActive(req.user.sid, req.user.sub)) {
        return res.status(401).json({ success: false, message: 'Invalid or expired session' });
      }
    }
    return next();
  } catch (_) { return res.status(401).json({ success: false, message: 'Invalid or expired token' }); }
  };
}

const requireAuth = createRequireAuth();
requireAuth.createRequireAuth = createRequireAuth;
module.exports = requireAuth;
