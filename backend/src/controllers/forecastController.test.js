const express = require('express');
const request = require('supertest');
const createForecastController = require('./forecastController');
function app(env, buildReport) { const instance = express(); instance.use('/api/forecast', createForecastController({ env, buildReport })); return instance; }
test('development exposes a no-store synthetic research preview for both horizons', async () => {
  for (const horizon of [1, 5]) {
    const response = await request(app({ NODE_ENV: 'development' })).get('/api/forecast/research-preview').query({ horizon });
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.data).toMatchObject({ status: 'research_preview', synthetic: true, research_only: true, live: false, market_accuracy_verified: false, horizon_sessions: horizon });
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
