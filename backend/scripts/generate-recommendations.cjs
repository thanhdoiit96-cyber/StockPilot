'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const models = require('../src/models');
const { generateRecommendationSnapshot } = require('../src/services/recommendationPersistence');

async function main() {
  const result = await generateRecommendationSnapshot({ ...models, provider: process.env.RECOMMENDATION_PROVIDER || 'vnstock', limit: Math.min(5, Math.max(3, Number(process.env.RECOMMENDATION_LIMIT || 5))), horizonDays: Number(process.env.RECOMMENDATION_HORIZON || 20) });
  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; }).finally(async () => { await models.sequelize.close(); });
