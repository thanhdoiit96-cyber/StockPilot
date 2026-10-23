'use strict';
const { evaluatePositionExitGuidance } = require('./positionExitShadowEvaluation');
const { sealPositionExitEvaluation } = require('./positionExitEvaluationPersistence');
const plain = row => row?.toJSON ? row.toJSON() : row;
const MAX_GUIDANCE_PER_RUN = 100;

async function runPositionExitEvaluation({ PositionExitGuidance, PositionExitEvaluation, StockPrice, limit = MAX_GUIDANCE_PER_RUN, now = new Date() } = {}) {
  const boundedLimit = Math.min(Math.max(Number(limit) || MAX_GUIDANCE_PER_RUN, 1), MAX_GUIDANCE_PER_RUN);
  const guidanceRows = await PositionExitGuidance.findAll({ order: [['created_at', 'ASC'], ['id', 'ASC']], limit: boundedLimit });
  const summary = { scanned: guidanceRows.length, created: 0, existing: 0, pending: 0, evaluated: 0, excluded: 0, provider_requests: 0 };
  for (const source of guidanceRows) {
    const guidance = plain(source); const existing = await PositionExitEvaluation.findOne({ where: { guidance_id: guidance.id } });
    if (existing) { summary.existing += 1; continue; }
    const [rows] = await StockPrice.sequelize.query(`SELECT stock_id, observed_at, close, price, high, low FROM stock_prices WHERE stock_id = $1 AND provider = $2 AND interval = '1d' AND observed_at > $3 ORDER BY observed_at ASC, id ASC LIMIT 20`, { bind: [guidance.stock_id, guidance.payload.provider, guidance.payload.as_of] });
    const evaluation = evaluatePositionExitGuidance({ guidance: guidance.payload, priceRows: rows.map(plain) });
    const sealed = await sealPositionExitEvaluation({ PositionExitEvaluation, guidanceId: guidance.id, evaluation, now });
    summary[sealed.status === 'created' ? evaluation.status : 'existing'] += 1;
  }
  return { status: guidanceRows.length ? 'completed' : 'no_snapshots', limit: boundedLimit, result_summary: summary };
}
module.exports = { MAX_GUIDANCE_PER_RUN, runPositionExitEvaluation };
