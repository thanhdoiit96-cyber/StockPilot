const { evaluateRecommendations } = require('./recommendationEngine');
const { assessRun } = require('./recommendationEligibility');
const { recommendationSnapshotHash } = require('./recommendationPersistence');
const price = (observed_at, close = 105, extra = {}) => ({ stock_id: 's', observed_at, close, provider: 'vnstock', interval: '1d', currency: 'VND', price_unit: 'VND_PER_SHARE', is_adjusted: false, ...extra });
const evaluate = (rows, horizon_days = 2, provider = 'vnstock', evaluatedAt = '2026-02-01T00:00:00Z') => evaluateRecommendations({ recommendations: [{ stock_id: 's', entry_price: 100, horizon_days }], priceRowsByStock: new Map([['s', rows]]), asOf: '2026-01-01', provider, evaluatedAt })[0];

test('duplicates and same local snapshot date do not advance the horizon', () => {
  expect(evaluate([price('2026-01-01T09:00:00Z'), price('2026-01-02'), price('2026-01-02T08:00:00Z')]).outcome).toBe('pending');
});
test('Vietnam midnight boundary, ordering and compatible duplicates are deterministic', () => {
  const rows = [price('2026-01-04T18:00:00Z'), price('2026-01-02'), price('2026-01-05T08:00:00Z')];
  const item = evaluate(rows);
  expect(item).toMatchObject({ outcome: 'positive', evaluated_at: '2026-01-04T18:00:00Z', forward_return_pct: 5 });
  expect(evaluate([...rows].reverse())).toEqual(item);
  const run = { id: 'run', as_of: '2026-01-01', provider: 'vnstock', recommendations: [item] };
  run.snapshot_sha256 = recommendationSnapshotHash(run);
  expect(assessRun(run, rows).recommendations[0].statistics_eligible).toBe(true);
});
test.each([
  { provider: 'other' }, { interval: '1m' }, { currency: 'USD' },
  { price_unit: 'THOUSAND_VND' }, { is_adjusted: true }, { close: 0 }, { close: Infinity },
])('does not measure incompatible or invalid history %j', extra => {
  expect(evaluate([price('2026-01-02', 101, extra), price('2026-01-05')]).outcome).toBe('pending');
});
test('conflicting duplicate cannot be skipped to use a later price', () => {
  expect(evaluate([price('2026-01-02'), price('2026-01-02', 99), price('2026-01-05'), price('2026-01-06')]).outcome).toBe('pending');
});
test('requires provider and ignores conflicts beyond target date', () => {
  const rows = [price('2026-01-02'), price('2026-01-05'), price('2026-01-06', 0)];
  expect(evaluate(rows, 2, null).outcome).toBe('pending');
  expect(evaluate(rows).outcome).toBe('positive');
});
test('future observations are unavailable until evaluator cutoff reaches them', () => {
  const rows = [price('2026-01-02'), price('2026-01-05')];
  expect(evaluate(rows, 2, 'vnstock', '2026-01-03T00:00:00Z').outcome).toBe('pending');
  expect(evaluate(rows, 2, 'vnstock', '2026-01-05T00:00:00Z')).toMatchObject({ outcome: 'positive', evaluation_evidence: { generated_at: '2026-01-05T00:00:00.000Z' } });
});
