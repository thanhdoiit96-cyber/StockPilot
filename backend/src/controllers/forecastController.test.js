const express = require('express');
const request = require('supertest');
const createForecastController = require('./forecastController');
const { forecastResearchFixture } = require('../services/forecastResearchFixture');
const { replayForecastDataset } = require('../services/forecastReplay');
const { createForecastPreviewArtifact, parseForecastPreviewArtifact } = require('../services/forecastPreviewArtifact');
let artifact;
beforeAll(() => { artifact = parseForecastPreviewArtifact(JSON.stringify(createForecastPreviewArtifact(replayForecastDataset(forecastResearchFixture()), { generatedAt: '2026-10-12T06:00:00Z' })), { now: new Date('2026-10-12T06:01:00Z') }); });
function app(env, loadArtifact = () => artifact) { const instance = express(); instance.use('/api/forecast', createForecastController({ env, loadArtifact })); return instance; }
test('development exposes a no-store synthetic research preview for both horizons', async () => {
  for (const horizon of [1, 5]) {
    const response = await request(app({ NODE_ENV: 'development' })).get('/api/forecast/research-preview').query({ horizon });
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.data).toMatchObject({ status: 'research_preview', synthetic: true, research_only: true, live: false, market_accuracy_verified: false, horizon_sessions: horizon, artifact_freshness: 'fresh', artifact_generated_at: '2026-10-12T06:00:00.000Z' });
    expect(response.body.data.artifact_sha256).toMatch(/^[a-f0-9]{64}$/);
  }
}, 15000);
test('production and an explicit development disable return 404 without building a report', async () => {
  const buildReport = jest.fn();
  for (const env of [{ NODE_ENV: 'production' }, { NODE_ENV: 'development', FORECAST_RESEARCH_PREVIEW: 'false' }]) {
    expect((await request(app(env, buildReport)).get('/api/forecast/research-preview?horizon=5')).status).toBe(404);
  }
  expect(buildReport).not.toHaveBeenCalled();
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
