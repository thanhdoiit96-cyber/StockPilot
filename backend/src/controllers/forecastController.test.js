const express = require('express');
const request = require('supertest');
const createForecastController = require('./forecastController');
const { forecastResearchFixture } = require('../services/forecastResearchFixture');
const { replayForecastDataset } = require('../services/forecastReplay');
const { createForecastPreviewArtifact, parseForecastPreviewArtifact } = require('../services/forecastPreviewArtifact');
const { artifactHash } = require('../services/forecastArtifact');
const { validateSnapshot, validateOutcome } = require('../services/forecastSnapshotStore');
let artifact;
beforeAll(() => { artifact = parseForecastPreviewArtifact(JSON.stringify(createForecastPreviewArtifact(replayForecastDataset(forecastResearchFixture()), { generatedAt: '2026-10-12T06:00:00Z' })), { now: new Date('2026-10-12T06:01:00Z') }); });
const snapshotPayload = validateSnapshot({ synthetic: true, research_only: true, live: false, market_accuracy_verified: false, provider: 'fixture', model_version: 'softmax-v1', horizon_sessions: 5,
  as_of: '2025-03-18', target_session: '2025-03-23', split_hash: 'a'.repeat(64), training_hash: 'b'.repeat(64), probabilities: [{ class: 'advancing', value: .6 }, { class: 'balanced', value: .3 }, { class: 'declining', value: .1 }] });
const snapshot = { id: '11111111-1111-4111-8111-111111111111', provider: 'fixture', model_version: 'softmax-v1', horizon_sessions: 5, as_of: '2025-03-18', target_session: '2025-03-23', payload: snapshotPayload, payload_sha256: artifactHash(snapshotPayload), integrity_valid: true };
const outcomePayload = validateOutcome(snapshot, { actual_class: 'balanced', target_session: '2025-03-23', outcome_available_at: '2025-03-23T19:00:00+07:00' });
snapshot.outcome = { payload: outcomePayload, payload_sha256: artifactHash(outcomePayload) };
const listHistory = async () => ({ items: [snapshot], has_more: false, next_cursor: null });
function app(env, loadArtifact = () => artifact, history = listHistory, cohorts = async () => [snapshot], currentDataFetcher) { const instance = express(); instance.use('/api/forecast', createForecastController({ env, loadArtifact, listHistory: history, listCohorts: cohorts, currentDataFetcher })); return instance; }
test('development exposes a no-store synthetic research preview for both horizons', async () => {
  for (const horizon of [1, 5]) {
    const response = await request(app({ NODE_ENV: 'development' })).get('/api/forecast/research-preview').query({ horizon });
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.data).toMatchObject({ status: 'research_preview', synthetic: true, research_only: true, live: false, market_accuracy_verified: false, horizon_sessions: horizon, artifact_freshness: 'fresh', artifact_generated_at: '2026-10-12T06:00:00.000Z' });
    expect(response.body.data.artifact_sha256).toMatch(/^[a-f0-9]{64}$/);
  }
}, 15000);
test('development exposes a current-data preview only when the live gate passes freshness checks', async () => {
  const currentDataFetcher = jest.fn(async () => ({
    status: 'current_data_ready',
    provider: 'vnstock',
    as_of: '2026-10-12T02:00:00.000Z',
    fetched_at: '2026-10-12T06:00:00.000Z',
    staleness_days: 0.5,
    maximum_staleness_days: 7,
    live: true,
    synthetic: false,
    research_only: false,
    market_accuracy_verified: false,
    rows: [{ instrument: { symbol: 'FPT' }, observed_at: '2026-10-12T02:00:00.000Z', quote: { close: '123.45', volume: '1000', currency: 'VND' } }]
  }));
  const response = await request(app({ NODE_ENV: 'development', FORECAST_LIVE_PREVIEW: 'true' }, () => artifact, listHistory, async () => [snapshot], currentDataFetcher)).get('/api/forecast/current-preview').query({ symbols: 'FPT,HPG', maximum_staleness_days: 7 });
  expect(response.status).toBe(200);
  expect(response.headers['cache-control']).toBe('no-store');
  expect(response.body.data).toMatchObject({ status: 'current_data_preview', mode: 'live', provider: 'vnstock', live: true, synthetic: false, research_only: false, market_accuracy_verified: false });
  expect(currentDataFetcher).toHaveBeenCalled();
});
test('development exposes a normalized live-preview response using current data and softmax model probabilities', async () => {
  const currentDataFetcher = jest.fn(async () => ({
    status: 'current_data_ready',
    provider: 'vnstock',
    as_of: '2026-10-12T02:00:00.000Z',
    fetched_at: '2026-10-12T06:00:00.000Z',
    staleness_days: 0.5,
    maximum_staleness_days: 7,
    live: true,
    synthetic: false,
    research_only: false,
    market_accuracy_verified: false,
    rows: Array.from({ length: 25 }, (_, index) => ({
      instrument: { symbol: 'FPT' },
      observed_at: new Date(Date.UTC(2026, 9, 12 - (24 - index))).toISOString(),
      quote: { close: String(100 + index), volume: '1000', currency: 'VND' }
    }))
  }));
  const response = await request(app({ NODE_ENV: 'development', FORECAST_LIVE_PREVIEW: 'true' }, () => artifact, listHistory, async () => [snapshot], currentDataFetcher)).get('/api/forecast/live-preview').query({ symbols: 'FPT', maximum_staleness_days: 7, horizon: 5 });
  expect(response.status).toBe(200);
  expect(response.body.data).toMatchObject({ status: 'live_preview', mode: 'live', synthetic: false, research_only: false, live: true, market_accuracy_verified: false, horizon_sessions: 5 });
  expect(Array.isArray(response.body.data.probabilities)).toBe(true);
  expect(response.body.data.probabilities.length).toBe(3);
  expect(response.body.data.model.summary.top_class).toBeTruthy();
});
test('development exposes a live evaluation summary only when current data is valid and fresh', async () => {
  const currentDataFetcher = jest.fn(async () => ({
    status: 'current_data_ready',
    provider: 'vnstock',
    as_of: '2026-10-12T02:00:00.000Z',
    fetched_at: '2026-10-12T06:00:00.000Z',
    staleness_days: 0.4,
    maximum_staleness_days: 7,
    live: true,
    synthetic: false,
    research_only: false,
    market_accuracy_verified: false,
    rows: Array.from({ length: 25 }, (_, index) => ({
      instrument: { symbol: 'FPT' },
      observed_at: new Date(Date.UTC(2026, 9, 12 - (24 - index))).toISOString(),
      quote: { close: String(100 + index), volume: '1000', currency: 'VND' }
    }))
  }));
  const response = await request(app({ NODE_ENV: 'development', FORECAST_LIVE_PREVIEW: 'true' }, () => artifact, listHistory, async () => [snapshot], currentDataFetcher)).get('/api/forecast/live-evaluation').query({ symbols: 'FPT', maximum_staleness_days: 7, horizon: 5 });
  expect(response.status).toBe(200);
  expect(response.body.data).toMatchObject({ status: 'live_evaluation_ready', mode: 'live', synthetic: false, research_only: false, live: true, market_accuracy_verified: false, decision: 'ready_for_shadow_evaluation' });
  expect(response.body.data.summary.by_class.length).toBe(3);
});
test('production and an explicit development disable return 404 without building a report', async () => {
  const buildReport = jest.fn();
  for (const env of [{ NODE_ENV: 'production' }, { NODE_ENV: 'development', FORECAST_RESEARCH_PREVIEW: 'false' }]) {
    expect((await request(app(env, buildReport)).get('/api/forecast/research-preview?horizon=5')).status).toBe(404);
  }
  expect(buildReport).not.toHaveBeenCalled();
});
test('live forecast routes require an explicit development-only backend opt-in', async () => {
  const currentDataFetcher = jest.fn();
  for (const env of [{ NODE_ENV: 'production', FORECAST_LIVE_PREVIEW: 'true' }, { NODE_ENV: 'development' }]) {
    expect((await request(app(env, () => artifact, listHistory, async () => [snapshot], currentDataFetcher)).get('/api/forecast/live-preview?horizon=5')).status).toBe(404);
  }
  expect(currentDataFetcher).not.toHaveBeenCalled();
});
test('invalid input is rejected and report generation failures are sanitized', async () => {
  expect((await request(app({ NODE_ENV: 'development' })).get('/api/forecast/research-preview?horizon=2')).status).toBe(400);
  const response = await request(app({ NODE_ENV: 'development' }, () => { throw new Error('secret path'); })).get('/api/forecast/research-preview?horizon=1');
  expect(response.status).toBe(503);
  expect(response.text).not.toContain('secret path');
});
test('an as-of outside the materialized artifact returns unavailable without recomputing', async () => {
  const response = await request(app({ NODE_ENV: 'development' })).get('/api/forecast/research-preview?horizon=5&as_of=2099-01-01');
  expect(response.status).toBe(200);
  expect(response.body.data).toMatchObject({ status: 'unavailable', reason: 'prediction_not_in_artifact', as_of: '2099-01-01' });
});
test('development exposes scored synthetic history without claiming calibration', async () => {
  const response = await request(app({ NODE_ENV: 'development' })).get('/api/forecast/research-history?horizon=5');
  expect(response.status).toBe(200);
  expect(response.headers['cache-control']).toBe('no-store');
  expect(response.body.data).toMatchObject({ status: 'research_history', source: 'snapshot_store', synthetic: true, live: false, calibrated: false,
    market_accuracy_verified: false, horizon_sessions: 5, summary: { predictions: 1, measured: 1, pending: 0 }, pagination: { has_more: false, next_cursor: null } });
  expect(response.body.data.entries).toHaveLength(1);
});
test('history validates pagination and sanitizes repository integrity failures', async () => {
  expect((await request(app({ NODE_ENV: 'development' })).get('/api/forecast/research-history?horizon=5&limit=51')).status).toBe(400);
  expect((await request(app({ NODE_ENV: 'development' })).get('/api/forecast/research-history?horizon=5&cursor=bad')).status).toBe(400);
  const response = await request(app({ NODE_ENV: 'development' }, () => artifact, async () => { throw new Error('database secret'); })).get('/api/forecast/research-history?horizon=5');
  expect(response.status).toBe(503); expect(response.text).not.toContain('database secret');
});
test('development exposes independently aggregated forecast cohorts', async () => {
  const response = await request(app({ NODE_ENV: 'development' })).get('/api/forecast/research-cohorts?horizon=5&model_version=softmax-v1&date_from=2025-03-01&date_to=2025-03-31&minimum_samples=20');
  expect(response.status).toBe(200);
  expect(response.headers['cache-control']).toBe('no-store');
  expect(response.body.data).toMatchObject({ version: 'forecast_cohort_summary_v1', total_rows: 1, minimum_samples: 20,
    cohorts: [{ dimensions: { model_version: 'softmax-v1', horizon_sessions: 5 }, coverage: { v1: { predictions: 1 }, v2: { predictions: 0 } }, baseline_comparison: { status: 'insufficient_samples' } }] });
});
test('cohort endpoint rejects invalid filters and sanitizes repository failures', async () => {
  expect((await request(app({ NODE_ENV: 'development' })).get('/api/forecast/research-cohorts?horizon=2')).status).toBe(400);
  expect((await request(app({ NODE_ENV: 'development' })).get('/api/forecast/research-cohorts?date_from=2025-02-31')).status).toBe(400);
  expect((await request(app({ NODE_ENV: 'development' })).get('/api/forecast/research-cohorts?date_from=2025-04-01&date_to=2025-03-01')).status).toBe(400);
  const response = await request(app({ NODE_ENV: 'development' }, () => artifact, listHistory, async () => { throw new Error('database secret'); })).get('/api/forecast/research-cohorts');
  expect(response.status).toBe(503);
  expect(response.text).not.toContain('database secret');
});
