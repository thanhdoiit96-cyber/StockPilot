const { replayForecastDataset } = require('./forecastReplay');
const { forecastResearchFixture } = require('./forecastResearchFixture');
test('replays first eligible labels and evaluates both horizons without backdating', () => {
  const input = forecastResearchFixture(), report = replayForecastDataset(input);
  expect(report.synthetic).toBe(true);
  expect(report.samples).toHaveLength(18);
  expect(report.samples[0].labels[0].label_available_at).toBe(new Date(input.evaluationCutoffs[0]).toISOString());
  expect(report.baselines.map(b => b.status)).toEqual(['evaluated', 'evaluated']);
  expect(report.models.map(model => model.status)).toEqual(['evaluated', 'evaluated']);
  expect(report.models.every(model => model.folds[0].status === 'available' && model.folds[0].metrics.samples === 7)).toBe(true);
  for (const horizon of [1, 5]) {
    const labels = new Set(report.samples.map(sample => sample.labels.find(label => label.horizon_sessions === horizon).label));
    expect(labels).toEqual(new Set(['declining', 'balanced', 'advancing']));
  }
});
test('later arrivals cannot replace the first eligible label', () => {
  const input = forecastResearchFixture();
  const first = input.calendar.sessions[60];
  // Two late symbols retain 96% coverage at the first evaluation.
  input.rows.filter(r => Number(r.stock_id) < 2 && r.session === first).forEach(r => { r.available_at = input.evaluationCutoffs.at(-1); });
  const report = replayForecastDataset(input);
  expect(report.samples[0].labels[0].coverage).toBe(0.96);
  expect(report.samples[0].labels[0].label_available_at).toBe(new Date(input.evaluationCutoffs[0]).toISOString());
});
test('blocked calendar stays excluded without baseline scores', () => {
  const input = forecastResearchFixture(); input.calendar.verified = false;
  const report = replayForecastDataset(input);
  expect(report.excluded).toHaveLength(18);
  expect(report.baselines.every(b => b.status === 'unavailable')).toBe(true);
  expect(report.models.every(model => model.status === 'unavailable')).toBe(true);
});
test('rejects unordered evaluation cutoffs', () => {
  const input = forecastResearchFixture(); input.evaluationCutoffs.reverse();
  expect(() => replayForecastDataset(input)).toThrow('strictly ordered');
});
