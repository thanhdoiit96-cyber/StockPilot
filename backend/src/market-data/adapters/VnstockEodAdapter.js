'use strict';

const MarketDataAdapter = require('./MarketDataAdapter');

function decimal(value) {
  if (value == null || value === '') return null;
  const normalized = String(value).replace(/,/g, '').trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) throw new Error(`invalid non-negative decimal: ${value}`);
  return normalized;
}

function scaledDecimal(value, scale) {
  const normalized = decimal(value);
  if (normalized == null || scale === 1) return normalized;
  return String(Number(normalized) * scale);
}

function isoTimestamp(value) {
  if (value instanceof Date) return value.toISOString();
  const text = String(value || '').trim();
  if (!text) throw new Error('date is required');
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? new Date(`${text}T00:00:00.000Z`)
    : new Date(text);
  if (Number.isNaN(parsed.getTime())) throw new Error(`invalid date: ${value}`);
  return parsed.toISOString();
}

/**
 * Adapter boundary for a Vnstock Python client/bridge.
 * The fetcher returns rows with date/time, OHLCV fields and an optional symbol.
 */
class VnstockEodAdapter extends MarketDataAdapter {
  constructor({
    fetcher,
    market = 'HOSE',
    marketBySymbol = {},
    source = 'vci',
    priceScale = 1,
    license = 'personal_research_only',
    licenseUrl = 'https://vnstocks.com/onboard/giay-phep-su-dung',
    now = () => new Date()
  } = {}) {
    super();
    if (typeof fetcher !== 'function') throw new TypeError('VnstockEodAdapter requires a fetcher function');
    this.fetcher = fetcher;
    this.market = market;
    this.marketBySymbol = Object.fromEntries(Object.entries(marketBySymbol).map(([symbol, value]) => [String(symbol).toUpperCase(), value]));
    this.source = source;
    this.priceScale = Number(priceScale) > 0 ? Number(priceScale) : 1;
    this.license = license;
    this.licenseUrl = licenseUrl;
    this.now = now;
  }

  get provider() { return 'vnstock'; }

  async fetchQuotes({ symbols, from, to } = {}) {
    const requested = (symbols || []).map(symbol => String(symbol).trim().toUpperCase()).filter(Boolean);
    if (!requested.length) throw new Error('symbols must contain at least one symbol');
    const fetchedAt = this.now().toISOString();
    const rows = await this.fetcher({ symbols: requested, from, to, interval: '1d', source: this.source });
    if (!Array.isArray(rows)) throw new Error('Vnstock fetcher must return an array');
    const normalized = rows.map(row => {
      const symbol = String(row.symbol || row.ticker || row.code || '').trim().toUpperCase();
      if (!symbol) throw new Error('Vnstock row is missing symbol');
      const observed = isoTimestamp(row.observed_at || row.time || row.date || row.trading_date);
      return {
        instrument: { symbol, market: row.market || this.marketBySymbol[symbol] || this.market, provider_symbol: String(row.provider_symbol || symbol).toUpperCase() },
        quote: {
          open: scaledDecimal(row.open, this.priceScale), high: scaledDecimal(row.high, this.priceScale), low: scaledDecimal(row.low, this.priceScale), close: scaledDecimal(row.close, this.priceScale),
          volume: decimal(row.volume), trade_count: decimal(row.trade_count ?? row.transactions), traded_value: decimal(row.traded_value ?? row.value),
          reference_price: scaledDecimal(row.reference_price, this.priceScale), ceiling_price: scaledDecimal(row.ceiling_price, this.priceScale), floor_price: scaledDecimal(row.floor_price, this.priceScale),
          currency: row.currency || 'VND', price_unit: row.price_unit || 'VND_PER_SHARE'
        },
        observed_at: observed,
        interval: '1d',
        source: {
          provider: this.provider, dataset: `vnstock-${this.source}-daily`, license: this.license,
          license_url: this.licenseUrl, upstream: this.source
        },
        fetched_at: fetchedAt,
        quality: {
          is_delayed: row.is_delayed !== false, is_adjusted: Boolean(row.is_adjusted),
          completeness: row.completeness || 'full'
        }
      };
    });
    const fromTime = from ? Date.parse(from) : -Infinity;
    const toTime = to ? Date.parse(to) + (String(to).length <= 10 ? 86400000 - 1 : 0) : Infinity;
    return normalized.filter(record => {
      const observed = Date.parse(record.observed_at);
      return observed >= fromTime && observed <= toTime;
    });
  }
}

module.exports = VnstockEodAdapter;
