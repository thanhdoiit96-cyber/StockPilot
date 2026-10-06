jest.mock('../models', () => ({
  Portfolio: { findOne: jest.fn(), create: jest.fn() }, PortfolioTransaction: { findAll: jest.fn(), bulkCreate: jest.fn() },
  PortfolioCashFlow: { findAll: jest.fn(), findOne: jest.fn(), create: jest.fn() },
  PortfolioEvent: { findAll: jest.fn(), findOne: jest.fn(), create: jest.fn() },
  Stock: { findAll: jest.fn(), findOne: jest.fn() }, StockPrice: { findAll: jest.fn() },
  sequelize: { transaction: jest.fn(), query: jest.fn() }
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
  models.PortfolioCashFlow.findAll.mockResolvedValue([]);
  models.PortfolioEvent.findAll.mockResolvedValue([]);
  models.Stock.findAll.mockResolvedValue([{ id: 's', code: 'FPT', name: 'FPT Corp' }]);
  models.Stock.findOne.mockResolvedValue({ id: 's', code: 'FPT', name: 'FPT Corp' });
  models.StockPrice.findAll.mockResolvedValue([{ stock_id: 's', close: 60000, observed_at: '2026-09-24T00:00:00Z' }]);
  models.sequelize.transaction.mockImplementation(callback => callback({ id: 'db-transaction' }));
  models.sequelize.query.mockResolvedValue([{ session_date: '2026-09-24' }]);
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

test('returns external cash flows separately from profit and summarizes their net amount', async () => {
  models.PortfolioCashFlow.findAll.mockResolvedValue([
    { id: 'cf-1', type: 'DEPOSIT', amount: '1000000.00', occurred_at: '2026-09-01T03:00:00Z', note: 'Vốn đầu kỳ', created_at: '2026-09-01T03:00:01Z', updated_at: '2026-09-01T03:00:01Z' },
    { id: 'cf-2', type: 'WITHDRAWAL', amount: '250000.00', occurred_at: '2026-09-20T03:00:00Z', note: null, created_at: '2026-09-20T03:00:01Z', updated_at: '2026-09-20T03:00:01Z' }
  ]);
  liveQuoteService.load.mockResolvedValue({});
  const response = await request(app).get('/portfolio');
  expect(response.body.data.cash_flows).toHaveLength(2);
  expect(response.body.data.performance.external_cash_flows).toEqual({ count: 2, deposits: 1000000, withdrawals: 250000, net: 750000 });
  expect(response.body.data.performance.limitations).toContain('cash_flows_recorded_not_applied_to_twr');
  expect(response.body.data.performance.realized_pnl).toBe(0);
});

test('creates a validated cash flow inside the authenticated portfolio', async () => {
  models.PortfolioCashFlow.create.mockResolvedValue({ id: 'cf-1', type: 'DEPOSIT', amount: 1000000 });
  const response = await request(app).post('/portfolio/cash-flows').send({ type: 'deposit', amount: 1000000, occurred_at: '2026-10-01T03:00:00Z', note: 'Vốn ban đầu' });
  expect(response.status).toBe(201);
  expect(models.PortfolioCashFlow.create).toHaveBeenCalledWith(expect.objectContaining({ portfolio_id: 'p', type: 'DEPOSIT', amount: 1000000, note: 'Vốn ban đầu' }));
});

test('rejects invalid cash flows before writing', async () => {
  const response = await request(app).post('/portfolio/cash-flows').send({ type: 'DIVIDEND', amount: -1, occurred_at: 'not-a-date' });
  expect(response.status).toBe(400);
  expect(models.PortfolioCashFlow.create).not.toHaveBeenCalled();
});

test('updates only a cash flow owned by the authenticated portfolio', async () => {
  const update = jest.fn().mockResolvedValue(undefined);
  models.PortfolioCashFlow.findOne.mockResolvedValue({ id: 'cf-1', update });
  const response = await request(app).put('/portfolio/cash-flows/cf-1').send({ type: 'withdrawal', amount: 200000, occurred_at: '2026-10-01T03:00:00Z', note: '' });
  expect(response.status).toBe(200);
  expect(models.PortfolioCashFlow.findOne).toHaveBeenCalledWith({ where: { id: 'cf-1', portfolio_id: 'p' } });
  expect(update).toHaveBeenCalledWith(expect.objectContaining({ type: 'WITHDRAWAL', amount: 200000, note: null, updated_at: expect.any(Date) }));
});

test('requires confirmation and ownership before deleting a cash flow', async () => {
  const unconfirmed = await request(app).delete('/portfolio/cash-flows/cf-1').send({});
  expect(unconfirmed.status).toBe(400);
  const destroy = jest.fn().mockResolvedValue(undefined);
  models.PortfolioCashFlow.findOne.mockResolvedValue({ id: 'cf-1', destroy });
  const confirmed = await request(app).delete('/portfolio/cash-flows/cf-1').send({ confirmed: true });
  expect(confirmed.status).toBe(200);
  expect(models.PortfolioCashFlow.findOne).toHaveBeenCalledWith({ where: { id: 'cf-1', portfolio_id: 'p' } });
  expect(destroy).toHaveBeenCalled();
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

test('returns bounded daily valuation history from stored market sessions without provider calls', async () => {
  models.PortfolioTransaction.findAll.mockResolvedValueOnce([{ id: 'tx', stock_id: 's', side: 'BUY', quantity: 10, price: 50000, fees: 0, traded_at: '2026-09-23T02:00:00Z', created_at: '2026-09-23T02:00:01Z' }]);
  models.PortfolioCashFlow.findAll.mockResolvedValueOnce([{ id: 'cf', type: 'DEPOSIT', amount: 500000, occurred_at: '2026-09-23T01:00:00Z' }]);
  models.sequelize.query.mockResolvedValueOnce([{ session_date: '2026-09-24' }, { session_date: '2026-09-23' }]);
  models.StockPrice.findAll.mockResolvedValueOnce([
    { id: 'p1', stock_id: 's', interval: '1d', observed_at: '2026-09-23T09:00:00Z', close: 50000 },
    { id: 'p2', stock_id: 's', interval: '1d', observed_at: '2026-09-24T09:00:00Z', close: 55000 }
  ]);
  const response = await request(app).get('/portfolio/performance/history?sessions=999');
  expect(response.status).toBe(200);
  expect(response.body.data).toMatchObject({ methodology: 'daily_close_twr_v1', requested_sessions: 260, twr_available: true, cumulative_twr_pct: 10, coverage: { sessions: 2, complete_sessions: 2 } });
  expect(models.sequelize.query).toHaveBeenCalledWith(expect.stringContaining("AT TIME ZONE 'Asia/Ho_Chi_Minh'"), expect.objectContaining({ replacements: { sessions: 260 } }));
  expect(liveQuoteService.load).not.toHaveBeenCalled();
});

test('withholds daily TWR when a stored market session lacks a held-symbol price', async () => {
  models.PortfolioTransaction.findAll.mockResolvedValueOnce([{ stock_id: 's', side: 'BUY', quantity: 1, price: 50000, fees: 0, traded_at: '2026-09-23T02:00:00Z' }]);
  models.PortfolioCashFlow.findAll.mockResolvedValueOnce([{ type: 'DEPOSIT', amount: 50000, occurred_at: '2026-09-23T01:00:00Z' }]);
  models.sequelize.query.mockResolvedValueOnce([{ session_date: '2026-09-25' }, { session_date: '2026-09-24' }, { session_date: '2026-09-23' }]);
  models.StockPrice.findAll.mockResolvedValueOnce([{ stock_id: 's', interval: '1d', observed_at: '2026-09-23T09:00:00Z', close: 50000 }, { stock_id: 's', interval: '1d', observed_at: '2026-09-25T09:00:00Z', close: 60000 }]);
  const response = await request(app).get('/portfolio/performance/history?sessions=3');
  expect(response.body.data).toMatchObject({ status: 'partial', twr_available: false, cumulative_twr_pct: null, coverage: { sessions: 3, complete_sessions: 2, incomplete_sessions: 1 } });
  expect(response.body.data.points[1]).toMatchObject({ date: '2026-09-24', status: 'partial', portfolio_value: null });
});

test('creates and lists a pending manual portfolio event without trusting client provenance', async () => {
  const created = { id: 'event-1', stock_id: 's', event_type: 'CASH_DIVIDEND', status: 'PENDING', schema_version: 1, record_date: '2026-09-20', payment_date: '2026-10-10', entitlement_quantity: '1000', payload: { gross_per_share: 2000, withholding_tax: 0, net_cash_amount: 2000000, currency: 'VND' }, source_type: 'MANUAL', verification_status: 'UNVERIFIED', toJSON() { return { ...this }; } };
  models.PortfolioEvent.create.mockResolvedValueOnce(created);
  const response = await request(app).post('/portfolio/events').send({ event_type: 'CASH_DIVIDEND', symbol: 'FPT', record_date: '2026-09-20', payment_date: '2026-10-10', entitlement_quantity: 1000, payload: created.payload, source_type: 'PROVIDER', verification_status: 'SOURCE_VERIFIED' });
  expect(response.status).toBe(201);
  expect(models.PortfolioEvent.create).toHaveBeenCalledWith(expect.objectContaining({ portfolio_id: 'p', stock_id: 's', status: 'PENDING', source_type: 'MANUAL', verification_status: 'UNVERIFIED', created_by: 'user-a' }));
  models.PortfolioEvent.findAll.mockResolvedValueOnce([{ ...created, Stock: { code: 'FPT' } }]);
  const listed = await request(app).get('/portfolio/events');
  expect(listed.body.data.events[0]).toMatchObject({ id: 'event-1', symbol: 'FPT', entitlement_quantity: 1000 });
});

test('confirms only an owned pending event and never rewrites its financial payload', async () => {
  const update = jest.fn(function (values) { Object.assign(this, values); return Promise.resolve(this); });
  const event = { id: 'event-1', status: 'PENDING', source_type: 'MANUAL', verification_status: 'UNVERIFIED', entitlement_quantity: 10, payload: { ratio_numerator: 2, ratio_denominator: 1 }, update };
  models.PortfolioEvent.findOne.mockResolvedValueOnce(event);
  const response = await request(app).post('/portfolio/events/event-1/confirm').send({ confirmed: true, payload: { ratio_numerator: 999 } });
  expect(response.status).toBe(200);
  expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: 'CONFIRMED', verification_status: 'USER_CONFIRMED' }));
  expect(update.mock.calls[0][0]).not.toHaveProperty('payload');
  expect(models.PortfolioEvent.findOne).toHaveBeenCalledWith({ where: { id: 'event-1', portfolio_id: 'p' } });
});

test('corrects an event by creating a pending replacement and superseding the original atomically', async () => {
  const update = jest.fn().mockResolvedValue(undefined);
  models.PortfolioEvent.findOne.mockResolvedValueOnce({ id: 'old-event', status: 'CONFIRMED', update });
  const replacement = { id: 'new-event', stock_id: 's', status: 'PENDING', entitlement_quantity: 100, payload: {}, toJSON() { return { ...this }; } };
  models.PortfolioEvent.create.mockResolvedValueOnce(replacement);
  const response = await request(app).post('/portfolio/events/old-event/correct').send({ event_type: 'STOCK_SPLIT', symbol: 'FPT', record_date: '2026-09-20', effective_date: '2026-10-01', entitlement_quantity: 100, payload: { ratio_numerator: 2, ratio_denominator: 1 } });
  expect(response.status).toBe(201);
  expect(models.PortfolioEvent.create).toHaveBeenCalledWith(expect.objectContaining({ supersedes_event_id: 'old-event', status: 'PENDING' }), { transaction: { id: 'db-transaction' } });
  expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: 'SUPERSEDED' }), { transaction: { id: 'db-transaction' } });
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
