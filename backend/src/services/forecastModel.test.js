const { evaluateForecastModel, summarizeForecastModel } = require('./forecastModel');
const sample = (day, value, label) => ({ as_of: `2026-01-${day}`, target_version: 'breadth_forward_v1', provider: 'fixture', synthetic: true,
  calendar_version: 'v1', calendar_source: 'fixture', status: 'features_available',
  features: [{ stock_id: 'A', return_1: value, return_5: value * 2, return_20: 0 }],
  labels: [{ horizon_sessions: 1, target_session: `2026-01-${String(Number(day) + 1).padStart(2, '0')}`, label_available_at: `2026-01-${String(Number(day) + 1).padStart(2, '0')}T17:00:00+07:00`, status: 'available', label }] });
const samples = () => [sample('02', -0.02, 'declining'), sample('05', 0.02, 'advancing'), sample('12', 0.01, 'advancing')];
const run = data => evaluateForecastModel({ samples: data, horizon: 1, folds: [{ testStart: '2026-01-12', testEnd: '2026-01-14', fitCutoff: '2026-01-11T23:00:00+07:00' }] });
test('reproducible finite probabilities and independently checked scores', () => {
  const data = samples(), result = run(data), fold = result.folds[0];
  expect(run([...data].reverse())).toEqual(result);
  const p = fold.predictions[0].probabilities;
  expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  expect(p.every(v => v > 0 && v < 1)).toBe(true);
  expect(fold.metrics.brier_multiclass_sum).toBeCloseTo(p[0] ** 2 + p[1] ** 2 + (p[2] - 1) ** 2);
  expect(fold.metrics.log_loss).toBeCloseTo(-Math.log(p[2]));
  expect(result.market_accuracy_verified).toBe(false);
});
test('test outcomes and features cannot change fit or scaling', () => {
  const data = samples(), before = run(data).folds[0];
  data[2].labels[0].label = 'declining'; data[2].features[0].return_1 = 100;
  const after = run(data).folds[0];
  for (const key of ['weights', 'means', 'scales', 'training_hash']) expect(after[key]).toEqual(before[key]);
});
test('unavailable classes/features and live data fail closed', () => {
  const data = samples(); data[1].labels[0].label = 'declining';
  expect(run(data).folds[0].reason).toBe('insufficient_training_classes');
  data[1].features[0].return_1 = NaN;
  expect(run(data).folds[0].reason).toBe('invalid_features');
  data[0].synthetic = false; expect(() => run(data)).toThrow('synthetic');
});
test('late labels are excluded using the same baseline manifest', () => {
  const data = samples(); data[1].labels[0].label_available_at = '2026-01-12T17:00:00+07:00';
  const fold = run(data).folds[0];
  expect(fold.train_sessions).toEqual(['2026-01-02']);
  expect(fold.reason).toBe('insufficient_training_classes');
});

test('prototype summary keeps research-only metrics explicit and comparable', () => {
  const summary = summarizeForecastModel(run(samples()));
  expect(summary.version).toBe('forecast_softmax_prototype_v1');
  expect(summary.research_only).toBe(true);
  expect(summary.market_accuracy_verified).toBe(false);
  expect(summary.status).toBe('evaluated');
  expect(summary.available_folds).toBeGreaterThan(0);
  expect(summary.metric_summary.brier_multiclass_sum).toBeGreaterThanOrEqual(0);
  expect(summary.probability_summary.classes).toEqual(['declining', 'balanced', 'advancing']);
  expect(summary.probability_summary.total_predictions).toBeGreaterThan(0);
});
