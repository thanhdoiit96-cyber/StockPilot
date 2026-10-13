'use strict';

const finite = value => value !== null && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
const net = (buy, sell) => finite(buy) !== null && finite(sell) !== null ? finite(buy) - finite(sell) : null;

function buildForeignFlowFeatures(rows = [], { cutoff, zscoreWindow = 20, persistenceWindow = 5 } = {}) {
  const cutoffTime = cutoff ? Date.parse(cutoff) : Infinity;
  if (Number.isNaN(cutoffTime)) throw new Error('foreign-flow cutoff must be an ISO timestamp or date');
  const eligible = rows.map(row => ({
    ...row,
    session: String(row.session_date || row.observed_at || '').slice(0, 10),
    netValue: net(row.buy_value, row.sell_value), netVolume: net(row.buy_volume, row.sell_volume),
    tradedValue: finite(row.traded_value), totalVolume: finite(row.total_volume ?? row.volume)
  })).filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row.session) && Date.parse(`${row.session}T23:59:59.999Z`) <= cutoffTime)
    .sort((a, b) => a.session.localeCompare(b.session));
  if (!eligible.length) return { version: 'foreign_flow_features_v1', status: 'unavailable', reason: 'foreign_flow_not_observed_before_cutoff', as_of: null, features: null, policy: { cutoff: cutoff || null, scored: false } };
  const latest = eligible.at(-1);
  if ([latest.netValue, latest.netVolume, latest.tradedValue, latest.totalVolume].some(value => value === null) || latest.tradedValue <= 0 || latest.totalVolume <= 0) return { version: 'foreign_flow_features_v1', status: 'unavailable', reason: 'foreign_flow_denominator_unavailable', as_of: latest.session, features: null, policy: { cutoff: cutoff || null, scored: false } };
  const history = eligible.filter(row => row.netValue !== null).slice(-zscoreWindow);
  let zscore = null;
  if (history.length === zscoreWindow) {
    const mean = history.reduce((sum, row) => sum + row.netValue, 0) / history.length;
    const variance = history.reduce((sum, row) => sum + (row.netValue - mean) ** 2, 0) / history.length;
    if (variance > 0) zscore = (latest.netValue - mean) / Math.sqrt(variance);
  }
  const persistence = eligible.filter(row => row.netValue !== null).slice(-persistenceWindow);
  return {
    version: 'foreign_flow_features_v1', status: zscore === null ? 'partial' : 'available', reason: zscore === null ? 'insufficient_zscore_history' : null, as_of: latest.session,
    observations: eligible.length,
    features: {
      net_value: latest.netValue, net_volume: latest.netVolume,
      net_value_to_traded_value: Number((latest.netValue / latest.tradedValue).toFixed(8)),
      net_volume_to_total_volume: Number((latest.netVolume / latest.totalVolume).toFixed(8)),
      net_value_zscore_20: zscore === null ? null : Number(zscore.toFixed(6)),
      positive_persistence_5: persistence.length === persistenceWindow ? Number((persistence.filter(row => row.netValue > 0).length / persistenceWindow).toFixed(6)) : null
    },
    policy: { cutoff: cutoff || null, zscore_window: zscoreWindow, persistence_window: persistenceWindow, winsorization: 'fit_on_train_only', scored: false }
  };
}

function buildForeignFlowBreadth(rows = [], { universeSize, minimumCoverage = 0.8 } = {}) {
  const complete = rows.map(row => net(row.buy_value, row.sell_value)).filter(value => value !== null);
  const denominator = Number(universeSize) > 0 ? Number(universeSize) : rows.length;
  const coverage = denominator ? complete.length / denominator : 0;
  if (!complete.length) return { status: 'unavailable', coverage: 0, positive_share: null, net_buying: 0, net_selling: 0, policy: { missing_is_neutral: false, scored: false } };
  return { status: coverage >= minimumCoverage ? 'available' : 'partial', coverage: Number(coverage.toFixed(6)), positive_share: Number((complete.filter(value => value > 0).length / complete.length).toFixed(6)), net_buying: complete.filter(value => value > 0).length, net_selling: complete.filter(value => value < 0).length, policy: { missing_is_neutral: false, scored: false } };
}

module.exports = { buildForeignFlowFeatures, buildForeignFlowBreadth };
