const { preparePositionExitSnapshot, positionExitGenerationKey, positionExitSnapshotHash, createPositionExitSnapshot } = require('./positionExitPersistence');
const prices = Array.from({ length: 65 }, (_, index) => ({ stock_id: 's', observed_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(), provider: 'vnstock', interval: '1d', close: 100 + index, high: 101 + index, low: 99 + index, price_unit: 'VND', currency: 'VND', is_adjusted: false }));
const transaction = { stock_id: 's', side: 'BUY', quantity: 10, price: 100, fees: 0, traded_at: '2026-01-01T00:00:00.000Z', Stock: { code: 'ABC' } };

test('prepares a reproducible, per-portfolio shadow snapshot without a provider call', () => {
  const first = preparePositionExitSnapshot({ portfolioId: 'p', transactions: [transaction], priceRows: prices });
  const second = preparePositionExitSnapshot({ portfolioId: 'p', transactions: [transaction], priceRows: prices });
  expect(first.input_provenance).toMatchObject({ portfolio_id: 'p', open_positions: 1, price_rows: 65 });
  expect(first.guidance[0]).toMatchObject({ stock_id: 's', research_only: true });
  const key = positionExitGenerationKey({ portfolioId: 'p', asOf: first.as_of, provider: 'vnstock', inputHash: first.input_provenance_sha256 });
  expect(key).toHaveLength(64);
  expect(positionExitSnapshotHash({ portfolioId: 'p', asOf: first.as_of, provider: 'vnstock', inputHash: first.input_provenance_sha256, guidance: first.guidance })).toBe(positionExitSnapshotHash({ portfolioId: 'p', asOf: second.as_of, provider: 'vnstock', inputHash: second.input_provenance_sha256, guidance: second.guidance }));
});

test('marks a position with a pending corporate action unavailable in its immutable payload', () => {
  const result = preparePositionExitSnapshot({ portfolioId: 'p', transactions: [transaction], priceRows: prices, events: [{ stock_id: 's', status: 'PENDING' }] });
  expect(result.guidance[0]).toMatchObject({ status: 'unavailable', reason: 'unapplied_corporate_action' });
});

test('uses only a sealed reconciled cost and quantity when supplied to the exit snapshot', () => {
  const result = preparePositionExitSnapshot({ portfolioId: 'p', transactions: [transaction], priceRows: prices, reconciliations: [{ stock_id: 's', status: 'reconciled', reconciliation_version: 'current_holding_reconciliation_v1', quantity: 20, avg_cost: 50, first_traded_at: transaction.traded_at }], reconciliationRun: { run_id: 'reconciliation-run', snapshot_sha256: 'b'.repeat(64) } });
  expect(result.guidance[0]).toMatchObject({ status: 'hold', position: { quantity: 20, average_cost: 50 } });
  expect(result.input_provenance).toMatchObject({ reconciliation_run_id: 'reconciliation-run', reconciliation_snapshot_sha256: 'b'.repeat(64) });
});

test('seals reconciliation before persisting an exit snapshot in the same transaction', async () => {
  const PortfolioTransaction = { findAll: jest.fn().mockResolvedValue([transaction]) };
  const PortfolioEvent = { findAll: jest.fn().mockResolvedValue([]) };
  const StockPrice = { findAll: jest.fn().mockResolvedValue(prices) };
  const HoldingReconciliationRun = { findOne: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'reconciliation-run' }) };
  const HoldingReconciliationApplication = { bulkCreate: jest.fn().mockResolvedValue([]) };
  const PositionExitRun = { findOne: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'exit-run' }) };
  const PositionExitGuidance = { bulkCreate: jest.fn().mockResolvedValue([]) };
  const sequelize = { transaction: jest.fn((_, callback) => callback('tx')) };
  const result = await createPositionExitSnapshot({ PortfolioTransaction, PortfolioEvent, StockPrice, HoldingReconciliationRun, HoldingReconciliationApplication, PositionExitRun, PositionExitGuidance, sequelize, portfolioId: 'p', now: new Date('2026-03-10T00:00:00Z') });
  expect(result).toMatchObject({ status: 'created', run_id: 'exit-run' });
  expect(HoldingReconciliationRun.create.mock.invocationCallOrder[0]).toBeLessThan(PositionExitRun.create.mock.invocationCallOrder[0]);
  expect(PositionExitRun.create).toHaveBeenCalledWith(expect.objectContaining({ input_provenance: expect.objectContaining({ reconciliation_run_id: 'reconciliation-run' }) }), { transaction: 'tx' });
});
