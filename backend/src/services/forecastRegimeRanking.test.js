const { forecastRegimeRankingFixture } = require('./forecastRegimeRankingFixture');
const { replayForecastDataset } = require('./forecastReplay');
const { evaluateRegimeAwareRanking } = require('./forecastRegimeRanking');
let input, report;
beforeAll(() => { input = forecastRegimeRankingFixture(); report = replayForecastDataset(input); });
test('compares regime-aware and rule rankings across disjoint synthetic folds with cost diagnostics', () => {
  const result = evaluateRegimeAwareRanking({ report, rows: input.rows, horizon: 5, topK: 5 });
  expect(result).toMatchObject({ status: 'evaluated', synthetic: true, research_only: true, market_accuracy_verified: false, comparable_sessions: 45,
    coupling_enabled: false, evidence_gate_passed: false, decision: 'no_incremental_value' });
  expect(result.confidence_intervals).toMatchObject({ method: 'hierarchical_fold_session_bootstrap', iterations: 1000, seed: 20261012, confidence: .95, folds: 3, cost_bps: 25 });
  expect(result.cost_sensitivity.map(item => item.cost_bps)).toEqual([0, 10, 25, 50]);
  expect(result.fold_results).toHaveLength(3);
  expect(result.fold_results.every(item => item.sessions === 15)).toBe(true);
  expect(result.fold_results.slice(1).every((item, index) => result.sessions.find(row => row.fold_index === index).target_session < item.first_session)).toBe(true);
  expect(result.gate).toHaveProperty('all_folds_net_positive');
  expect(result.selection_diagnostics.baseline.average_turnover).toBeGreaterThanOrEqual(0);
  expect(result.selection_diagnostics.baseline.turnover_transitions).toBe(42);
  expect(result.selection_diagnostics.regime.concentration_hhi).toBeGreaterThan(0);
  expect(result.baseline.stocks).toBe(result.regime.stocks);
  expect(result.baseline.stocks).toBe(225);
  expect(result.sessions.every(item => item.baseline_returns.length === 5 && item.regime_returns.length === 5 && Number.isInteger(item.fold_index))).toBe(true);
});
test('outcomes affect metrics but cannot alter the frozen selections', () => {
  const before = evaluateRegimeAwareRanking({ report, rows: input.rows, horizon: 5 });
  const targets = new Set([before.sessions.at(-1).target_session]);
  const changedRows = input.rows.map(row => targets.has(row.session) ? { ...row, close: row.close * (Number(row.stock_id) % 2 ? 2 : .5) } : row);
  const after = evaluateRegimeAwareRanking({ report, rows: changedRows, horizon: 5 });
  expect(after.selection_hash).toBe(before.selection_hash);
  expect(after.sessions.map(item => item.regime_symbols)).toEqual(before.sessions.map(item => item.regime_symbols));
  expect(after.regime.mean_forward_return).not.toBe(before.regime.mean_forward_return);
});
test('fails closed for non-synthetic context and unavailable forecast model', () => {
  expect(() => evaluateRegimeAwareRanking({ report: { ...report, synthetic: false }, rows: input.rows })).toThrow('synthetic');
  expect(evaluateRegimeAwareRanking({ report: { ...report, models: [] }, rows: input.rows })).toMatchObject({ status: 'unavailable', coupling_enabled: false });
});
