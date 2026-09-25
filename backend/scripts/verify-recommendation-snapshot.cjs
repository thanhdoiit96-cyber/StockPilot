'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const models = require('../src/models');

function hashRun(run) {
  const snapshot = (run.recommendations || []).map(item => ({ rank: item.rank, stock_id: item.stock_id, code: item.stock?.code, entry_price: item.entry_price == null ? null : Number(item.entry_price), horizon_days: item.horizon_days, rationale: item.rationale })).sort((a, b) => a.rank - b.rank);
  return crypto.createHash('sha256').update(JSON.stringify({ run_id: run.id, as_of: run.as_of, model: run.model, provider: run.provider, snapshot })).digest('hex');
}

async function main() {
  const evidencePath = process.env.RECOMMENDATION_MONITOR_EVIDENCE || path.resolve(__dirname, '../evidence/recommendation-monitor-latest.json');
  if (!fs.existsSync(evidencePath)) throw new Error(`monitor evidence not found: ${evidencePath}`);
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  const run = await models.RecommendationRun.findOne({ where: { id: evidence.run?.id }, include: [{ association: 'recommendations', include: [{ association: 'stock', attributes: ['code'] }] }] });
  if (!run) throw new Error(`recommendation run not found: ${evidence.run?.id}`);
  const actual = hashRun(run);
  const expected = evidence.run?.snapshot_sha256;
  const result = { valid: actual === expected, run_id: run.id, expected, actual, checked_at: new Date().toISOString() };
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exitCode = 2;
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; }).finally(async () => { await models.sequelize.close(); });
