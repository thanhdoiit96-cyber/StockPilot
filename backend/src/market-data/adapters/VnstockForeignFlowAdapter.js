'use strict';
const crypto = require('crypto');

const decimal = value => {
  if (value == null || value === '') return null;
  const text = String(value).replace(/,/g, '').trim();
  if (!/^\d+(\.\d+)?$/.test(text)) throw new Error(`invalid non-negative foreign-flow decimal: ${value}`);
  return text;
};
const dateOnly = value => {
  const text = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) throw new Error(`invalid foreign-flow session: ${value}`);
  return text;
};

class VnstockForeignFlowAdapter {
  constructor({ fetcher, source = 'vci', license = 'sponsor_access_pending_display_rights', licenseUrl = 'https://vnstocks.com/onboard/giay-phep-su-dung', now = () => new Date() } = {}) {
    if (typeof fetcher !== 'function') throw new TypeError('VnstockForeignFlowAdapter requires a fetcher');
    Object.assign(this, { fetcher, source, license, licenseUrl, now });
  }
  async fetch({ symbols, from, to } = {}) {
    const requested = (symbols || []).map(value => String(value).trim().toUpperCase()).filter(Boolean);
    if (!requested.length) throw new Error('symbols must contain at least one symbol');
    const rows = await this.fetcher({ symbols: requested, from, to, source: this.source });
    if (!Array.isArray(rows)) throw new Error('Vnstock foreign-flow fetcher must return an array');
    return rows.map(row => {
      const symbol = String(row.symbol || row.ticker || '').trim().toUpperCase();
      const normalized = {
        symbol, provider_symbol: String(row.provider_symbol || symbol).toUpperCase(), session_date: dateOnly(row.session_date || row.trading_date || row.date || row.time),
        buy_volume: decimal(row.buy_volume ?? row.foreign_buy_volume ?? row.fr_buy_volume),
        sell_volume: decimal(row.sell_volume ?? row.foreign_sell_volume ?? row.fr_sell_volume),
        buy_value: decimal(row.buy_value ?? row.foreign_buy_value ?? row.fr_buy_value_matched),
        sell_value: decimal(row.sell_value ?? row.foreign_sell_value ?? row.fr_sell_value_matched),
        currency: row.currency || 'VND', provider: 'vnstock', source: this.source, license: this.license, license_url: this.licenseUrl,
        fetched_at: this.now().toISOString()
      };
      if (!symbol || ['buy_volume', 'sell_volume', 'buy_value', 'sell_value'].some(field => normalized[field] == null)) throw new Error(`incomplete foreign-flow row for ${symbol || 'unknown symbol'}`);
      normalized.source_hash = crypto.createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(normalized).filter(([key]) => key !== 'fetched_at')))).digest('hex');
      return normalized;
    }).filter(row => (!from || row.session_date >= from) && (!to || row.session_date <= to));
  }
}
module.exports = VnstockForeignFlowAdapter;
