'use strict';
const express = require('express');
const request = require('supertest');
const models = require('../models');
const router = require('./marketDataController');
const app = express(); app.use('/api/market-data', router);

afterEach(() => jest.restoreAllMocks());

test('foreign-flow endpoint returns explicit unavailable contract for an empty store', async () => {
  jest.spyOn(models.ForeignFlowDaily, 'max').mockResolvedValue(null);
  jest.spyOn(models.Stock, 'findAll').mockResolvedValue([{ id: '1', code: 'FPT', name: 'FPT', industry: 'Công nghệ' }]);
  const response = await request(app).get('/api/market-data/foreign-flow');
  expect(response.status).toBe(200);
  expect(response.body.data).toMatchObject({ status: 'unavailable', totals: null, coverage: { observed: 0, universe_size: 1, ratio: 0 }, policy: { missing_is_neutral: false, scored: false } });
});

test('foreign-flow endpoint validates date and symbol without querying storage', async () => {
  expect((await request(app).get('/api/market-data/foreign-flow?date=13-10-2026')).status).toBe(400);
  expect((await request(app).get('/api/market-data/foreign-flow?symbol=FPT%20DROP')).status).toBe(400);
});
