'use strict';
jest.mock('../market-data/eodCoverage', () => ({ eodCoverage: jest.fn().mockResolvedValue({ symbols: 123, covered: 123, missing_symbols: [] }) }));
jest.mock('../models', () => ({ sequelize: { query: jest.fn() } }));

const { readRecommendationLifecycleCheckpoint } = require('./recommendationLifecycleCheckpoint');
const { eodCoverage } = require('../market-data/eodCoverage');

test('does not report generation readiness for a partially ingested session', async () => {
  eodCoverage.mockResolvedValueOnce({ symbols: 123, covered: 114, missing_symbols: ['MISSING'] });
  const report = await readRecommendationLifecycleCheckpoint({ StockPrice: { findOne: jest.fn().mockResolvedValue({ observed_at: '2026-10-23T00:00:00Z' }) }, RecommendationRun: { findOne: jest.fn().mockResolvedValue(null) }, now: new Date('2026-10-26T02:00:00Z') });
  expect(report).toMatchObject({ status: 'awaiting_coverage', expected_session: '2026-10-23', can_generate: false, coverage: { covered: 114 } });
});

test('reads only the newest EOD observation and reports the generation gate', async () => {
  const StockPrice = { findOne: jest.fn().mockResolvedValue({ observed_at: '2026-10-08T00:00:00.000Z' }) };
  const RecommendationRun = { findOne: jest.fn().mockResolvedValue(null) };
  const report = await readRecommendationLifecycleCheckpoint({ StockPrice, RecommendationRun, now: new Date('2026-10-09T09:00:00.000Z') });
  expect(report).toMatchObject({ provider: 'vnstock', status: 'awaiting_eod', expected_session: '2026-10-09', latest_eod_session: '2026-10-08', can_generate: false });
  expect(StockPrice.findOne).toHaveBeenCalledWith(expect.objectContaining({ attributes: ['observed_at'], order: [['observed_at', 'DESC']] }));
});

test('uses Friday EOD on a weekend instead of blocking a verified pending snapshot', async () => {
  const run = { id: 'weekend-run', as_of: '2026-10-09', provider: 'vnstock', model: 'short_term_rule_v2', input_provenance: { version: 'recommendation_input_v1' }, input_provenance_sha256: 'invalid', snapshot_sha256: 'invalid', recommendations: [] };
  const StockPrice = { findOne: jest.fn().mockResolvedValue({ observed_at: '2026-10-09T00:00:00.000Z' }) };
  const RecommendationRun = { findOne: jest.fn().mockResolvedValue(run) };
  const report = await readRecommendationLifecycleCheckpoint({ StockPrice, RecommendationRun, now: new Date('2026-10-11T01:00:00.000Z') });
  expect(report).toMatchObject({ status: 'snapshot_integrity_failed', can_generate: false, can_evaluate: false });
  expect(RecommendationRun.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ as_of: '2026-10-09' }) }));
});

test('uses Friday EOD before Monday reaches the EOD cutoff', async () => {
  const StockPrice = { findOne: jest.fn().mockResolvedValue({ observed_at: '2026-10-09T00:00:00.000Z' }) };
  const RecommendationRun = { findOne: jest.fn().mockResolvedValue(null) };
  const report = await readRecommendationLifecycleCheckpoint({ StockPrice, RecommendationRun, now: new Date('2026-10-12T02:00:00.000Z') });
  expect(report).toMatchObject({ provider: 'vnstock', status: 'ready_to_generate', expected_session: '2026-10-09', latest_eod_session: '2026-10-09', can_generate: true, can_evaluate: false });
});
