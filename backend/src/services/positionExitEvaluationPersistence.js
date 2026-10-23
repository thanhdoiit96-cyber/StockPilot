'use strict';
const crypto = require('node:crypto');
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}` : JSON.stringify(value);
const hash = value => crypto.createHash('sha256').update(canonical(value)).digest('hex');

async function sealPositionExitEvaluation({ PositionExitEvaluation, guidanceId, evaluation, now = new Date(), transaction } = {}) {
  if (!PositionExitEvaluation || !guidanceId || !evaluation?.version || !['pending', 'evaluated', 'excluded'].includes(evaluation.status)) throw new Error('valid immutable exit evaluation is required');
  const existing = await PositionExitEvaluation.findOne({ where: { guidance_id: guidanceId }, transaction });
  if (existing) return { status: 'evaluation_exists', evaluation_id: existing.id };
  const payload_sha256 = hash(evaluation);
  const row = await PositionExitEvaluation.create({ guidance_id: guidanceId, schema_version: evaluation.version, status: evaluation.status, payload: evaluation, payload_sha256, created_at: now }, { transaction });
  return { status: 'created', evaluation_id: row.id, payload_sha256 };
}
module.exports = { sealPositionExitEvaluation };
