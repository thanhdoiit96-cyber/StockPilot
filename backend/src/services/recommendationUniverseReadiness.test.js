'use strict';

const { recommendationUniverseReadiness, vietnamSessionDate } = require('./recommendationUniverseReadiness');

test('uses Vietnam calendar dates at the EOD universe boundary', () => {
  expect(vietnamSessionDate('2026-10-01T18:00:00.000Z')).toBe('2026-10-02');
});

test('requires every model-eligible symbol to have the latest EOD close', () => {
  const stocks = [{ id: 'a', code: 'AAA' }, { id: 'b', code: 'BBB' }, { id: 'c', code: 'CCC' }];
  const prices = [
    ...['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01'].map((observed_at, index) => ({ stock_id: 'a', observed_at, close: 10 + index })),
    ...['2026-09-28', '2026-09-29', '2026-09-30'].map((observed_at, index) => ({ stock_id: 'b', observed_at, close: 20 + index })),
    { stock_id: 'c', observed_at: '2026-10-01', close: 0 },
  ];
  expect(recommendationUniverseReadiness({ stocks, prices, minimumHistoricalSessions: 3 })).toMatchObject({
    latest_eod_session: '2026-10-01', model_universe_symbols: 2, eligible_symbols: 1,
    missing_symbols: ['BBB'], ready_for_recommendations: false,
  });
});

test('does not let duplicate, invalid or newly listed rows satisfy the history gate', () => {
  const result = recommendationUniverseReadiness({
    stocks: [{ id: 'a', code: 'AAA' }, { id: 'b', code: 'BBB' }],
    prices: [
      { stock_id: 'a', observed_at: '2026-09-29', close: 10 }, { stock_id: 'a', observed_at: '2026-09-29T08:00:00Z', close: 10 },
      { stock_id: 'a', observed_at: '2026-09-30', close: 11 }, { stock_id: 'a', observed_at: '2026-10-01', close: 12 },
      { stock_id: 'b', observed_at: '2026-09-30', close: 0 }, { stock_id: 'b', observed_at: 'invalid', close: 20 },
    ], minimumHistoricalSessions: 2,
  });
  expect(result).toMatchObject({ model_universe_symbols: 1, eligible_symbols: 1, ready_for_recommendations: true });
  expect(result.coverage.find(item => item.code === 'AAA')).toMatchObject({ historical_sessions: 2, observations: 3 });
});

test('ignores price rows belonging to stocks outside the listed universe', () => {
  const result = recommendationUniverseReadiness({
    stocks: [{ id: 'a', code: 'AAA' }],
    prices: [
      { stock_id: 'a', observed_at: '2026-10-01', close: 10 },
      { stock_id: 'delisted', observed_at: '2026-10-02', close: 20 },
    ], minimumHistoricalSessions: 1,
  });
  expect(result).toMatchObject({ latest_eod_session: '2026-10-01', price_rows: 1, model_universe_symbols: 0 });
});
