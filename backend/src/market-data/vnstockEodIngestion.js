'use strict';

const VnstockEodAdapter = require('./adapters/VnstockEodAdapter');
const { createVnstockBridgeFetcher } = require('./adapters/vnstockBridgeFetcher');
const { MarketDataIngestionService } = require('./marketDataIngestionService');

function isoDate(date) { return date.toISOString().slice(0, 10); }

function defaultWindow(now = new Date()) {
  const to = new Date(now);
  to.setUTCDate(to.getUTCDate() - 1);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 7);
  return { from: isoDate(from), to: isoDate(to) };
}

async function ingestVnstockEod({ Stock, StockPrice, MarketDataIngestionRun, sequelize, cacheService, symbols, from, to, source = 'vci', marketBySymbol = {}, python, bridge, cwd, env, now = new Date() } = {}) {
  if (!Stock || !StockPrice || !sequelize) throw new TypeError('Stock, StockPrice and sequelize are required');
  const listed = symbols?.length
    ? symbols.map(symbol => String(symbol).trim().toUpperCase()).filter(Boolean)
    : (await Stock.findAll({ attributes: ['code'], where: { listing_status: 'listed' }, order: [['code', 'ASC']] })).map(stock => stock.code);
  if (!listed.length) return { received: 0, inserted: 0, updated: 0, skipped: 0, rejected: 0, errors: [], window: defaultWindow(now) };
  const window = { from: from || defaultWindow(now).from, to: to || defaultWindow(now).to };
  const batchSize = Math.max(1, Number(process.env.VNSTOCK_EOD_BATCH_SIZE || 1));
  if (listed.length > batchSize) {
    const aggregate = { received: 0, inserted: 0, updated: 0, skipped: 0, rejected: 0, errors: [], provider: 'vnstock', source, symbols: listed, window, batches: [] };
    const retries = Math.max(0, Number(process.env.VNSTOCK_EOD_BATCH_RETRIES || 3));
    for (let offset = 0; offset < listed.length; offset += batchSize) {
      if (offset > 0) await new Promise(resolve => setTimeout(resolve, Number(process.env.VNSTOCK_EOD_BATCH_DELAY_MS || 1000)));
      const batch = listed.slice(offset, offset + batchSize);
      let result = null;
      let lastError = null;
      for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
          result = await ingestVnstockEod({ Stock, StockPrice, MarketDataIngestionRun, sequelize, cacheService, symbols: batch, from: window.from, to: window.to, source, marketBySymbol, python, bridge, cwd, env, now });
          break;
        } catch (error) {
          lastError = error;
          if (attempt < retries) await new Promise(resolve => setTimeout(resolve, Math.min(30000, Number(process.env.VNSTOCK_EOD_RETRY_DELAY_MS || 1500) * (2 ** attempt))));
        }
      }
      if (!result) {
        aggregate.errors.push({ symbols: batch, message: lastError?.message || 'EOD batch failed' });
        aggregate.batches.push({ symbols: batch, received: 0, inserted: 0, updated: 0, skipped: 0, rejected: 0, error: lastError?.message || 'EOD batch failed' });
        continue;
      }
      for (const field of ['received', 'inserted', 'updated', 'skipped', 'rejected']) aggregate[field] += Number(result[field] || 0);
      aggregate.errors.push(...(result.errors || []));
      aggregate.batches.push({ symbols: batch, received: result.received || 0, inserted: result.inserted || 0, updated: result.updated || 0, skipped: result.skipped || 0, rejected: result.rejected || 0 });

      // The worker may return a partial response when one of its small
      // provider requests fails. Retry symbols that were absent from the
      // response individually so a failed batch cannot silently remove the
      // current trading session for those symbols.
      const fetched = new Set(result.fetched_symbols || []);
      const missing = batch.filter(symbol => !fetched.has(symbol));
      if (missing.length) {
        for (const symbol of missing) {
          await new Promise(resolve => setTimeout(resolve, Number(process.env.VNSTOCK_EOD_RETRY_DELAY_MS || 1500)));
          try {
            const single = await ingestVnstockEod({ Stock, StockPrice, MarketDataIngestionRun, sequelize, cacheService, symbols: [symbol], from: window.from, to: window.to, source, marketBySymbol, python, bridge, cwd, env, now });
            for (const field of ['received', 'inserted', 'updated', 'skipped', 'rejected']) aggregate[field] += Number(single[field] || 0);
            aggregate.errors.push(...(single.errors || []));
            aggregate.batches.push({ symbols: [symbol], fallback: true, received: single.received || 0, inserted: single.inserted || 0, updated: single.updated || 0, skipped: single.skipped || 0, rejected: single.rejected || 0 });
          } catch (error) {
            aggregate.errors.push({ symbols: [symbol], message: error.message });
            aggregate.batches.push({ symbols: [symbol], fallback: true, received: 0, inserted: 0, updated: 0, skipped: 0, rejected: 0, error: error.message });
          }
        }
      }
    }
    return aggregate;
  }
  const adapter = new VnstockEodAdapter({
    source,
    priceScale: Number(process.env.VNSTOCK_PRICE_SCALE || 1000),
    marketBySymbol,
    now: () => new Date(),
    fetcher: createVnstockBridgeFetcher({ python, bridge, cwd, env })
  });
  let records;
  try {
    records = await adapter.fetchQuotes({ symbols: listed, from: window.from, to: window.to });
  } catch (error) {
    if (MarketDataIngestionRun) {
      const failedAt = new Date();
      await MarketDataIngestionRun.create({ provider: adapter.provider, source, status: 'failed', interval: '1d', from_date: window.from, to_date: window.to, symbols: listed, received: 0, inserted: 0, updated: 0, skipped: 0, rejected: 0, errors: [{ message: error.message }], started_at: failedAt, completed_at: failedAt, updated_at: failedAt });
    }
    throw error;
  }
  const ingestion = new MarketDataIngestionService({ Stock, StockPrice, sequelize, cacheService, MarketDataIngestionRun });
  const report = await ingestion.ingest(records, { provider: adapter.provider, source, interval: '1d', symbols: listed, from: window.from, to: window.to });
  return { ...report, provider: adapter.provider, source, symbols: listed, window, fetched_symbols: [...new Set(records.map(record => record.instrument.symbol))] };
}

module.exports = { ingestVnstockEod, defaultWindow };
