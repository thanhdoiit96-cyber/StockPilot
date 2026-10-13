'use strict';

const express = require('express');
const { MarketDataIngestionRun, ForeignFlowDaily, Stock } = require('../models');
const { buildForeignFlowSnapshot } = require('../services/foreignFlowSnapshot');

const router = express.Router();

router.get('/ingestion/latest', async (req, res) => {
  try {
    const run = await MarketDataIngestionRun.findOne({ order: [['started_at', 'DESC'], ['id', 'DESC']] });
    res.json({ success: true, data: run || null });
  } catch (error) {
    console.error('[Market Data Controller] Error fetching ingestion status:', error);
    res.status(500).json({ success: false, message: 'Error fetching ingestion status' });
  }
});

router.get('/reconciliation/latest', async (req, res) => {
  try {
    const { MarketDataReconciliationRun } = require('../models');
    const run = await MarketDataReconciliationRun.findOne({ order: [['started_at', 'DESC'], ['id', 'DESC']] });
    res.json({ success: true, data: run || null });
  } catch (error) {
    console.error('[Market Data Controller] Error fetching reconciliation status:', error);
    res.status(500).json({ success: false, message: 'Error fetching reconciliation status' });
  }
});

router.get('/foreign-flow', async (req, res) => {
  try {
    const requestedDate = String(req.query.date || '').trim();
    if (requestedDate && !/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) return res.status(400).json({ success: false, code: 'INVALID_FOREIGN_FLOW_QUERY', message: 'date must use YYYY-MM-DD' });
    const symbol = String(req.query.symbol || '').trim().toUpperCase() || null;
    if (symbol && !/^[A-Z0-9]{1,12}$/.test(symbol)) return res.status(400).json({ success: false, code: 'INVALID_FOREIGN_FLOW_QUERY', message: 'symbol is invalid' });
    const sector = String(req.query.sector || '').trim() || null;
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const minimumCoverage = Math.min(1, Math.max(0.5, Number(req.query.minimum_coverage) || 0.8));
    const sessionDate = requestedDate || await ForeignFlowDaily.max('session_date');
    const universe = await Stock.findAll({ where: { listing_status: 'listed' }, attributes: ['id', 'code', 'name', 'industry'], order: [['code', 'ASC']] });
    const rows = sessionDate ? await ForeignFlowDaily.findAll({ where: { session_date: sessionDate }, include: [{ model: Stock, as: 'stock', attributes: ['id', 'code', 'name', 'industry'] }] }) : [];
    return res.json({ success: true, data: buildForeignFlowSnapshot({ rows, universe, sessionDate, minimumCoverage, sector, symbol, limit }) });
  } catch (error) {
    console.error('[Market Data Controller] Error fetching foreign flow:', error);
    return res.status(503).json({ success: false, code: 'FOREIGN_FLOW_UNAVAILABLE', message: 'Foreign-flow data is unavailable.' });
  }
});

module.exports = router;
