'use strict';
require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env') });
const models = require('../src/models');
const { issueOfficialVn30Shadow } = require('../src/services/officialVn30Shadow');
async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--write', '--horizon=1', '--horizon=5'].includes(arg)) || args.filter(arg => arg.startsWith('--horizon=')).length > 1) throw new Error('Usage: node scripts/issue-official-vn30-shadow.cjs [--horizon=1|5] [--write]');
  const horizon = Number(args.find(arg => arg.startsWith('--horizon='))?.split('=')[1] || 5);
  const result = await issueOfficialVn30Shadow(models, { horizon, write: args.includes('--write') });
  console.log(JSON.stringify(result, null, 2));
  if (result.status === 'not_issued') process.exitCode = 2;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => models.sequelize.close());
