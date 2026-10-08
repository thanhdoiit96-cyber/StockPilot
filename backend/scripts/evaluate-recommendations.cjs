'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const models = require('../src/models');
const { evaluatePendingRecommendations } = require('../src/services/recommendationPersistence');

async function main() {
  console.log(JSON.stringify(await evaluatePendingRecommendations(models), null, 2));
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; }).finally(async () => { await models.sequelize.close(); });
