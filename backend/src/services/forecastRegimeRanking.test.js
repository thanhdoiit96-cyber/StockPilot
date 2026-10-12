const { forecastRegimeRankingFixture } = require('./forecastRegimeRankingFixture');
const { replayForecastDataset } = require('./forecastReplay');
const { evaluateRegimeAwareRanking } = require('./forecastRegimeRanking');
let input, report;
beforeAll(() => { input = forecastRegimeRankingFixture(); report = replayForecastDataset(input); });
test('compares regime-aware and rule rankings on 25 pre-registered synthetic sessions with diagnostics', () => {
  const result = evaluateRegimeAwareRanking({ report, rows: input.rows, horizon: 5, topK: 5 });
  expect(result).toMatchObject({ status: 'evaluated', synthetic: true, research_only: true, market_accuracy_verified: false, comparable_sessions: 25, coupling_enabled: false, evidence_gate_passed: false, decision: 'no_incremental_value' });
  expect(result.confidence_intervals).toMatchObject({ method: 'paired_session_bootstrap', iterations: 1000, seed: 20261012, confidence: .95 });
  expect(result.selection_diagnostics.baseline.average_turnover).toBeGreaterThanOrEqual(0);
  expect(result.selection_diagnostics.regime.concentration_hhi).toBeGreaterThan(0);
  expect(result.baseline.stocks).toBe(result.regime.stocks);
  expect(result.baseline.stocks).toBe(125);
  expect(result.sessions.every(item => item.baseline_returns.length === 5 && item.regime_returns.length === 5)).toBe(true);
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
