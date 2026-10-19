const { normalizeAllocationTargets, summarizeAllocationTargets } = require('./portfolioAllocationTargets');

test('rejects duplicate targets and totals above 100 percent', () => {
  expect(normalizeAllocationTargets({ targets: [{ stock_id: 'a', target_weight_pct: 60 }, { stock_id: 'a', target_weight_pct: 20 }] }).error).toBeTruthy();
  expect(normalizeAllocationTargets({ targets: [{ stock_id: 'a', target_weight_pct: 60 }, { stock_id: 'b', target_weight_pct: 50 }] }).error).toContain('100%');
});

test('reports only material allocation deviations', () => {
  const summary = summarizeAllocationTargets({ positions: [{ stock_id: 'a', symbol: 'FPT', market_value: 700 }, { stock_id: 'b', symbol: 'VCB', market_value: 300 }], targets: [{ stock_id: 'a', target_weight_pct: 60, alert_threshold_pct: 5 }, { stock_id: 'b', target_weight_pct: 40, alert_threshold_pct: 15 }] });
  expect(summary.alerts).toEqual([expect.objectContaining({ symbol: 'FPT', deviation_pct: 10, status: 'outside_target' })]);
  expect(summary.unallocated_target_weight_pct).toBe(0);
});
