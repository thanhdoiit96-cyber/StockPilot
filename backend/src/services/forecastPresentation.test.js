const { forecastResearchFixture } = require('./forecastResearchFixture');
const { replayForecastDataset } = require('./forecastReplay');
const { buildForecastPresentation } = require('./forecastPresentation');
let report;
beforeAll(() => { report = replayForecastDataset(forecastResearchFixture()); });
test.each([1, 5])('maps an evaluated synthetic %i-session prediction without promoting it to live', horizon => {
  const model = report.models.find(item => item.horizon_sessions === horizon);
  const asOf = model.folds[0].predictions[0].session;
  const view = buildForecastPresentation({ report, horizon, asOf });
  expect(view).toMatchObject({ status: 'research_preview', synthetic: true, research_only: true, live: false, market_accuracy_verified: false, calibrated: false, horizon_sessions: horizon, as_of: asOf });
  expect(view.probabilities.map(item => item.class)).toEqual(['advancing', 'balanced', 'declining']);
  expect(view.probabilities.reduce((sum, item) => sum + item.value, 0)).toBeCloseTo(1);
});
test('fails closed for missing sessions, live-shaped reports and unavailable models', () => {
  expect(buildForecastPresentation({ report, horizon: 1, asOf: '2099-01-01' }).reason).toBe('prediction_not_in_replay');
  expect(buildForecastPresentation({ report: { ...report, synthetic: false }, horizon: 1, asOf: '2025-01-01' }).reason).toBe('verified_live_forecast_not_available');
  expect(buildForecastPresentation({ report: { ...report, models: [] }, horizon: 5, asOf: '2025-01-01' }).reason).toBe('model_unavailable');
});
