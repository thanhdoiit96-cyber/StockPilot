'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const models = require('../src/models');
const { auditRecommendationPrices } = require('../src/services/recommendationPriceAudit');

async function main() {
  // One consistent, read-only database snapshot; never invoke the evaluator.
  const report = await models.sequelize.transaction({ isolationLevel: 'REPEATABLE READ' }, async transaction => {
    await models.sequelize.query('SET TRANSACTION READ ONLY', { transaction });
    const prices = await models.StockPrice.findAll({ raw: true, transaction });
    const runs = await models.RecommendationRun.findAll({ include: [{ association: 'recommendations' }], transaction });
    return auditRecommendationPrices({ prices, runs: runs.map(run => run.toJSON()) });
  });
  console.log(JSON.stringify(report, null, 2));
}

main().catch(() => { console.error('Recommendation price audit failed; check database connectivity and schema.'); process.exitCode = 1; })
  .finally(() => models.sequelize.close());
