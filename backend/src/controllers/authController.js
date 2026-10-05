'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { Op } = require('sequelize');
const { User, AuthSession, sequelize } = require('../models');
const requireAuth = require('../middleware/requireAuth');
const { cookieNames, parseCookies, setSessionCookies, clearSessionCookies } = require('../auth/cookies');
const { AuthSessionError, sameHash, sessionService } = require('../services/authSessionService');

const router = express.Router();
const sessions = sessionService({ AuthSession, sequelize });
const publicUser = user => ({ id: user.id, email: user.email, role: user.role, display_name: user.display_name || null, email_verified_at: user.email_verified_at || null });
const issue = user => jwt.sign({ sub: user.id, email: user.email, role: user.role, pv: user.password_version || 0 }, process.env.JWT_SECRET || 'development-only-change-me', { expiresIn: process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRATION || '2h' });
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

router.post('/login', async (req, res, next) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  try {
    const authenticate = async transaction => {
      const user = await User.findOne({ where: { email }, ...(transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {}) });
      if (!user || !await bcrypt.compare(password, user.password_hash)) return null;
      const created = wantsCookieSession(req) ? await sessions.create(user.id, { transaction }) : null;
      return { user, created, token: created ? null : issue(user) };
    };
    const result = sequelize?.transaction ? await sequelize.transaction(authenticate) : await authenticate(null);
    if (!result) return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    if (result.created) {
      setSessionCookies(res, { accessToken: issueAccess(result.user, result.created.session.id), refreshToken: result.created.refreshToken, csrfToken: result.created.csrfToken });
      return res.json({ success: true, user: publicUser(result.user) });
    }
    return res.json({ success: true, user: publicUser(result.user), token: result.token });
  } catch (error) { next(error); }
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
  if (!req.body || !Object.prototype.hasOwnProperty.call(req.body, 'display_name') ||
      (req.body.display_name !== null && typeof req.body.display_name !== 'string')) {
    return res.status(400).json({ success: false, message: 'Tên hiển thị phải là văn bản; dùng null để xóa tên.' });
  }
  const displayName = req.body.display_name === null ? null : req.body.display_name.trim();
  if (displayName !== null && (!displayName || displayName.length > 120)) {
    return res.status(400).json({ success: false, message: 'Tên hiển thị phải dài từ 1 đến 120 ký tự' });
  }
  const user = await User.findByPk(req.user.sub);
  if (!user) return res.status(404).json({ success: false, message: 'User không tồn tại' });
  await user.update({ display_name: displayName });
  return res.json({ success: true, user: publicUser(user) });
});

const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false,
  keyGenerator: req => String(req.user.sub),
  message: { success: false, message: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.' }
});
router.post('/password', requireAuth, passwordLimiter, async (req, res, next) => {
  const { current_password: current, new_password: password } = req.body || {};
  if (typeof current !== 'string' || !current ||
      typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password) > 72 || password === current) {
    return res.status(400).json({ success: false, message: 'Mật khẩu mới cần ít nhất 12 ký tự, tối đa 72 byte và khác mật khẩu hiện tại.' });
  }
  try {
    const changed = await sequelize.transaction(async transaction => {
      const user = await User.findByPk(req.user.sub, { transaction, lock: transaction.LOCK.UPDATE });
      if (!user || !await bcrypt.compare(current, user.password_hash)) return false;
      await user.update({ password_hash: await bcrypt.hash(password, 12), password_version: (user.password_version || 0) + 1, updated_at: new Date() }, { transaction });
      await AuthSession.update({ revoked_at: new Date(), revoke_reason: 'password_changed' }, { where: { user_id: user.id, revoked_at: null }, transaction });
      return true;
    });
    if (!changed) return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng.' });
    clearSessionCookies(res);
    return res.json({ success: true });
  } catch (error) { return next(error); }
});

const sessionView = (row, currentId) => ({
  id: row.id, current: row.id === currentId, label: row.label || null,
  created_at: row.created_at, last_used_at: row.last_used_at,
  expires_at: new Date(Math.min(new Date(row.expires_at).getTime(), new Date(row.idle_expires_at).getTime()))
});
router.get('/sessions', requireAuth, async (req, res, next) => {
  try {
    const current = req.authSession;
    const now = new Date();
    const rows = await AuthSession.findAll({
      attributes: ['id', 'label', 'created_at', 'last_used_at', 'expires_at', 'idle_expires_at'],
      where: { user_id: req.user.sub, revoked_at: null, expires_at: { [Op.gt]: now }, idle_expires_at: { [Op.gt]: now },
        ...(current ? { id: { [Op.ne]: current.id } } : {}) },
      order: [['last_used_at', 'DESC'], ['id', 'ASC']], limit: 51
    });
    return res.json({ success: true, data: {
      sessions: [...(current ? [sessionView(current, current.id)] : []), ...rows.slice(0, 50).map(row => sessionView(row, current?.id))],
      has_more: rows.length > 50, can_revoke_others: Boolean(current)
    } });
  } catch (error) { next(error); }
});
router.post('/sessions/revoke-others', requireAuth, async (req, res, next) => {
  if (!req.authSession) return res.status(409).json({ success: false, message: 'Vui lòng đăng nhập lại để quản lý các phiên khác.' });
  try {
    const [count] = await AuthSession.update({ revoked_at: new Date(), revoke_reason: 'user_revoked_others' }, {
      where: { user_id: req.user.sub, id: { [Op.ne]: req.authSession.id }, revoked_at: null }
    });
    return res.json({ success: true, data: { revoked_count: count } });
  } catch (error) { next(error); }
});

router.post('/sessions/revoke', requireAuth, async (req, res, next) => {
  if (!req.authSession) return res.status(409).json({ success: false, message: 'Vui lòng đăng nhập lại để quản lý các phiên khác.' });
  const id = req.body?.session_id;
  if (typeof id === 'string' && id.toLowerCase() === req.authSession.id.toLowerCase()) return res.status(409).json({ success: false, message: 'Dùng nút Đăng xuất để kết thúc phiên hiện tại.' });
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).json({ success: false, message: 'Phiên đăng nhập không hợp lệ.' });
  }
  try {
    const [count] = await AuthSession.update({ revoked_at: new Date(), revoke_reason: 'user_revoked_session' }, {
      where: { user_id: req.user.sub, id: { [Op.eq]: id, [Op.ne]: req.authSession.id }, revoked_at: null }
    });
    if (!count) return res.status(404).json({ success: false, message: 'Phiên không còn khả dụng. Vui lòng làm mới danh sách.' });
    return res.json({ success: true });
  } catch (error) { next(error); }
});

router.patch('/sessions/label', requireAuth, async (req, res, next) => {
  if (!req.authSession) return res.status(409).json({ success: false, message: 'Vui lòng đăng nhập lại để quản lý phiên.' });
  const { session_id: id, label } = req.body || {};
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
      (label !== null && typeof label !== 'string') ||
      (typeof label === 'string' && (label.trim().length > 80 || /[\u0000-\u001f\u007f]/.test(label)))) {
    return res.status(400).json({ success: false, message: 'Tên phiên tối đa 80 ký tự, không chứa ký tự điều khiển.' });
  }
  const normalized = typeof label === 'string' ? label.trim() || null : null;
  try {
    const now = new Date();
    const [count] = await AuthSession.update({ label: normalized, updated_at: now }, {
      where: { id, user_id: req.user.sub, revoked_at: null, expires_at: { [Op.gt]: now }, idle_expires_at: { [Op.gt]: now } }
    });
    if (!count) return res.status(404).json({ success: false, message: 'Phiên không còn khả dụng. Vui lòng làm mới danh sách.' });
    return res.json({ success: true, data: { id, label: normalized } });
  } catch (error) { next(error); }
});

module.exports = router;
