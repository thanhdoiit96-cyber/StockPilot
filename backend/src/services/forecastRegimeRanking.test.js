const { forecastResearchFixture } = require('./forecastResearchFixture');
const { replayForecastDataset } = require('./forecastReplay');
const { evaluateRegimeAwareRanking } = require('./forecastRegimeRanking');
let input, report;
beforeAll(() => { input = forecastResearchFixture(); report = replayForecastDataset(input); });
test('compares regime-aware and rule rankings on identical synthetic sessions without enabling a small sample', () => {
  const result = evaluateRegimeAwareRanking({ report, rows: input.rows, horizon: 5, topK: 5 });
  expect(result).toMatchObject({ status: 'evaluated', synthetic: true, research_only: true, market_accuracy_verified: false, comparable_sessions: 7, coupling_enabled: false, decision: 'insufficient_evidence' });
  expect(result.baseline.stocks).toBe(result.regime.stocks);
  expect(result.baseline.stocks).toBe(35);
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
