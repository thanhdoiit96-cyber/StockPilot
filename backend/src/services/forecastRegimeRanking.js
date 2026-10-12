'use strict';
const { createHash } = require('crypto');
const { buildShortTermRecommendations } = require('./recommendationEngine');
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const CLASSES = ['declining', 'balanced', 'advancing'];

function metric(selections) {
  const returns = selections.flatMap(item => item.returns);
  return { sessions: selections.length, stocks: returns.length,
    mean_forward_return: returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : null,
    positive_rate: returns.length ? returns.filter(value => value > 0).length / returns.length : null };
}

function evaluateRegimeAwareRanking({ report, rows = [], horizon = 5, topK = 5, minimumSessions = 20 } = {}) {
  if (report?.synthetic !== true || report?.research_only !== true) throw new Error('Explicit synthetic research report required');
  if (![1, 5].includes(horizon) || !Number.isInteger(topK) || topK < 1 || topK > 10 || !Number.isInteger(minimumSessions) || minimumSessions < 5) throw new Error('Invalid ranking evaluation settings');
  const model = report.models?.find(item => item.horizon_sessions === horizon);
  if (!model || model.status !== 'evaluated') return { version: 'forecast_regime_ranking_v1', status: 'unavailable', reason: 'forecast_model_unavailable', coupling_enabled: false };
  const samples = new Map(report.samples.map(sample => [sample.as_of, sample]));
  const stockIds = [...new Set(rows.map(row => String(row.stock_id)))].sort();
  const stocks = stockIds.map(id => ({ id, code: `S${id.padStart(3, '0')}`, name: `Synthetic ${id}` }));
  const bySessionStock = new Map(rows.map(row => [`${row.session}|${row.stock_id}`, row]));
  const sessions = [];
  for (const prediction of model.folds.flatMap(fold => fold.predictions || [])) {
    const sample = samples.get(prediction.session);
    const label = sample?.labels?.find(item => item.horizon_sessions === horizon && item.status === 'available');
    if (!label || prediction.probabilities.length !== CLASSES.length) continue;
    const history = new Map(stockIds.map(id => [id, rows.filter(row => String(row.stock_id) === id && row.session <= prediction.session).sort((a, b) => a.session.localeCompare(b.session))]));
    const pool = buildShortTermRecommendations({ stocks, priceRowsByStock: history, limit: 30, horizonDays: horizon, asOf: prediction.session });
    if (pool.length < topK) continue;
    const regimeTilt = prediction.probabilities[2] - prediction.probabilities[0];
    const adjusted = pool.map(item => {
      const momentum = Number(item.rationale?.score_parts?.momentum || 0);
      const stability = Number(item.rationale?.score_parts?.stability || 0);
      const adjustment = regimeTilt * (momentum - stability) * 0.1;
      return { ...item, regime_adjustment: adjustment, regime_score: item.score + adjustment };
    }).sort((a, b) => b.regime_score - a.regime_score || b.score - a.score || a.symbol.localeCompare(b.symbol));
    const baseline = pool.slice(0, topK), regime = adjusted.slice(0, topK);
    const returnsFor = selected => selected.map(item => {
      const origin = bySessionStock.get(`${prediction.session}|${item.stock_id}`), target = bySessionStock.get(`${label.target_session}|${item.stock_id}`);
      return origin && target ? Number(target.close) / Number(origin.close) - 1 : NaN;
    }).filter(Number.isFinite);
    const baselineReturns = returnsFor(baseline), regimeReturns = returnsFor(regime);
    if (baselineReturns.length !== topK || regimeReturns.length !== topK) continue;
    sessions.push({ session: prediction.session, target_session: label.target_session, regime_probabilities: Object.fromEntries(CLASSES.map((name, index) => [name, prediction.probabilities[index]])), regime_tilt: regimeTilt,
      baseline_symbols: baseline.map(item => item.symbol), regime_symbols: regime.map(item => item.symbol), baseline_returns: baselineReturns, regime_returns: regimeReturns });
  }
  if (!sessions.length) return { version: 'forecast_regime_ranking_v1', status: 'unavailable', reason: 'no_comparable_sessions', coupling_enabled: false };
  const baselineSelections = sessions.map(item => ({ returns: item.baseline_returns }));
  const regimeSelections = sessions.map(item => ({ returns: item.regime_returns }));
  const baseline = metric(baselineSelections), regime = metric(regimeSelections);
  const comparison = { mean_forward_return_delta: regime.mean_forward_return - baseline.mean_forward_return, positive_rate_delta: regime.positive_rate - baseline.positive_rate };
  const enough = sessions.length >= minimumSessions;
  const couplingEnabled = enough && comparison.mean_forward_return_delta > 0 && comparison.positive_rate_delta > 0;
  return { version: 'forecast_regime_ranking_v1', status: 'evaluated', synthetic: true, research_only: true, market_accuracy_verified: false,
    horizon_sessions: horizon, top_k: topK, policy: 'fixed_regime_tilt_v1', policy_formula: 'rule_score + (p_advancing - p_declining) * (momentum - stability) * 0.1',
    minimum_sessions: minimumSessions, comparable_sessions: sessions.length, baseline, regime, comparison,
    gate: { enough_sessions: enough, improves_mean_return: comparison.mean_forward_return_delta > 0, improves_positive_rate: comparison.positive_rate_delta > 0 },
    coupling_enabled: couplingEnabled, decision: couplingEnabled ? 'eligible_for_further_validation' : enough ? 'no_incremental_value' : 'insufficient_evidence',
    selection_hash: hash(sessions.map(item => [item.session, item.baseline_symbols, item.regime_symbols])), sessions };
}
module.exports = { evaluateRegimeAwareRanking };
