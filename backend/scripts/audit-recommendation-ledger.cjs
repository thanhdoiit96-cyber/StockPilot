'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const models = require('../src/models');
const { auditRecommendationEvaluationLedger } = require('../src/services/recommendationLedgerAudit');

async function main() {
  const report = await models.sequelize.transaction({ isolationLevel: 'REPEATABLE READ' }, async transaction => {
    await models.sequelize.query('SET TRANSACTION READ ONLY', { transaction });
    const events = await models.RecommendationEvaluationEvent.findAll({
      order: [['created_at', 'ASC'], ['id', 'ASC']], transaction,
      include: [{ association: 'recommendation', attributes: ['id', 'outcome', 'evaluated_at', 'forward_return_pct', 'evaluation_evidence'] }],
    });
    return auditRecommendationEvaluationLedger({ events });
  });
  console.log(JSON.stringify(report, null, 2));
  if (report.invalid_events) process.exitCode = 2;
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; })
  .finally(() => models.sequelize.close());
