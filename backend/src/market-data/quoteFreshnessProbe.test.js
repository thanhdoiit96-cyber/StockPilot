const { marketPhaseAt, runQuoteFreshnessProbe } = require('../../scripts/verify-quote-freshness.cjs');

test.each([
  ['2026-09-23T02:00:00.000Z', 'morning_session'],
  ['2026-09-23T04:30:00.000Z', 'lunch_break'],
  ['2026-09-23T06:00:00.000Z', 'afternoon_session'],
  ['2026-09-23T08:00:00.000Z', 'outside_regular_hours'],
  ['2026-09-27T02:00:00.000Z', 'weekend']
])('classifies %s correctly in Vietnam local time', (timestamp, expected) => {
  expect(marketPhaseAt(new Date(timestamp))).toBe(expected);
});

test('evaluates provider quote age during a regular session without writing evidence in tests', async () => {
  const checkedAt = new Date('2026-09-23T02:35:00.000Z');
  const fetchImpl = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: { FPT: { price: 66000, observed_at: '2026-09-23T02:34:30.000Z', upstream: 'VCI' } } })
  });
  const result = await runQuoteFreshnessProbe({
    symbols: 'FPT',
    fetchImpl,
    now: () => checkedAt,
    writeEvidence: false
  });
  expect(result).toMatchObject({
    market_phase: 'morning_session', http_status: 200, returned: 1,
    freshness: { evaluated_during_regular_session: true, under_1m: 1, under_5m: 1, over_15m: 0 },
    error: null
  });
  expect(result.observations[0].age_seconds).toBe(30);
});

test('does not score a weekday market clock as live when the provider has no current-session observation', async () => {
  const checkedAt = new Date('2026-09-23T02:35:00.000Z');
  const result = await runQuoteFreshnessProbe({
    symbols: 'FPT',
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ success: true, data: {
      FPT: { price: 66000, observed_at: '2026-09-22T07:45:00.000Z', upstream: 'VCI' }
    } }) }),
    now: () => checkedAt,
    writeEvidence: false
  });
  expect(result.market_phase).toBe('morning_session');
  expect(result.session_day_confirmed).toBe(false);
  expect(result.freshness.evaluated_during_regular_session).toBe(false);
  expect(result.freshness.reason).toMatch(/market holiday or an upstream freshness issue/);
});
