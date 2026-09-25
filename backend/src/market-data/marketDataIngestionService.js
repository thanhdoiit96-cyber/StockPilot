'use strict';

const crypto = require('crypto');
const { validateBatch } = require('./marketDataValidator');

const activeRuns = new Set();

function hashRecord(record) {
  // Fetch time belongs to the ingestion run, not to the market observation.
  const stable = {
    instrument: record.instrument,
    quote: record.quote,
    observed_at: record.observed_at,
    interval: record.interval,
    provider: record.source.provider,
    quality: record.quality
  };
  return crypto.createHash('sha256').update(JSON.stringify(stable)).digest('hex');
}

class MarketDataIngestionService {
  constructor({ Stock, StockPrice, sequelize, cacheService = null, MarketDataIngestionRun = null }) {
    this.Stock = Stock;
    this.StockPrice = StockPrice;
    this.sequelize = sequelize;
    this.cacheService = cacheService;
    this.MarketDataIngestionRun = MarketDataIngestionRun;
  }

  async ingest(records, metadata = {}) {
    const provider = metadata.provider || records?.[0]?.source?.provider || 'unknown';
    const source = metadata.source || records?.[0]?.source?.upstream || provider;
    const lockKey = `${provider}:${source}:${metadata.interval || '1d'}`;
    if (activeRuns.has(lockKey)) {
      const error = new Error(`ingestion already running for ${lockKey}`);
      error.code = 'INGESTION_ALREADY_RUNNING';
      throw error;
    }
    activeRuns.add(lockKey);
    const startedAt = new Date();
    let audit = null;
    const symbols = metadata.symbols || [...new Set((records || []).map(record => record.instrument?.symbol).filter(Boolean))];
    if (this.MarketDataIngestionRun) {
      audit = await this.MarketDataIngestionRun.create({ provider, source, status: 'running', interval: metadata.interval || '1d', from_date: metadata.from || null, to_date: metadata.to || null, symbols, received: 0, inserted: 0, updated: 0, skipped: 0, rejected: 0, errors: [], started_at: startedAt, updated_at: startedAt });
    }
    const finish = async (report, status = 'success') => {
      if (audit) await audit.update({ ...report, status, completed_at: new Date(), updated_at: new Date(), errors: report.errors || [] });
      activeRuns.delete(lockKey);
      return report;
    };
    const { valid, rejected } = validateBatch(records);
    const report = { received: Array.isArray(records) ? records.length : 0, inserted: 0, updated: 0, skipped: 0, rejected: rejected.length, errors: rejected };
    if (!valid.length) return finish(report);
    const transaction = await this.sequelize.transaction();
    const changedStockIds = new Set();
    try {
      for (const record of valid) {
        const code = record.instrument.symbol.trim().toUpperCase();
        const stock = await this.Stock.findOne({ where: { code }, transaction });
        if (!stock) {
          report.rejected += 1;
          report.errors.push({ record, errors: [`stock ${code} does not exist`] });
          continue;
        }
        const where = { stock_id: stock.id, provider: record.source.provider, interval: record.interval, observed_at: new Date(record.observed_at) };
        const values = {
          ...where, provider_symbol: record.instrument.provider_symbol || code, open: record.quote.open, high: record.quote.high,
          low: record.quote.low, price: record.quote.close, close: record.quote.close, volume: record.quote.volume,
          trade_count: record.quote.trade_count, traded_value: record.quote.traded_value,
          reference_price: record.quote.reference_price, ceiling_price: record.quote.ceiling_price, floor_price: record.quote.floor_price,
          currency: record.quote.currency, price_unit: record.quote.price_unit, fetched_at: new Date(record.fetched_at),
          is_adjusted: Boolean(record.quality?.is_adjusted), source_hash: hashRecord(record), updated_at: new Date()
        };
        const existing = await this.StockPrice.findOne({ where, transaction });
        if (existing) {
          if (existing.source_hash === values.source_hash) { report.skipped += 1; continue; }
          await existing.update(values, { transaction });
          report.updated += 1;
        } else {
          await this.StockPrice.create(values, { transaction });
          report.inserted += 1;
        }
        changedStockIds.add(stock.id);
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      await finish({ ...report, errors: [...report.errors, { errors: [error.message] }] }, 'failed');
      throw error;
    }
    if (this.cacheService) {
      await this.cacheService.deleteByType('stock');
      for (const id of changedStockIds) {
        // Keep all detail cache generations invalidated after EOD upserts.
        // The detail route currently uses v7; older keys are retained for
        // compatibility with already running clients.
        for (const version of ['v7', 'v6', 'v5', 'v4']) {
          await this.cacheService.delete(`${version}:stock:${id}`);
        }
        await this.cacheService.delete(`stock:price:${id}`);
      }
    }
    return finish(report);
  }
}

module.exports = { MarketDataIngestionService, hashRecord };
