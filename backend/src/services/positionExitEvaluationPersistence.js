'use strict';
const crypto = require('node:crypto');
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}` : JSON.stringify(value);
const hash = value => crypto.createHash('sha256').update(canonical(value)).digest('hex');

async function sealPositionExitEvaluation({ PositionExitEvaluation, guidanceId, evaluation, now = new Date(), transaction } = {}) {
  if (!PositionExitEvaluation || !guidanceId || !evaluation?.version || !['pending', 'evaluated', 'excluded'].includes(evaluation.status)) throw new Error('valid immutable exit evaluation is required');
  if (evaluation.version === 'position_exit_shadow_evaluation_v2' && ![1, 5, 20].includes(evaluation.horizon_days)) throw new Error('valid v2 horizon is required');
  if (evaluation.version === 'position_exit_shadow_evaluation_v2' && evaluation.status === 'pending') return { status: 'pending' };
  const horizon_days = evaluation.horizon_days || 0;
  const where = { guidance_id: guidanceId, horizon_days, schema_version: evaluation.version };
  const existing = await PositionExitEvaluation.findOne({ where, transaction });
  if (existing) return { status: 'evaluation_exists', evaluation_id: existing.id };
  const payload_sha256 = hash(evaluation);
  const values = { ...where, status: evaluation.status, payload: evaluation, payload_sha256, created_at: now };
  const [row, created] = PositionExitEvaluation.findOrCreate
    ? await PositionExitEvaluation.findOrCreate({ where, defaults: values, transaction })
    : [await PositionExitEvaluation.create(values, { transaction }), true];
  if (!created) return { status: 'evaluation_exists', evaluation_id: row.id };
  return { status: 'created', evaluation_id: row.id, payload_sha256 };
}
module.exports = { sealPositionExitEvaluation, hash };
