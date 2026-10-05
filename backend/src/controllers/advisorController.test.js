'use strict';
const express = require('express');
const request = require('supertest');

const rows = [];
jest.mock('../models', () => ({ AdvisorConversation: {
  findAll: jest.fn(async options => options?.attributes ? [] : rows.filter(row => row.user_id === options.where.user_id)),
  create: jest.fn(async value => ({ id: 'conversation-1', ...value })),
  findOne: jest.fn(async ({ where }) => rows.find(row => row.id === where.id && row.user_id === where.user_id) || null),
  destroy: jest.fn(async ({ where }) => { const index = rows.findIndex(row => row.id === where.id && row.user_id === where.user_id); if (index < 0) return 0; rows.splice(index, 1); return 1; })
} }));
jest.mock('../middleware/requireAuth', () => (req, res, next) => { req.user = { sub: req.header('x-user') || 'user-a' }; next(); });
const router = require('./advisorController');

const payload = { title: 'Phân tích FPT', context: 'symbol', messages: [{ role: 'user', text: 'Xu hướng?', citations: [] }, { role: 'ai', text: 'Đang tăng', context: 'Mã đang chọn', citations: [{ label: 'Nguồn', url: 'https://example.com' }] }] };
function app() { const instance = express(); instance.use(express.json()); instance.use('/api/advisor/conversations', router); return instance; }
beforeEach(() => { rows.length = 0; jest.clearAllMocks(); });

test('creates a bounded validated conversation in the authenticated user scope', async () => {
  const response = await request(app()).post('/api/advisor/conversations').set('x-user', 'user-a').send(payload);
  expect(response.status).toBe(201);
  expect(response.body.data).toMatchObject({ id: 'conversation-1', title: 'Phân tích FPT', context: 'symbol' });
  const { AdvisorConversation } = require('../models');
  expect(AdvisorConversation.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-a', messages: payload.messages }));
});

test('rejects unsafe citations and more than 100 messages', async () => {
  const unsafe = await request(app()).post('/api/advisor/conversations').send({ ...payload, messages: [{ role: 'ai', text: 'x', citations: [{ label: 'bad', url: 'javascript:alert(1)' }] }] });
  expect(unsafe.status).toBe(400);
  const oversized = await request(app()).post('/api/advisor/conversations').send({ ...payload, messages: Array.from({ length: 101 }, () => ({ role: 'user', text: 'x' })) });
  expect(oversized.status).toBe(400);
});

test('does not expose or delete another user conversation', async () => {
  rows.push({ id: 'private-1', user_id: 'user-a', ...payload, created_at: new Date(), updated_at: new Date() });
  const list = await request(app()).get('/api/advisor/conversations').set('x-user', 'user-b');
  expect(list.body.data).toEqual([]);
  const deleted = await request(app()).delete('/api/advisor/conversations/private-1').set('x-user', 'user-b');
  expect(deleted.status).toBe(404);
  expect(rows).toHaveLength(1);
});
