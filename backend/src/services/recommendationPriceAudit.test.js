const { auditRecommendationPrices, sessionDate } = require('./recommendationPriceAudit');

test('uses Vietnam session dates and rejects absent dates', () => {
  expect(sessionDate('2026-01-01T18:00:00Z')).toBe('2026-01-02');
  expect(sessionDate(null)).toBeNull();
  expect(sessionDate('invalid')).toBeNull();
});

test('separates provenance groups and detects conflicting duplicates', () => {
  const base = { stock_id: 's', observed_at: '2026-01-02', provider: 'a', interval: '1d', close: 100 };
  const report = auditRecommendationPrices({ prices: [base, { ...base }, { ...base, close: 101 }, { ...base, provider: 'b' }, { ...base, interval: '1m' }] });
  expect(report.duplicate_groups).toBe(1);
  expect(report.extra_duplicate_rows).toBe(2);
  expect(report.conflicting_duplicate_groups).toBe(1);
});

test('flags early legacy outcomes without counting duplicate dates or mutating inputs', () => {
  const prices = [{ stock_id: 's', observed_at: '2026-01-02', close: 100 }];
  const runs = [{ id: 'r', as_of: '2026-01-01', recommendations: [
    { id: 'measured', stock_id: 's', outcome: 'positive', evaluated_at: '2026-01-02', horizon_days: 2 },
    { id: 'pending', stock_id: 's', outcome: 'pending' },
  ] }];
  const before = JSON.stringify(runs);
  const report = auditRecommendationPrices({ prices: [...prices, ...prices], runs });
  expect(report.measured_outcomes).toBe(1);
  expect(report.findings[0].reasons).toEqual(['fewer_distinct_observed_dates_than_horizon', 'missing_snapshot_hash']);
  expect(JSON.stringify(runs)).toBe(before);
});

test('does not label an observation-count match as calendar verification', () => {
  const report = auditRecommendationPrices({ prices: [{ observed_at: 'bad' }, { observed_at: '2026-01-02', close: 0 }] });
  expect(report.invalid_dates).toBe(1);
  expect(report.invalid_prices).toBe(1);
  expect(report.limitations).toContain('no provider compatibility');
});
