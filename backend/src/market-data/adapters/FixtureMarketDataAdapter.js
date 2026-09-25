'use strict';

const fs = require('fs/promises');
const path = require('path');
const MarketDataAdapter = require('./MarketDataAdapter');

function decimal(value) {
  if (value == null || value === '') return null;
  return String(value);
}

class FixtureMarketDataAdapter extends MarketDataAdapter {
  constructor({ file = path.resolve(__dirname, '../fixtures/valid-daily-quotes.json') } = {}) {
    super();
    this.file = file;
  }

  get provider() { return 'fixture'; }

  async fetchQuotes({ symbols, from, to } = {}) {
    const records = JSON.parse(await fs.readFile(this.file, 'utf8'));
    const wanted = symbols?.length ? new Set(symbols.map(symbol => symbol.trim().toUpperCase())) : null;
    return records.filter(record => {
      const symbol = record.symbol?.trim().toUpperCase();
      const observed = Date.parse(record.observed_at);
      return (!wanted || wanted.has(symbol))
        && (!from || observed >= Date.parse(from))
        && (!to || observed <= Date.parse(to));
    }).map(record => ({
      instrument: { symbol: record.symbol.trim().toUpperCase(), market: record.market || 'HOSE', provider_symbol: record.provider_symbol || record.symbol.trim().toUpperCase() },
      quote: {
        open: decimal(record.open), high: decimal(record.high), low: decimal(record.low),
        close: decimal(record.close), volume: decimal(record.volume), currency: record.currency || 'VND',
        price_unit: record.price_unit || 'VND_PER_SHARE'
      },
      observed_at: new Date(record.observed_at).toISOString(),
      interval: record.interval || '1d',
      source: { provider: this.provider, dataset: record.dataset || path.basename(this.file), license: 'internal-test' },
      fetched_at: new Date(record.fetched_at || Date.now()).toISOString(),
      quality: { is_delayed: Boolean(record.is_delayed), is_adjusted: Boolean(record.is_adjusted), completeness: record.completeness || 'full' }
    }));
  }
}

module.exports = FixtureMarketDataAdapter;
