const { timingSafeEqual } = require('crypto');

// Administrative access stays disabled until a server-side key is configured.
module.exports = function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) return res.status(503).json({ success: false, message: 'Administrative access is disabled' });
  const supplied = req.get('authorization') || '';
  const actual = Buffer.from(supplied);
  const target = Buffer.from(`Bearer ${expected}`);
  if (actual.length !== target.length || !timingSafeEqual(actual, target)) {
    return res.status(401).json({ success: false, message: 'Administrator credentials required' });
  }
  next();
};
