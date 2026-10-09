'use strict';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const models = require('../src/models');
const { vietnamSessionDate, latestEodSession, verifyRecommendationSnapshot } = require('../src/services/recommendationPersistence');
const { lifecycleReadiness } = require('../src/services/recommendationLifecycleReadiness');

async function main() {
  const provider = process.env.RECOMMENDATION_PROVIDER || 'vnstock';
  const [prices, run] = await Promise.all([
    models.StockPrice.findAll({ attributes: ['observed_at'], where: { provider, interval: '1d' }, raw: true }),
    models.RecommendationRun.findOne({ where: { as_of: vietnamSessionDate(), provider, model: 'short_term_rule_v2', horizon_days: Number(process.env.RECOMMENDATION_HORIZON || 20) }, order: [['created_at', 'DESC']], include: [{ association: 'recommendations', include: [{ association: 'stock', attributes: ['code'] }] }] }),
  ]);
  const integrity = run?.snapshot_sha256 ? verifyRecommendationSnapshot(run) : null;
  console.log(JSON.stringify({ provider, ...lifecycleReadiness({ expectedSession: vietnamSessionDate(), latestEodSession: latestEodSession(prices), run, integrity }) }, null, 2));
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; }).finally(() => models.sequelize.close());
