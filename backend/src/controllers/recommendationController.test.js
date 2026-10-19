jest.mock('../models', () => ({
  User: { findByPk: jest.fn(async () => ({ password_version: 0 })) },
  RecommendationRun: { findOne: jest.fn(), findAll: jest.fn() },
  Recommendation: { bulkCreate: jest.fn(), update: jest.fn(), findOne: jest.fn() },
  ExternalFactor: { findAll: jest.fn() },
  Stock: { findAll: jest.fn() },
  StockPrice: { findAll: jest.fn(), findOne: jest.fn() },
  SavedRecommendation: { findAll: jest.fn(), create: jest.fn(), destroy: jest.fn() },
  RecommendationEvaluationEvent: { findAll: jest.fn() }
}));
jest.mock('../services/recommendationPersistence', () => ({
  verifyRecommendationSnapshot: jest.fn((run) => ({ valid: Boolean(run?.snapshot_sha256), expected: run?.snapshot_sha256 || null, actual: run?.snapshot_sha256 || null, reason: run?.snapshot_sha256 ? null : 'snapshot_monitor_evidence_missing' })),
  verifyRecommendationEvaluationEvent: jest.fn(() => ({ valid: true })),
  generateRecommendationSnapshot: jest.fn(),
  recommendationSnapshotHash: jest.fn(run => `hash-${run?.id || 'snapshot'}`),
  recommendationEvaluationEvent: jest.fn(({ recommendation, run, now }) => ({ recommendation_id: recommendation.id, run_id: run.id, event_type: 'evaluation_recorded', schema_version: 'recommendation_evaluation_event_v1', payload: { version: 'recommendation_evaluation_event_v1', recommendation_id: recommendation.id, run_id: run.id, outcome: recommendation.outcome, evaluated_at: recommendation.evaluated_at, forward_return_pct: recommendation.forward_return_pct, evaluation_evidence: recommendation.evaluation_evidence, recorded_at: new Date(now).toISOString() }, payload_sha256: `hash-${recommendation.id}` })),
  vietnamSessionDate: jest.fn(() => '2026-10-15'),
  latestEodSession: jest.fn(() => '2026-10-08')
}));
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { SavedRecommendation, RecommendationRun, RecommendationEvaluationEvent, StockPrice } = require('../models');
const { generateRecommendationSnapshot } = require('../services/recommendationPersistence');
const createRouter = require('./recommendationController');
const { deriveCalibration } = createRouter;

describe('saved recommendation API', () => {
  let app;
  const token = jwt.sign({ sub: 'user-1', email: 'test@example.com', role: 'user' }, 'development-only-change-me');
  beforeEach(() => {
    jest.clearAllMocks();
    StockPrice.findAll.mockResolvedValue([]);
    app = express();
    app.use(express.json());
    app.use('/api/recommendations', createRouter);
  });

  test('requires authentication and scopes list to the token subject', async () => {
    expect((await request(app).get('/api/recommendations/saved')).status).toBe(401);
    SavedRecommendation.findAll.mockResolvedValue([]);
    expect((await request(app).get('/api/recommendations/saved').set('Authorization', `Bearer ${token}`)).status).toBe(200);
    expect(SavedRecommendation.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { user_id: 'user-1' } }));
  });

  test('creates and deletes only the authenticated user snapshot', async () => {
    const row = { id: 'snapshot-1', criteria: { momentum: 50 }, result: { recommendations: [] }, created_at: '2026-09-25T09:00:00.000Z' };
    SavedRecommendation.create.mockResolvedValue(row);
    expect((await request(app).post('/api/recommendations/saved').set('Authorization', `Bearer ${token}`).send({ criteria: row.criteria, result: row.result })).status).toBe(201);
    expect(SavedRecommendation.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-1', criteria: row.criteria, result: row.result }));
    SavedRecommendation.destroy.mockResolvedValue(1);
    expect((await request(app).delete('/api/recommendations/saved/snapshot-1').set('Authorization', `Bearer ${token}`)).status).toBe(204);
    expect(SavedRecommendation.destroy).toHaveBeenCalledWith({ where: { id: 'snapshot-1', user_id: 'user-1' } });
  });

  test('returns one immutable historical snapshot with measured and pending outcomes separated', async () => {
    RecommendationRun.findOne.mockResolvedValue({
      id: 'run-1', as_of: '2026-09-01', created_at: '2026-09-01T08:00:00.000Z', horizon_days: 20,
      provider: 'vnstock', model: 'short_term_rule_v2', universe_size: 48, selected_count: 2, status: 'completed',
      recommendations: [
        { id: 'rec-1', rank: 1, score: '84.5', horizon_days: 20, entry_price: '120000', outcome: 'positive', forward_return_pct: '3.25', evaluated_at: '2026-09-29T08:00:00.000Z', rationale: { reference_plan: { price_source: 'eod' } }, stock: { id: 'stock-1', code: 'FPT', name: 'FPT', industry: 'Technology' } },
        { id: 'rec-2', rank: 2, score: '80', horizon_days: 20, entry_price: '80000', outcome: 'pending', forward_return_pct: null, evaluated_at: null, rationale: {}, stock: { id: 'stock-2', code: 'MWG', name: 'MWG', industry: 'Retail' } },
      ],
    });
    const response = await request(app).get('/api/recommendations/history/run-1');
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.objectContaining({ id: 'run-1', summary: expect.objectContaining({ measured_count: 0, excluded_count: 1, pending_count: 1, positive_count: 0, hit_rate_pct: null, average_forward_return_pct: null }) }));
    expect(response.body.data.recommendations[0]).toEqual(expect.objectContaining({ outcome: 'positive', forward_return_pct: 3.25, statistics_eligible: false, measurement_status: 'excluded', exclusion_reasons: expect.arrayContaining(['snapshot_unverified']) }));
    expect(response.body.data.recommendations[1]).toEqual(expect.objectContaining({ outcome: 'pending', forward_return_pct: null }));
    expect(RecommendationRun.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'run-1' } }));
  });

  test('picks the latest EOD snapshot by as_of, not the most recently created run', async () => {
    const run = { id: 'run-latest', as_of: '2026-10-14', created_at: '2026-10-15T09:00:00.000Z', horizon_days: 20, provider: 'vnstock', model: 'short_term_rule_v2', universe_size: 48, selected_count: 2, status: 'completed', recommendations: [] };
    RecommendationRun.findOne.mockResolvedValue(run);
    RecommendationRun.findAll.mockResolvedValue([]);
    const response = await request(app).get('/api/recommendations/latest');
    expect(response.status).toBe(200);
    expect(response.body.data.run).toMatchObject({ id: 'run-latest', as_of: '2026-10-14' });
    expect(RecommendationRun.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { provider: 'vnstock', model: 'short_term_rule_v2' }, order: [['as_of', 'DESC'], ['created_at', 'DESC']] }));
  });

  test('regenerates the default latest snapshot when the stored run is stale relative to the current session', async () => {
    const stale = { id: 'stale-run', as_of: '2026-10-14', created_at: '2026-10-15T09:00:00.000Z', horizon_days: 20, provider: 'vnstock', model: 'short_term_rule_v2', universe_size: 48, selected_count: 2, status: 'completed', recommendations: [] };
    const fresh = { id: 'fresh-run', as_of: '2026-10-15', created_at: '2026-10-15T10:00:00.000Z', horizon_days: 20, provider: 'vnstock', model: 'short_term_rule_v2', universe_size: 48, selected_count: 2, status: 'completed', recommendations: [] };
    RecommendationRun.findOne.mockResolvedValueOnce(stale).mockResolvedValueOnce(fresh);
    RecommendationRun.findAll.mockResolvedValue([]);
    generateRecommendationSnapshot.mockResolvedValue({ run_id: 'fresh-run' });

    const response = await request(app).get('/api/recommendations/latest');

    expect(response.status).toBe(200);
    expect(response.body.data.run).toMatchObject({ id: 'fresh-run', as_of: '2026-10-15' });
    expect(generateRecommendationSnapshot).toHaveBeenCalledWith(expect.objectContaining({ provider: 'vnstock', limit: 5, horizonDays: 20 }));
  });

  test('returns a distinct not-found response for an unknown history snapshot', async () => {
    RecommendationRun.findOne.mockResolvedValue(null);
    const response = await request(app).get('/api/recommendations/history/missing');
    expect(response.status).toBe(404);
    expect(response.body.code).toBe('recommendation_history_not_found');
  });

  test('returns a read-only evaluation ledger with independently verified event hashes', async () => {
    const { recommendationEvaluationEvent } = require('../services/recommendationPersistence');
    const recommendation = { id: 'rec-1', outcome: 'positive', evaluated_at: '2026-01-02T00:00:00.000Z', forward_return_pct: 5, evaluation_evidence: { version: 'recommendation_evaluation_v1' } };
    const event = recommendationEvaluationEvent({ recommendation, run: { id: 'run-1' }, now: '2026-01-03T00:00:00.000Z' });
    RecommendationRun.findOne.mockResolvedValue({ id: 'run-1' });
    RecommendationEvaluationEvent.findAll.mockResolvedValue([{ id: 'event-1', ...event, created_at: '2026-01-03T00:00:00.000Z', recommendation: { id: 'rec-1', rank: 1, stock: { code: 'FPT' } } }]);
    const response = await request(app).get('/api/recommendations/history/run-1/evaluation-ledger');
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ run_id: 'run-1', event_count: 1, events: [expect.objectContaining({ event_type: 'evaluation_recorded', integrity: 'verified', recommendation: expect.objectContaining({ stock_code: 'FPT' }) })] });
    expect(RecommendationEvaluationEvent.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { run_id: 'run-1' } }));
  });

  test('rejects an unknown snapshot before querying its evaluation ledger', async () => {
    RecommendationRun.findOne.mockResolvedValue(null);
    const response = await request(app).get('/api/recommendations/history/missing/evaluation-ledger');
    expect(response.status).toBe(404);
    expect(response.body.code).toBe('recommendation_history_not_found');
    expect(RecommendationEvaluationEvent.findAll).not.toHaveBeenCalled();
  });

  test('exposes a read-only lifecycle reason without creating a snapshot', async () => {
    StockPrice.findOne.mockResolvedValue({ observed_at: '2026-10-08T00:00:00.000Z' });
    RecommendationRun.findOne.mockResolvedValue(null);
    const response = await request(app).get('/api/recommendations/lifecycle-readiness');
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ provider: 'vnstock', status: 'awaiting_eod', latest_eod_session: '2026-10-08', can_generate: false, can_evaluate: false });
    expect(StockPrice.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { provider: 'vnstock', interval: '1d' } }));
  });

  test('list, report and cohort consistently count only evidenced outcomes', async () => {
    const { recommendationSnapshotHash } = require('../services/recommendationPersistence');
    const eligible = { id: 'verified', as_of: '2026-01-01', model: 'test', provider: 'vnstock', horizon_days: 1, selected_count: 1, recommendations: [{ id: 'rec', stock_id: 's', stock: { code: 'FPT' }, rank: 1, horizon_days: 1, entry_price: 100, evaluated_at: '2026-01-02', forward_return_pct: 5, outcome: 'positive', rationale: { score_parts: { trend: 80 } }, evaluation_evidence: { version: 'recommendation_evaluation_v1', generated_at: '2026-01-03T00:00:00.000Z', provider: 'vnstock', interval: '1d', timezone: 'Asia/Ho_Chi_Minh', horizon_days: 1, observed_session_dates: ['2026-01-02'], entry_price: 100, target: { observed_at: '2026-01-02', close: 105 }, forward_return_pct: 5, outcome: 'positive' } }] };
    eligible.snapshot_sha256 = recommendationSnapshotHash(eligible);
    const excluded = { ...eligible, id: 'legacy', snapshot_sha256: null };
    StockPrice.findAll.mockResolvedValue([{ stock_id: 's', observed_at: '2026-01-02', close: 105, interval: '1d', provider: 'vnstock', currency: 'VND', price_unit: 'VND_PER_SHARE', is_adjusted: false }]);
    RecommendationRun.findAll.mockResolvedValue([eligible, excluded]);
    RecommendationRun.findOne.mockResolvedValue(eligible);
    const list = await request(app).get('/api/recommendations/history');
    expect(list.body.data[0]).toMatchObject({ measured_count: 1, excluded_count: 0, hit_rate_pct: 100 });
    expect(list.body.data[1]).toMatchObject({ measured_count: 0, excluded_count: 1, hit_rate_pct: null });
    const detail = await request(app).get('/api/recommendations/history/verified');
    expect(detail.body.data.summary).toMatchObject({ measured_count: 1, hit_rate_pct: 100 });
    const cohort = await request(app).get('/api/recommendations/history/summary');
    expect(cohort.body.data.cohorts[0]).toMatchObject({ measured_count: 1, excluded_count: 1, hit_rate_pct: 100, average_forward_return_pct: 5 });
  });

  test('groups completed outcomes by immutable model and horizon with a sample gate', async () => {
    RecommendationRun.findAll.mockResolvedValue([
      { id: 'run-1', model: 'short_term_rule_v2', horizon_days: 20, selected_count: 2, recommendations: [{ outcome: 'positive', forward_return_pct: '4', rationale: { snapshot_taxonomy: { industry: 'Technology' } } }, { outcome: 'negative', forward_return_pct: '-2', rationale: { snapshot_taxonomy: { industry: 'Technology' } } }] },
      { id: 'run-2', model: 'short_term_rule_v2', horizon_days: 20, selected_count: 1, recommendations: [{ outcome: 'pending', forward_return_pct: null, rationale: {} }] },
      { model: 'short_term_rule_v3', horizon_days: 40, selected_count: 1, recommendations: [{ outcome: 'positive', forward_return_pct: '1.5' }] },
    ]);
    const response = await request(app).get('/api/recommendations/history/summary');
    expect(response.status).toBe(200);
    expect(response.body.data.minimum_samples).toBe(15);
    expect(response.body.data.cohorts).toEqual(expect.arrayContaining([
      expect.objectContaining({ model: 'short_term_rule_v2', horizon_days: 20, runs_count: 2, measured_count: 0, excluded_count: 2, pending_count: 1, hit_rate_pct: null, status: 'insufficient_samples', return_distribution: null }),
    ]));
    expect(response.body.data.sector_cohorts).toEqual(expect.arrayContaining([
      expect.objectContaining({ industry: 'Technology', model: 'short_term_rule_v2', measured_count: 0, excluded_count: 2, hit_rate_pct: null, status: 'insufficient_samples' }),
    ]));
    expect(response.body.data.sector_taxonomy).toEqual(expect.objectContaining({ source: 'snapshot_taxonomy', excluded_without_snapshot_taxonomy: 2 }));
    expect(response.body.data.pending_integrity).toEqual(expect.objectContaining({ pending_runs: 1, blocked_runs: 1 }));
  });
});

describe('recommendation calibration scope', () => {
  test('keeps personalized weights neutral when evidence belongs to a different model', () => {
    const runs = Array.from({ length: 3 }, (_, runIndex) => ({
      id: `run-${runIndex}`,
      model: 'short_term_rule_v2',
      horizon_days: 20,
      recommendations: Array.from({ length: 5 }, (_, itemIndex) => ({
        statistics_eligible: true,
        forward_return_pct: itemIndex % 2 ? -2 : 3,
        rationale: { score_parts: { trend: 50 + itemIndex, momentum: 40 + itemIndex, rsi: 45 + itemIndex, stability: 55 + itemIndex, liquidity: 60 + itemIndex } },
      })),
    }));

    const learning = deriveCalibration(runs, { targetModel: 'personalized_rule_v1', targetHorizonDays: 20 });

    expect(learning).toMatchObject({
      sample_count: 15,
      status: 'model_mismatch',
      application_status: 'not_applied',
      application_reason: 'model_mismatch',
      source: { model: 'short_term_rule_v2', horizon_days: 20, runs_considered: 3 },
      target: { model: 'personalized_rule_v1', horizon_days: 20 },
    });
    expect(learning.calibration).toEqual({ trend: 1, momentum: 1, rsi: 1, stability: 1, liquidity: 1 });
    expect(Object.values(learning.evidence).every(item => item.adjustment === 1 && item.samples === 15)).toBe(true);
  });
});
