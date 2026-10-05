'use strict';
const express = require('express');
const Joi = require('joi');
const { Op } = require('sequelize');
const { AdvisorConversation } = require('../models');
const requireAuth = require('../middleware/requireAuth');
const router = express.Router();

const contexts = ['symbol', 'portfolio', 'market'];
const citationSchema = Joi.object({ label: Joi.string().trim().max(240).required(), url: Joi.string().uri({ scheme: ['http', 'https'] }).max(2000).allow(null, '') });
const messageSchema = Joi.object({ role: Joi.string().valid('user', 'ai').required(), text: Joi.string().trim().max(4000).required(), context: Joi.string().trim().max(80).allow(null, ''), citations: Joi.array().items(citationSchema).max(20).default([]) });
const payloadSchema = Joi.object({ title: Joi.string().trim().max(120).required(), context: Joi.string().valid(...contexts).required(), messages: Joi.array().items(messageSchema).max(100).required() });
const serialize = row => ({ id: row.id, title: row.title, context: row.context, messages: row.messages, created_at: row.created_at, updated_at: row.updated_at });

router.use(requireAuth);
router.get('/', async (req, res) => {
  try { const rows = await AdvisorConversation.findAll({ where: { user_id: req.user.sub }, order: [['updated_at', 'DESC']], limit: 20 }); return res.json({ success: true, data: rows.map(serialize) }); }
  catch (error) { return res.status(500).json({ success: false, message: 'Không thể tải hội thoại Advisor' }); }
});
router.post('/', async (req, res) => {
  const { value, error } = payloadSchema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });
  try {
    const row = await AdvisorConversation.create({ ...value, user_id: req.user.sub, created_at: new Date(), updated_at: new Date() });
    const retained = await AdvisorConversation.findAll({ where: { user_id: req.user.sub }, attributes: ['id'], order: [['updated_at', 'DESC']], offset: 20 });
    if (retained.length) await AdvisorConversation.destroy({ where: { user_id: req.user.sub, id: { [Op.in]: retained.map(item => item.id) } } });
    return res.status(201).json({ success: true, data: serialize(row) });
  } catch (error) { return res.status(500).json({ success: false, message: 'Không thể lưu hội thoại Advisor' }); }
});
router.put('/:id', async (req, res) => {
  const { value, error } = payloadSchema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });
  try {
    const row = await AdvisorConversation.findOne({ where: { id: req.params.id, user_id: req.user.sub } });
    if (!row) return res.status(404).json({ success: false, message: 'Không tìm thấy hội thoại Advisor' });
    await row.update({ ...value, updated_at: new Date() });
    return res.json({ success: true, data: serialize(row) });
  } catch (error) { return res.status(500).json({ success: false, message: 'Không thể cập nhật hội thoại Advisor' }); }
});
router.delete('/:id', async (req, res) => {
  try { const deleted = await AdvisorConversation.destroy({ where: { id: req.params.id, user_id: req.user.sub } }); if (!deleted) return res.status(404).json({ success: false, message: 'Không tìm thấy hội thoại Advisor' }); return res.status(204).end(); }
  catch (error) { return res.status(500).json({ success: false, message: 'Không thể xóa hội thoại Advisor' }); }
});
module.exports = router;
module.exports.payloadSchema = payloadSchema;
