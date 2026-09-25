'use strict';

const MarketDataAdapter = require('./MarketDataAdapter');

function createEodhdFetcher({ apiKey = process.env.EODHD_API_KEY, baseUrl = 'https://eodhd.com/api', suffix = process.env.EODHD_SYMBOL_SUFFIX || '.VN', timeoutMs = 15000, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error('EODHD_API_KEY is required');
  return async ({ symbols, from, to }) => {
    const rows = [];
    for (const symbol of symbols) {
      const response = await fetchImpl(`${baseUrl}/eod/${encodeURIComponent(symbol)}${suffix}?api_token=${encodeURIComponent(apiKey)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&period=d&fmt=json`, { signal: AbortSignal.timeout(timeoutMs) });
      if (response.status === 404) continue;
      if (!response.ok) throw new Error(`EODHD HTTP ${response.status} for ${symbol}`);
      const payload = await response.json();
      if (!Array.isArray(payload)) throw new Error(`EODHD returned invalid payload for ${symbol}`);
      payload.forEach(row => rows.push({ symbol, ...row }));
    }
    return rows;
  };
}

function parseCorporateActions(payload) {
  if (Array.isArray(payload)) return payload;
  if (typeof payload !== 'string') return [];
  const trimmed = payload.trim();
  if (trimmed.startsWith('[')) {
    try { return parseCorporateActions(JSON.parse(trimmed)); } catch (_) { /* fall through to CSV parsing */ }
  }
  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines.shift().split(',').map(value => value.trim().replace(/^"|"$/g, ''));
  return lines.map(line => {
    const values = line.split(',').map(value => value.trim().replace(/^"|"$/g, ''));
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

function createEodhdCorporateActionFetcher({ apiKey = process.env.EODHD_API_KEY, baseUrl = 'https://eodhd.com/api', suffix = process.env.EODHD_SYMBOL_SUFFIX || '.VN', timeoutMs = 15000, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error('EODHD_API_KEY is required');
  return async ({ symbols }) => {
    const actions = [];
    for (const symbol of symbols) {
      const response = await fetchImpl(`${baseUrl}/splits/${encodeURIComponent(symbol)}${suffix}?api_token=${encodeURIComponent(apiKey)}&fmt=json`, { signal: AbortSignal.timeout(timeoutMs) });
      if (response.status === 404) continue;
      if (!response.ok) throw new Error(`EODHD corporate actions HTTP ${response.status} for ${symbol}`);
      const rows = parseCorporateActions(await response.text());
      rows.forEach(row => {
        const date = row.date || row.Date;
        const ratioText = row['Stock Splits'] || row.stock_split || row.split || row.ratio;
        const match = String(ratioText || '').match(/([0-9.]+)\s*\/\s*([0-9.]+)/);
        if (date && match) actions.push({ symbol: String(symbol).toUpperCase(), effective_date: String(date).slice(0, 10), numerator: Number(match[1]), denominator: Number(match[2]), ratio: Number(match[1]) / Number(match[2]), provider: 'eodhd' });
      });
    }
    return actions;
  };
}

class EodhdEodAdapter extends MarketDataAdapter {
  constructor({ fetcher, corporateActionFetcher = null, market = 'HOSE', marketBySymbol = {}, license = 'personal_plan_pending', licenseUrl = 'https://eodhd.com/pricing', now = () => new Date() } = {}) {
    super();
    if (typeof fetcher !== 'function') throw new TypeError('EodhdEodAdapter requires a fetcher function');
    this.fetcher = fetcher; this.corporateActionFetcher = corporateActionFetcher; this.market = market; this.marketBySymbol = marketBySymbol; this.license = license; this.licenseUrl = licenseUrl; this.now = now;
  }
  get provider() { return 'eodhd'; }
  get source() { return 'eodhd'; }

  async fetchCorporateActions({ symbols, from, to } = {}) {
    if (!this.corporateActionFetcher) return [];
    const actions = await this.corporateActionFetcher({ symbols, from, to });
    return Array.isArray(actions) ? actions : [];
  }
  async fetchQuotes({ symbols, from, to } = {}) {
    const fetchedAt = this.now().toISOString();
    const rows = await this.fetcher({ symbols, from, to });
    return rows.map(row => {
      const symbol = String(row.symbol || '').trim().toUpperCase();
      return {
        instrument: { symbol, market: row.market || this.marketBySymbol[symbol] || this.market, provider_symbol: `${symbol}.VN` },
        quote: { open: row.open == null ? null : String(row.open), high: row.high == null ? null : String(row.high), low: row.low == null ? null : String(row.low), close: row.close == null ? null : String(row.close), volume: row.volume == null ? null : String(row.volume), currency: 'VND', price_unit: 'VND_PER_SHARE' },
        observed_at: `${String(row.date).slice(0, 10)}T00:00:00.000Z`, interval: '1d',
        source: { provider: this.provider, dataset: 'eodhd-eod', license: this.license, license_url: this.licenseUrl }, fetched_at: fetchedAt,
        quality: { is_delayed: true, is_adjusted: Boolean(row.adjusted_close), completeness: 'full' }
      };
    });
  }
}

module.exports = { EodhdEodAdapter, createEodhdFetcher, createEodhdCorporateActionFetcher, parseCorporateActions };
