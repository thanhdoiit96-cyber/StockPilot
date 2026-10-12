const { forecastResearchFixture } = require('./forecastResearchFixture');
const { replayForecastDataset } = require('./forecastReplay');
const { createForecastPreviewArtifact, parseForecastPreviewArtifact } = require('./forecastPreviewArtifact');
const { materializeForecastArtifact, evaluateForecastArtifactOutcomes } = require('./forecastArtifactMaterializer');

function memoryModels() {
  const snapshots = [], outcomes = [];
  const ForecastSnapshot = {
    findOne: async ({ where }) => snapshots.find(row => row.generation_key === where.generation_key) || null,
    findByPk: async id => snapshots.find(row => row.id === id) || null,
    create: async values => { const row = { id: `00000000-0000-4000-8000-${String(snapshots.length + 1).padStart(12, '0')}`, ...values }; snapshots.push(row); return row; }
  };
  const ForecastOutcomeEvent = {
    findOne: async ({ where }) => outcomes.find(row => row.snapshot_id === where.snapshot_id) || null,
    create: async values => { const row = { id: `10000000-0000-4000-8000-${String(outcomes.length + 1).padStart(12, '0')}`, ...values }; outcomes.push(row); return row; }
  };
  return { ForecastSnapshot, ForecastOutcomeEvent, sequelize: { transaction: fn => fn({ id: 'tx' }) }, snapshots, outcomes };
}
let artifact;
beforeAll(() => { artifact = parseForecastPreviewArtifact(JSON.stringify(createForecastPreviewArtifact(replayForecastDataset(forecastResearchFixture()), { generatedAt: '2026-10-12T06:00:00Z' })), { now: new Date('2026-10-12T06:01:00Z') }); });
test('materializes validated predictions and outcomes idempotently', async () => {
  const models = memoryModels(), env = { NODE_ENV: 'development' }, now = new Date('2026-10-12T12:00:00Z');
  expect(await materializeForecastArtifact({ artifact, models, env, now })).toMatchObject({ status: 'materialized', predictions: 14, created: 14, existing: 0 });
  expect(models.snapshots.every(row => row.schema_version === 'forecast_snapshot_payload_v2' && row.payload.baseline_snapshot)).toBe(true);
  expect(await materializeForecastArtifact({ artifact, models, env, now })).toMatchObject({ predictions: 14, created: 0, existing: 14 });
  expect(await evaluateForecastArtifactOutcomes({ artifact, models, env, now })).toMatchObject({ outcomes: 14, measured: 14, existing: 0, pending: 0, missing_snapshot: 0 });
  expect(await evaluateForecastArtifactOutcomes({ artifact, models, env, now })).toMatchObject({ outcomes: 14, measured: 0, existing: 14 });
  expect(models.snapshots).toHaveLength(14); expect(models.outcomes).toHaveLength(14);
});
test('keeps future outcomes pending and reports missing snapshots without creating them', async () => {
  const models = memoryModels(), env = { NODE_ENV: 'development' };
  const early = await evaluateForecastArtifactOutcomes({ artifact, models, env, now: new Date('2025-01-01T00:00:00Z') });
  expect(early).toMatchObject({ measured: 0, existing: 0, pending: 14, missing_snapshot: 0 });
  const missing = await evaluateForecastArtifactOutcomes({ artifact, models, env, now: new Date('2026-10-12T00:00:00Z') });
  expect(missing).toMatchObject({ measured: 0, existing: 0, pending: 0, missing_snapshot: 14 });
});
test('fails closed outside development before touching storage', async () => {
  const models = memoryModels();
  await expect(materializeForecastArtifact({ artifact, models, env: { NODE_ENV: 'production' } })).rejects.toThrow('development-only');
  await expect(evaluateForecastArtifactOutcomes({ artifact, models, env: { NODE_ENV: 'development', FORECAST_RESEARCH_PREVIEW: 'false' } })).rejects.toThrow('development-only');
  expect(models.snapshots).toHaveLength(0);
});
