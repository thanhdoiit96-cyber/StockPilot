jest.mock('../models', () => ({
  RecommendationRun: { findOne: jest.fn() },
  Stock: { findAll: jest.fn() },
  StockPrice: { findAll: jest.fn() },
  SavedRecommendation: { findAll: jest.fn(), create: jest.fn(), destroy: jest.fn() }
}));
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { SavedRecommendation } = require('../models');
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
});
