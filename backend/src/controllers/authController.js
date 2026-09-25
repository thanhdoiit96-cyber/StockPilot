'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
const publicUser = user => ({ id: user.id, email: user.email, role: user.role });
const issue = user => jwt.sign({ sub: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'development-only-change-me', { expiresIn: process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRATION || '2h' });

router.post('/register', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return res.status(400).json({ success: false, message: 'Email hợp lệ và mật khẩu tối thiểu 8 ký tự' });
  try {
    const user = await User.create({ email, password_hash: await bcrypt.hash(password, 12) });
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
  return res.json({ success: true, user: publicUser(user), token: issue(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findByPk(req.user.sub);
  if (!user) return res.status(401).json({ success: false, message: 'User không tồn tại' });
  return res.json({ success: true, user: publicUser(user) });
});

module.exports = router;
