'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const models = require('../src/models');
const CacheService = require('../src/services/cacheService');
const { syncStockListings } = require('../src/services/stockListing');
const { parseListingSymbols, selectRequestedListings } = require('../src/services/scopedListingSelection');

async function main() {
  const requestedSymbols = parseListingSymbols(process.argv.slice(2));
  const workerUrl = (process.env.VNSTOCK_WORKER_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
  const source = process.env.VNSTOCK_SOURCE || 'vci';
  const response = await fetch(`${workerUrl}/listing`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ source }), signal: AbortSignal.timeout(Number(process.env.VNSTOCK_TIMEOUT_MS || 45000))
  });
  if (!response.ok) {
    const detail = (await response.text()).replace(/[\r\n]+/g, ' ').slice(0, 400);
    throw new Error(`vnstock listing worker HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
  }
  const payload = await response.json();
  if (payload.errors?.length || !Array.isArray(payload.rows) || !payload.rows.length) throw new Error('VCI listing response is empty or contains errors');

  const existing = requestedSymbols ? [] : await models.Stock.findAll({ attributes: ['code'] });
  const symbols = requestedSymbols || existing.map(stock => stock.code);
  const allowed = new Set(symbols.map(code => String(code).toUpperCase()));
  const matchingRows = requestedSymbols ? selectRequestedListings(payload.rows, requestedSymbols) : payload.rows.filter(row => allowed.has(String(row.symbol || row.code || '').trim().toUpperCase()));
  const checkedAt = new Date();
  const result = await syncStockListings({ Stock: models.Stock, rows: matchingRows, symbols, checkedAt });
  const cache = new CacheService(models.sequelize);
  await cache.deleteByType('stock');
  console.log(JSON.stringify({ source, mode: requestedSymbols ? 'explicit_symbols' : 'existing_only', provider_symbols: payload.rows.length, selected_symbols: symbols.length,
    matched_symbols: matchingRows.length, listing_checked_at: checkedAt.toISOString(), ...result, cache_invalidated: true }, null, 2));
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; })
  .finally(async () => { await models.sequelize.close(); });
