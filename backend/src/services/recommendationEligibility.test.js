const { assessRun } = require('./recommendationEligibility');
const { recommendationSnapshotHash } = require('./recommendationPersistence');

function fixture() {
  const run = { id: 'run', as_of: '2026-01-01', model: 'test', provider: 'vnstock', recommendations: [
    { id: 'rec', stock_id: 's', stock: { code: 'FPT' }, rank: 1, horizon_days: 2, entry_price: 100, outcome: 'positive', forward_return_pct: 5, evaluated_at: '2026-01-05', rationale: {}, evaluation_evidence: { version: 'recommendation_evaluation_v1', generated_at: '2026-01-06T00:00:00.000Z', provider: 'vnstock', interval: '1d', timezone: 'Asia/Ho_Chi_Minh', horizon_days: 2, observed_session_dates: ['2026-01-02', '2026-01-05'], entry_price: 100, target: { observed_at: '2026-01-05', close: 105 }, forward_return_pct: 5, outcome: 'positive' } },
  ] };
  run.snapshot_sha256 = recommendationSnapshotHash(run);
  const prices = ['2026-01-02', '2026-01-05'].map((date, i) => ({ stock_id: 's', provider: 'vnstock', interval: '1d', observed_at: date, close: i ? 105 : 101, currency: 'VND', price_unit: 'VND_PER_SHARE', is_adjusted: false }));
  return { run, prices };
}

test('accepts matching hash, distinct observed sessions and return without mutation', () => {
  const { run, prices } = fixture();
  const before = JSON.stringify(run);
  const item = assessRun(run, [...prices, prices[0]]).recommendations[0];
  expect(item.statistics_eligible).toBe(true);
  expect(item.observed_session_count).toBe(2);
  expect(JSON.stringify(run)).toBe(before);
});

test.each([
  ['missing hash', ({ run }) => { run.snapshot_sha256 = null; }, 'snapshot_unverified'],
  ['tampered snapshot', ({ run }) => { run.recommendations[0].entry_price = 90; }, 'snapshot_unverified'],
  ['incomplete horizon', ({ prices }) => { prices.shift(); }, 'insufficient_observed_sessions'],
  ['different provider', ({ prices }) => { prices[0].provider = 'other'; }, 'insufficient_observed_sessions'],
  ['intraday', ({ prices }) => { prices[0].interval = '1m'; }, 'insufficient_observed_sessions'],
  ['adjusted price', ({ prices }) => { prices[0].is_adjusted = true; }, 'price_evidence_unavailable'],
  ['wrong unit', ({ prices }) => { prices[0].price_unit = 'THOUSAND_VND'; }, 'price_evidence_unavailable'],
  ['conflicting duplicate', ({ prices }) => { prices.push({ ...prices[0], close: 99 }); }, 'conflicting_session_prices'],
  ['wrong return', ({ run }) => { run.recommendations[0].forward_return_pct = 25; }, 'return_mismatch'],
  ['wrong sign', ({ run }) => { run.recommendations[0].outcome = 'negative'; }, 'return_mismatch'],
  ['missing evaluation date', ({ run }) => { run.recommendations[0].evaluated_at = null; }, 'invalid_evaluation_boundary'],
  ['late evaluation', ({ run }) => { run.recommendations[0].evaluated_at = '2026-01-06'; }, 'evaluation_date_mismatch'],
  ['missing evidence', ({ run }) => { run.recommendations[0].evaluation_evidence = null; }, 'evaluation_evidence_invalid'],
  ['tampered evidence', ({ run }) => { run.recommendations[0].evaluation_evidence.target.close = 999; }, 'evaluation_evidence_invalid'],
])('excludes %s', (_, modify, reason) => {
  const data = fixture(); modify(data);
  const item = assessRun(data.run, data.prices).recommendations[0];
  expect(item.measurement_status).toBe('excluded');
  expect(item.statistics_eligible).toBe(false);
  expect(item.exclusion_reasons).toContain(reason);
});

test('verification bypass cannot make legacy outcomes eligible', () => {
  const { run, prices } = fixture();
  run.snapshot_sha256 = null;
  const previous = process.env.RECOMMENDATION_SNAPSHOT_VERIFY;
  process.env.RECOMMENDATION_SNAPSHOT_VERIFY = 'false';
  try { expect(assessRun(run, prices).recommendations[0].statistics_eligible).toBe(false); }
  finally { if (previous == null) delete process.env.RECOMMENDATION_SNAPSHOT_VERIFY; else process.env.RECOMMENDATION_SNAPSHOT_VERIFY = previous; }
});
