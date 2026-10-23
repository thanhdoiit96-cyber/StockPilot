'use strict';
const { runPositionExitEvaluation } = require('./positionExitEvaluationRunner');
const guidance = { id: 'g1', stock_id: 's1', created_at: new Date(), payload: { version: 'position_exit_rule_v1', as_of: '2026-01-01', provider: 'vnstock', reference: { close: 100 }, levels: { active_stop: 95, take_profit_review: 110 } } };
test('reads bounded stored EOD only and seals a pending evaluation', async () => {
  const PositionExitGuidance = { findAll: jest.fn().mockResolvedValue([guidance]) };
  const PositionExitEvaluation = { findOne: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'e1' }) };
  const StockPrice = { sequelize: { query: jest.fn().mockResolvedValue([[{ observed_at: '2026-01-02T00:00:00Z', close: 101 }]]) } };
  const result = await runPositionExitEvaluation({ PositionExitGuidance, PositionExitEvaluation, StockPrice });
  expect(result).toMatchObject({ status: 'completed', result_summary: { scanned: 1, pending: 1, provider_requests: 0 } });
  expect(StockPrice.sequelize.query.mock.calls[0][0]).toContain('LIMIT 20');
});
test('reports no snapshots without querying prices', async () => {
  const PositionExitGuidance = { findAll: jest.fn().mockResolvedValue([]) }; const PositionExitEvaluation = { findOne: jest.fn() }; const StockPrice = { sequelize: { query: jest.fn() } };
  await expect(runPositionExitEvaluation({ PositionExitGuidance, PositionExitEvaluation, StockPrice })).resolves.toMatchObject({ status: 'no_snapshots', result_summary: { scanned: 0 } });
  expect(StockPrice.sequelize.query).not.toHaveBeenCalled();
});
