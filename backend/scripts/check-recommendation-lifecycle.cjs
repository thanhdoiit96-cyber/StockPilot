'use strict';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const models = require('../src/models');
const { readRecommendationLifecycleCheckpoint } = require('../src/services/recommendationLifecycleCheckpoint');

async function main() {
  const report = await readRecommendationLifecycleCheckpoint({ StockPrice: models.StockPrice, RecommendationRun: models.RecommendationRun, provider: process.env.RECOMMENDATION_PROVIDER || 'vnstock', horizonDays: Number(process.env.RECOMMENDATION_HORIZON || 20) });
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; }).finally(() => models.sequelize.close());
