'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { recommendationSnapshotHash, verifyRecommendationSnapshot, generateRecommendationSnapshot, evaluatePendingRecommendations } = require('./recommendationPersistence');

function sampleRun() {
  return {
    id: 'run-1',
    as_of: '2026-09-21',
    model: 'short_term_rule_v2',
    provider: 'vnstock',
    recommendations: [{ rank: 1, stock_id: 'stock-1', stock: { code: 'FPT' }, entry_price: '100', horizon_days: 20, rationale: { factors: ['trend'] } }]
  };
}

test('accepts evidence when snapshot hash matches', () => {
  const run = sampleRun();
  const file = path.join(os.tmpdir(), `recommendation-monitor-${Date.now()}-valid.json`);
  fs.writeFileSync(file, JSON.stringify({ run: { id: run.id, snapshot_sha256: recommendationSnapshotHash(run) } }), 'utf8');
  expect(verifyRecommendationSnapshot(run, file)).toMatchObject({ valid: true });
  fs.rmSync(file, { force: true });
});

test('blocks evaluation when snapshot evidence has been changed', () => {
  const run = sampleRun();
  const file = path.join(os.tmpdir(), `recommendation-monitor-${Date.now()}-invalid.json`);
  fs.writeFileSync(file, JSON.stringify({ run: { id: run.id, snapshot_sha256: 'tampered' } }), 'utf8');
  expect(verifyRecommendationSnapshot(run, file)).toMatchObject({ valid: false, expected: 'tampered' });
  fs.rmSync(file, { force: true });
});

test('generates a v2 snapshot with verified external evidence', async () => {
  const stock = { id: 'stock-1', code: 'FPT', name: 'FPT', industry: 'Technology', toJSON() { return this; } };
  const prices = Array.from({ length: 70 }, (_, index) => ({ stock_id: 'stock-1', observed_at: `2026-01-${String(index + 1).padStart(2, '0')}`, close: 100 + index, toJSON() { return this; } }));
  const stored = [];
  const result = await generateRecommendationSnapshot({
    Stock: { findAll: async () => [stock] },
    StockPrice: { findAll: async () => prices },
    ExternalFactor: { findAll: async () => [
      { type: 'macro', status: 'verified', source: 'World Bank', source_url: 'https://worldbank.example/report', title: 'Macro report', published_at: '2026-01-01', symbol: null, toJSON() { return this; } },
      { type: 'news', status: 'verified', source: 'Wire', source_url: 'https://wire.example/fpt', title: 'FPT update', published_at: '2026-01-02', symbol: 'FPT', impact: 'positive', toJSON() { return this; } },
      { type: 'news', status: 'unverified', source: 'Blog', published_at: '2026-01-03', symbol: 'FPT', impact: 'negative', toJSON() { return this; } }
    ] },
    RecommendationRun: { findOne: async () => null, create: async payload => ({ id: 'run-v2', ...payload }), update: async () => [1] }, now: new Date('2026-01-31T10:00:00.000Z'),
    Recommendation: { bulkCreate: async rows => stored.push(...rows) }
  });
  expect(result).toMatchObject({ model: 'short_term_rule_v2', selected_count: 1 });
  expect(stored[0].rationale.evidence).toMatchObject({ macro: { status: 'available', verified_count: 1 }, news: { positive_count: 1, negative_count: 0 } });
  expect(stored[0].rationale.evidence.sources).toHaveLength(2);
  expect(stored[0].rationale.snapshot_taxonomy).toMatchObject({ industry: 'Technology', source: 'stocks.industry' });
});

test('does not create a duplicate scheduled snapshot for the same session contract', async () => {
  const stock = { id: 'stock-1', code: 'FPT', name: 'FPT', toJSON() { return this; } };
  const prices = Array.from({ length: 70 }, (_, index) => ({ stock_id: 'stock-1', observed_at: `2026-01-${String(index + 1).padStart(2, '0')}`, close: 100 + index, toJSON() { return this; } }));
  let created = false;
  const result = await generateRecommendationSnapshot({
    Stock: { findAll: async () => [stock] }, StockPrice: { findAll: async () => prices }, ExternalFactor: { findAll: async () => [] }, now: new Date('2026-01-31T10:00:00.000Z'),
    RecommendationRun: { findOne: async () => ({ id: 'existing-run', universe_size: 1, selected_count: 1, model: 'short_term_rule_v2', snapshot_sha256: null }), create: async () => { created = true; } },
    Recommendation: { bulkCreate: async () => { throw new Error('must not write recommendations'); } },
  });
  expect(result).toMatchObject({ status: 'snapshot_exists', run_id: 'existing-run' });
  expect(result.as_of).toBe('2026-01-31');
  expect(created).toBe(false);
});

test('does not create a snapshot before the current Vietnam EOD session is present', async () => {
  const stock = { id: 'stock-1', code: 'FPT', name: 'FPT', toJSON() { return this; } };
  const result = await generateRecommendationSnapshot({
    Stock: { findAll: async () => [stock] }, StockPrice: { findAll: async () => [{ stock_id: 'stock-1', observed_at: '2026-03-10T00:00:00.000Z', close: 100, toJSON() { return this; } }] },
    RecommendationRun: { findOne: async () => { throw new Error('must not query runs before EOD is ready'); } }, now: new Date('2026-03-11T10:00:00.000Z'),
  });
  expect(result).toEqual(expect.objectContaining({ status: 'eod_not_ready', expected_session: '2026-03-11', latest_eod_session: '2026-03-10' }));
});

test('evaluates every pending integrity-verified run without overwriting completed outcomes', async () => {
  const pending = (id, stockId, code, asOf) => ({ id, stock_id: stockId, entry_price: 100, horizon_days: 1, outcome: 'pending', rationale: {}, stock: { code }, toJSON() { return this; } });
  const first = { id: 'run-1', as_of: '2026-01-01', model: 'short_term_rule_v2', provider: 'vnstock', recommendations: [pending('rec-1', 'stock-1', 'AAA', '2026-01-01')] };
  const second = { id: 'run-2', as_of: '2026-01-02', model: 'short_term_rule_v2', provider: 'vnstock', recommendations: [pending('rec-2', 'stock-2', 'BBB', '2026-01-02')] };
  first.snapshot_sha256 = recommendationSnapshotHash(first);
  second.snapshot_sha256 = recommendationSnapshotHash(second);
  const updates = [];
  const report = await evaluatePendingRecommendations({
    RecommendationRun: { findAll: async () => [first, second] },
    StockPrice: { findAll: async () => [
      { stock_id: 'stock-1', observed_at: '2026-01-02', close: 110, toJSON() { return this; } },
      { stock_id: 'stock-2', observed_at: '2026-01-03', close: 90, toJSON() { return this; } },
    ] },
    Recommendation: { update: async (values, options) => updates.push({ values, options }) },
  });
  expect(report).toMatchObject({ runs_considered: 2, runs_evaluated: 2, runs_skipped_integrity: 0, measured: 2, positive: 1, hit_rate_pct: 50 });
  expect(updates).toHaveLength(2);
  expect(updates.map(item => item.options.where.id)).toEqual(['rec-1', 'rec-2']);
  expect(updates.every(item => item.options.where.outcome === 'pending')).toBe(true);
});
