const { normalizeTransactionPrice, normalizeRecommendationContext, vietnamTradingDate, uniqueForwardSessions, evaluateRecommendationEntry, summarizePortfolioHoldings, summarizePortfolioTransactions } = require('./portfolioAccounting');

test('normalizes legacy thousand-unit input to VND per share', () => {
  expect(normalizeTransactionPrice(21.55)).toBe(21550);
  expect(normalizeTransactionPrice(21550)).toBe(21550);
});

test('stores only a valid recommendation snapshot with a portfolio buy', () => {
  expect(normalizeRecommendationContext({ source: 'personalized', symbol: 'FPT', model: 'personalized_rule_v1', generated_at: '2026-09-22T03:00:00.000Z', horizon_days: 20, score: 82.4, rank: 1, expected_entry_price: 120000, criteria: { trend: 30, momentum: 25 } }, 'FPT')).toMatchObject({ source: 'personalized', symbol: 'FPT', horizon_days: 20, score: 82.4, expected_entry_price: 120000, criteria: { trend: 30, momentum: 25 } });
  expect(() => normalizeRecommendationContext({ source: 'personalized', symbol: 'MWG', generated_at: '2026-09-22', horizon_days: 20, score: 80, expected_entry_price: 120000 }, 'FPT')).toThrow(/không hợp lệ/);
  expect(() => normalizeRecommendationContext({ source: 'unknown', generated_at: 'bad', horizon_days: 90, score: 130, expected_entry_price: 0 })).toThrow(/không hợp lệ/);
  expect(normalizeRecommendationContext(null)).toBeNull();
});

test('evaluates a recommendation at its configured forward session and waits for missing sessions', () => {
  const recommendation = { horizon_days: 3, expected_entry_price: 100 };
  const futureRows = [{ observed_at: '2026-09-23', close: 101 }, { observed_at: '2026-09-24', close: 102 }, { observed_at: '2026-09-25', close: 110 }];
  expect(evaluateRecommendationEntry({ recommendation, actualEntryPrice: 103, currentEodPrice: 110, futureRows })).toMatchObject({ status: 'evaluated', sessions_observed: 3, horizon_price: 110, forward_return_pct: 10, outcome: 'positive' });
  expect(evaluateRecommendationEntry({ recommendation, futureRows: futureRows.slice(0, 2) })).toMatchObject({ status: 'pending', sessions_observed: 2, forward_return_pct: null, outcome: 'pending' });
});

test('counts one daily forward session per Vietnam trading date and ignores intraday rows', () => {
  const rows = [
    { id: '1', interval: '1d', observed_at: '2026-09-23T09:00:00+07:00', close: 100 },
    { id: '2', interval: '1d', observed_at: '2026-09-23T16:00:00+07:00', close: 101 },
    { id: '3', interval: 'intraday', observed_at: '2026-09-24T10:00:00+07:00', close: 105 },
    { id: '4', interval: '1d', observed_at: '2026-09-24T16:00:00+07:00', close: 102 }
  ];
  const sessions = uniqueForwardSessions(rows, '2026-09-22T10:00:00+07:00');
  expect(vietnamTradingDate('2026-09-22T18:00:00Z')).toBe('2026-09-23');
  expect(sessions).toHaveLength(2);
  expect(sessions.map(row => row.close)).toEqual([101, 102]);
  expect(evaluateRecommendationEntry({ recommendation: { horizon_days: 2, expected_entry_price: 100 }, futureRows: sessions })).toMatchObject({ status: 'evaluated', sessions_observed: 2, horizon_price: 102, forward_return_pct: 2 });
});

test('uses weighted average cost and preserves it after a partial sale', () => {
  const positions = summarizePortfolioTransactions([
    { stock_id: 'a', side: 'BUY', quantity: '10', price: '10000', fees: '10', Stock: { code: 'FPT' } },
    { stock_id: 'a', side: 'BUY', quantity: '10', price: '20000', fees: '0' },
    { stock_id: 'a', side: 'SELL', quantity: '5', price: '18000', fees: '5' }
  ], new Map([['a', 19000]]));
  expect(positions[0]).toMatchObject({ quantity: 15, avg_cost: 15000.5, market_price: 19000, market_value: 285000, unrealized_pnl: 59992.5 });
  expect(positions[0].realized_pnl).toBeCloseTo(14992.5, 8);
});

test('orders are supplied by the controller with created_at tie-breaker', () => {
  const positions = summarizePortfolioTransactions([
    { stock_id: 'a', side: 'BUY', quantity: 2, price: 10000, fees: 0 },
    { stock_id: 'a', side: 'SELL', quantity: 1, price: 12000, fees: 0 }
  ]);
  expect(positions[0].avg_cost).toBe(10000);
  expect(positions[0].quantity).toBe(1);
});

test('keeps a fully sold symbol as a closed holding with realized P/L', () => {
  const holdings = summarizePortfolioHoldings([
    { stock_id: 'a', side: 'BUY', quantity: 10, price: 10000, fees: 100, traded_at: '2026-09-01T03:00:00Z', Stock: { code: 'FPT', name: 'FPT Corp' } },
    { stock_id: 'a', side: 'SELL', quantity: 10, price: 12000, fees: 100, traded_at: '2026-09-10T03:00:00Z', Stock: { code: 'FPT', name: 'FPT Corp' } }
  ], new Map([['a', 13000]]));
  expect(holdings).toEqual([expect.objectContaining({
    stock_id: 'a', symbol: 'FPT', status: 'closed', quantity: 0, market_price: null,
    unrealized_pnl: null, realized_pnl: 19800, closed_at: '2026-09-10T03:00:00Z'
  })]);
  expect(summarizePortfolioTransactions([
    { stock_id: 'a', side: 'BUY', quantity: 1, price: 10000, fees: 0 },
    { stock_id: 'a', side: 'SELL', quantity: 1, price: 12000, fees: 0 }
  ])).toEqual([]);
});
