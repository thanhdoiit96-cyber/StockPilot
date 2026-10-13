const { buildLiveForecastPreview } = require('./forecastLivePreview');

function rows(symbol, start, step) {
  return Array.from({ length: 21 }, (_, index) => ({ instrument: { symbol }, observed_at: new Date(Date.UTC(2026, 8, index + 1)).toISOString(), quote: { close: String(start + step * index) } }));
}
test('builds basket features per symbol instead of treating different symbols as one time series', () => {
  const preview = buildLiveForecastPreview({ currentData: { provider: 'vnstock', as_of: '2026-09-21T00:00:00Z', fetched_at: '2026-09-21T01:00:00Z', rows: [...rows('AAA', 100, 1), ...rows('BBB', 200, -1)] }, horizon: 5 });
  expect(preview).toMatchObject({ status: 'live_preview', synthetic: false, research_only: false, market_accuracy_verified: false, horizon_sessions: 5,
    model: { type: 'current-data-softmax-prototype', history_window: 21 } });
  expect(preview.probabilities).toHaveLength(3);
  expect(preview.probabilities.reduce((sum, item) => sum + item.value, 0)).toBeCloseTo(1, 5);
});
test('rejects a basket when no symbol has a complete 21-session history', () => {
  expect(() => buildLiveForecastPreview({ currentData: { provider: 'vnstock', rows: rows('AAA', 100, 1).slice(0, 20) } })).toThrow('insufficient_history');
});
