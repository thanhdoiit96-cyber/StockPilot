const express = require('express');
const request = require('supertest');
const createForecastController = require('./forecastController');
function app(env, reader) { const app = express(); app.use(createForecastController({ env, officialPreviewReader: reader })); return app; }
test('development-only gate, horizon validation and no fallback', async () => {
  const reader = jest.fn(async () => ({ status: 'unavailable', reason: 'membership_snapshot_unavailable' }));
  for (const env of [{ NODE_ENV: 'production', FORECAST_LIVE_PREVIEW: 'true' }, { NODE_ENV: 'development' }]) expect((await request(app(env, reader)).get('/official-vn30-preview?horizon=5')).status).toBe(404);
  expect(reader).not.toHaveBeenCalled();
  const instance = app({ NODE_ENV: 'development', FORECAST_LIVE_PREVIEW: 'true' }, reader);
  expect((await request(instance).get('/official-vn30-preview?horizon=2')).status).toBe(400);
  const response = await request(instance).get('/official-vn30-preview?horizon=5');
  expect(response.body.data.reason).toBe('membership_snapshot_unavailable');
  expect(response.headers['cache-control']).toBe('no-store');
  expect(reader).toHaveBeenCalledWith({ horizon: 5 });
});
test('read failure fails closed', async () => {
  const response = await request(app({ NODE_ENV: 'development', FORECAST_LIVE_PREVIEW: 'true' }, async () => { throw new Error('private DB detail'); })).get('/official-vn30-preview?horizon=1');
  expect(response.status).toBe(503);
  expect(JSON.stringify(response.body)).not.toContain('private');
});
