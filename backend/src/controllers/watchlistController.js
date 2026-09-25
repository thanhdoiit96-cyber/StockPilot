'use strict';
const express = require('express');
const { WatchlistItem, Stock } = require('../models');
const requireAuth = require('../middleware/requireAuth');
const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const items = await WatchlistItem.findAll({ where: { user_id: req.user.sub }, include: [{ model: Stock, attributes: ['id', 'code', 'name', 'industry'] }], order: [['created_at', 'DESC']] });
  res.json({ success: true, data: items });
});
router.post('/', async (req, res) => {
  const stock = await Stock.findOne({ where: { code: String(req.body?.symbol || '').trim().toUpperCase() } });
  if (!stock) return res.status(404).json({ success: false, message: 'Không tìm thấy mã cổ phiếu' });
  try {
    const item = await WatchlistItem.create({ user_id: req.user.sub, stock_id: stock.id });
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ success: false, message: 'Mã đã có trong watchlist' });
    throw error;
  }
});
router.delete('/:symbol', async (req, res) => {
  const stock = await Stock.findOne({ where: { code: String(req.params.symbol).trim().toUpperCase() } });
  if (!stock) return res.status(404).json({ success: false, message: 'Không tìm thấy mã cổ phiếu' });
  await WatchlistItem.destroy({ where: { user_id: req.user.sub, stock_id: stock.id } });
  res.status(204).end();
});
module.exports = router;
