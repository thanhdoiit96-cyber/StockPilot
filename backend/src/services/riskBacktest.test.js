const { backtestRiskPlan } = require('./riskBacktest');
test('runs a walk-forward backtest without future leakage', () => {
  const rows = Array.from({ length: 80 }, (_, index) => ({ close: 100 + index * 0.2 }));
  const result = backtestRiskPlan(rows, 10);
  expect(result.eligible).toBeGreaterThan(0);
  expect(result.outcomes.take_profit + result.outcomes.stop_loss + result.outcomes.neither).toBe(result.eligible);
  expect(result.rates.take_profit + result.rates.stop_loss + result.rates.neither).toBeCloseTo(100, 1);
});
