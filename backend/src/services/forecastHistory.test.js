const { forecastResearchFixture } = require('./forecastResearchFixture');
const { replayForecastDataset } = require('./forecastReplay');
const { buildForecastHistory } = require('./forecastHistory');
let report;
beforeAll(() => { report = replayForecastDataset(forecastResearchFixture()); });
test.each([1, 5])('builds immutable scored research history for horizon %i', horizon => {
  const history = buildForecastHistory({ report, horizon });
  expect(history).toMatchObject({ status: 'research_history', synthetic: true, research_only: true, live: false, market_accuracy_verified: false, calibrated: false,
    horizon_sessions: horizon, summary: { predictions: 7, measured: 7, pending: 0 } });
  expect(history.entries).toHaveLength(7);
  expect(history.entries.every(entry => entry.outcome_status === 'measured' && entry.training_hash && entry.split_hash && entry.outcome_available_at)).toBe(true);
  expect(history.summary.brier_multiclass_sum).toBeCloseTo(report.models.find(model => model.horizon_sessions === horizon).folds[0].metrics.brier_multiclass_sum, 12);
  expect(history.summary.baseline_comparison.frequency).toMatchObject({ samples: 7 });
  expect(Number.isFinite(history.summary.baseline_comparison.frequency.brier_delta)).toBe(true);
  expect(history.reliability.bins.reduce((sum, bin) => sum + bin.samples, 0)).toBe(7);
  expect(history.reliability.bins.filter(bin => bin.samples < 5).every(bin => bin.status === 'insufficient_samples')).toBe(true);
});
test('outcomes alter scores but cannot alter stored prediction identity', () => {
  const before = buildForecastHistory({ report, horizon: 5 });
  const changed = structuredClone(report);
  const sample = changed.samples.find(item => item.as_of === before.entries.at(-1).as_of);
  sample.labels.find(label => label.horizon_sessions === 5).label = sample.labels.find(label => label.horizon_sessions === 5).label === 'advancing' ? 'declining' : 'advancing';
  const after = buildForecastHistory({ report: changed, horizon: 5 });
  expect(after.entries.map(({ actual_class, correct, brier_multiclass_sum, log_loss, ...entry }) => entry))
    .toEqual(before.entries.map(({ actual_class, correct, brier_multiclass_sum, log_loss, ...entry }) => entry));
  expect(after.entries.at(-1).brier_multiclass_sum).not.toBe(before.entries.at(-1).brier_multiclass_sum);
});
test('fails closed outside explicit synthetic research context', () => {
  expect(buildForecastHistory({ report: { ...report, synthetic: false }, horizon: 5 })).toMatchObject({ status: 'unavailable' });
  expect(buildForecastHistory({ report, horizon: 2 })).toMatchObject({ status: 'unavailable', reason: 'invalid_request' });
});
