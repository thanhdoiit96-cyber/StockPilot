const { forecastResearchFixture } = require('./forecastResearchFixture');
const { replayForecastDataset } = require('./forecastReplay');
const { buildRollingForecastEntries, materializeRollingForecast } = require('./forecastRolling');
const { validateSnapshot } = require('./forecastSnapshotStore');

function report() {
  const fixture = forecastResearchFixture(), asOf = fixture.calendar.sessions[76], cutoff = `${asOf}T18:00:00+07:00`;
  return { asOf, cutoff, value: replayForecastDataset({ ...fixture, evaluationCutoffs: fixture.evaluationCutoffs.filter(value => Date.parse(value) <= Date.parse(cutoff)), folds: [] }) };
}
test('builds pending v2 rolling predictions only from labels available by issuance cutoff', () => {
  const { asOf, cutoff, value } = report(), entries = buildRollingForecastEntries({ report: value, asOf, cutoff });
  expect(entries.map(entry => entry.horizon_sessions)).toEqual([1, 5]);
  expect(entries.every(entry => entry.issuance.status === 'pending' && entry.baseline_snapshot.fit_cutoff === new Date(cutoff).toISOString())).toBe(true);
  expect(entries.map(entry => validateSnapshot(entry).version)).toEqual(['forecast_snapshot_payload_v2', 'forecast_snapshot_payload_v2']);
  expect(entries.every(entry => entry.issuance.training_samples >= 10)).toBe(true);
  expect(entries.every(entry => entry.target_session > asOf)).toBe(true);
});
test('rejects issuance when the fixture calendar cannot identify every target session', () => {
  const fixture = forecastResearchFixture(), asOf = fixture.calendar.sessions[77], cutoff = `${asOf}T18:00:00+07:00`;
  const value = replayForecastDataset({ ...fixture, origins: [...fixture.origins, { asOf, cutoff }], evaluationCutoffs: fixture.evaluationCutoffs.filter(item => Date.parse(item) <= Date.parse(cutoff)), folds: [] });
  expect(() => buildRollingForecastEntries({ report: value, asOf, cutoff })).toThrow('target session unavailable');
});
test('rolling inference is deterministic and rejects a pre-close cutoff', () => {
  const { asOf, cutoff, value } = report();
  expect(buildRollingForecastEntries({ report: value, asOf, cutoff })).toEqual(buildRollingForecastEntries({ report: value, asOf, cutoff }));
  expect(() => buildRollingForecastEntries({ report: value, asOf, cutoff: `${asOf}T10:00:00+07:00` })).toThrow('context');
});
test('materializes rolling predictions idempotently only in development', async () => {
  const { asOf, cutoff, value } = report(); let created = 0;
  const models = { ForecastSnapshot: { findOne: async () => null, create: async values => ({ id: `00000000-0000-4000-8000-${String(++created).padStart(12, '0')}`, ...values }) }, sequelize: { transaction: fn => fn({}) } };
  const result = await materializeRollingForecast({ report: value, asOf, cutoff, models, env: { NODE_ENV: 'development' }, now: new Date('2026-10-12T00:00:00Z') });
  expect(result).toMatchObject({ status: 'rolling_materialized', predictions: 2, created: 2, existing: 0, as_of: asOf });
  await expect(materializeRollingForecast({ report: value, asOf, cutoff, models, env: { NODE_ENV: 'production' } })).rejects.toThrow('development-only');
});
