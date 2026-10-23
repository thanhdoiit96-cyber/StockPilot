'use strict';
const { PositionExitGuidance, PositionExitEvaluation, StockPrice, sequelize } = require('../src/models');
const { runPositionExitEvaluation } = require('../src/services/positionExitEvaluationRunner');
const args = Object.fromEntries(process.argv.slice(2).map(value => { const [key, ...rest] = value.replace(/^--/, '').split('='); return [key, rest.join('=')]; }));

async function main() {
  if (process.env.EXIT_GUIDANCE_EVALUATION_ENABLED !== 'true') throw new Error('EXIT_GUIDANCE_EVALUATION_ENABLED=true is required');
  const limit = args.limit == null ? undefined : Number(args.limit);
  if (args.limit != null && (!Number.isInteger(limit) || limit < 1 || limit > 100)) throw new Error('--limit must be an integer from 1 to 100');
  return runPositionExitEvaluation({ PositionExitGuidance, PositionExitEvaluation, StockPrice, limit });
}
main().then(result => console.log(JSON.stringify(result))).catch(error => { console.error(`Exit-guidance evaluation failed: ${error.message}`); process.exitCode = 1; }).finally(async () => { await sequelize.close(); });
