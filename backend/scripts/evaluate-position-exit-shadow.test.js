'use strict';
jest.mock('../src/models', () => ({ PositionExitGuidance: {}, PositionExitEvaluation: {}, StockPrice: {}, sequelize: { close: jest.fn() } }));
jest.mock('../src/services/positionExitEvaluationRunner', () => ({ runPositionExitEvaluation: jest.fn().mockResolvedValue({ status: 'no_snapshots' }) }));
test('script source keeps shadow evaluation opt-in and bounded', () => {
  const source = require('fs').readFileSync(require('path').join(__dirname, 'evaluate-position-exit-shadow.cjs'), 'utf8');
  expect(source).toContain("EXIT_GUIDANCE_EVALUATION_ENABLED !== 'true'");
  expect(source).toContain('limit > 100');
});
