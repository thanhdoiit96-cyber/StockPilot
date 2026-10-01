jest.mock('../models', () => ({ Stock: { findAll: jest.fn(), findByPk: jest.fn() }, StockPrice: { findOne: jest.fn() } }));
const express = require('express');
const request = require('supertest');
const { Op } = require('sequelize');
const { Stock, StockPrice } = require('../models');
const createRouter = require('./stockController');

describe('stock API', () => {
  let app;
  let cache;
  const originalKey = process.env.ADMIN_API_KEY;
  beforeEach(() => {
    jest.clearAllMocks();
    Stock.sequelize = { query: jest.fn().mockResolvedValue([[{ session_date: '2026-09-21' }, { session_date: '2026-09-18' }], {}]) };
    process.env.ADMIN_API_KEY = 'test-admin-key';
    cache = { get: jest.fn().mockResolvedValue(null), set: jest.fn(), delete: jest.fn(), deleteByType: jest.fn(), clearAll: jest.fn() };
    app = express();
    app.use(express.json());
    app.use('/api/stocks', createRouter(cache));
  });
  afterAll(() => {
    if (originalKey === undefined) delete process.env.ADMIN_API_KEY;
    else process.env.ADMIN_API_KEY = originalKey;
  });
  test('blocks unauthenticated writes and cache clears', async () => {
    expect((await request(app).put('/api/stocks/123').send({ name: 'Changed' })).status).toBe(401);
    expect((await request(app).post('/api/stocks/cache/clear')).status).toBe(401);
    expect(Stock.findByPk).not.toHaveBeenCalled();
    expect(cache.clearAll).not.toHaveBeenCalled();
  });
  test('exposes the shared sector catalog for frontend filters', async () => {
    const result = await request(app).get('/api/stocks/sectors');
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ success: true, fallback: { key: 'other' } });
    expect(result.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'technology', label: expect.any(String) }),
      expect.objectContaining({ key: 'consumer_retail', label: expect.any(String) })
    ]));
  });
  test('disables administrative access without a configured key', async () => {
    delete process.env.ADMIN_API_KEY;
    expect((await request(app).post('/api/stocks/cache/clear').set('Authorization', 'Bearer test-admin-key')).status).toBe(503);
  });
  test('permits authenticated cache clearing', async () => {
    expect((await request(app).post('/api/stocks/cache/clear').set('Authorization', 'Bearer test-admin-key')).status).toBe(200);
    expect(cache.clearAll).toHaveBeenCalledTimes(1);
  });
  test('rejects invalid administrative updates', async () => {
    const result = await request(app).put('/api/stocks/123').set('Authorization', 'Bearer test-admin-key').send({ market_cap: -1 });
    expect(result.status).toBe(400);
    expect(Stock.findByPk).not.toHaveBeenCalled();
  });
  test('returns stored prices without inventing missing market metrics', async () => {
    Stock.findAll.mockResolvedValue([{ id: '123', code: 'ABC', exchange: 'UPCOM', listing_status: 'listed', prices: [{ price: '50.25', updated_at: '2026-09-18' }] }]);
    const result = await request(app).get('/api/stocks');
    expect(result.body.data[0]).toMatchObject({ price: 50.25, change: null, volume: null, exchange: 'UPCOM', listing_status: 'listed' });
    const include = Stock.findAll.mock.calls[0][0].include[0];
    expect(include).toMatchObject({ association: 'prices', separate: true, limit: 1, order: [['observed_at', 'DESC NULLS LAST'], ['updated_at', 'DESC NULLS LAST'], ['id', 'DESC']] });
    expect(include.where.observed_at[Op.not]).toBe(null);
  });
  test('filters stock lists by supported exchange and includes it in pagination', async () => {
    Stock.findAll.mockResolvedValue([]);
    const result = await request(app).get('/api/stocks').query({ exchange: 'hsx' });
    expect(result.status).toBe(200);
    expect(result.body.pagination.exchange).toBe('HSX');
    expect(Stock.findAll.mock.calls[0][0].where).toEqual(expect.objectContaining({ exchange: 'HSX' }));
    expect(cache.get.mock.calls[0][0]).toContain(':HSX:');
  });
  test('returns bounded cached market breadth history without imputing unavailable fields', async () => {
    Stock.sequelize.query.mockResolvedValueOnce([[
      { session_date: '2026-09-29', advances: '2', declines: '1', unchanged: '0', classified: '3', covered: '3', universe: '4', volume_advances: '100', volume_declines: '50', volume_unchanged: '0', traded_value: null, traded_value_observations: '0' },
      { session_date: '2026-09-30', advances: '1', declines: '2', unchanged: '0', classified: '3', covered: '3', universe: '4', volume_advances: '80', volume_declines: '120', volume_unchanged: '0', traded_value: null, traded_value_observations: '0' }
    ], {}]);
    const result = await request(app).get('/api/stocks/breadth/history').query({ sessions: 2, exchange: 'hsx' });
    expect(result.status).toBe(200);
    expect(result.body.data).toMatchObject({ exchange: 'HSX', requested_sessions: 2, returned_sessions: 2, continuity: { status: 'continuous' } });
    expect(result.body.data.points[0]).toMatchObject({ ad_ratio: 2, coverage_pct: 75, traded_value: null });
    expect(Stock.sequelize.query).toHaveBeenCalledWith(expect.stringContaining('LAG(close)'), { bind: ['HSX', 3, 2] });
    expect(cache.set).toHaveBeenCalledWith('v1:market-breadth-history:HSX:2', { data: result.body.data }, 5, 'market_breadth');
  });
  test('bounds breadth history sessions and serves cached results', async () => {
    cache.get.mockResolvedValueOnce({ data: { requested_sessions: 60, points: [] } });
    const result = await request(app).get('/api/stocks/breadth/history').query({ sessions: 999, exchange: 'invalid' });
    expect(result.status).toBe(200);
    expect(result.body.source).toBe('cache');
    expect(cache.get).toHaveBeenCalledWith('v1:market-breadth-history:ALL:60');
    expect(Stock.sequelize.query).not.toHaveBeenCalled();
  });
  test('falls back to 20 breadth sessions when the query is not numeric', async () => {
    cache.get.mockResolvedValueOnce({ data: { requested_sessions: 20, points: [] } });
    const result = await request(app).get('/api/stocks/breadth/history').query({ sessions: 'not-a-number' });
    expect(result.status).toBe(200);
    expect(cache.get).toHaveBeenCalledWith('v1:market-breadth-history:ALL:20');
  });
  test('limits detail history by market observation time, not import/update time', async () => {
    Stock.findByPk.mockResolvedValue({
      id: '123', code: 'ABC', name: 'Example', prices: [
        { open: 10, high: 11, low: 9, close: 10, interval: '1d', observed_at: '2026-09-21T00:00:00.000Z', updated_at: '2026-09-22T00:00:00.000Z' },
        { close: 10.5, interval: 'intraday', observed_at: '2026-09-21T09:30:00.000Z', updated_at: '2026-09-21T09:31:00.000Z' }
      ]
    });
    const result = await request(app).get('/api/stocks/123');
    expect(result.status).toBe(200);
    expect(result.body.data.price_history[0].observed_at).toBe('2026-09-21T00:00:00.000Z');
    expect(result.body.data.price_history).toHaveLength(1);
    expect(result.body.data.market_sessions).toEqual(['2026-09-18', '2026-09-21']);
    expect(Stock.sequelize.query).toHaveBeenCalledWith(expect.stringContaining("AT TIME ZONE 'Asia/Ho_Chi_Minh'"));
    expect(Stock.findByPk.mock.calls[0][1].include[0]).toMatchObject({
      association: 'prices', separate: true, limit: 60,
      order: [['observed_at', 'DESC NULLS LAST'], ['updated_at', 'DESC NULLS LAST'], ['id', 'DESC']]
    });
    expect(Stock.findByPk.mock.calls[0][1].include[0].where.observed_at[Op.not]).toBe(null);
    expect(Stock.findByPk.mock.calls[0][1].include[0].where.interval).toBe('1d');
  });
  test('price endpoint ignores legacy rows without a provider observation time', async () => {
    Stock.findByPk.mockResolvedValue({ id: '123', code: 'ABC' });
    StockPrice.findOne.mockResolvedValue({ price: '50.25', observed_at: '2026-09-21T00:00:00.000Z', updated_at: '2026-09-22T00:00:00.000Z' });
    const result = await request(app).get('/api/stocks/123/price');
    expect(result.status).toBe(200);
    expect(result.body.data.price).toBe(50.25);
    const query = StockPrice.findOne.mock.calls[0][0];
    expect(query.where).toMatchObject({ stock_id: '123' });
    expect(query.where.observed_at[Op.not]).toBe(null);
    expect(query.order).toEqual([['observed_at', 'DESC NULLS LAST'], ['updated_at', 'DESC NULLS LAST'], ['id', 'DESC']]);
  });
  test('pins validated symbols before sorting and pagination, with separate cache keys', async () => {
    Stock.sequelize = { literal: value => ({ val: value }) };
    Stock.findAll.mockResolvedValue([]);
    const result = await request(app).get('/api/stocks').query({ pinned: " fpt,FPT,ZZZ,x');--", pageSize: 1, sort: 'code', direction: 'desc' });
    expect(result.status).toBe(200);
    const options = Stock.findAll.mock.calls[0][0];
    expect(options.limit).toBe(1);
    expect(options.order).toEqual([
      [{ val: 'CASE WHEN "Stock"."code" IN (\'FPT\',\'ZZZ\') THEN 0 ELSE 1 END' }, 'ASC'], ['code', 'DESC']
    ]);
    const pinnedKey = cache.get.mock.calls[0][0];
    await request(app).get('/api/stocks').query({ pageSize: 1, sort: 'code', direction: 'desc' });
    expect(cache.get.mock.calls[1][0]).not.toBe(pinnedKey);
    delete Stock.sequelize;
  });
});
