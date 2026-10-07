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

test('starts history at first portfolio activity and identifies an unfunded purchase', () => {
  const result = buildDailyValuationSeries({
    transactions: [{ stock_id: 's', side: 'BUY', quantity: 10, price: 10000, fees: 0, traded_at: '2026-10-02T02:00:00Z' }],
    priceRows: prices,
    sessionDates: ['2026-10-01', '2026-10-02', '2026-10-03']
  });
  expect(result.first_activity_date).toBe('2026-10-02');
  expect(result.points.map(point => point.date)).toEqual(['2026-10-02', '2026-10-03']);
  expect(result.coverage).toEqual({ sessions: 2, complete_sessions: 0, incomplete_sessions: 2 });
  expect(result.points[0]).toMatchObject({ status: 'partial', incomplete_reasons: ['negative_cash_balance'] });
});

test('reports missing prices separately from cash and unresolved events', () => {
  const result = buildDailyValuationSeries({
    transactions: [{ stock_id: 's', side: 'BUY', quantity: 1, price: 10000, fees: 0, traded_at: '2026-10-01T02:00:00Z' }],
    cashFlows: [{ type: 'DEPOSIT', amount: 10000, occurred_at: '2026-10-01T01:00:00Z' }],
    priceRows: [prices[0]], sessionDates: ['2026-10-01', '2026-10-02']
  });
  expect(result.points[1].incomplete_reasons).toEqual(['missing_prices']);
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

test('treats a confirmed cash dividend as investment return rather than external cash flow', () => {
  const flatPrices = prices.map(row => ({ ...row, close: 10000 }));
  const result = buildDailyValuationSeries({
    transactions: [{ stock_id: 's', side: 'BUY', quantity: 10, price: 10000, fees: 0, traded_at: '2026-10-01T02:00:00Z' }],
    cashFlows: [{ type: 'DEPOSIT', amount: 100000, occurred_at: '2026-10-01T01:00:00Z' }],
    portfolioEvents: [{ id: 'div-1', stock_id: 's', event_type: 'CASH_DIVIDEND', status: 'CONFIRMED', payment_date: '2026-10-02', payload: { net_cash_amount: 1000 } }],
    priceRows: flatPrices
  });
  expect(result).toMatchObject({ status: 'complete', twr_available: true, cumulative_twr_pct: 1, event_coverage: { applied_events: 1, pending_events: 0, unsupported_events: 0 } });
  expect(result.points[1]).toMatchObject({ portfolio_value: 101000, cash_balance: 1000, dividend_income: 1000, external_cash_flow: 0, daily_return_pct: 1 });
  expect(result.points[2]).toMatchObject({ portfolio_value: 101000, dividend_income: 0, daily_return_pct: 0 });
});

test('marks coverage partial from a due pending event and withholds TWR without silently skipping it', () => {
  const result = buildDailyValuationSeries({
    cashFlows: [{ type: 'DEPOSIT', amount: 100000, occurred_at: '2026-10-01T01:00:00Z' }],
    portfolioEvents: [{ id: 'pending-dividend', event_type: 'CASH_DIVIDEND', status: 'PENDING', payment_date: '2026-10-02', payload: { net_cash_amount: 1000 } }],
    sessionDates: ['2026-10-01', '2026-10-02', '2026-10-03']
  });
  expect(result).toMatchObject({ status: 'partial', twr_available: false, coverage: { sessions: 3, complete_sessions: 1, incomplete_sessions: 2 }, event_coverage: { applied_events: 0, pending_events: 1, unsupported_events: 0 } });
  expect(result.limitations).toContain('pending_portfolio_events');
  expect(result.points[1]).toMatchObject({ status: 'partial', portfolio_value: null, unresolved_event_ids: ['pending-dividend'] });
  expect(result.points[2].unresolved_event_ids).toEqual(['pending-dividend']);
});

test('does not auto-exercise an entitlement when confirmed exercised quantity is zero', () => {
  const result = buildDailyValuationSeries({
    transactions: [{ stock_id: 's', side: 'BUY', quantity: 10, price: 10000, fees: 0, traded_at: '2026-10-01T02:00:00Z' }],
    cashFlows: [{ type: 'DEPOSIT', amount: 150000, occurred_at: '2026-10-01T01:00:00Z' }],
    portfolioEvents: [{ id: 'rights-zero', stock_id: 's', event_type: 'RIGHTS_ISSUE', status: 'CONFIRMED', effective_date: '2026-10-02', payload: { ratio_numerator: 1, ratio_denominator: 5, subscription_price: 10000, exercised_quantity: 0, exercise_cash_amount: 0 } }],
    priceRows: prices.map(row => ({ ...row, close: 10000 }))
  });
  expect(result).toMatchObject({ status: 'complete', cumulative_twr_pct: 0, event_coverage: { applied_events: 1, pending_events: 0, unsupported_events: 0 } });
  expect(result.points[1]).toMatchObject({ cash_balance: 50000, total_cost_basis: 100000, external_cash_flow: 0, stock_event_adjustments: [{ event_id: 'rights-zero', quantity_before: 10, quantity_after: 10, cost_basis_before: 100000, cost_basis_after: 100000, cash_change: 0 }] });
});

test('applies only confirmed exercised rights to quantity, cash and cost basis', () => {
  const result = buildDailyValuationSeries({
    transactions: [{ stock_id: 's', side: 'BUY', quantity: 10, price: 10000, fees: 0, traded_at: '2026-10-01T02:00:00Z' }],
    cashFlows: [{ type: 'DEPOSIT', amount: 150000, occurred_at: '2026-10-01T01:00:00Z' }],
    portfolioEvents: [{ id: 'rights-partial', stock_id: 's', event_type: 'RIGHTS_ISSUE', status: 'CONFIRMED', effective_date: '2026-10-02', payload: { ratio_numerator: 1, ratio_denominator: 5, subscription_price: 10000, exercised_quantity: 1, exercise_cash_amount: 10000 } }],
    priceRows: prices.map(row => ({ ...row, close: 10000 }))
  });
  expect(result).toMatchObject({ status: 'complete', twr_available: true, cumulative_twr_pct: 0, event_coverage: { applied_events: 1, unsupported_events: 0 } });
  expect(result.points[1]).toMatchObject({ portfolio_value: 150000, cash_balance: 40000, total_cost_basis: 110000, external_cash_flow: 0, daily_return_pct: 0, stock_event_adjustments: [{ event_id: 'rights-partial', quantity_before: 10, quantity_after: 11, cost_basis_before: 100000, cost_basis_after: 110000, cash_change: -10000, average_cost_after: 10000 }] });
});

test('applies a whole-share stock split before same-day trades while preserving cost basis and valuation continuity', () => {
  const result = buildDailyValuationSeries({
    transactions: [{ stock_id: 's', side: 'BUY', quantity: 10, price: 10000, fees: 0, traded_at: '2026-10-01T02:00:00Z' }],
    cashFlows: [{ type: 'DEPOSIT', amount: 100000, occurred_at: '2026-10-01T01:00:00Z' }],
    portfolioEvents: [{ id: 'split', stock_id: 's', event_type: 'STOCK_SPLIT', status: 'CONFIRMED', effective_date: '2026-10-02', payload: { ratio_numerator: 2, ratio_denominator: 1 } }],
    priceRows: [prices[0], { ...prices[1], close: 5000 }, { ...prices[2], close: 5000 }]
  });
  expect(result).toMatchObject({ status: 'complete', twr_available: true, cumulative_twr_pct: 0, event_coverage: { applied_events: 1, unsupported_events: 0 }, fractional_share_policy: 'whole_share_only_v1_cash_in_lieu_not_inferred' });
  expect(result.points[1]).toMatchObject({ portfolio_value: 100000, total_cost_basis: 100000, daily_return_pct: 0, stock_event_adjustments: [{ event_id: 'split', quantity_before: 10, quantity_after: 20, cost_basis_before: 100000, cost_basis_after: 100000, average_cost_after: 5000 }] });
});

test('applies confirmed stock dividend received quantity without changing total cost basis', () => {
  const adjustedPrice = 100000 / 12;
  const result = buildDailyValuationSeries({
    transactions: [{ stock_id: 's', side: 'BUY', quantity: 10, price: 10000, fees: 0, traded_at: '2026-10-01T02:00:00Z' }],
    cashFlows: [{ type: 'DEPOSIT', amount: 100000, occurred_at: '2026-10-01T01:00:00Z' }],
    portfolioEvents: [{ id: 'stock-div', stock_id: 's', event_type: 'STOCK_DIVIDEND', status: 'CONFIRMED', effective_date: '2026-10-02', payload: { ratio_numerator: 2, ratio_denominator: 10, received_quantity: 2 } }],
    priceRows: [prices[0], { ...prices[1], close: adjustedPrice }, { ...prices[2], close: adjustedPrice }]
  });
  expect(result.event_coverage.applied_events).toBe(1);
  expect(result.points[1].stock_event_adjustments[0]).toMatchObject({ quantity_before: 10, quantity_after: 12, cost_basis_after: 100000 });
  expect(result.points[1].stock_event_adjustments[0].average_cost_after).toBeCloseTo(adjustedPrice, 6);
  expect(result.points[1].portfolio_value).toBeCloseTo(100000, 6);
});

test('does not infer rounding or cash in lieu when a split creates fractional shares', () => {
  const result = buildDailyValuationSeries({
    transactions: [{ stock_id: 's', side: 'BUY', quantity: 3, price: 10000, fees: 0, traded_at: '2026-10-01T02:00:00Z' }],
    cashFlows: [{ type: 'DEPOSIT', amount: 30000, occurred_at: '2026-10-01T01:00:00Z' }],
    portfolioEvents: [{ id: 'fractional-split', stock_id: 's', event_type: 'STOCK_SPLIT', status: 'CONFIRMED', effective_date: '2026-10-02', payload: { ratio_numerator: 1, ratio_denominator: 2 } }],
    priceRows: prices
  });
  expect(result).toMatchObject({ status: 'partial', twr_available: false, fractional_share_policy: 'whole_share_only_v1_cash_in_lieu_not_inferred', event_coverage: { applied_events: 0, unsupported_events: 1 } });
  expect(result.points[1]).toMatchObject({ portfolio_value: null, unresolved_event_ids: ['fractional-split'], stock_event_adjustments: [] });
});
