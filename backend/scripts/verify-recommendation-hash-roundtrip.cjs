'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') throw new Error('Development database only');
const models = require('../src/models');
const { generateRecommendationSnapshot, recommendationSnapshotHash } = require('../src/services/recommendationPersistence');

async function main() {
  const transaction = await models.sequelize.transaction();
  try {
    const stock = await models.Stock.findOne({ transaction });
    assert.ok(stock, 'An existing development stock is required');
    const prices = Array.from({ length: 70 }, (_, index) => ({
      stock_id: stock.id, observed_at: new Date(Date.UTC(2001, 0, index + 1)).toISOString(), close: 100 + index,
    }));
    const runModel = {
      findOne: options => models.RecommendationRun.findOne({ ...options, transaction }),
      create: values => models.RecommendationRun.create(values, { transaction }),
      update: (values, options) => models.RecommendationRun.update(values, { ...options, transaction }),
    };
    const result = await generateRecommendationSnapshot({
      Stock: { findAll: async () => [stock] }, StockPrice: { findAll: async () => prices },
      RecommendationRun: runModel,
      Recommendation: { bulkCreate: rows => models.Recommendation.bulkCreate(rows, { transaction }) },
      now: new Date(prices.at(-1).observed_at), provider: 'synthetic-hash-roundtrip-test',
    });
    assert.notEqual(result.status, 'snapshot_exists', 'Fixture session already exists; no existing snapshot may be changed');
    assert.ok(result.run_id);
    assert.equal(result.selected_count, 1);
    const reloaded = await runModel.findOne({ where: { id: result.run_id }, include: [{ association: 'recommendations', include: [{ association: 'stock', attributes: ['code'] }] }] });
    assert.equal(recommendationSnapshotHash(reloaded), reloaded.snapshot_sha256);
    const plain = reloaded.toJSON();
    assert.equal(recommendationSnapshotHash(plain), result.snapshot_sha256);
    plain.recommendations[0].entry_price = Number(plain.recommendations[0].entry_price) + 1;
    assert.notEqual(recommendationSnapshotHash(plain), result.snapshot_sha256);
    console.log(JSON.stringify({ status: 'passed', database: 'PostgreSQL', data: 'synthetic', sequelize_instance_and_plain_hash_match: true, tampering_detected: true }));
  } finally {
    await transaction.rollback();
    console.log('Fixture transaction rolled back; no snapshot retained.');
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => models.sequelize.close());
