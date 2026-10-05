'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, AuthSession, sequelize } = require('../models');
const requireAuth = require('../middleware/requireAuth');
const { cookieNames, parseCookies, setSessionCookies, clearSessionCookies } = require('../auth/cookies');
const { AuthSessionError, sameHash, sessionService } = require('../services/authSessionService');

const router = express.Router();
const sessions = sessionService({ AuthSession, sequelize });
const publicUser = user => ({ id: user.id, email: user.email, role: user.role, display_name: user.display_name || null, email_verified_at: user.email_verified_at || null });
const issue = user => jwt.sign({ sub: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'development-only-change-me', { expiresIn: process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRATION || '2h' });
const issueAccess = (user, sid) => jwt.sign({ sub: user.id, sid, email: user.email, role: user.role }, process.env.JWT_SECRET || 'development-only-change-me', { expiresIn: process.env.AUTH_ACCESS_EXPIRES_IN || '15m' });
const wantsCookieSession = req => req.get('x-auth-mode') === 'cookie-v1';
const sessionTokens = req => {
  const cookies = parseCookies(req.get('cookie') || '');
  const names = cookieNames();
  const csrfCookie = cookies[names.csrf] || '';
  const csrfHeader = String(req.get('x-csrf-token') || '');
  return { refreshToken: cookies[names.refresh] || '', csrfToken: csrfCookie && sameHash(csrfCookie, csrfHeader) ? csrfHeader : '' };
};
const authFailure = (res, error) => {
  if (error instanceof AuthSessionError) return res.status(error.status).json({ success: false, code: error.code, message: error.code });
  throw error;
};
async function cookieResponse(res, user, status = 200) {
  const created = await sessions.create(user.id);
  setSessionCookies(res, { accessToken: issueAccess(user, created.session.id), refreshToken: created.refreshToken, csrfToken: created.csrfToken });
  return res.status(status).json({ success: true, user: publicUser(user) });
}

router.post('/register', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return res.status(400).json({ success: false, message: 'Email hợp lệ và mật khẩu tối thiểu 8 ký tự' });
  try {
    const user = await User.create({ email, password_hash: await bcrypt.hash(password, 12) });
    if (wantsCookieSession(req)) return cookieResponse(res, user, 201);
    return res.status(201).json({ success: true, user: publicUser(user), token: issue(user) });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ success: false, message: 'Email đã được đăng ký' });
    throw error;
  }
});

router.post('/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const user = await User.findOne({ where: { email } });
  if (!user || !(await bcrypt.compare(String(req.body?.password || ''), user.password_hash))) return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
  if (wantsCookieSession(req)) return cookieResponse(res, user);
  return res.json({ success: true, user: publicUser(user), token: issue(user) });
});

router.post('/refresh', async (req, res) => {
  try {
    const tokens = sessionTokens(req);
    const rotated = await sessions.rotate(tokens.refreshToken, tokens.csrfToken);
    const user = await User.findByPk(rotated.session.user_id);
    if (!user) {
      await sessions.revoke(rotated.refreshToken, rotated.csrfToken, 'user_missing');
      clearSessionCookies(res);
      return res.status(401).json({ success: false, code: 'AUTH_USER_MISSING', message: 'User does not exist' });
    }
    setSessionCookies(res, { accessToken: issueAccess(user, rotated.session.id), refreshToken: rotated.refreshToken, csrfToken: rotated.csrfToken });
    return res.json({ success: true, user: publicUser(user) });
  } catch (error) {
    clearSessionCookies(res);
    return authFailure(res, error);
  }
});

router.post('/logout', async (req, res) => {
  try {
    const tokens = sessionTokens(req);
    await sessions.revoke(tokens.refreshToken, tokens.csrfToken, 'logout');
    clearSessionCookies(res);
    return res.status(204).end();
  } catch (error) {
    if (error instanceof AuthSessionError && error.code === 'CSRF_INVALID') return authFailure(res, error);
    clearSessionCookies(res);
    return authFailure(res, error);
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findByPk(req.user.sub);
  if (!user) return res.status(401).json({ success: false, message: 'User không tồn tại' });
  return res.json({ success: true, user: publicUser(user) });
});

router.patch('/profile', requireAuth, async (req, res) => {
  const displayName = req.body?.display_name == null ? null : String(req.body.display_name).trim();
  if (displayName !== null && (!displayName || displayName.length > 120)) {
    return res.status(400).json({ success: false, message: 'Tên hiển thị phải dài từ 1 đến 120 ký tự' });
  }
  const user = await User.findByPk(req.user.sub);
  if (!user) return res.status(404).json({ success: false, message: 'User không tồn tại' });
  await user.update({ display_name: displayName });
  return res.json({ success: true, user: publicUser(user) });
});

module.exports = router;
