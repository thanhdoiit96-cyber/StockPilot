'use strict';
const { literal } = require('sequelize');
const { HORIZONS, evaluatePositionExitHorizon } = require('./positionExitShadowEvaluation');
const { sealPositionExitEvaluation, hash } = require('./positionExitEvaluationPersistence');
const plain = row => row?.toJSON ? row.toJSON() : row;
const MAX_GUIDANCE_PER_RUN = 100;

async function runPositionExitEvaluation({ PositionExitGuidance, PositionExitEvaluation, StockPrice, limit = MAX_GUIDANCE_PER_RUN, now = new Date() } = {}) {
  const boundedLimit = Math.min(Math.max(Number(limit) || MAX_GUIDANCE_PER_RUN, 1), MAX_GUIDANCE_PER_RUN);
  const guidanceRows = await PositionExitGuidance.findAll({ where: literal(`(SELECT COUNT(DISTINCT e.horizon_days) FROM position_exit_evaluations e WHERE e.guidance_id = "PositionExitGuidance".id AND e.schema_version = 'position_exit_shadow_evaluation_v2' AND e.horizon_days IN (1,5,20)) < 3`), order: [['created_at', 'ASC'], ['id', 'ASC']], limit: boundedLimit });
  const summary = { scanned: guidanceRows.length, created: 0, existing: 0, pending: 0, evaluated: 0, excluded: 0, provider_requests: 0 };
  for (const source of guidanceRows) {
    const guidance = plain(source);
    const validHash = guidance.payload && hash(guidance.payload) === guidance.payload_sha256;
    let rows = [];
    const preflight = validHash ? evaluatePositionExitHorizon({ guidance: guidance.payload, horizonDays: 1 }) : null;
    if (preflight?.status === 'pending') {
      [rows] = await StockPrice.sequelize.query(`SELECT * FROM (
        SELECT DISTINCT ON ((observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
          observed_at, close, price, high, low, provider, interval, price_unit, currency, is_adjusted
        FROM stock_prices WHERE stock_id = $1 AND provider = $2 AND interval = '1d'
          AND (observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date > $3::date AND observed_at <= $4
        ORDER BY (observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date ASC, observed_at DESC, id DESC
      ) daily ORDER BY observed_at ASC LIMIT 20`, { bind: [guidance.stock_id, guidance.payload.provider, guidance.payload.as_of, now] });
    }
    for (const horizonDays of HORIZONS) {
      const evaluation = validHash ? evaluatePositionExitHorizon({ guidance: guidance.payload, priceRows: rows.map(plain), horizonDays })
        : { version: 'position_exit_shadow_evaluation_v2', horizon_days: horizonDays, status: 'excluded', reason: 'guidance_hash_mismatch' };
      if (evaluation.status === 'pending') { summary.pending += 1; continue; }
      const sealed = await sealPositionExitEvaluation({ PositionExitEvaluation, guidanceId: guidance.id, evaluation, now });
      if (sealed.status === 'created') { summary.created += 1; summary[evaluation.status] += 1; }
      else summary.existing += 1;
    }
  }
  return { status: guidanceRows.length ? 'completed' : 'no_snapshots', limit: boundedLimit, result_summary: summary };
}
module.exports = { MAX_GUIDANCE_PER_RUN, runPositionExitEvaluation };
