const { buildRiskPlan } = require('./riskPlan');

test('builds transparent horizon plan only with sufficient quality', () => {
  const rows = Array.from({ length: 30 }, (_, index) => ({ close: 100 + index }));
  const plan = buildRiskPlan(rows, { status: 'pass' });
  expect(plan.status).toBe('available');
  expect(plan.horizons.short_term.stop_loss).toBeLessThan(plan.current_price);
  expect(plan.horizons.short_term.take_profit).toBeGreaterThan(plan.current_price);
  expect(plan.disclaimer).toMatch(/không phải lời khuyên/);
});

test('blocks plan when history is insufficient', () => {
  expect(buildRiskPlan([{ close: 100 }], { status: 'pass' }).status).toBe('insufficient_data');
});

test('keeps every actionable stop loss below and take profit above current price', () => {
  const plan = buildRiskPlan(Array.from({ length: 30 }, (_, index) => ({ close: 100 + index })), { status: 'pass' });
  expect(plan.horizons.medium_term.stop_loss).toBeLessThan(plan.current_price);
  expect(plan.horizons.medium_term.take_profit).toBeGreaterThan(plan.current_price);
  expect(plan.horizons.long_term.stop_loss).toBeLessThan(plan.current_price);
  expect(plan.horizons.long_term.take_profit).toBeNull();
});
