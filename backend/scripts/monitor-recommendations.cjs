'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const models = require('../src/models');
const { verifyRecommendationSnapshot } = require('../src/services/recommendationPersistence');
const { assessRuns } = require('../src/services/recommendationEligibility');
const { recommendationConcentration } = require('../src/services/recommendationConcentration');

async function main() {
  const source = await models.RecommendationRun.findOne({ where: { provider: 'vnstock', model: 'short_term_rule_v2' }, order: [['as_of', 'DESC'], ['created_at', 'DESC']], include: [{ association: 'recommendations', include: [{ association: 'stock', attributes: ['code', 'name'] }] }] });
  if (!source) throw new Error('no recommendation snapshot found');
  const [run] = await assessRuns([source], models.StockPrice);
  const risk = recommendationConcentration(run, verifyRecommendationSnapshot(source).valid === true);
  const items = run.recommendations || [];
  const measured = items.filter(item => item.statistics_eligible === true);
  const pending = items.filter(item => item.measurement_status === 'pending');
  // Preserve the legacy monitor-hash contract used by verify:recommendation-snapshot.
  const snapshot = items.map(item => ({ rank: item.rank, stock_id: item.stock_id, code: item.stock?.code, entry_price: item.entry_price == null ? null : Number(item.entry_price), horizon_days: item.horizon_days, rationale: item.rationale })).sort((a, b) => a.rank - b.rank);
  const monitorHash = crypto.createHash('sha256').update(JSON.stringify({ run_id: run.id, as_of: run.as_of, model: run.model, provider: run.provider, snapshot })).digest('hex');
  const report = {
    generated_at: new Date().toISOString(),
    run: { id: run.id, as_of: run.as_of, created_at: run.created_at, model: run.model, provider: run.provider, horizon_days: run.horizon_days, selected_count: items.length, snapshot_sha256: monitorHash, canonical_snapshot_sha256: run.snapshot_sha256 || null },
    status: { selected: items.length, measured: measured.length, pending: pending.length, excluded: items.filter(item => item.measurement_status === 'excluded').length, hit_rate_pct: measured.length ? measured.filter(item => item.outcome === 'positive').length / measured.length * 100 : null, evaluation_ready: measured.length === items.length && items.length > 0, ...risk },
    selected: items.map(item => ({ rank: item.rank, code: item.stock?.code, sector: item.rationale?.snapshot_taxonomy?.industry || null, measurement_status: item.measurement_status, outcome: item.outcome || 'pending', forward_return_pct: item.statistics_eligible === true ? item.forward_return_pct : null }))
  };
  const output = process.env.RECOMMENDATION_MONITOR_OUTPUT || path.resolve(__dirname, '../evidence/recommendation-monitor-latest.json');
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => models.sequelize.close());
