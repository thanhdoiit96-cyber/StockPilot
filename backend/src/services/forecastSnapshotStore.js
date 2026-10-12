'use strict';
const { createHash } = require('crypto');
const { Op } = require('sequelize');
const { artifactHash } = require('./forecastArtifact');
const CLASSES = ['declining', 'balanced', 'advancing'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const keyHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const plain = value => value?.get ? value.get({ plain: true }) : value;
const validDate = value => DATE.test(value || '') && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

function validateSnapshot(input) {
  if (!input || input.synthetic !== true || input.research_only !== true || input.live !== false || input.market_accuracy_verified !== false) throw new Error('Explicit synthetic research snapshot required');
  if (![1, 5].includes(input.horizon_sessions) || !validDate(input.as_of) || !input.provider || !input.model_version) throw new Error('Invalid snapshot identity');
  if (!/^[a-f0-9]{64}$/.test(input.split_hash || '') || !/^[a-f0-9]{64}$/.test(input.training_hash || '')) throw new Error('Invalid snapshot provenance');
  if (!Array.isArray(input.probabilities) || input.probabilities.length !== 3) throw new Error('Invalid snapshot probabilities');
  const values = Object.fromEntries(input.probabilities.map(item => [item.class, item.value]));
  if (CLASSES.some(name => !Number.isFinite(values[name]) || values[name] < 0 || values[name] > 1) || Math.abs(CLASSES.reduce((sum, name) => sum + values[name], 0) - 1) > 1e-9) throw new Error('Invalid snapshot probabilities');
  return { version: 'forecast_snapshot_payload_v1', synthetic: true, research_only: true, live: false, market_accuracy_verified: false,
    provider: input.provider, model_version: input.model_version, horizon_sessions: input.horizon_sessions, as_of: input.as_of,
    target_session: validDate(input.target_session) && input.target_session > input.as_of ? input.target_session : null, split_hash: input.split_hash, training_hash: input.training_hash,
    probabilities: CLASSES.map(name => ({ class: name, value: values[name] })) };
}
function snapshotGenerationKey(payload) { return keyHash([payload.provider, payload.model_version, payload.horizon_sessions, payload.as_of]); }
function verifySnapshot(row) { const value = plain(row); return Boolean(value?.payload_sha256 && value.payload_sha256 === artifactHash(value.payload)); }

function validateOutcome(snapshot, input) {
  const row = plain(snapshot);
  if (!verifySnapshot(row)) throw new Error('Snapshot integrity failed');
  const availableAt = typeof input?.outcome_available_at === 'string' ? Date.parse(input.outcome_available_at) : NaN;
  if (!input || !CLASSES.includes(input.actual_class) || !validDate(input.target_session) || input.target_session !== row.target_session || !Number.isFinite(availableAt)
    || availableAt < Date.parse(`${input.target_session}T15:00:00+07:00`)) throw new Error('Invalid forecast outcome');
  const probabilities = Object.fromEntries(row.payload.probabilities.map(item => [item.class, item.value]));
  const truth = CLASSES.indexOf(input.actual_class);
  const vector = CLASSES.map(name => probabilities[name]);
  return { version: 'forecast_outcome_payload_v1', snapshot_sha256: row.payload_sha256, actual_class: input.actual_class, target_session: input.target_session,
    outcome_available_at: new Date(input.outcome_available_at).toISOString(), brier_multiclass_sum: vector.reduce((sum, value, index) => sum + (value - Number(index === truth)) ** 2, 0),
    log_loss: -Math.log(Math.max(1e-15, vector[truth])) };
}

async function createForecastSnapshot({ ForecastSnapshot, sequelize }, input, { retentionDays = 180, now = new Date() } = {}) {
  if (!Number.isInteger(retentionDays) || retentionDays < 30 || retentionDays > 730 || !Number.isFinite(now.getTime())) throw new Error('Invalid retention policy');
  const payload = validateSnapshot(input), generation_key = snapshotGenerationKey(payload), payload_sha256 = artifactHash(payload);
  const existing = await ForecastSnapshot.findOne({ where: { generation_key } });
  if (existing) {
    if (!verifySnapshot(existing) || plain(existing).payload_sha256 !== payload_sha256) throw new Error('Snapshot identity conflict');
    return { status: 'snapshot_exists', snapshot: plain(existing) };
  }
  const values = { generation_key, schema_version: payload.version, provider: payload.provider, model_version: payload.model_version, horizon_sessions: payload.horizon_sessions,
    as_of: payload.as_of, target_session: payload.target_session, synthetic: true, research_only: true, payload, payload_sha256,
    expires_at: new Date(now.getTime() + retentionDays * 86400000) };
  try {
    const created = await sequelize.transaction(transaction => ForecastSnapshot.create(values, { transaction }));
    return { status: 'created', snapshot: plain(created) };
  } catch (error) {
    if (error?.name !== 'SequelizeUniqueConstraintError') throw error;
    const raced = await ForecastSnapshot.findOne({ where: { generation_key } });
    if (!raced || !verifySnapshot(raced) || plain(raced).payload_sha256 !== payload_sha256) throw new Error('Snapshot identity conflict');
    return { status: 'snapshot_exists', snapshot: plain(raced) };
  }
}

async function recordForecastOutcome({ ForecastSnapshot, ForecastOutcomeEvent, sequelize }, snapshotId, input) {
  if (!UUID.test(snapshotId || '')) throw new Error('Invalid snapshot id');
  const snapshot = await ForecastSnapshot.findByPk(snapshotId);
  if (!snapshot) return { status: 'snapshot_not_found' };
  const payload = validateOutcome(snapshot, input), payload_sha256 = artifactHash(payload);
  const existing = await ForecastOutcomeEvent.findOne({ where: { snapshot_id: snapshotId } });
  if (existing) {
    const row = plain(existing);
    if (row.payload_sha256 !== payload_sha256 || row.payload_sha256 !== artifactHash(row.payload)) throw new Error('Outcome already measured with different evidence');
    return { status: 'outcome_exists', outcome: row };
  }
  try {
    const created = await sequelize.transaction(transaction => ForecastOutcomeEvent.create({ snapshot_id: snapshotId, schema_version: payload.version, payload, payload_sha256 }, { transaction }));
    return { status: 'measured', outcome: plain(created) };
  } catch (error) {
    if (error?.name !== 'SequelizeUniqueConstraintError') throw error;
    const raced = await ForecastOutcomeEvent.findOne({ where: { snapshot_id: snapshotId } });
    const row = plain(raced);
    if (!row || row.payload_sha256 !== payload_sha256 || row.payload_sha256 !== artifactHash(row.payload)) throw new Error('Outcome already measured with different evidence');
    return { status: 'outcome_exists', outcome: row };
  }
}

function writeForecastCursor(row) { return Buffer.from(JSON.stringify({ as_of: row.as_of, id: row.id })).toString('base64url'); }
function readForecastCursor(value) {
  if (typeof value !== 'string' || !value || value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid forecast cursor');
  let cursor; try { cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')); } catch { throw new Error('Invalid forecast cursor'); }
  if (!validDate(cursor?.as_of) || !UUID.test(cursor?.id || '')) throw new Error('Invalid forecast cursor');
  return cursor;
}
async function listForecastSnapshots({ ForecastSnapshot, ForecastOutcomeEvent }, { horizon, cursor, limit = 20, includeExpired = false, now = new Date() } = {}) {
  if (![1, 5].includes(horizon) || !Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error('Invalid forecast history query');
  const after = cursor ? readForecastCursor(cursor) : null;
  const where = { horizon_sessions: horizon, synthetic: true, research_only: true, ...(includeExpired ? {} : { expires_at: { [Op.gt]: now } }),
    ...(after ? { [Op.or]: [{ as_of: { [Op.lt]: after.as_of } }, { as_of: after.as_of, id: { [Op.lt]: after.id } }] } : {}) };
  const rows = await ForecastSnapshot.findAll({ where, include: [{ model: ForecastOutcomeEvent, as: 'outcome', required: false }], order: [['as_of', 'DESC'], ['id', 'DESC']], limit: limit + 1 });
  const page = rows.slice(0, limit).map(item => { const row = plain(item); return { ...row, lifecycle_status: row.outcome ? 'measured' : 'pending', integrity_valid: verifySnapshot(row) }; });
  return { items: page, has_more: rows.length > limit, next_cursor: rows.length > limit ? writeForecastCursor(page.at(-1)) : null };
}
module.exports = { validateSnapshot, snapshotGenerationKey, verifySnapshot, validateOutcome, createForecastSnapshot, recordForecastOutcome, writeForecastCursor, readForecastCursor, listForecastSnapshots };
