'use strict';

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const models = require('../src/models');
const { verifyRecommendationSnapshot } = require('../src/services/recommendationPersistence');

async function main() {
  const run = await models.RecommendationRun.findOne({ order: [['created_at', 'DESC']], include: [{ association: 'recommendations', include: [{ association: 'stock', attributes: ['code'] }] }] });
  const integrity = run ? verifyRecommendationSnapshot(run) : { valid: false, reason: 'no_recommendation_snapshot' };
  const report = {
    generated_at: new Date().toISOString(),
    enabled: process.env.RECOMMENDATION_EVALUATION_ENABLED === 'true',
    cron: process.env.RECOMMENDATION_EVALUATION_CRON || '45 16 * * 1-5',
    timezone: process.env.RECOMMENDATION_EVALUATION_TIMEZONE || 'Asia/Ho_Chi_Minh',
    snapshot: run ? { id: run.id, as_of: run.as_of, created_at: run.created_at, selected_count: run.selected_count, integrity } : null,
    ready: Boolean(run && integrity.valid && process.env.RECOMMENDATION_EVALUATION_ENABLED === 'true')
  };
  const output = process.env.RECOMMENDATION_SCHEDULER_OUTPUT || path.resolve(__dirname, '../evidence/recommendation-scheduler-2026-09-21.json');
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
  if (!report.ready) process.exitCode = 2;
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; }).finally(async () => { await models.sequelize.close(); });
