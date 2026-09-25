'use strict';
const jwt = require('jsonwebtoken');

module.exports = function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'development-only-change-me');
    return next();
  } catch (_) { return res.status(401).json({ success: false, message: 'Invalid or expired token' }); }
};
