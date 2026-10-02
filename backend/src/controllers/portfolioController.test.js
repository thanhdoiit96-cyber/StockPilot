jest.mock('../models', () => ({
  Portfolio: { findOne: jest.fn(), create: jest.fn() }, PortfolioTransaction: { findAll: jest.fn(), bulkCreate: jest.fn() },
  Stock: { findAll: jest.fn(), findOne: jest.fn() }, StockPrice: { findAll: jest.fn() },
  sequelize: { transaction: jest.fn() }
}));
jest.mock('../middleware/requireAuth', () => (req, res, next) => { req.user = { sub: 'user-a' }; next(); });
jest.mock('../services/liveQuoteService', () => ({ liveQuoteService: { load: jest.fn() } }));
const request = require('supertest');
const express = require('express');
const models = require('../models');
const { liveQuoteService } = require('../services/liveQuoteService');
const router = require('./portfolioController');

beforeEach(() => {
  jest.clearAllMocks();
  models.Portfolio.findOne.mockResolvedValue({ id: 'p', user_id: 'user-a' });
  models.PortfolioTransaction.findAll.mockResolvedValue([{ id: 'tx-1', stock_id: 's', side: 'BUY', quantity: 10, price: 50000, fees: 0, traded_at: '2026-09-24T02:00:00Z', created_at: '2026-09-24T02:01:00Z', recommendation_context: null, Stock: { code: 'FPT', name: 'FPT Corp' } }]);
  models.PortfolioTransaction.bulkCreate.mockResolvedValue([{ id: 'import-1' }]);
  models.Stock.findAll.mockResolvedValue([{ id: 's', code: 'FPT', name: 'FPT Corp' }]);
  models.StockPrice.findAll.mockResolvedValue([{ stock_id: 's', close: 60000, observed_at: '2026-09-24T00:00:00Z' }]);
  models.sequelize.transaction.mockImplementation(callback => callback({ id: 'db-transaction' }));
});
const app = express(); app.use(express.json()); app.use('/portfolio', router);

test('empty intraday leaves ledger positions and EOD fallback intact', async () => {
  liveQuoteService.load.mockResolvedValue({});
  const response = await request(app).get('/portfolio');
  expect(response.status).toBe(200);
  expect(response.body.data.positions[0]).toMatchObject({ symbol: 'FPT', quantity: 10, market_price: 60000, price_source: 'eod' });
  expect(liveQuoteService.load).toHaveBeenCalledWith(['FPT'], { waitMs: 1500 });
});

test('uses the same shared intraday quote as detail/overview for valuation', async () => {
  liveQuoteService.load.mockResolvedValue({ FPT: { symbol: 'FPT', price: 66000, observed_at: '2026-09-25T10:00:00+07:00' } });
  const response = await request(app).get('/portfolio');
  expect(response.body.data.positions[0]).toMatchObject({ market_price: 66000, market_value: 660000, unrealized_pnl: 160000, price_source: 'intraday' });
});

test('returns the authenticated portfolio transaction history as normalized ledger rows', async () => {
  models.PortfolioTransaction.findAll.mockResolvedValue([{ id: 'tx-1', stock_id: 's', side: 'BUY', quantity: '10', price: '50000', fees: '1000', traded_at: '2026-09-24T02:00:00Z', created_at: '2026-09-24T02:01:00Z', recommendation_context: null, Stock: { code: 'FPT', name: 'FPT Corp' } }]);
  liveQuoteService.load.mockResolvedValue({});
  const response = await request(app).get('/portfolio');
  expect(response.body.data.transaction_count).toBe(1);
  expect(response.body.data.transactions).toEqual([{
    id: 'tx-1',
    stock_id: 's',
    symbol: 'FPT',
    name: 'FPT Corp',
    side: 'BUY',
    quantity: 10,
    price: 50000,
    fees: 1000,
    traded_at: '2026-09-24T02:00:00Z',
    created_at: '2026-09-24T02:01:00Z',
    source: 'manual'
  }]);
});

test('returns fully sold symbols separately from open positions', async () => {
  models.PortfolioTransaction.findAll.mockResolvedValue([
    { id: 'buy', stock_id: 's', side: 'BUY', quantity: 10, price: 50000, fees: 100, traded_at: '2026-09-20T02:00:00Z', created_at: '2026-09-20T02:01:00Z', recommendation_context: null, Stock: { code: 'FPT', name: 'FPT Corp' } },
    { id: 'sell', stock_id: 's', side: 'SELL', quantity: 10, price: 60000, fees: 100, traded_at: '2026-09-24T02:00:00Z', created_at: '2026-09-24T02:01:00Z', recommendation_context: null, Stock: { code: 'FPT', name: 'FPT Corp' } }
  ]);
  const response = await request(app).get('/portfolio');
  expect(response.status).toBe(200);
  expect(response.body.data.positions).toEqual([]);
  expect(response.body.data.closed_positions).toEqual([expect.objectContaining({ symbol: 'FPT', status: 'closed', quantity: 0, realized_pnl: 99800, closed_at: '2026-09-24T02:00:00Z' })]);
  expect(response.body.data.position_counts).toEqual({ open: 0, closed: 1 });
  expect(liveQuoteService.load).not.toHaveBeenCalled();
});

test('calculates day change from the previous distinct EOD session', async () => {
  models.StockPrice.findAll.mockResolvedValue([
    { stock_id: 's', close: 60000, observed_at: '2026-09-25T00:00:00Z' },
    { stock_id: 's', close: 55000, observed_at: '2026-09-24T00:00:00Z' }
  ]);
  liveQuoteService.load.mockResolvedValue({ FPT: { symbol: 'FPT', price: 66000, observed_at: '2026-09-25T10:00:00+07:00' } });
  const response = await request(app).get('/portfolio');
  expect(response.body.data.positions[0]).toMatchObject({
    market_price: 66000,
    previous_market_price: 55000,
    day_change: 11000,
    day_change_pct: 20,
    price_source: 'intraday'
  });
});

test('database errors produce an explicit HTTP error rather than an empty portfolio', async () => {
  models.Portfolio.findOne.mockRejectedValueOnce(new Error('database unavailable'));
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const response = await request(app).get('/portfolio');
    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  } finally { spy.mockRestore(); }
});

test('previews row-level import errors without writing any transaction', async () => {
  const response = await request(app).post('/portfolio/transactions/import').send({ dry_run: true, rows: [
    { row_number: 2, symbol: 'FPT', side: 'SELL', quantity: '20', price: '60000', fees: '0', traded_at: '2026-10-01T03:00:00Z' },
    { row_number: 3, symbol: 'AAA', side: 'BUY', quantity: '1', price: '10000', fees: '0', traded_at: '2026-10-01T03:00:00Z' }
  ] });
  expect(response.status).toBe(200);
  expect(response.body.data.valid).toBe(false);
  expect(response.body.data.errors).toEqual(expect.arrayContaining([
    expect.objectContaining({ row: 2, field: 'quantity' }),
    expect.objectContaining({ row: 3, field: 'symbol' })
  ]));
  expect(models.PortfolioTransaction.bulkCreate).not.toHaveBeenCalled();
});

test('commits a valid import with one atomic bulk write', async () => {
  const response = await request(app).post('/portfolio/transactions/import').send({ dry_run: false, rows: [
    { row_number: 2, symbol: 'FPT', side: 'BUY', quantity: '5', price: '61000', fees: '100', traded_at: '2026-10-01T03:00:00Z' }
  ] });
  expect(response.status).toBe(201);
  expect(response.body.data).toMatchObject({ valid: true, dry_run: false, row_count: 1, transaction_ids: ['import-1'] });
  expect(models.sequelize.transaction).toHaveBeenCalledTimes(1);
  expect(models.PortfolioTransaction.bulkCreate).toHaveBeenCalledWith([
    expect.objectContaining({ portfolio_id: 'p', stock_id: 's', side: 'BUY', quantity: 5, price: 61000, fees: 100, recommendation_context: null })
  ], expect.objectContaining({ transaction: { id: 'db-transaction' }, returning: true }));
});

test('rejects malformed commit before opening a database transaction', async () => {
  const response = await request(app).post('/portfolio/transactions/import').send({ dry_run: false, rows: [
    { row_number: 2, symbol: 'FPT', side: 'BUY', quantity: '-1', price: '61000', traded_at: '2026-10-01T03:00:00Z' }
  ] });
  expect(response.status).toBe(422);
  expect(response.body.success).toBe(false);
  expect(models.sequelize.transaction).not.toHaveBeenCalled();
  expect(models.PortfolioTransaction.bulkCreate).not.toHaveBeenCalled();
});

test('updates a ledger transaction only after validating the locked full timeline', async () => {
  const update = jest.fn().mockResolvedValue(undefined);
  models.PortfolioTransaction.findAll.mockResolvedValueOnce([
    { id: 'buy', stock_id: 's', side: 'BUY', quantity: 10, price: 50000, fees: 0, traded_at: '2026-10-01T03:00:00Z', created_at: '2026-10-01T03:00:01Z', recommendation_context: null },
    { id: 'sell', stock_id: 's', side: 'SELL', quantity: 4, price: 60000, fees: 0, traded_at: '2026-10-02T03:00:00Z', created_at: '2026-10-02T03:00:01Z', recommendation_context: null, update }
  ]);
  const response = await request(app).put('/portfolio/transactions/sell').send({ side: 'SELL', quantity: 5, price: 61000, fees: 100, traded_at: '2026-10-02T03:00:00Z' });
  expect(response.status).toBe(200);
  expect(update).toHaveBeenCalledWith(expect.objectContaining({ side: 'SELL', quantity: 5, price: 61000, fees: 100 }), { transaction: { id: 'db-transaction' } });
  expect(models.PortfolioTransaction.findAll).toHaveBeenCalledWith(expect.objectContaining({ transaction: { id: 'db-transaction' }, lock: true }));
});

test('rejects an edit that would make a later sell exceed the historical position', async () => {
  const update = jest.fn();
  models.PortfolioTransaction.findAll.mockResolvedValueOnce([
    { id: 'buy', stock_id: 's', side: 'BUY', quantity: 10, price: 50000, fees: 0, traded_at: '2026-10-01T03:00:00Z', created_at: '2026-10-01T03:00:01Z', recommendation_context: null, update },
    { id: 'sell', stock_id: 's', side: 'SELL', quantity: 8, price: 60000, fees: 0, traded_at: '2026-10-02T03:00:00Z', created_at: '2026-10-02T03:00:01Z', recommendation_context: null }
  ]);
  const response = await request(app).put('/portfolio/transactions/buy').send({ side: 'BUY', quantity: 5, price: 50000, fees: 0, traded_at: '2026-10-01T03:00:00Z' });
  expect(response.status).toBe(422);
  expect(response.body.message).toContain('vượt vị thế');
  expect(update).not.toHaveBeenCalled();
});

test('requires explicit confirmation and rejects deletion that breaks the remaining timeline', async () => {
  const destroy = jest.fn();
  const withoutConfirmation = await request(app).delete('/portfolio/transactions/buy').send({});
  expect(withoutConfirmation.status).toBe(400);
  expect(models.sequelize.transaction).not.toHaveBeenCalled();

  models.PortfolioTransaction.findAll.mockResolvedValueOnce([
    { id: 'buy', stock_id: 's', side: 'BUY', quantity: 10, traded_at: '2026-10-01T03:00:00Z', created_at: '2026-10-01T03:00:01Z', destroy },
    { id: 'sell', stock_id: 's', side: 'SELL', quantity: 4, traded_at: '2026-10-02T03:00:00Z', created_at: '2026-10-02T03:00:01Z' }
  ]);
  const response = await request(app).delete('/portfolio/transactions/buy').send({ confirmed: true });
  expect(response.status).toBe(422);
  expect(destroy).not.toHaveBeenCalled();
});

test('deletes a confirmed transaction when the locked remaining timeline stays valid', async () => {
  const destroy = jest.fn().mockResolvedValue(undefined);
  models.PortfolioTransaction.findAll.mockResolvedValueOnce([
    { id: 'buy', stock_id: 's', side: 'BUY', quantity: 10, traded_at: '2026-10-01T03:00:00Z', created_at: '2026-10-01T03:00:01Z' },
    { id: 'sell', stock_id: 's', side: 'SELL', quantity: 4, traded_at: '2026-10-02T03:00:00Z', created_at: '2026-10-02T03:00:01Z', destroy }
  ]);
  const response = await request(app).delete('/portfolio/transactions/sell').send({ confirmed: true });
  expect(response.status).toBe(200);
  expect(response.body.data).toEqual({ id: 'sell' });
  expect(destroy).toHaveBeenCalledWith({ transaction: { id: 'db-transaction' } });
});
