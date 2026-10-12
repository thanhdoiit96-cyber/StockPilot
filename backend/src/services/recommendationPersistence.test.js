'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { recommendationSnapshotHash, recommendationInputProvenanceHash, recommendationEvaluationEvent, verifyRecommendationEvaluationEvent, verifyRecommendationSnapshot, recommendationGenerationKey, inputProvenance, generateRecommendationSnapshot, evaluatePendingRecommendations, vietnamSessionDate } = require('./recommendationPersistence');

test('uses the most recent Vietnam trading session on weekends and configured holidays', () => {
  expect(vietnamSessionDate(new Date('2026-10-11T01:00:00.000Z'), new Set())).toBe('2026-10-09');
  expect(vietnamSessionDate(new Date('2026-10-12T01:00:00.000Z'), new Set(['2026-10-12']))).toBe('2026-10-09');
});

test('uses the previous completed trading session before the EOD cutoff', () => {
  expect(vietnamSessionDate(new Date('2026-10-12T02:00:00.000Z'), new Set())).toBe('2026-10-09');
  expect(vietnamSessionDate(new Date('2026-10-12T09:00:00.000Z'), new Set())).toBe('2026-10-12');
});

function sealRun(run) {
  run.input_provenance = { version: 'recommendation_input_v1', eod_session: run.as_of, provider: run.provider };
  run.input_provenance_sha256 = recommendationInputProvenanceHash(run.input_provenance);
  run.snapshot_sha256 = recommendationSnapshotHash(run);
  return run;
}

function sampleRun() {
  return {
    id: 'run-1',
    as_of: '2026-09-21',
    model: 'short_term_rule_v2',
    provider: 'vnstock',
    recommendations: [{ rank: 1, stock_id: 'stock-1', stock: { code: 'FPT' }, entry_price: '100', horizon_days: 20, rationale: { factors: ['trend'] } }]
  };
}

function historicalPrices(stockId = 'stock-1') {
  return Array.from({ length: 70 }, (_, index) => ({
    stock_id: stockId,
    observed_at: new Date(Date.UTC(2025, 10, 22 + index)).toISOString().slice(0, 10),
    close: 100 + index,
    toJSON() { return this; }
  }));
}

test('accepts evidence when snapshot hash matches', () => {
  const run = sampleRun();
  const file = path.join(os.tmpdir(), `recommendation-monitor-${Date.now()}-valid.json`);
  fs.writeFileSync(file, JSON.stringify({ run: { id: run.id, snapshot_sha256: recommendationSnapshotHash(run) } }), 'utf8');
  expect(verifyRecommendationSnapshot(run, file)).toMatchObject({ valid: true });
  fs.rmSync(file, { force: true });
});

test('records bounded, EOD-only input provenance without price values', () => {
  const provenance = inputProvenance({ rows: [
    { provider: 'vnstock', interval: '1d', currency: 'VND', price_unit: 'VND_PER_SHARE', is_adjusted: false },
    { provider: 'vnstock', interval: '1m', currency: 'VND' },
  ], factors: [{ id: 'factor-1' }], provider: 'vnstock', session: '2026-01-31', now: '2026-02-01T00:00:00Z' });
  expect(provenance).toEqual(expect.objectContaining({ version: 'recommendation_input_v1', eod_session: '2026-01-31', price_rows: 1, verified_external_factor_count: 1, reference_price_source: 'eod' }));
  expect(JSON.stringify(provenance)).not.toContain('close');
});

test('hashes an immutable evaluation event deterministically', () => {
  const recommendation = { id: 'rec', outcome: 'positive', evaluated_at: '2026-01-02', forward_return_pct: 5, evaluation_evidence: { version: 'recommendation_evaluation_v1' } };
  const first = recommendationEvaluationEvent({ recommendation, run: { id: 'run' }, now: '2026-01-03T00:00:00Z' });
  const second = recommendationEvaluationEvent({ recommendation, run: { id: 'run' }, now: '2026-01-03T00:00:00Z' });
  expect(first).toEqual(second);
  recommendation.forward_return_pct = 6;
  expect(recommendationEvaluationEvent({ recommendation, run: { id: 'run' }, now: '2026-01-03T00:00:00Z' }).payload_sha256).not.toBe(first.payload_sha256);
});

test('verifies an evaluation event from its canonical persisted payload', () => {
  const event = recommendationEvaluationEvent({ recommendation: { id: 'rec', outcome: 'positive', evaluated_at: '2026-01-02', forward_return_pct: 5, evaluation_evidence: { version: 'recommendation_evaluation_v1' } }, run: { id: 'run' }, now: '2026-01-03T00:00:00Z' });
  expect(verifyRecommendationEvaluationEvent(event)).toMatchObject({ valid: true });
  event.payload.forward_return_pct = 6;
  expect(verifyRecommendationEvaluationEvent(event)).toMatchObject({ valid: false, reason: 'payload_sha256_mismatch' });
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
  const prices = historicalPrices();
  const stored = [];
  let persistedRun;
  let savedHash;
  const result = await generateRecommendationSnapshot({
    Stock: { findAll: async () => [stock] },
    StockPrice: { findAll: async () => prices },
    ExternalFactor: { findAll: async () => [
      { type: 'macro', status: 'verified', source: 'World Bank', source_url: 'https://worldbank.example/report', title: 'Macro report', published_at: '2026-01-01', symbol: null, toJSON() { return this; } },
      { type: 'news', status: 'verified', source: 'Wire', source_url: 'https://wire.example/fpt', title: 'FPT update', published_at: '2026-01-02', symbol: 'FPT', impact: 'positive', toJSON() { return this; } },
      { type: 'news', status: 'unverified', source: 'Blog', published_at: '2026-01-03', symbol: 'FPT', impact: 'negative', toJSON() { return this; } }
    ] },
    RecommendationRun: {
      findOne: async options => options.where.id ? { ...persistedRun, recommendations: stored.map(item => ({ ...item, stock: { code: stock.code } })) } : null,
      create: async payload => { persistedRun = { id: 'run-v2', ...payload }; return persistedRun; },
      update: async values => { Object.assign(persistedRun, values); if (values.snapshot_sha256) savedHash = values.snapshot_sha256; return [1]; },
    }, now: new Date('2026-01-30T10:00:00.000Z'),
    Recommendation: { bulkCreate: async rows => stored.push(...rows) }
  });
  expect(result).toMatchObject({ model: 'short_term_rule_v2', selected_count: 1 });
  expect(stored[0].rationale.evidence).toMatchObject({ macro: { status: 'available', verified_count: 1 }, news: { positive_count: 1, negative_count: 0 } });
  expect(stored[0].rationale.evidence.sources).toHaveLength(2);
  expect(stored[0].rationale.snapshot_taxonomy).toMatchObject({ industry: 'Technology', source: 'stocks.industry' });
  const reloaded = { ...persistedRun, snapshot_sha256: savedHash, recommendations: stored.map(item => ({ ...item, stock: { code: stock.code } })) };
  expect(verifyRecommendationSnapshot(reloaded)).toMatchObject({ valid: true, source: 'recommendation_runs.snapshot_sha256' });
  reloaded.recommendations[0].entry_price = 999;
  expect(verifyRecommendationSnapshot(reloaded).valid).toBe(false);
  reloaded.recommendations[0].entry_price = stored[0].entry_price;
  reloaded.input_provenance.price_rows = 999;
  expect(verifyRecommendationSnapshot(reloaded)).toMatchObject({ valid: false, reason: 'input_provenance_integrity_failed' });
});

test('does not create a duplicate scheduled snapshot for the same session contract', async () => {
  const stock = { id: 'stock-1', code: 'FPT', name: 'FPT', toJSON() { return this; } };
  const prices = historicalPrices();
  let created = false;
  const result = await generateRecommendationSnapshot({
    Stock: { findAll: async () => [stock] }, StockPrice: { findAll: async () => prices }, ExternalFactor: { findAll: async () => [] }, now: new Date('2026-01-30T10:00:00.000Z'),
    RecommendationRun: { findOne: async () => ({ id: 'existing-run', universe_size: 1, selected_count: 1, model: 'short_term_rule_v2', snapshot_sha256: null }), create: async () => { created = true; } },
    Recommendation: { bulkCreate: async () => { throw new Error('must not write recommendations'); } },
  });
  expect(result).toMatchObject({ status: 'snapshot_exists', run_id: 'existing-run' });
  expect(result.as_of).toBe('2026-01-30');
  expect(created).toBe(false);
});

test('uses a transaction and returns the winner when a concurrent generation claims the contract', async () => {
  const stock = { id: 'stock-1', code: 'FPT', name: 'FPT', toJSON() { return this; } };
  const prices = historicalPrices();
  const winner = { id: 'winner', as_of: '2026-01-30', provider: 'vnstock', model: 'short_term_rule_v2', horizon_days: 20, universe_size: 1, selected_count: 1, snapshot_sha256: 'sealed' };
  let calls = 0; const transaction = { id: 'tx' };
  const result = await generateRecommendationSnapshot({
    Stock: { findAll: async () => [stock] }, StockPrice: { findAll: async () => prices }, ExternalFactor: { findAll: async () => [] },
    sequelize: { transaction: async (...args) => args.at(-1)(transaction) },
    RecommendationRun: { findOne: async () => (++calls === 1 ? null : winner), create: async () => { const error = new Error('duplicate'); error.name = 'SequelizeUniqueConstraintError'; throw error; } },
    Recommendation: { bulkCreate: jest.fn() }, now: new Date('2026-01-30T10:00:00Z'),
  });
  expect(result).toMatchObject({ status: 'snapshot_exists', run_id: 'winner', snapshot_sha256: 'sealed' });
  expect(recommendationGenerationKey({ asOf: '2026-01-30', horizonDays: 20, provider: 'vnstock' })).toHaveLength(64);
});

test.each([null, { recommendations: [{}] }])('does not seal a missing or incomplete persisted snapshot', async persisted => {
  const update = jest.fn();
  await expect(generateRecommendationSnapshot({
    Stock: { findAll: async () => [] },
    StockPrice: { findAll: async () => [{ stock_id: 's', observed_at: '2026-01-30', close: 100 }] },
    RecommendationRun: {
      findOne: async options => options.where.id ? persisted : null,
      create: async () => ({ id: 'new-run' }), update,
    },
    Recommendation: { bulkCreate: jest.fn() }, now: new Date('2026-01-30T10:00:00Z'),
  })).rejects.toThrow('Cannot seal incomplete recommendation snapshot');
  expect(update).not.toHaveBeenCalled();
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
  sealRun(first); sealRun(second);
  const updates = [];
  const report = await evaluatePendingRecommendations({
    RecommendationRun: { findAll: async () => [first, second] },
    StockPrice: { findAll: async () => [
      { provider: 'vnstock', interval: '1d', currency: 'VND', price_unit: 'VND_PER_SHARE', is_adjusted: false, stock_id: 'stock-1', observed_at: '2026-01-02', close: 110, toJSON() { return this; } },
      { provider: 'vnstock', interval: '1d', currency: 'VND', price_unit: 'VND_PER_SHARE', is_adjusted: false, stock_id: 'stock-2', observed_at: '2026-01-03', close: 90, toJSON() { return this; } },
    ] },
    Recommendation: { update: async (values, options) => { updates.push({ values, options }); return [1]; } }, RecommendationEvaluationEvent: { create: async () => ({}) },
  });
  expect(report).toMatchObject({ runs_considered: 2, runs_evaluated: 2, runs_skipped_integrity: 0, measured: 2, positive: 1, hit_rate_pct: 50 });
  expect(updates).toHaveLength(2);
  expect(updates.map(item => item.options.where.id)).toEqual(['rec-1', 'rec-2']);
  expect(updates.every(item => item.options.where.outcome === 'pending')).toBe(true);
  expect(updates.every(item => item.values.evaluation_evidence?.version === 'recommendation_evaluation_v1')).toBe(true);
});

test('counts only outcome writes claimed atomically by this evaluator', async () => {
  const pending = { id: 'rec', stock_id: 'stock', entry_price: 100, horizon_days: 1, outcome: 'pending', stock: { code: 'AAA' }, toJSON() { return this; } };
  const run = { id: 'run', as_of: '2026-01-01', provider: 'vnstock', recommendations: [pending] };
  sealRun(run);
  const transaction = { id: 'tx' };
  const report = await evaluatePendingRecommendations({
    sequelize: { transaction: async (...args) => args.at(-1)(transaction) }, RecommendationRun: { findAll: async () => [run] },
    StockPrice: { findAll: async () => [{ stock_id: 'stock', provider: 'vnstock', interval: '1d', currency: 'VND', price_unit: 'VND_PER_SHARE', is_adjusted: false, observed_at: '2026-01-02', close: 110, toJSON() { return this; } }] },
    Recommendation: { update: async (_, options) => { expect(options.transaction).toBe(transaction); return [0]; } }, RecommendationEvaluationEvent: { create: jest.fn() }, now: new Date('2026-01-03T00:00:00Z'),
  });
  expect(report).toMatchObject({ evaluated: 1, measured: 0, positive: 0, hit_rate_pct: null });
});
