jest.mock('../models', () => ({
  Portfolio: { findOne: jest.fn() }, PortfolioTransaction: { findAll: jest.fn() },
  Stock: {}, StockPrice: { findAll: jest.fn() }
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
  models.StockPrice.findAll.mockResolvedValue([{ stock_id: 's', close: 60000, observed_at: '2026-09-24T00:00:00Z' }]);
});
const app = express(); app.use('/portfolio', router);

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
