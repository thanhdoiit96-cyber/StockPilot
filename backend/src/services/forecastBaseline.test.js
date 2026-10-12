const { evaluateForecastBaseline } = require('./forecastBaseline');
const sample = (day, target, label = 'advancing') => ({ as_of: `2026-01-${day}`, target_version: 'breadth_forward_v1', provider: 'fixture', synthetic: true, calendar_version: 'test-v1', calendar_source: 'fixture', status: 'features_available', labels: [{ horizon_sessions: 5, target_session: `2026-01-${target}`, label_available_at: `2026-01-${target}T17:00:00+07:00`, status: 'available', label }] });
const folds = [{ testStart: '2026-01-12', testEnd: '2026-01-14', fitCutoff: '2026-01-11T23:00:00+07:00' }];
test('purges outcomes overlapping the test boundary and learns only train labels', () => {
  const samples = [sample('02','09'), sample('05','12','declining'), sample('12','19','balanced')];
  const result = evaluateForecastBaseline({ samples, folds });
  expect(result.folds[0]).toMatchObject({ train_sessions: ['2026-01-02'], purged_sessions: ['2026-01-05'], probabilities: [0.25, 0.25, 0.5] });
  expect(result.folds[0].metrics.brier_multiclass_sum).toBe(0.875);
  expect(result.folds[0].metrics.log_loss).toBeCloseTo(-Math.log(0.25));
  samples[2].labels[0].label = 'declining';
  expect(evaluateForecastBaseline({ samples, folds }).folds[0].probabilities).toEqual(result.folds[0].probabilities);
});
test('rejects mixed synthetic/live contexts and overlapping folds', () => {
  expect(() => evaluateForecastBaseline({ samples: [sample('02','09'), { ...sample('12','19'), synthetic: false }], folds })).toThrow('Mixed');
  expect(() => evaluateForecastBaseline({ samples: [], folds: [...folds, ...folds] })).toThrow('overlapping');
});
test('does not turn missing outcomes or empty train into scores', () => {
  const missing = sample('02','09'); missing.labels[0].status = 'unavailable';
  const result = evaluateForecastBaseline({ samples: [missing, sample('12','19')], folds });
  expect(result.excluded).toHaveLength(1);
  expect(result.folds[0]).toMatchObject({ status: 'unavailable', reason: 'empty_train' });
  expect(result.folds[0].metrics).toBeUndefined();
});
test('fold manifests and metrics are reproducible independent of input ordering', () => {
  const samples = [sample('02','09'), sample('12','19')];
  expect(evaluateForecastBaseline({ samples, folds })).toEqual(evaluateForecastBaseline({ samples: [...samples].reverse(), folds }));
});

test('excludes late labels even when the target session precedes the test', () => {
  const late = sample('03', '10', 'declining');
  late.labels[0].label_available_at = '2026-01-12T01:00:00+07:00';
  const result = evaluateForecastBaseline({ samples: [sample('02','09'), late, sample('12','19')], folds });
  expect(result.folds[0]).toMatchObject({ probabilities: [0.25, 0.25, 0.5], late_label_sessions: ['2026-01-03'] });
});

test('missing availability cannot silently enter training', () => {
  const missing = sample('02','09'); delete missing.labels[0].label_available_at;
  const result = evaluateForecastBaseline({ samples: [missing, sample('12','19')], folds });
  expect(result.excluded[0].reason).toBe('label_availability_invalid');
  expect(result.folds[0].reason).toBe('empty_train');
});

test('fit cutoffs require a timezone and precede the Vietnam test session', () => {
  for (const fitCutoff of ['2026-01-11T23:00:00', '2026-01-11T17:00:00Z']) {
    expect(() => evaluateForecastBaseline({ folds: [{ ...folds[0], fitCutoff }] })).toThrow('Fit cutoff');
  }
});

test('persistence uses the latest eligible target and identical test sessions', () => {
  const late = sample('04', '11', 'balanced');
  late.labels[0].label_available_at = '2026-01-12T17:00:00+07:00';
  const result = evaluateForecastBaseline({ samples: [sample('02','09'), sample('03','10','declining'), late, sample('12','19','declining')], folds }).folds[0];
  expect(result.persistence).toMatchObject({ source_session: '2026-01-03', probabilities: [0.8, 0.1, 0.1], mode: 'frozen_at_fit' });
  expect(result.persistence.metrics.samples).toBe(result.metrics.samples);
  expect(result.persistence.metrics.brier_multiclass_sum).toBeCloseTo(0.06);
  expect(result.persistence.metrics.log_loss).toBeCloseTo(-Math.log(0.8));
  expect(result.comparison.brier_delta).toBeCloseTo(result.metrics.brier_multiclass_sum - 0.06);
});

test('test outcomes never update frozen persistence probabilities', () => {
  const samples = [sample('02','09'), sample('12','19','declining'), sample('13','20','balanced')];
  const before = evaluateForecastBaseline({ samples, folds }).folds[0];
  samples[1].labels[0].label = 'advancing';
  const after = evaluateForecastBaseline({ samples, folds }).folds[0];
  expect(after.persistence.probabilities).toEqual(before.persistence.probabilities);
  expect(after.persistence.source_session).toBe(before.persistence.source_session);
  expect(after.persistence.metrics.log_loss).not.toBe(before.persistence.metrics.log_loss);
});
