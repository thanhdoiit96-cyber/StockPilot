const { buildDailyValuationSeries } = require('./portfolioValuation');

const prices = [
  { id: 'p1', stock_id: 's', interval: '1d', observed_at: '2026-10-01T09:00:00Z', close: 10000 },
  { id: 'p2', stock_id: 's', interval: '1d', observed_at: '2026-10-02T09:00:00Z', close: 11000 },
  { id: 'p3', stock_id: 's', interval: '1d', observed_at: '2026-10-03T09:00:00Z', close: 12100 }
];

test('builds daily close valuation and TWR with beginning-of-session external flows', () => {
  const result = buildDailyValuationSeries({
    transactions: [{ stock_id: 's', side: 'BUY', quantity: 10, price: 10000, fees: 0, traded_at: '2026-10-01T02:00:00Z' }],
    cashFlows: [
      { type: 'DEPOSIT', amount: 100000, occurred_at: '2026-10-01T01:00:00Z' },
      { type: 'DEPOSIT', amount: 10000, occurred_at: '2026-10-03T01:00:00Z' }
    ], priceRows: prices, sessions: 30
  });
  expect(result).toMatchObject({ status: 'complete', twr_available: true, cumulative_twr_pct: 20.083333, coverage: { sessions: 3, complete_sessions: 3, incomplete_sessions: 0 } });
  expect(result.points.map(point => point.portfolio_value)).toEqual([100000, 110000, 131000]);
  expect(result.points[1].daily_return_pct).toBe(10);
  expect(result.points[2]).toMatchObject({ external_cash_flow: 10000, daily_return_pct: 9.166667, cumulative_twr_pct: 20.083333 });
});

test('withholds TWR and valuation when exact prices are missing', () => {
  const result = buildDailyValuationSeries({
    transactions: [{ stock_id: 's', side: 'BUY', quantity: 10, price: 10000, fees: 0, traded_at: '2026-10-01T02:00:00Z' }],
    cashFlows: [{ type: 'DEPOSIT', amount: 100000, occurred_at: '2026-10-01T01:00:00Z' }],
    priceRows: [prices[0], prices[2]], sessionDates: ['2026-10-01', '2026-10-02', '2026-10-03']
  });
  expect(result.coverage).toEqual({ sessions: 3, complete_sessions: 2, incomplete_sessions: 1 });
  expect(result.twr_available).toBe(false);
  expect(result.cumulative_twr_pct).toBeNull();
  expect(result.points[1]).toMatchObject({ status: 'partial', priced_positions: 0, open_positions: 1, portfolio_value: null });
});

test('marks legacy portfolios without funding as partial instead of publishing false returns', () => {
  const result = buildDailyValuationSeries({ transactions: [{ stock_id: 's', side: 'BUY', quantity: 10, price: 10000, fees: 0, traded_at: '2026-10-01T02:00:00Z' }], priceRows: prices });
  expect(result.status).toBe('partial');
  expect(result.twr_available).toBe(false);
  expect(result.cumulative_twr_pct).toBeNull();
  expect(result.points[0]).toMatchObject({ status: 'partial', cash_balance: -100000, portfolio_value: null, daily_return_pct: null });
});

test('requires every held symbol to have an exact session price', () => {
  const result = buildDailyValuationSeries({
    transactions: [{ stock_id: 's', side: 'BUY', quantity: 1, price: 10000, fees: 0, traded_at: '2026-10-01T02:00:00Z' }, { stock_id: 'missing', side: 'BUY', quantity: 1, price: 5000, fees: 0, traded_at: '2026-10-01T02:00:00Z' }],
    cashFlows: [{ type: 'DEPOSIT', amount: 15000, occurred_at: '2026-10-01T01:00:00Z' }], priceRows: prices
  });
  expect(result.status).toBe('partial');
  expect(result.points[0]).toMatchObject({ priced_positions: 1, open_positions: 2, market_value: null, portfolio_value: null, missing_stock_ids: ['missing'] });
});

test('bounds requested sessions and deduplicates the latest price in a Vietnam session', () => {
  const result = buildDailyValuationSeries({ cashFlows: [{ type: 'DEPOSIT', amount: 10000, occurred_at: '2026-10-01T01:00:00Z' }], priceRows: [...prices, { id: 'later', stock_id: 's', interval: '1d', observed_at: '2026-10-01T10:00:00Z', close: 10500 }], sessions: 999 });
  expect(result.requested_sessions).toBe(260);
  expect(result.points).toHaveLength(3);
});
