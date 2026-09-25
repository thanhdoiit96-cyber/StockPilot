'use strict';

const cron = require('node-cron');
const models = require('../models');
const { syncStockListings } = require('../services/stockListing');

async function runListingCheck({ Stock = models.Stock, cacheService, workerUrl = process.env.VNSTOCK_WORKER_URL || 'http://127.0.0.1:8787', source = process.env.VNSTOCK_SOURCE || 'vci', fetchImpl = fetch, now = () => new Date() } = {}) {
  const response = await fetchImpl(`${workerUrl.replace(/\/$/, '')}/listing`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ source }),
    signal: AbortSignal.timeout(Number(process.env.VNSTOCK_TIMEOUT_MS || 45000))
  });
  if (!response.ok) {
    const detail = (await response.text()).replace(/[\r\n]+/g, ' ').slice(0, 400);
    throw new Error(`vnstock listing worker HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
  }
  const payload = await response.json();
  if (payload.errors?.length || !Array.isArray(payload.rows) || !payload.rows.length) throw new Error('VCI listing response is empty or contains errors');
  const existing = await Stock.findAll({ attributes: ['code'] });
  const symbols = existing.map(stock => stock.code);
  const allowed = new Set(symbols.map(code => String(code).toUpperCase()));
  const matchingRows = payload.rows.filter(row => allowed.has(String(row.symbol || row.code || '').trim().toUpperCase()));
  const checkedAt = now();
  const result = await syncStockListings({ Stock, rows: matchingRows, symbols, checkedAt });
  if (cacheService) await cacheService.deleteByType('stock');
  return { source, provider_symbols: payload.rows.length, existing_symbols: symbols.length, matched_existing_symbols: matchingRows.length, listing_checked_at: checkedAt.toISOString(), ...result };
}

function startVnstockListingJob({ cacheService, logger = console, schedule = process.env.VNSTOCK_LISTING_SYNC_CRON || '15 15 * * 1-5', timezone = process.env.VNSTOCK_LISTING_SYNC_TIMEZONE || 'Asia/Ho_Chi_Minh', runCheck = runListingCheck } = {}) {
  if (process.env.VNSTOCK_LISTING_SYNC_ENABLED === 'false') return null;
  let running = false;
  return cron.schedule(schedule, async () => {
    if (running) return;
    running = true;
    try {
      const report = await runCheck({ cacheService });
      logger.info(`[Vnstock listing] ${JSON.stringify(report)}`);
    } catch (error) {
      logger.error(`[Vnstock listing] ${error.stack || error.message}`);
    } finally {
      running = false;
    }
  }, { timezone });
}

module.exports = { startVnstockListingJob, runListingCheck };
