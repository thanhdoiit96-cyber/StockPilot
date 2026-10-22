'use strict';
const { prepareHoldingReconciliationSnapshot, holdingReconciliationGenerationKey, holdingReconciliationSnapshotHash, sealHoldingReconciliationSnapshot } = require('./holdingReconciliationPersistence');

const transaction = { stock_id: 's', side: 'BUY', quantity: 10, price: 10000, fees: 0, traded_at: '2026-01-01T03:00:00Z' };

test('prepares deterministic, as-of-scoped reconciliation evidence', () => {
  const first = prepareHoldingReconciliationSnapshot({ portfolioId: 'p', asOf: '2026-01-02', transactions: [transaction] });
  const second = prepareHoldingReconciliationSnapshot({ portfolioId: 'p', asOf: '2026-01-02', transactions: [transaction] });
  expect(first.applications[0]).toMatchObject({ stock_id: 's', status: 'reconciled', quantity: 10, avg_cost: 10000 });
  const key = holdingReconciliationGenerationKey({ portfolioId: 'p', asOf: first.as_of, inputHash: first.input_provenance_sha256 });
  expect(key).toHaveLength(64);
  expect(holdingReconciliationSnapshotHash({ portfolioId: 'p', asOf: first.as_of, inputHash: first.input_provenance_sha256, applications: first.applications })).toBe(holdingReconciliationSnapshotHash({ portfolioId: 'p', asOf: second.as_of, inputHash: second.input_provenance_sha256, applications: second.applications }));
});

test('seals a reconciliation run and per-stock payload without an external call', async () => {
  const HoldingReconciliationRun = { findOne: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'run' }) };
  const HoldingReconciliationApplication = { bulkCreate: jest.fn().mockResolvedValue([]) };
  const result = await sealHoldingReconciliationSnapshot({ HoldingReconciliationRun, HoldingReconciliationApplication, portfolioId: 'p', asOf: '2026-01-02', transactions: [transaction], now: new Date('2026-01-03T00:00:00Z'), transaction: 'db-transaction' });
  expect(result).toMatchObject({ status: 'created', run_id: 'run', applications: [expect.objectContaining({ status: 'reconciled' })] });
  expect(HoldingReconciliationRun.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'sealed', model: 'current_holding_reconciliation_v1' }), { transaction: 'db-transaction' });
  expect(HoldingReconciliationApplication.bulkCreate).toHaveBeenCalledWith([expect.objectContaining({ run_id: 'run', stock_id: 's', payload_sha256: expect.any(String) })], { transaction: 'db-transaction' });
});
