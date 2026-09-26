'use strict';

const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const models = require('../src/models');
const CacheService = require('../src/services/cacheService');
const { ingestVnstockEod } = require('../src/market-data/vnstockEodIngestion');

async function sessionCoverage(date) {
  const [rows] = await models.sequelize.query(
    "SELECT COUNT(*)::int AS rows, COUNT(DISTINCT stock_id)::int AS symbols FROM stock_prices WHERE provider = 'vnstock' AND interval = '1d' AND (observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = $1::date",
    { bind: [date] }
  );
  return rows[0];
}

async function main() {
  const date = process.env.VNSTOCK_BACKFILL_DATE;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
    throw new Error('Set VNSTOCK_BACKFILL_DATE to a valid YYYY-MM-DD session date');
  }
  const batchSize = Number(process.env.VNSTOCK_BACKFILL_BATCH_SIZE || 1);
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 10) throw new Error('VNSTOCK_BACKFILL_BATCH_SIZE must be between 1 and 10');
  const stopAfter = Math.max(1, Number(process.env.VNSTOCK_BACKFILL_STOP_AFTER || 5));

  const stocks = await models.Stock.findAll({ attributes: ['code'], order: [['code', 'ASC']] });
  const universe = stocks.map(stock => stock.code);
  const requestedSymbols = process.env.VNSTOCK_BACKFILL_SYMBOLS
    ? [...new Set(process.env.VNSTOCK_BACKFILL_SYMBOLS.split(',').map(symbol => symbol.trim().toUpperCase()).filter(Boolean))]
    : universe;
  const unknownSymbols = requestedSymbols.filter(symbol => !universe.includes(symbol));
  if (unknownSymbols.length) throw new Error(`Unknown stock symbols: ${unknownSymbols.join(', ')}`);
  const symbols = requestedSymbols;
  if (!symbols.length) throw new Error('No existing stock symbols found; refusing to run an empty backfill');
  const before = await sessionCoverage(date);
  const report = { date, provider: 'vnstock', source: process.env.VNSTOCK_SOURCE || 'vci', universe_symbols: universe.length, target_symbols: symbols, batch_size: batchSize, stop_after: stopAfter,
    before, batches: [], failures: [], totals: { received: 0, inserted: 0, updated: 0, skipped: 0, rejected: 0 }, error: null };
  const cacheService = new CacheService(models.sequelize);

  let consecutiveNoData = 0;
  let consecutiveFailures = 0;
  try {
    for (let offset = 0; offset < symbols.length; offset += batchSize) {
      const batch = symbols.slice(offset, offset + batchSize);
      let result;
      let lastError;
      let attempts = 0;
      for (attempts = 1; attempts <= 3; attempts += 1) {
        try {
          result = await ingestVnstockEod({ ...models, cacheService, symbols: batch, from: date, to: date, source: report.source,
            env: { VNSTOCK_PROJECT_DIR: process.env.VNSTOCK_PROJECT_DIR || '.vnstock' } });
          break;
        } catch (error) {
          lastError = error;
          if (attempts < 3) await new Promise(resolve => setTimeout(resolve, attempts * 5000));
        }
      }
      const item = result ? { batch: Math.floor(offset / batchSize) + 1, symbols: batch, requested: batch.length, attempts, received: result.received,
        inserted: result.inserted, updated: result.updated, skipped: result.skipped, rejected: result.rejected } : null;
      if (item) {
        report.batches.push(item);
        for (const key of Object.keys(report.totals)) report.totals[key] += Number(item[key] || 0);
        if (result.rejected) report.failures.push({ batch: item.batch, symbols: batch, error: `Provider records rejected: ${result.rejected}` });
        consecutiveNoData = Number(result.received || 0) > 0 ? 0 : consecutiveNoData + 1;
        consecutiveFailures = Number(result.rejected || 0) > 0 ? consecutiveFailures + 1 : 0;
      } else {
        consecutiveNoData += 1;
        consecutiveFailures += 1;
      }
      // A price-board response can be partial. Recover every missing symbol
      // individually so one provider reset cannot leave a whole batch stale.
      const fetched = new Set(result?.fetched_symbols || []);
      const missingBatch = batch.filter(symbol => !fetched.has(symbol));
      for (const symbol of missingBatch) {
        let recovered = null;
        let recoveryError = null;
        for (let recoveryAttempt = 1; recoveryAttempt <= 2; recoveryAttempt += 1) {
          try {
            recovered = await ingestVnstockEod({ ...models, cacheService, symbols: [symbol], from: date, to: date, source: report.source,
              env: { VNSTOCK_PROJECT_DIR: process.env.VNSTOCK_PROJECT_DIR || '.vnstock' } });
            break;
          } catch (error) {
            recoveryError = error;
            if (recoveryAttempt < 2) await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }
        if (recovered) {
          for (const key of Object.keys(report.totals)) report.totals[key] += Number(recovered[key] || 0);
          report.batches.push({ batch: Math.floor(offset / batchSize) + 1, symbols: [symbol], fallback: true, requested: 1, attempts: 2,
            received: recovered.received, inserted: recovered.inserted, updated: recovered.updated, skipped: recovered.skipped, rejected: recovered.rejected });
        } else {
          report.failures.push({ batch: Math.floor(offset / batchSize) + 1, symbols: [symbol], fallback: true, attempts: 2, error: recoveryError?.message || lastError?.message || 'symbol recovery failed' });
        }
      }
      if (consecutiveFailures >= stopAfter || consecutiveNoData >= stopAfter) {
        report.stopped_early = { offset: offset + batch.length, reason: consecutiveFailures >= stopAfter ? 'consecutive_provider_failures' : 'consecutive_empty_provider_responses' };
        break;
      }
      if (offset + batchSize < symbols.length) await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) { report.error = error.message; }

  report.after = await sessionCoverage(date);
  const [coverageRows] = await models.sequelize.query(
    "SELECT s.code FROM stocks s WHERE s.code = ANY($2::text[]) AND NOT EXISTS (SELECT 1 FROM stock_prices p WHERE p.stock_id=s.id AND p.provider='vnstock' AND p.interval='1d' AND (p.observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date=$1::date) ORDER BY s.code",
    { bind: [date, symbols] }
  );
  report.missing_symbols = coverageRows.map(row => row.code);
  report.completed = !report.error && report.failures.length === 0 && report.missing_symbols.length === 0;
  report.evidence_file = `eod-backfill-${date}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(path.resolve(__dirname, '../evidence', report.evidence_file), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.completed) process.exitCode = 1;
}

main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => models.sequelize.close());
