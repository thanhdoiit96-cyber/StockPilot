jest.mock('../models', () => ({ Stock: { findAll: jest.fn(), findByPk: jest.fn() }, StockPrice: { findOne: jest.fn() } }));
jest.mock('../services/eodEvidence', () => ({ readLatestEodEvidence: jest.fn() }));
jest.mock('../services/liveQuoteService', () => ({ liveQuoteService: { load: jest.fn(), health: jest.fn() } }));
const express = require('express');
const request = require('supertest');
const { Op } = require('sequelize');
const { Stock, StockPrice } = require('../models');
const { readLatestEodEvidence } = require('../services/eodEvidence');
const { liveQuoteService } = require('../services/liveQuoteService');
const createRouter = require('./stockController');

describe('stock API', () => {
  let app;
  let cache;
  const originalKey = process.env.ADMIN_API_KEY;
  beforeEach(() => {
    jest.clearAllMocks();
    readLatestEodEvidence.mockReturnValue(null);
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
  test('reports incomplete intraday quote coverage without pretending missing symbols have a quote', async () => {
    liveQuoteService.load.mockResolvedValue({ FPT: { symbol: 'FPT', price: 100000 } });
    const result = await request(app).get('/api/stocks/quotes').query({ symbols: 'fpt,BCG,FPT' });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      success: true,
      requested: 2,
      returned: 1,
      coverage_pct: 50,
      complete: false,
      missing_symbols: ['BCG'],
      data: { FPT: { price: 100000 } }
    });
    expect(liveQuoteService.load).toHaveBeenCalledWith(['FPT', 'BCG'], { waitMs: 11000 });
  });
  test('exposes bounded trade-priority evidence without raw provider errors', async () => {
    Stock.sequelize.query
      .mockResolvedValueOnce([[{ session_date: '2026-10-02', listed: 551, covered: 354, missing: 197, missing_symbols: ['ABC'], exchange_coverage: [{ exchange: 'HSX', listed: 200, covered: 189, missing: 11 }] }], {}])
      .mockResolvedValueOnce([[{ never_seen: 10, previous_session: 20, stale_history: 167 }], {}]);
    readLatestEodEvidence.mockReturnValue({
      file: 'eod-retry-2026-10-02-test.json',
      mode: 'gap_retry',
      evidence: {
        checked_at: '2026-10-02T16:12:22.541Z', requested: 215, selected: 25, selected_traded: 18,
        trade_priority: { enabled: true, probed: 215, batches: 2, failed_batches: 1, matched: 18, errors: [{ error: 'secret upstream detail' }] },
        after: { symbols: 551, covered: 354, missing_symbols: ['ABC'] }, retries: [{}], complete: false
      }
    });
    const result = await request(app).get('/api/stocks/data-quality').query({ session: '2026-10-02' });
    expect(result.status).toBe(200);
    expect(result.body.data.eod_retry).toMatchObject({
      last_run_requested: 215,
      last_run_selected: 25,
      last_run_selected_traded: 18,
      last_run_trade_priority: { enabled: true, probed: 215, batches: 2, failed_batches: 1, matched: 18, had_error: true }
    });
    expect(result.body.data.exchange_coverage).toEqual([{ exchange: 'HSX', listed: 200, covered: 189, missing: 11, coverage_pct: 94.5 }]);
    expect(JSON.stringify(result.body)).not.toContain('secret upstream detail');
  });
  test('builds a database-only observed Liquid30 research basket with its coverage contract', async () => {
    const listed = Array.from({ length: 46 }, (_, index) => ({
      id: `id-${index}`, code: `S${String(index).padStart(2, '0')}`, listing_status: 'listed',
      ...(index < 30 ? { stock_id: `id-${index}`, observed_at: '2026-10-21', close: '10', traded_value: String(1000 - index), price_unit: 'VND' } : {})
    }));
    Stock.sequelize.query.mockResolvedValueOnce([listed, {}]);
    const result = await request(app).get('/api/stocks/liquid30-readiness');
    expect(result.status).toBe(200);
    expect(result.headers['cache-control']).toBe('no-store');
    expect(result.body.data).toMatchObject({
      status: 'partial_observed_universe', scope: 'observed_eod_subset', research_only: true,
      as_of: '2026-10-21', coverage: { observed: 30, universe: 46, minimum: .65 }
    });
    expect(result.body.data.constituents).toHaveLength(30);
    expect(result.body.data.constituents[0]).toMatchObject({ rank: 1, symbol: 'S00', traded_value: 1000 });
    expect(Stock.sequelize.query.mock.calls[0][0]).toContain("interval = '1d'");
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
    expect(include).toMatchObject({ association: 'prices', separate: true, limit: 2, order: [['observed_at', 'DESC NULLS LAST'], ['updated_at', 'DESC NULLS LAST'], ['id', 'DESC']] });
    expect(include.where.observed_at[Op.not]).toBe(null);
  });
  test('derives EOD change from the previous stored session when intraday is unavailable', async () => {
    Stock.findAll.mockResolvedValue([{
      id: '123', code: 'FPT', exchange: 'HSX', prices: [
        { close: '62100', observed_at: '2026-10-02T00:00:00Z' },
        { close: '62700', observed_at: '2026-10-01T00:00:00Z' }
      ]
    }]);
    const result = await request(app).get('/api/stocks');
    expect(result.status).toBe(200);
    expect(result.body.data[0]).toMatchObject({ price: 62100, change: -0.9569, data_session_date: '2026-10-02' });
  });
  test('filters stock lists by supported exchange and includes it in pagination', async () => {
    Stock.findAll.mockResolvedValue([]);
    const result = await request(app).get('/api/stocks').query({ exchange: 'hsx' });
    expect(result.status).toBe(200);
    expect(result.body.pagination.exchange).toBe('HSX');
    expect(Stock.findAll.mock.calls[0][0].where).toEqual(expect.objectContaining({ exchange: 'HSX' }));
    expect(cache.get.mock.calls[0][0]).toContain(':HSX:');
  });
  test('keeps the other-sector universe consistent by excluding code and industry classifications', async () => {
    Stock.findAll.mockResolvedValue([]);
    await request(app).get('/api/stocks').query({ sector: 'other', listing_status: 'listed' });
    const condition = Stock.findAll.mock.calls[0][0].where;
    const sectorFilter = condition[Op.and][0];
    expect(sectorFilter[Op.and][0].code[Op.notIn]).toEqual(expect.arrayContaining(['FPT', 'VCB']));
    expect(sectorFilter[Op.and][1][Op.or][2][Op.not][Op.or]).toEqual(expect.arrayContaining([
      { industry: { [Op.iLike]: '%công nghệ%' } },
      { industry: { [Op.iLike]: '%ngân hàng%' } }
    ]));
    expect(condition[Op.and][1]).toEqual({ listing_status: 'listed' });
  });
  test('exports bounded filtered EOD CSV without spreadsheet formulas', async () => {
    Stock.sequelize.literal = value => ({ val: value });
    Stock.findAll.mockResolvedValue([{ id: '1', code: 'FPT', name: '=Unsafe', exchange: 'HSX', prices: [{ close: '100000', volume: '1200', provider: 'vnstock', observed_at: '2026-10-01T00:00:00Z' }] }]);
    const result = await request(app).get('/api/stocks/export.csv').query({ sector: 'technology', sort: 'code', direction: 'desc', columns: 'volume' });
    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toMatch(/text\/csv/);
    expect(result.headers['x-export-count']).toBe('1');
    expect(result.headers['x-export-limit']).toBe('2000');
    expect(result.text).toContain('"Mã","Giá EOD","Khối lượng","Nguồn dữ liệu"');
    expect(result.text).toContain('"FPT","100000","1200","vnstock"');
    expect(result.text).not.toContain('=Unsafe');
    expect(Stock.findAll.mock.calls[0][0]).toMatchObject({ limit: 2001, order: [['code', 'DESC']] });
  });
  test('returns bounded cached market breadth history without imputing unavailable fields', async () => {
    Stock.sequelize.query.mockResolvedValueOnce([[
      { session_date: '2026-09-29', advances: '2', declines: '1', unchanged: '0', classified: '3', covered: '3', universe: '4', volume_advances: '100', volume_declines: '50', volume_unchanged: '0', volume_observations: '3', traded_value: null, traded_value_observations: '0' },
      { session_date: '2026-09-30', advances: '1', declines: '2', unchanged: '0', classified: '3', covered: '3', universe: '4', volume_advances: '80', volume_declines: '120', volume_unchanged: '0', volume_observations: '3', traded_value: null, traded_value_observations: '0' }
    ], {}]);
    const result = await request(app).get('/api/stocks/breadth/history').query({ sessions: 2, exchange: 'hsx', sector: 'technology' });
    expect(result.status).toBe(200);
    expect(result.body.data).toMatchObject({ exchange: 'HSX', sector: 'technology', sector_label: 'Công nghệ', requested_sessions: 2, returned_sessions: 2, continuity: { status: 'continuous' } });
    expect(result.body.data.points[0]).toMatchObject({ ad_ratio: 2, coverage_pct: 75, traded_value: null });
    expect(result.body.data.points[1].volume).toMatchObject({ net: -40, net_pct: -20, signal: 'confirmation' });
    const bind = Stock.sequelize.query.mock.calls[0][1].bind;
    expect(bind.slice(0, 4)).toEqual(['HSX', 'technology', expect.arrayContaining(['FPT']), expect.arrayContaining(['%công nghệ%'])]);
    expect(bind.slice(-2)).toEqual([2, 2]);
    expect(Stock.sequelize.query).toHaveBeenCalledWith(expect.stringContaining('LEFT JOIN LATERAL'), expect.any(Object));
    expect(Stock.sequelize.query).toHaveBeenCalledWith(expect.stringContaining('COUNT(volume)'), expect.any(Object));
    expect(cache.set).toHaveBeenCalledWith('v4:market-breadth-history:HSX:technology:2', { data: result.body.data }, 5, 'market_breadth');
  });
  test('bounds breadth history sessions and serves cached results', async () => {
    cache.get.mockResolvedValueOnce({ data: { requested_sessions: 60, points: [] } });
    const result = await request(app).get('/api/stocks/breadth/history').query({ sessions: 999, exchange: 'invalid' });
    expect(result.status).toBe(200);
    expect(result.body.source).toBe('cache');
    expect(cache.get).toHaveBeenCalledWith('v4:market-breadth-history:ALL:ALL:60');
    expect(Stock.sequelize.query).not.toHaveBeenCalled();
  });
  test('falls back to 20 breadth sessions when the query is not numeric', async () => {
    cache.get.mockResolvedValueOnce({ data: { requested_sessions: 20, points: [] } });
    const result = await request(app).get('/api/stocks/breadth/history').query({ sessions: 'not-a-number' });
    expect(result.status).toBe(200);
    expect(cache.get).toHaveBeenCalledWith('v4:market-breadth-history:ALL:ALL:20');
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
