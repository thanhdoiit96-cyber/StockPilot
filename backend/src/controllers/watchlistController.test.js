'use strict';
const item = { id: 'w-1', user_id: 'user-a', stock_id: 's-1', update: jest.fn() };
jest.mock('../models', () => ({
  WatchlistItem: { findAll: jest.fn(), findOne: jest.fn(), findByPk: jest.fn(), create: jest.fn(), destroy: jest.fn() },
  Stock: { findOne: jest.fn() }
}));
jest.mock('../middleware/requireAuth', () => (req, res, next) => { req.user = { sub: 'user-a' }; next(); });
const request = require('supertest');
const express = require('express');
const { WatchlistItem, Stock } = require('../models');
const router = require('./watchlistController');
const app = express(); app.use(express.json()); app.use('/watchlist', router);

beforeEach(() => {
  jest.clearAllMocks();
  Stock.findOne.mockResolvedValue({ id: 's-1', code: 'FPT' });
  WatchlistItem.findOne.mockResolvedValue(item);
  WatchlistItem.findByPk.mockResolvedValue({ ...item, status: 'RESEARCHING', note: 'Đọc báo cáo', Stock: { id: 's-1', code: 'FPT' } });
  item.update.mockResolvedValue(item);
});

test('updates metadata only through the authenticated user ownership predicate', async () => {
  const response = await request(app).patch('/watchlist/FPT').send({ status: 'researching', note: '  Đọc báo cáo  ' });
  expect(response.status).toBe(200);
  expect(WatchlistItem.findOne).toHaveBeenCalledWith({ where: { user_id: 'user-a', stock_id: 's-1' } });
  expect(item.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'RESEARCHING', note: 'Đọc báo cáo', metadata_updated_at: expect.any(Date) }));
  expect(response.body.data).toMatchObject({ status: 'RESEARCHING', note: 'Đọc báo cáo' });
});

test('does not expose another user item and validates metadata before writing', async () => {
  WatchlistItem.findOne.mockResolvedValueOnce(null);
  expect((await request(app).patch('/watchlist/FPT').send({ status: 'WATCHING' })).status).toBe(404);
  expect((await request(app).patch('/watchlist/FPT').send({ status: 'BUY' })).status).toBe(400);
  expect(item.update).not.toHaveBeenCalled();
});
