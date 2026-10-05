'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { recommendationSnapshotHash, verifyRecommendationSnapshot, generateRecommendationSnapshot } = require('./recommendationPersistence');

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
  const stock = { id: 'stock-1', code: 'FPT', name: 'FPT', toJSON() { return this; } };
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
    RecommendationRun: { create: async payload => ({ id: 'run-v2', ...payload }) },
    Recommendation: { bulkCreate: async rows => stored.push(...rows) }
  });
  expect(result).toMatchObject({ model: 'short_term_rule_v2', selected_count: 1 });
  expect(stored[0].rationale.evidence).toMatchObject({ macro: { status: 'available', verified_count: 1 }, news: { positive_count: 1, negative_count: 0 } });
  expect(stored[0].rationale.evidence.sources).toHaveLength(2);
});
