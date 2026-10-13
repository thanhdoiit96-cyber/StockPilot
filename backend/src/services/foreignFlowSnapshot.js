'use strict';
const { summarizeForeignFlow, summarizeForeignFlowBySector } = require('./foreignFlow');
const { sectorFromIndustry } = require('./sectorClassifier');
const { sectorForCode } = require('./sectorCatalog');

const plain = row => typeof row?.toJSON === 'function' ? row.toJSON() : row;
const taxonomy = stock => sectorForCode(stock?.code) || sectorFromIndustry(stock?.industry) || 'other';

function buildForeignFlowSnapshot({ rows = [], universe = [], sessionDate = null, minimumCoverage = 0.8, sector = null, symbol = null, limit = 50 } = {}) {
  const eligibleStocks = universe.filter(stock => (!sector || taxonomy(stock) === sector) && (!symbol || String(stock.code).toUpperCase() === symbol));
  const eligibleIds = new Set(eligibleStocks.map(stock => String(stock.id)));
  const selected = rows.map(plain).filter(row => eligibleIds.has(String(row.stock_id))).map(row => ({ ...row, stock: plain(row.stock), sector: taxonomy(plain(row.stock)) }));
  if (!sessionDate || !selected.length) return {
    version: 'foreign_flow_snapshot_v1', status: 'unavailable', reason: 'foreign_flow_not_observed', session_date: sessionDate,
    scope: { sector, symbol, universe_size: eligibleStocks.length }, coverage: { observed: 0, universe_size: eligibleStocks.length, ratio: 0 }, totals: null, sectors: [], symbols: [],
    policy: { minimum_coverage: minimumCoverage, missing_is_neutral: false, scored: false }
  };
  const total = summarizeForeignFlow(selected, { minimumCoverage: eligibleStocks.length ? Math.min(1, minimumCoverage * selected.length / eligibleStocks.length) : minimumCoverage });
  const coverageRatio = eligibleStocks.length ? selected.length / eligibleStocks.length : 0;
  const status = coverageRatio >= minimumCoverage && total.status === 'available' ? 'available' : 'partial';
  const sectors = summarizeForeignFlowBySector(selected, row => row.sector, { minimumCoverage: 0 }).map(item => ({ sector: item.sector, observed: item.observations, totals: item.totals })).sort((a, b) => Math.abs(b.totals?.net_value || 0) - Math.abs(a.totals?.net_value || 0));
  const symbols = selected.map(row => ({ symbol: row.stock?.code || row.provider_symbol, name: row.stock?.name || null, sector: row.sector, buy_volume: Number(row.buy_volume), sell_volume: Number(row.sell_volume), net_volume: Number(row.buy_volume) - Number(row.sell_volume), buy_value: Number(row.buy_value), sell_value: Number(row.sell_value), net_value: Number(row.buy_value) - Number(row.sell_value), provider: row.provider, source: row.source, license: row.license, fetched_at: row.fetched_at })).sort((a, b) => Math.abs(b.net_value) - Math.abs(a.net_value) || a.symbol.localeCompare(b.symbol)).slice(0, limit);
  return { version: 'foreign_flow_snapshot_v1', status, reason: status === 'partial' ? 'foreign_flow_coverage_below_threshold' : null, session_date: sessionDate, scope: { sector, symbol, universe_size: eligibleStocks.length }, coverage: { observed: selected.length, universe_size: eligibleStocks.length, ratio: Number(coverageRatio.toFixed(6)) }, totals: total.totals, sectors, symbols, policy: { minimum_coverage: minimumCoverage, missing_is_neutral: false, scored: false } };
}
module.exports = { buildForeignFlowSnapshot, taxonomy };
