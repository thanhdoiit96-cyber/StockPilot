'use strict';

const { validateBatch } = require('./marketDataValidator');

function unique(values) { return [...new Set(values.map(value => String(value).trim().toUpperCase()).filter(Boolean))]; }

async function runCoverageProbe({ adapter, symbols, from, to, minCoverage = 0.95, minSessions = 1, now = () => new Date() } = {}) {
  if (!adapter || typeof adapter.fetchQuotes !== 'function') throw new TypeError('adapter.fetchQuotes is required');
  const expected = unique(symbols || []);
  if (!expected.length) throw new TypeError('symbols must contain at least one symbol');
  const startedAt = now().toISOString();
  const raw = await adapter.fetchQuotes({ symbols: expected, from, to });
  const { valid, rejected } = validateBatch(raw);
  const bySymbol = new Map(expected.map(symbol => [symbol, []]));
  valid.forEach(record => {
    const symbol = record.instrument.symbol.toUpperCase();
    if (bySymbol.has(symbol)) bySymbol.get(symbol).push(record);
  });
  const results = expected.map(symbol => {
    const records = bySymbol.get(symbol);
    const observations = [...new Set(records.map(record => record.observed_at))].sort();
    return { symbol, market: records[0]?.instrument.market || null, records: records.length, sessions: observations.length, first_observed_at: observations[0] || null, last_observed_at: observations.at(-1) || null, pass: observations.length >= minSessions };
  });
  const covered = results.filter(result => result.pass).length;
  const completedAt = now().toISOString();
  const coverageRatio = covered / expected.length;
  const report = {
    type: 'market_data_coverage_probe', version: 1, status: coverageRatio >= minCoverage && rejected.length === 0 ? 'pass' : 'fail',
    provider: adapter.provider, license: valid[0]?.source?.license || null, license_url: valid[0]?.source?.license_url || null,
    started_at: startedAt, completed_at: completedAt, query: { symbols: expected, from: from || null, to: to || null, interval: '1d' },
    received: raw.length, accepted: valid.length, rejected: rejected.length, covered_symbols: covered, expected_symbols: expected.length,
    coverage_ratio: coverageRatio, min_coverage: minCoverage, min_sessions: minSessions,
    markets: results.reduce((counts, result) => { if (result.market) counts[result.market] = (counts[result.market] || 0) + 1; return counts; }, {}),
    results, errors: rejected
  };
  return report;
}

module.exports = { runCoverageProbe };
