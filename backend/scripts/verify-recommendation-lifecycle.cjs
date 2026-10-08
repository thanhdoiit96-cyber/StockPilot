'use strict';

const path = require('path');
const { Op } = require('sequelize');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const models = require('../src/models');
const { evaluatePendingRecommendations, verifyRecommendationSnapshot } = require('../src/services/recommendationPersistence');

async function main() {
  const run = await models.RecommendationRun.findOne({
    where: { snapshot_sha256: { [Op.ne]: null } },
    order: [['created_at', 'DESC']],
    include: [{ association: 'recommendations', include: [{ association: 'stock', attributes: ['code'] }] }],
  });
  if (!run) return console.log(JSON.stringify({ status: 'waiting_for_hash_backed_snapshot' }, null, 2));
  const integrity = verifyRecommendationSnapshot(run);
  if (!integrity.valid) {
    console.log(JSON.stringify({ status: 'snapshot_integrity_failed', run_id: run.id, as_of: run.as_of, source: integrity.source || null }, null, 2));
    process.exitCode = 1;
    return;
  }
  const evaluation = await evaluatePendingRecommendations(models);
  const refreshed = await models.RecommendationRun.findOne({ where: { id: run.id }, include: [{ association: 'recommendations', attributes: ['outcome', 'forward_return_pct'] }] });
  const recommendations = refreshed?.recommendations || [];
  const measured = recommendations.filter(item => item.outcome && item.outcome !== 'pending' && item.forward_return_pct != null);
  console.log(JSON.stringify({
    status: 'verified', run_id: run.id, as_of: run.as_of, horizon_days: run.horizon_days,
    pending_count: recommendations.length - measured.length, measured_count: measured.length,
    evaluation: { runs_considered: evaluation.runs_considered, runs_evaluated: evaluation.runs_evaluated, runs_skipped_integrity: evaluation.runs_skipped_integrity, measured: evaluation.measured },
  }, null, 2));
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; }).finally(async () => { await models.sequelize.close(); });
