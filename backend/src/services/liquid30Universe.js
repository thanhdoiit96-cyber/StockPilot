'use strict';

const session = value => value instanceof Date ? value.toISOString().slice(0, 10) : typeof value === 'string' ? value.slice(0, 10) : null;
const positive = value => Number.isFinite(Number(value)) && Number(value) > 0;

function buildLiquid30Readiness({ stocks = [], prices = [], minimumCoverage = .95, limit = 30, allowObservedSubset = false } = {}) {
  const listed = stocks.filter(stock => stock?.listing_status === 'listed' && stock?.id && stock?.code);
  const sessions = prices.map(row => session(row?.observed_at)).filter(Boolean).sort();
  const asOf = sessions.at(-1) || null;
  if (!asOf || listed.length < limit) return { version: 'liquid30_readiness_v1', status: 'unavailable', reason: 'universe_or_session_unavailable', as_of: asOf, constituents: [] };
  const byStock = new Map();
  for (const row of prices) if (session(row.observed_at) === asOf && !byStock.has(String(row.stock_id))) byStock.set(String(row.stock_id), row);
  const rows = listed.map(stock => ({ stock, row: byStock.get(String(stock.id)) })).filter(({ row }) => row && positive(row.close ?? row.price) && positive(row.traded_value) && typeof row.price_unit === 'string' && row.price_unit.trim());
  const coverage = rows.length / listed.length;
  if (coverage < minimumCoverage) return { version: 'liquid30_readiness_v1', status: 'unavailable', reason: 'market_coverage_below_threshold', as_of: asOf, coverage: { observed: rows.length, universe: listed.length, ratio: Number(coverage.toFixed(6)), minimum: minimumCoverage }, constituents: [] };
  const constituents = rows.sort((a, b) => Number(b.row.traded_value) - Number(a.row.traded_value) || String(a.stock.code).localeCompare(String(b.stock.code))).slice(0, limit).map(({ stock, row }, index) => ({ rank: index + 1, symbol: stock.code, stock_id: stock.id, traded_value: Number(row.traded_value) }));
  const partial = coverage < .95;
  return constituents.length === limit ? { version: 'liquid30_readiness_v1', status: partial ? 'partial_observed_universe' : 'ready', scope: partial ? 'observed_eod_subset' : 'whole_market', research_only: partial || undefined, as_of: asOf, coverage: { observed: rows.length, universe: listed.length, ratio: Number(coverage.toFixed(6)), minimum: minimumCoverage }, constituents: allowObservedSubset || !partial ? constituents : [] } : { version: 'liquid30_readiness_v1', status: 'unavailable', reason: 'fewer_than_30_eligible_symbols', as_of: asOf, constituents: [] };
}
module.exports = { buildLiquid30Readiness };
