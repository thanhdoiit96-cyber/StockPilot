'use strict';

const { aggregateInvestorCashFlows, calculatePortfolioXirr } = require('./portfolioXirr');

test('calculates a unique annualized MWR and independently verifies its NPV residual', () => {
  const input = { cashFlows: [{ type: 'DEPOSIT', amount: 100000, occurred_at: '2025-01-01T03:00:00Z' }], terminalValue: 110000, terminalDate: '2026-01-01', valuationComplete: true };
  const result = calculatePortfolioXirr(input);
  expect(result).toMatchObject({ status: 'available', methodology: 'xirr_actual_365_v1', scope: 'inception_to_terminal', annualized_mwr_pct: 10, roots_pct: [10] });
  const entries = aggregateInvestorCashFlows(input.cashFlows, input.terminalValue, input.terminalDate).entries;
  const independentlyEvaluatedNpv = entries.reduce((sum, row) => sum + row.amount / ((1 + result.annualized_mwr_pct / 100) ** row.years), 0);
  expect(Math.abs(independentlyEvaluatedNpv)).toBeLessThanOrEqual(0.01);
});

test('uses investor-perspective signs and aggregates terminal value on the same date', () => {
  const aggregated = aggregateInvestorCashFlows([
    { type: 'DEPOSIT', amount: 100, occurred_at: '2025-01-01T03:00:00Z' },
    { type: 'WITHDRAWAL', amount: 20, occurred_at: '2026-01-01T03:00:00Z' }
  ], 90, '2026-01-01');
  expect(aggregated.entries.map(({ date, amount }) => ({ date, amount }))).toEqual([{ date: '2025-01-01', amount: -100 }, { date: '2026-01-01', amount: 110 }]);
});

test('does not publish an arbitrary rate when the cash-flow pattern has two valid roots', () => {
  const result = calculatePortfolioXirr({
    cashFlows: [
      { type: 'DEPOSIT', amount: 100, occurred_at: '2024-01-01T03:00:00Z' },
      { type: 'WITHDRAWAL', amount: 230, occurred_at: '2024-12-31T03:00:00Z' },
      { type: 'DEPOSIT', amount: 132, occurred_at: '2025-12-31T03:00:00Z' }
    ],
    terminalValue: 0,
    terminalDate: '2025-12-31',
    valuationComplete: true
  });
  expect(result.status).toBe('multiple_roots');
  expect(result.annualized_mwr_pct).toBeNull();
  expect(result.roots_pct).toEqual([10, 20]);
});

test('returns no_root for a sign-changing series without a real solution', () => {
  const result = calculatePortfolioXirr({ cashFlows: [
    { type: 'DEPOSIT', amount: 100, occurred_at: '2024-01-01T03:00:00Z' },
    { type: 'WITHDRAWAL', amount: 100, occurred_at: '2024-12-31T03:00:00Z' },
    { type: 'DEPOSIT', amount: 100, occurred_at: '2025-12-31T03:00:00Z' }
  ], terminalValue: 0, terminalDate: '2025-12-31', valuationComplete: true });
  expect(result).toMatchObject({ status: 'no_root', annualized_mwr_pct: null, roots_pct: [] });
});

test.each([
  [{ cashFlows: [], terminalValue: 100, terminalDate: '2026-01-01', valuationComplete: true }, 'insufficient_sign_change'],
  [{ cashFlows: [{ type: 'DEPOSIT', amount: 100, occurred_at: '2026-01-02T03:00:00Z' }], terminalValue: 100, terminalDate: '2026-01-01', valuationComplete: true }, 'external_cash_flow_after_terminal'],
  [{ cashFlows: [{ type: 'DEPOSIT', amount: 100, occurred_at: '2025-01-01T03:00:00Z' }], terminalValue: 100, terminalDate: '2026-01-01', valuationComplete: false }, 'partial_valuation']
])('withholds MWR with an explicit reason', (input, reason) => {
  expect(calculatePortfolioXirr(input)).toMatchObject({ status: 'unavailable', reason, annualized_mwr_pct: null });
});
