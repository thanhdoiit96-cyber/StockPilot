'use strict';

const INTERVALS = new Set(['1m', '5m', '15m', '1h', '1d']);
const COMPLETENESS = new Set(['full', 'partial', 'unknown']);

function isCanonicalQuote(value) {
  return Boolean(value && typeof value === 'object'
    && (value.open == null || typeof value.open === 'string')
    && (value.high == null || typeof value.high === 'string')
    && (value.low == null || typeof value.low === 'string')
    && (value.close == null || typeof value.close === 'string')
    && (value.volume == null || typeof value.volume === 'string')
    && ['trade_count', 'traded_value', 'reference_price', 'ceiling_price', 'floor_price'].every(field => value[field] == null || typeof value[field] === 'string')
    && typeof value.currency === 'string'
    && typeof value.price_unit === 'string');
}

function validateMarketRecord(record) {
  const errors = [];
  if (!record || typeof record !== 'object') return ['record must be an object'];
  if (!record.instrument || typeof record.instrument.symbol !== 'string' || !record.instrument.symbol.trim()) {
    errors.push('instrument.symbol is required');
  }
  if (!isCanonicalQuote(record.quote)) errors.push('quote is not canonical');
  if (typeof record.observed_at !== 'string' || Number.isNaN(Date.parse(record.observed_at))) errors.push('observed_at must be an ISO timestamp');
  if (typeof record.fetched_at !== 'string' || Number.isNaN(Date.parse(record.fetched_at))) errors.push('fetched_at must be an ISO timestamp');
  if (!record.source || typeof record.source.provider !== 'string' || !record.source.provider.trim()) errors.push('source.provider is required');
  if (!INTERVALS.has(record.interval)) errors.push(`interval must be one of ${[...INTERVALS].join(', ')}`);
  if (record.quality?.completeness && !COMPLETENESS.has(record.quality.completeness)) errors.push('quality.completeness is invalid');
  for (const field of ['open', 'high', 'low', 'close', 'volume', 'trade_count', 'traded_value', 'reference_price', 'ceiling_price', 'floor_price']) {
    const value = record.quote?.[field];
    if (value != null && (typeof value !== 'string' || !/^\d+(\.\d+)?$/.test(value))) errors.push(`quote.${field} must be a non-negative decimal string or null`);
  }
  if (record.quote?.close == null && record.quote?.price == null) errors.push('quote.close is required');
  return errors;
}

module.exports = { INTERVALS, validateMarketRecord };
