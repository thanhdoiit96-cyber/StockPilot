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
  const turnover = sessions.slice(1).flatMap((item, index) => item.fold_index === sessions[index].fold_index
    ? [1 - item[key].filter(symbol => new Set(sessions[index][key]).has(symbol)).length / topK]
    : []);
  const counts = new Map(); lists.flat().forEach(symbol => counts.set(symbol, (counts.get(symbol) || 0) + 1));
  const total = lists.length * topK;
  const shares = [...counts.values()].map(count => count / total);
  return { average_turnover: turnover.length ? turnover.reduce((a, b) => a + b, 0) / turnover.length : null, turnover_transitions: turnover.length,
    unique_symbols: counts.size, maximum_selection_share: Math.max(...shares), concentration_hhi: shares.reduce((sum, value) => sum + value ** 2, 0) };
}
function hierarchicalBootstrap(sessions, costBps, iterations = 1000, seed = 20261012) {
  let state = seed >>> 0;
  const random = () => { state = (1664525 * state + 1013904223) >>> 0; return state / 2 ** 32; };
  const deltas = sessions.map(item => ({ fold: item.fold_index,
    mean: item.regime_returns.reduce((a, b) => a + b, 0) / item.regime_returns.length - item.baseline_returns.reduce((a, b) => a + b, 0) / item.baseline_returns.length,
    positive: item.regime_returns.filter(value => value > 0).length / item.regime_returns.length - item.baseline_returns.filter(value => value > 0).length / item.baseline_returns.length,
    net: item.regime_returns.reduce((a, b) => a + b, 0) / item.regime_returns.length - item.regime_turnover * costBps / 10000
      - (item.baseline_returns.reduce((a, b) => a + b, 0) / item.baseline_returns.length - item.baseline_turnover * costBps / 10000)
  }));
  const folds = [...new Set(deltas.map(item => item.fold))].map(fold => deltas.filter(item => item.fold === fold));
  const samples = { mean: [], positive: [], net: [] };
  for (let i = 0; i < iterations; i++) {
    const selected = [];
    for (let j = 0; j < folds.length; j++) {
      const fold = folds[Math.floor(random() * folds.length)];
      for (let k = 0; k < fold.length; k++) selected.push(fold[Math.floor(random() * fold.length)]);
    }
    samples.mean.push(selected.reduce((sum, row) => sum + row.mean, 0) / selected.length);
    samples.positive.push(selected.reduce((sum, row) => sum + row.positive, 0) / selected.length);
    samples.net.push(selected.reduce((sum, row) => sum + row.net, 0) / selected.length);
  }
  const interval = values => { values.sort((a, b) => a - b); return { lower: values[Math.floor(iterations * .025)], upper: values[Math.min(iterations - 1, Math.floor(iterations * .975))] }; };
  return { method: 'hierarchical_fold_session_bootstrap', iterations, seed, confidence: .95, folds: folds.length, cost_bps: costBps,
    mean_forward_return_delta: interval(samples.mean), positive_rate_delta: interval(samples.positive), net_mean_return_delta: interval(samples.net) };
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
  for (const [foldIndex, fold] of model.folds.entries()) for (const prediction of fold.predictions || []) {
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
    sessions.push({ fold_index: foldIndex, session: prediction.session, target_session: label.target_session, regime_probabilities: Object.fromEntries(CLASSES.map((name, index) => [name, prediction.probabilities[index]])), regime_tilt: regimeTilt,
      baseline_symbols: baseline.map(item => item.symbol), regime_symbols: regime.map(item => item.symbol), baseline_returns: baselineReturns, regime_returns: regimeReturns });
  }
  if (!sessions.length) return { version: 'forecast_regime_ranking_v1', status: 'unavailable', reason: 'no_comparable_sessions', coupling_enabled: false };
  for (const [index, item] of sessions.entries()) {
    const previous = sessions[index - 1];
    for (const strategy of ['baseline', 'regime']) item[`${strategy}_turnover`] = !previous || previous.fold_index !== item.fold_index ? 1
      : 1 - item[`${strategy}_symbols`].filter(symbol => new Set(previous[`${strategy}_symbols`]).has(symbol)).length / topK;
  }
  const baselineSelections = sessions.map(item => ({ returns: item.baseline_returns }));
  const regimeSelections = sessions.map(item => ({ returns: item.regime_returns }));
  const baseline = metric(baselineSelections), regime = metric(regimeSelections);
  const comparison = { mean_forward_return_delta: regime.mean_forward_return - baseline.mean_forward_return, positive_rate_delta: regime.positive_rate - baseline.positive_rate };
  const primaryCostBps = 25;
  const cost_sensitivity = [0, 10, 25, 50].map(costBps => {
    const net = (item, strategy) => item[`${strategy}_returns`].reduce((a, b) => a + b, 0) / item[`${strategy}_returns`].length - item[`${strategy}_turnover`] * costBps / 10000;
    const baselineNet = sessions.reduce((sum, item) => sum + net(item, 'baseline'), 0) / sessions.length;
    const regimeNet = sessions.reduce((sum, item) => sum + net(item, 'regime'), 0) / sessions.length;
    return { cost_bps: costBps, baseline_net_mean_return: baselineNet, regime_net_mean_return: regimeNet, net_mean_return_delta: regimeNet - baselineNet };
  });
  const confidence_intervals = hierarchicalBootstrap(sessions, primaryCostBps);
  const selection_diagnostics = { baseline: diagnostics(sessions, 'baseline_symbols', topK), regime: diagnostics(sessions, 'regime_symbols', topK) };
  const fold_results = [...new Set(sessions.map(item => item.fold_index))].map(foldIndex => {
    const foldSessions = sessions.filter(item => item.fold_index === foldIndex);
    const net = (item, strategy) => item[`${strategy}_returns`].reduce((a, b) => a + b, 0) / item[`${strategy}_returns`].length - item[`${strategy}_turnover`] * primaryCostBps / 10000;
    const baselineNet = foldSessions.reduce((sum, item) => sum + net(item, 'baseline'), 0) / foldSessions.length;
    const regimeNet = foldSessions.reduce((sum, item) => sum + net(item, 'regime'), 0) / foldSessions.length;
    return { fold_index: foldIndex, sessions: foldSessions.length, first_session: foldSessions[0].session, last_session: foldSessions.at(-1).session,
      baseline_net_mean_return: baselineNet, regime_net_mean_return: regimeNet, net_mean_return_delta: regimeNet - baselineNet };
  });
  const enough = sessions.length >= minimumSessions;
  const enoughFolds = fold_results.length >= 3;
  const allFoldsNetPositive = fold_results.every(item => item.net_mean_return_delta > 0);
  const evidenceGatePassed = enough && enoughFolds && confidence_intervals.mean_forward_return_delta.lower > 0 && confidence_intervals.positive_rate_delta.lower > 0
    && confidence_intervals.net_mean_return_delta.lower > 0 && allFoldsNetPositive;
  return { version: 'forecast_regime_ranking_v1', status: 'evaluated', synthetic: true, research_only: true, market_accuracy_verified: false,
    horizon_sessions: horizon, top_k: topK, policy: 'fixed_regime_tilt_v1', policy_formula: 'rule_score + (p_advancing - p_declining) * (momentum - stability) * 0.1',
    minimum_sessions: minimumSessions, comparable_sessions: sessions.length, baseline, regime, comparison, cost_model: { convention: 'one_way_bps_times_session_turnover', primary_cost_bps: primaryCostBps, initial_formation_turnover: 1 },
    cost_sensitivity, confidence_intervals, fold_results, selection_diagnostics,
    gate: { enough_sessions: enough, enough_disjoint_folds: enoughFolds, mean_return_ci_above_zero: confidence_intervals.mean_forward_return_delta.lower > 0,
      positive_rate_ci_above_zero: confidence_intervals.positive_rate_delta.lower > 0, net_return_ci_above_zero: confidence_intervals.net_mean_return_delta.lower > 0,
      all_folds_net_positive: allFoldsNetPositive },
    evidence_gate_passed: evidenceGatePassed, coupling_enabled: false,
    decision: evidenceGatePassed ? 'eligible_for_live_evidence_validation' : enough ? 'no_incremental_value' : 'insufficient_evidence',
    selection_hash: hash(sessions.map(item => [item.session, item.baseline_symbols, item.regime_symbols])), sessions };
}
module.exports = { evaluateRegimeAwareRanking };
