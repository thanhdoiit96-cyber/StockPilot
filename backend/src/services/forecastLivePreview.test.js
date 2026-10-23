const { buildLiveForecastPreview } = require('./forecastLivePreview');

function rows(symbol, start, step) {
  return Array.from({ length: 21 }, (_, index) => ({ instrument: { symbol }, observed_at: new Date(Date.UTC(2026, 8, index + 1)).toISOString(), quote: { close: String(start + step * index) } }));
}
test('builds basket features per symbol instead of treating different symbols as one time series', () => {
  const preview = buildLiveForecastPreview({ currentData: { provider: 'vnstock', as_of: '2026-09-21T00:00:00Z', fetched_at: '2026-09-21T01:00:00Z', rows: [...rows('AAA', 100, 1), ...rows('BBB', 200, -1)] }, horizon: 5 });
  expect(preview).toMatchObject({ status: 'live_preview', synthetic: false, research_only: false, market_accuracy_verified: false, horizon_sessions: 5,
    model: { type: 'current-data-softmax-prototype', history_window: 21 }, breadth_target: { version: 'breadth_forward_v1', point_estimate_available: false },
    validation: { status: 'monitoring', calibration_validated: false, independent_audit_validated: false, provider_validation_completed: false, market_accuracy_verified: false } });
  expect(preview.probabilities).toHaveLength(3);
  expect(Math.abs(preview.probabilities.reduce((sum, item) => sum + item.value, 0) - 1)).toBeLessThan(1e-12);
});
test('rejects a basket when no symbol has a complete 21-session history', () => {
  expect(() => buildLiveForecastPreview({ currentData: { provider: 'vnstock', rows: rows('AAA', 100, 1).slice(0, 20) } })).toThrow('insufficient_history');
});

test('discloses only symbols whose history actually enters the model', () => {
  const preview = buildLiveForecastPreview({ currentData: { provider: 'vnstock', requested_symbols: ['AAA', 'BBB', 'CCC'], rows: [...rows('AAA', 100, 1), ...rows('BBB', 200, -1).slice(0, 20)] } });
  expect(preview.current_data.input_scope).toMatchObject({ requested_symbols: ['AAA', 'BBB', 'CCC'], used_symbols: ['AAA'], missing_symbols: ['BBB', 'CCC'], minimum_close_observations: 21, minimum_distinct_dates: 21, contract_version: 'vn_observation_dates_v2' });
});

test('duplicate dates cannot satisfy the history requirement', () => {
  const data = rows('AAA', 100, 1).slice(0, 20);
  expect(() => buildLiveForecastPreview({ currentData: { rows: [...data, data[0]] } })).toThrow('insufficient_history');
});

test('identical duplicates and equivalent Vietnam dates preserve clean probabilities', () => {
  const data = rows('AAA', 100, 1);
  const clean = buildLiveForecastPreview({ currentData: { rows: data } });
  const duplicate = { ...data[0], observed_at: '2026-08-31T18:00:00Z' };
  const result = buildLiveForecastPreview({ currentData: { rows: [...data, duplicate, ...data].reverse() } });
  expect(result.probabilities).toEqual(clean.probabilities);
});

test.each([
  ['conflicting_session_prices', { observed_at: '2026-09-01T01:00:00Z', quote: { close: '999' } }],
  ['invalid_observation_time', { observed_at: 'invalid', quote: { close: '100' } }]
])('excludes and discloses a symbol with %s', (reason, badRow) => {
  const good = rows('AAA', 100, 1);
  const result = buildLiveForecastPreview({ currentData: { requested_symbols: ['AAA', 'BBB'], rows: [...good, ...rows('BBB', 200, 1), { instrument: { symbol: 'BBB' }, ...badRow }] } });
  expect(result.probabilities).toEqual(buildLiveForecastPreview({ currentData: { rows: good } }).probabilities);
  expect(result.current_data.input_scope).toMatchObject({ used_symbols: ['AAA'], missing_symbols: ['BBB'], exclusions: [{ symbol: 'BBB', reason }] });
});
