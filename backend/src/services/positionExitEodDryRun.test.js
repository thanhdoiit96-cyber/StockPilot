'use strict';
const { runPositionExitEodDryRun, MAX_HOLDINGS_PER_PORTFOLIO } = require('./positionExitEodDryRun');

const transaction = { id: 't', stock_id: '11111111-1111-4111-8111-111111111111', side: 'BUY', quantity: 10, price: 50, fees: 0, traded_at: '2026-01-02T00:00:00.000Z', created_at: '2026-01-02T00:00:00.000Z' };

function dependencies() {
  const Portfolio = { findAll: jest.fn().mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]) };
  const PortfolioTransaction = { findAll: jest.fn(({ where }) => Promise.resolve(where.portfolio_id === 'p1' ? [transaction] : [])) };
  const PortfolioEvent = { findAll: jest.fn().mockResolvedValue([]) };
  const StockPrice = { sequelize: { query: jest.fn().mockResolvedValue([[{ stock_id: transaction.stock_id, provider: 'vnstock', interval: '1d', observed_at: '2026-10-21T00:00:00.000Z', close: 55, price_unit: 'VND', currency: 'VND', is_adjusted: false }], {}]) } };
  const PositionExitGeneratorRun = { findOne: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'dry-run' }) };
  return { Portfolio, PortfolioTransaction, PortfolioEvent, StockPrice, PositionExitGeneratorRun };
}

test('records bounded, provider-free EOD dry-run evidence without creating exit snapshots', async () => {
  const deps = dependencies();
  const result = await runPositionExitEodDryRun({ ...deps, sessionDate: '2026-10-21', triggerId: 'eod-run-1', ownerId: 'worker-a', now: new Date('2026-10-22T00:00:00Z') });
  expect(result).toMatchObject({ status: 'completed', run_id: 'dry-run', result_summary: { portfolios_seen: 2, portfolios_attempted: 1, holdings_candidate: 1, price_rows_read: 1, holdings_with_session_eod: 1, guidance_statuses: { unavailable: 1 } } });
  expect(deps.StockPrice.sequelize.query.mock.calls[0][0]).toContain('ROW_NUMBER() OVER');
  expect(deps.PositionExitGeneratorRun.create).toHaveBeenCalledWith(expect.objectContaining({ mode: 'dry_run', status: 'completed', input_evidence: expect.objectContaining({ provider_requests: 0, owner_id: 'worker-a' }) }));
});

test('does not surface an exit rule for a holding without an exact EOD session', async () => {
  const deps = dependencies();
  deps.StockPrice.sequelize.query.mockResolvedValueOnce([[{ stock_id: transaction.stock_id, provider: 'vnstock', interval: '1d', observed_at: '2026-10-20T00:00:00.000Z', close: 55, price_unit: 'VND', currency: 'VND', is_adjusted: false }], {}]);
  const result = await runPositionExitEodDryRun({ ...deps, sessionDate: '2026-10-21', triggerId: 'eod-run-2', ownerId: 'worker-a' });
  expect(result.result_summary).toMatchObject({ holdings_with_session_eod: 0, guidance_statuses: { unavailable_eod_session_missing: 1 } });
});

test('uses a transaction-scoped PostgreSQL advisory lock when a sequelize owner is provided', async () => {
  const deps = dependencies();
  const transaction = 'transaction';
  const sequelize = { transaction: jest.fn(async (_options, callback) => callback(transaction)), query: jest.fn().mockResolvedValue([[{ locked: true }]]) };
  await runPositionExitEodDryRun({ ...deps, sequelize, sessionDate: '2026-10-21', triggerId: 'eod-run-lock', ownerId: 'worker-a' });
  expect(sequelize.query).toHaveBeenCalledWith(expect.stringContaining('pg_try_advisory_xact_lock'), expect.objectContaining({ transaction }));
  expect(deps.PositionExitGeneratorRun.create).toHaveBeenCalledWith(expect.any(Object), { transaction });
});

test('does not read or write when the advisory lock is unavailable', async () => {
  const deps = dependencies();
  const sequelize = { transaction: jest.fn(async (_options, callback) => callback('transaction')), query: jest.fn().mockResolvedValue([[{ locked: false }]]) };
  await expect(runPositionExitEodDryRun({ ...deps, sequelize, sessionDate: '2026-10-21', triggerId: 'eod-run-locked', ownerId: 'worker-a' })).resolves.toEqual({ status: 'lock_unavailable', session_date: '2026-10-21' });
  expect(deps.PositionExitGeneratorRun.findOne).not.toHaveBeenCalled();
  expect(deps.Portfolio.findAll).not.toHaveBeenCalled();
  expect(deps.PositionExitGeneratorRun.create).not.toHaveBeenCalled();
});

test('is idempotent for the same trigger and refuses incomplete invocation identity', async () => {
  const deps = dependencies(); deps.PositionExitGeneratorRun.findOne.mockResolvedValue({ id: 'existing' });
  await expect(runPositionExitEodDryRun({ ...deps, sessionDate: '2026-10-21', triggerId: 'eod-run-1', ownerId: 'worker-a' })).resolves.toEqual({ status: 'run_exists', run_id: 'existing', session_date: '2026-10-21' });
  await expect(runPositionExitEodDryRun({ ...dependencies(), sessionDate: 'bad', triggerId: '', ownerId: '' })).rejects.toThrow('sessionDate');
  expect(MAX_HOLDINGS_PER_PORTFOLIO).toBe(100);
});
