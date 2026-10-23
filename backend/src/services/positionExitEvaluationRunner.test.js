'use strict';
const { runPositionExitEvaluation } = require('./positionExitEvaluationRunner');
const guidance = { id: 'g1', stock_id: 's1', created_at: new Date(), payload: { version: 'position_exit_rule_v1', as_of: '2026-01-01', provider: 'vnstock', reference: { close: 100 }, levels: { active_stop: 95, take_profit_review: 110 } } };
const { hash } = require('./positionExitEvaluationPersistence');
guidance.payload = { ...guidance.payload, status: 'hold', research_only: true, price_basis: { price_unit: 'VND', currency: 'VND', is_adjusted: false } };
guidance.payload_sha256 = hash(guidance.payload);
test('reads bounded stored EOD only and seals a pending evaluation', async () => {
  const PositionExitGuidance = { findAll: jest.fn().mockResolvedValue([guidance]) };
  const PositionExitEvaluation = { findOne: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'e1' }) };
  const StockPrice = { sequelize: { query: jest.fn().mockResolvedValue([[{ observed_at: '2026-01-02T00:00:00Z', close: 101, provider: 'vnstock', interval: '1d', price_unit: 'VND', currency: 'VND', is_adjusted: false }]]) } };
  const result = await runPositionExitEvaluation({ PositionExitGuidance, PositionExitEvaluation, StockPrice });
  expect(result).toMatchObject({ status: 'completed', result_summary: { scanned: 1, created: 1, evaluated: 1, pending: 2, provider_requests: 0 } });
  expect(PositionExitEvaluation.create).toHaveBeenCalledTimes(1);
  expect(StockPrice.sequelize.query.mock.calls[0][0]).toContain('LIMIT 20');
});
test('reports no snapshots without querying prices', async () => {
  const PositionExitGuidance = { findAll: jest.fn().mockResolvedValue([]) }; const PositionExitEvaluation = { findOne: jest.fn() }; const StockPrice = { sequelize: { query: jest.fn() } };
  await expect(runPositionExitEvaluation({ PositionExitGuidance, PositionExitEvaluation, StockPrice })).resolves.toMatchObject({ status: 'no_snapshots', result_summary: { scanned: 0 } });
  expect(StockPrice.sequelize.query).not.toHaveBeenCalled();
});

test('pending horizons mature on later runs without overwriting existing evidence', async () => {
  const ledger = new Map();
  const PositionExitGuidance = { findAll: jest.fn().mockResolvedValue([guidance]) };
  const PositionExitEvaluation = {
    findOne: jest.fn(async ({ where }) => ledger.get(where.horizon_days)),
    findOrCreate: jest.fn(async ({ where, defaults }) => { const row = { id: `h${where.horizon_days}`, ...defaults }; ledger.set(where.horizon_days, row); return [row, true]; })
  };
  const price = index => ({ observed_at: new Date(Date.UTC(2026, 0, index + 2)).toISOString(), close: 101 + index, provider: 'vnstock', interval: '1d', ...guidance.payload.price_basis });
  const StockPrice = { sequelize: { query: jest.fn().mockResolvedValue([Array.from({ length: 1 }, (_, i) => price(i))]) } };
  const dependencies = { PositionExitGuidance, PositionExitEvaluation, StockPrice };
  await runPositionExitEvaluation(dependencies);
  const frozen = JSON.stringify(ledger.get(1));
  StockPrice.sequelize.query.mockResolvedValue([Array.from({ length: 20 }, (_, i) => price(i))]);
  const mature = await runPositionExitEvaluation(dependencies);
  expect(mature.result_summary).toMatchObject({ created: 2, existing: 1, pending: 0 });
  expect(ledger.size).toBe(3);
  expect(JSON.stringify(ledger.get(1))).toBe(frozen);
  expect((await runPositionExitEvaluation(dependencies)).result_summary).toMatchObject({ created: 0, existing: 3 });
});

test('tampered guidance is excluded without querying provider or prices', async () => {
  const PositionExitGuidance = { findAll: jest.fn().mockResolvedValue([{ ...guidance, payload_sha256: 'bad' }]) };
  const PositionExitEvaluation = { findOne: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'e' }) };
  const StockPrice = { sequelize: { query: jest.fn() } };
  expect((await runPositionExitEvaluation({ PositionExitGuidance, PositionExitEvaluation, StockPrice })).result_summary).toMatchObject({ excluded: 3, created: 3 });
  expect(StockPrice.sequelize.query).not.toHaveBeenCalled();
});
