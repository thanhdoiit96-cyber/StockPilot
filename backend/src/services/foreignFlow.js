'use strict';

const finite = value => value !== null && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;

function summarizeForeignFlow(rows = [], { minimumCoverage = 0.8 } = {}) {
  const normalized = rows.map(row => {
    const buyVolume = finite(row.buy_volume ?? row.foreign_buy_volume);
    const sellVolume = finite(row.sell_volume ?? row.foreign_sell_volume);
    const buyValue = finite(row.buy_value ?? row.foreign_buy_value);
    const sellValue = finite(row.sell_value ?? row.foreign_sell_value);
    return { ...row, buyVolume, sellVolume, buyValue, sellValue, complete: buyVolume !== null && sellVolume !== null && buyValue !== null && sellValue !== null };
  });
  const complete = normalized.filter(row => row.complete);
  const coverage = normalized.length ? complete.length / normalized.length : 0;
  if (!normalized.length || !complete.length) return { version: 'foreign_flow_summary_v1', status: 'unavailable', reason: 'foreign_flow_not_observed', observations: normalized.length, complete_observations: 0, coverage: 0, totals: null };
  const totals = complete.reduce((sum, row) => ({
    buy_volume: sum.buy_volume + row.buyVolume,
    sell_volume: sum.sell_volume + row.sellVolume,
    buy_value: sum.buy_value + row.buyValue,
    sell_value: sum.sell_value + row.sellValue
  }), { buy_volume: 0, sell_volume: 0, buy_value: 0, sell_value: 0 });
  totals.net_volume = totals.buy_volume - totals.sell_volume;
  totals.net_value = totals.buy_value - totals.sell_value;
  return {
    version: 'foreign_flow_summary_v1', status: coverage >= minimumCoverage ? 'available' : 'partial',
    reason: coverage >= minimumCoverage ? null : 'foreign_flow_coverage_below_threshold', observations: normalized.length,
    complete_observations: complete.length, coverage: Number(coverage.toFixed(6)), totals,
    policy: { minimum_coverage: minimumCoverage, missing_is_neutral: false, scored: false }
  };
}

function summarizeForeignFlowBySector(rows = [], sectorForRow = row => row.sector || 'other', options) {
  const groups = new Map();
  for (const row of rows) {
    const sector = sectorForRow(row) || 'other';
    if (!groups.has(sector)) groups.set(sector, []);
    groups.get(sector).push(row);
  }
  return [...groups.entries()].map(([sector, sectorRows]) => ({ sector, ...summarizeForeignFlow(sectorRows, options) }));
}

module.exports = { summarizeForeignFlow, summarizeForeignFlowBySector };
