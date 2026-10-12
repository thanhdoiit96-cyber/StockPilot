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
function diagnostics(sessions, key, topK) {
  const lists = sessions.map(item => item[key]);
  const turnover = lists.slice(1).map((list, index) => 1 - list.filter(symbol => new Set(lists[index]).has(symbol)).length / topK);
  const counts = new Map(); lists.flat().forEach(symbol => counts.set(symbol, (counts.get(symbol) || 0) + 1));
  const total = lists.length * topK;
  const shares = [...counts.values()].map(count => count / total);
  return { average_turnover: turnover.length ? turnover.reduce((a, b) => a + b, 0) / turnover.length : null,
    unique_symbols: counts.size, maximum_selection_share: Math.max(...shares), concentration_hhi: shares.reduce((sum, value) => sum + value ** 2, 0) };
}
function bootstrapPaired(sessions, iterations = 1000, seed = 20261012) {
  let state = seed >>> 0;
  const random = () => { state = (1664525 * state + 1013904223) >>> 0; return state / 2 ** 32; };
  const deltas = sessions.map(item => ({
    mean: item.regime_returns.reduce((a, b) => a + b, 0) / item.regime_returns.length - item.baseline_returns.reduce((a, b) => a + b, 0) / item.baseline_returns.length,
    positive: item.regime_returns.filter(value => value > 0).length / item.regime_returns.length - item.baseline_returns.filter(value => value > 0).length / item.baseline_returns.length
  }));
  const samples = { mean: [], positive: [] };
  for (let i = 0; i < iterations; i++) {
    let mean = 0, positive = 0;
    for (let j = 0; j < deltas.length; j++) { const row = deltas[Math.floor(random() * deltas.length)]; mean += row.mean / deltas.length; positive += row.positive / deltas.length; }
    samples.mean.push(mean); samples.positive.push(positive);
  }
  const interval = values => { values.sort((a, b) => a - b); return { lower: values[Math.floor(iterations * .025)], upper: values[Math.min(iterations - 1, Math.floor(iterations * .975))] }; };
  return { method: 'paired_session_bootstrap', iterations, seed, confidence: .95, mean_forward_return_delta: interval(samples.mean), positive_rate_delta: interval(samples.positive) };
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
  const confidence_intervals = bootstrapPaired(sessions);
  const selection_diagnostics = { baseline: diagnostics(sessions, 'baseline_symbols', topK), regime: diagnostics(sessions, 'regime_symbols', topK) };
  const enough = sessions.length >= minimumSessions;
  const evidenceGatePassed = enough && confidence_intervals.mean_forward_return_delta.lower > 0 && confidence_intervals.positive_rate_delta.lower > 0;
  return { version: 'forecast_regime_ranking_v1', status: 'evaluated', synthetic: true, research_only: true, market_accuracy_verified: false,
    horizon_sessions: horizon, top_k: topK, policy: 'fixed_regime_tilt_v1', policy_formula: 'rule_score + (p_advancing - p_declining) * (momentum - stability) * 0.1',
    minimum_sessions: minimumSessions, comparable_sessions: sessions.length, baseline, regime, comparison, confidence_intervals, selection_diagnostics,
    gate: { enough_sessions: enough, mean_return_ci_above_zero: confidence_intervals.mean_forward_return_delta.lower > 0, positive_rate_ci_above_zero: confidence_intervals.positive_rate_delta.lower > 0 },
    evidence_gate_passed: evidenceGatePassed, coupling_enabled: false,
    decision: evidenceGatePassed ? 'eligible_for_live_evidence_validation' : enough ? 'no_incremental_value' : 'insufficient_evidence',
    selection_hash: hash(sessions.map(item => [item.session, item.baseline_symbols, item.regime_symbols])), sessions };
}
module.exports = { evaluateRegimeAwareRanking };
