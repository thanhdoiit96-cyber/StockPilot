const { forecastResearchFixture } = require('./forecastResearchFixture');
const { replayForecastDataset } = require('./forecastReplay');
const { buildForecastHistory } = require('./forecastHistory');
const { assertForecastModeGate } = require('./forecastModeGate');
let report;
beforeAll(() => { report = replayForecastDataset(forecastResearchFixture()); });
test.each([1, 5])('builds immutable scored research history for horizon %i', horizon => {
  const history = buildForecastHistory({ report, horizon });
  expect(history).toMatchObject({ status: 'research_history', synthetic: true, research_only: true, live: false, market_accuracy_verified: false, calibrated: false,
    horizon_sessions: horizon, summary: { predictions: 7, measured: 7, pending: 0 } });
  expect(history.entries).toHaveLength(7);
  expect(history.entries.every(entry => entry.outcome_status === 'measured' && entry.provider === 'fixture' && entry.training_hash && entry.split_hash && entry.outcome_available_at)).toBe(true);
  expect(history.entries.every(entry => entry.baseline_snapshot?.frequency_probabilities.length === 3 && entry.baseline_snapshot?.persistence_probabilities.length === 3)).toBe(true);
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
  expect(after.entries.map(({ actual_class: _actualClass, correct: _correct, brier_multiclass_sum: _brierMulticlassSum, log_loss: _logLoss, ...entry }) => entry))
    .toEqual(before.entries.map(({ actual_class: _actualClass, correct: _correct, brier_multiclass_sum: _brierMulticlassSum, log_loss: _logLoss, ...entry }) => entry));
  expect(after.entries.at(-1).brier_multiclass_sum).not.toBe(before.entries.at(-1).brier_multiclass_sum);
});
test('fails closed outside explicit synthetic research context', () => {
  expect(buildForecastHistory({ report: { ...report, synthetic: false }, horizon: 5 })).toMatchObject({ status: 'unavailable' });
  expect(buildForecastHistory({ report, horizon: 2 })).toMatchObject({ status: 'unavailable', reason: 'invalid_request' });
});
test('keeps research mode explicitly non-live while allowing a pending license for research-safe analysis', () => {
  const gate = require('./forecastModeGate').normalizeForecastModeGate({
    mode: 'research',
    provider: 'vnstock',
    license: '',
    synthetic: false,
    research_only: true,
    live: false,
    evidence_integrity: true,
    coverage: 0.92,
    sample_count: 28,
    minimum_samples: 20
  });

  expect(gate).toMatchObject({
    mode: 'research',
    semantic_mode: 'research',
    status: 'research_only',
    live: false,
    market_accuracy_verified: false,
    research_only: true,
    license_status: 'pending',
    provider_status: 'verified'
  });
  expect(() => assertForecastModeGate({ mode: 'research', provider: 'vnstock', synthetic: false, research_only: true, live: false, evidence_integrity: true, coverage: 0.92, sample_count: 28 })).not.toThrow();
});
test('allows local live preview with pending license while preserving non-live semantics', () => {
  const gate = require('./forecastModeGate').normalizeForecastModeGate({
    mode: 'live',
    provider: 'vnstock',
    license: '',
    local_only: true,
    synthetic: false,
    research_only: false,
    live: true,
    evidence_integrity: true,
    coverage: 0.92,
    sample_count: 28,
    minimum_samples: 20
  });

  expect(gate).toMatchObject({
    mode: 'live',
    semantic_mode: 'local_live_preview',
    status: 'local_live_preview',
    live: true,
    research_only: false,
    market_accuracy_verified: false,
    license_status: 'pending_local_preview'
  });
  expect(() => assertForecastModeGate({ mode: 'live', provider: 'vnstock', local_only: true, license: '', synthetic: false, research_only: false, live: true, evidence_integrity: true, coverage: 0.92, sample_count: 28, minimum_samples: 20 })).not.toThrow();
  const localPreview = buildForecastHistory({ report: { ...report, synthetic: false, research_only: false, live: true, local_only: true, provider: 'vnstock', mode: 'live', license: '', evidence_integrity: true, coverage: 0.92, sample_count: 28, minimum_samples: 20 }, horizon: 5 });
  expect(localPreview).toMatchObject({ status: 'local_live_preview_history', live: true, research_only: false, market_accuracy_verified: false });
});
test('rejects stale historical data for current-data live preview', () => {
  expect(() => assertForecastModeGate({
    mode: 'live',
    provider: 'vnstock',
    local_only: true,
    as_of: '2025-03-18',
    now: '2026-10-12T12:00:00.000Z',
    license: '',
    synthetic: false,
    research_only: false,
    live: true,
    evidence_integrity: true,
    coverage: 0.92,
    sample_count: 28,
    minimum_samples: 20,
    maximum_staleness_days: 7
  })).toThrow('live_forecast_gate_not_passed');
});
test('blocks live mode until required gates are satisfied', () => {
  expect(() => assertForecastModeGate({ mode: 'live', provider: 'vnstock', license: 'personal_research_only', synthetic: false, research_only: false, live: true, evidence_integrity: false, coverage: 0.2, sample_count: 5 })).toThrow('live_forecast_gate_not_passed');
  expect(buildForecastHistory({ report: { ...report, synthetic: false, research_only: false, live: true, provider: 'vnstock', mode: 'live', license: 'personal_research_only', evidence_integrity: false, coverage: 0.2, sample_count: 5 }, horizon: 5 })).toMatchObject({ status: 'unavailable', reason: 'live_forecast_gate_not_passed' });
});
