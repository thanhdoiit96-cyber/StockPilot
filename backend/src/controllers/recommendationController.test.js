jest.mock('../models', () => ({
  User: { findByPk: jest.fn(async () => ({ password_version: 0 })) },
  RecommendationRun: { findOne: jest.fn(), findAll: jest.fn() },
  Stock: { findAll: jest.fn() },
  StockPrice: { findAll: jest.fn() },
  SavedRecommendation: { findAll: jest.fn(), create: jest.fn(), destroy: jest.fn() }
}));
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { SavedRecommendation, RecommendationRun } = require('../models');
const createRouter = require('./recommendationController');

describe('saved recommendation API', () => {
  let app;
  const token = jwt.sign({ sub: 'user-1', email: 'test@example.com', role: 'user' }, 'development-only-change-me');
  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(response.body.data).toEqual(expect.objectContaining({ id: 'run-1', summary: expect.objectContaining({ measured_count: 1, pending_count: 1, positive_count: 1, hit_rate_pct: 100, average_forward_return_pct: 3.25 }) }));
    expect(response.body.data.recommendations[1]).toEqual(expect.objectContaining({ outcome: 'pending', forward_return_pct: null }));
    expect(RecommendationRun.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'run-1' } }));
  });

  test('returns a distinct not-found response for an unknown history snapshot', async () => {
    RecommendationRun.findOne.mockResolvedValue(null);
    const response = await request(app).get('/api/recommendations/history/missing');
    expect(response.status).toBe(404);
    expect(response.body.code).toBe('recommendation_history_not_found');
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
      expect.objectContaining({ model: 'short_term_rule_v2', horizon_days: 20, runs_count: 2, measured_count: 2, pending_count: 1, hit_rate_pct: 50, status: 'insufficient_samples', return_distribution: expect.objectContaining({ minimum_pct: -2, median_pct: 1, maximum_pct: 4 }) }),
    ]));
    expect(response.body.data.sector_cohorts).toEqual(expect.arrayContaining([
      expect.objectContaining({ industry: 'Technology', model: 'short_term_rule_v2', measured_count: 2, hit_rate_pct: 50, status: 'insufficient_samples' }),
    ]));
    expect(response.body.data.sector_taxonomy).toEqual(expect.objectContaining({ source: 'snapshot_taxonomy', excluded_without_snapshot_taxonomy: 2 }));
  });
});
