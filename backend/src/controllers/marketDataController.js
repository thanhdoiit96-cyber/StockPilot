'use strict';

const express = require('express');
const { MarketDataIngestionRun } = require('../models');

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

module.exports = router;
