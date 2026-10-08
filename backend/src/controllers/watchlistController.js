'use strict';
const express = require('express');
const { WatchlistItem, Stock } = require('../models');
const requireAuth = require('../middleware/requireAuth');
const { normalizeWatchlistMetadata } = require('../services/watchlistMetadata');
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
router.patch('/:symbol', async (req, res) => {
  const stock = await Stock.findOne({ where: { code: String(req.params.symbol || '').trim().toUpperCase() } });
  if (!stock) return res.status(404).json({ success: false, code: 'WATCHLIST_STOCK_NOT_FOUND', message: 'Không tìm thấy mã cổ phiếu' });
  let metadata;
  try { metadata = normalizeWatchlistMetadata(req.body); }
  catch (error) { return res.status(400).json({ success: false, code: error.code, message: error.message }); }
  const item = await WatchlistItem.findOne({ where: { user_id: req.user.sub, stock_id: stock.id } });
  if (!item) return res.status(404).json({ success: false, code: 'WATCHLIST_ITEM_NOT_FOUND', message: 'Mã không có trong Watchlist' });
  await item.update({ ...metadata, metadata_updated_at: new Date() });
  const updated = await WatchlistItem.findByPk(item.id, { include: [{ model: Stock, attributes: ['id', 'code', 'name', 'industry'] }] });
  return res.json({ success: true, data: updated });
});
router.delete('/:symbol', async (req, res) => {
  const stock = await Stock.findOne({ where: { code: String(req.params.symbol).trim().toUpperCase() } });
  if (!stock) return res.status(404).json({ success: false, message: 'Không tìm thấy mã cổ phiếu' });
  await WatchlistItem.destroy({ where: { user_id: req.user.sub, stock_id: stock.id } });
  res.status(204).end();
});
module.exports = router;
