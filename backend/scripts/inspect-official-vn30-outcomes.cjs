'use strict';
require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env') });
const models = require('../src/models');
const { readOfficialOutcomeReadiness } = require('../src/services/officialVn30OutcomeReadiness');
async function main() {
  if (process.env.NODE_ENV !== 'development' || process.argv.length > 2) throw new Error('Development-only read-only inspection; no arguments supported');
  console.log(JSON.stringify(await readOfficialOutcomeReadiness(models), null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => models.sequelize.close());
