'use strict';
const assert = require('node:assert/strict');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') throw new Error('Development database only');
const models = require('../src/models');
const { recommendationEvaluationEvent } = require('../src/services/recommendationPersistence');

async function main() {
  const transaction = await models.sequelize.transaction();
  try {
    const recommendation = await models.Recommendation.findOne({ transaction });
    assert.ok(recommendation, 'An existing development recommendation is required');
    const event = recommendationEvaluationEvent({ recommendation: { ...recommendation.toJSON(), outcome: 'pending', evaluated_at: null, forward_return_pct: null, evaluation_evidence: { fixture: true } }, run: { id: recommendation.run_id }, now: '2001-01-01T00:00:00.000Z' });
    const created = await models.RecommendationEvaluationEvent.create(event, { transaction });
    let immutable = false;
    try { await models.RecommendationEvaluationEvent.update({ payload: { changed: true } }, { where: { id: created.id }, transaction }); }
    catch (error) { immutable = /immutable/.test(error.message); }
    assert.equal(immutable, true, 'Database trigger must reject an event update');
    console.log(JSON.stringify({ status: 'passed', database: 'PostgreSQL', event_hash_length: created.payload_sha256.length, update_rejected: true }));
  } finally { await transaction.rollback(); console.log('Fixture transaction rolled back; no event retained.'); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => models.sequelize.close());
