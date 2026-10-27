'use strict';
const { artifactHash } = require('./forecastArtifact');
const { readOfficialVn30Preview } = require('./officialVn30Preview');
const { vietnamSessionDate, holidaySet, eodCutoffHour } = require('./recommendationPersistence');
const VERSION = 'official_vn30_shadow_v1';
const plain = row => row?.get ? row.get({ plain: true }) : row;

function nextSession(asOf, holidays) {
  const day = new Date(`${asOf}T00:00:00Z`);
  for (let i = 0; i < 370; i++) {
    day.setUTCDate(day.getUTCDate() + 1);
    if (![0, 6].includes(day.getUTCDay()) && !holidays.has(day.toISOString().slice(0, 10))) return day.toISOString().slice(0, 10);
  }
  throw new Error('invalid_trading_calendar');
}

function prepareOfficialShadow(preview, { now = new Date(), holidays = holidaySet(), cutoffHour = eodCutoffHour() } = {}) {
  if (!Number.isFinite(now.getTime()) || preview?.status !== 'official_vn30_preview' || preview.universe !== 'OfficialVN30' || preview.research_only !== true || preview.synthetic !== false || preview.live !== false || preview.publication_permitted !== false || ![1, 5].includes(preview.horizon_sessions)) throw new Error('invalid_official_preview');
  const evidence = preview.private_evidence;
  if (!evidence?.membership_id || ![29, 30].includes(evidence.histories?.length) || !Array.isArray(evidence.availability) || !evidence.availability.length) throw new Error('private_evidence_required');
  const next = nextSession(preview.as_of, holidays);
  if (vietnamSessionDate(now, holidays, cutoffHour) !== preview.as_of || now.getTime() >= Date.parse(`${next}T09:00:00+07:00`)) throw new Error('prospective_issuance_window_closed');
  const time = value => value == null ? NaN : new Date(value).getTime();
  if (!Number.isFinite(time(evidence.membership_ingested_at)) || time(evidence.membership_ingested_at) > now.getTime()) throw new Error('membership_not_available_at_issuance');
  for (const row of evidence.availability) {
    const fetched = time(row.fetched_at), created = time(row.created_at), updated = time(row.updated_at);
    const closed = Date.parse(`${row.session_date}T${String(cutoffHour).padStart(2, '0')}:00:00+07:00`);
    if (![fetched, created, updated, closed].every(Number.isFinite) || fetched < closed || [fetched, created, updated].some(value => value > now.getTime())) throw new Error('input_not_available_after_close_before_issuance');
  }
  const crypto = require('node:crypto');
  if (crypto.createHash('sha256').update(JSON.stringify(evidence.histories)).digest('hex') !== preview.input_sha256) throw new Error('input_hash_mismatch');
  const classes = ['advancing', 'balanced', 'declining'];
  if (preview.probabilities?.length !== 3 || classes.some(name => !preview.probabilities.some(item => item.class === name && Number.isFinite(item.value) && item.value >= 0 && item.value <= 1)) || Math.abs(preview.probabilities.reduce((sum, item) => sum + item.value, 0) - 1) > 1e-6) throw new Error('invalid_probabilities');
  const { private_evidence, ...publicPreview } = preview;
  const identity = { version: VERSION, provider: preview.provider, model: preview.model_version, membership: preview.membership.membership_sha256, source: preview.membership.source_sha256, horizon: preview.horizon_sessions, as_of: preview.as_of };
  const payload = { ...publicPreview, version: VERSION, shadow: true, issued_at: now.toISOString(), first_target_session: next,
    input_evidence: JSON.parse(JSON.stringify(private_evidence)), calendar_policy: { version: 'configured_vietnam_weekdays_v1', holidays: [...holidays].sort(), cutoff_hour: cutoffHour, next_open_hour: 9 },
    outcome_policy: 'pending_corporate_action_and_calendar_contract', scoring_permitted: false };
  if (Buffer.byteLength(JSON.stringify(payload)) > 1024 * 1024) throw new Error('shadow_payload_limit_exceeded');
  const { issued_at: _issuedAt, ...stable } = payload;
  return { payload, generation_key: artifactHash(identity), content_sha256: artifactHash(stable) };
}

async function issueOfficialVn30Shadow(models, { horizon = 5, write = false, env = process.env, clock = () => new Date(), reader = readOfficialVn30Preview } = {}) {
  if (env.NODE_ENV !== 'development') throw new Error('official_shadow_development_only');
  if (write && env.FORECAST_OFFICIAL_SHADOW !== 'true') throw new Error('official_shadow_write_disabled');
  if (![1, 5].includes(horizon)) throw new Error('invalid_horizon');
  const now = clock();
  const preview = await reader(models, { horizon, now, includeEvidence: true });
  if (preview.status === 'unavailable') return { status: 'not_issued', reason: preview.reason, horizon_sessions: horizon, as_of: preview.as_of, coverage: preview.coverage };
  let prepared;
  try { prepared = prepareOfficialShadow(preview, { now }); }
  catch (error) { return { status: 'not_issued', reason: error.message, horizon_sessions: horizon, as_of: preview.as_of, coverage: preview.coverage }; }
  if (!write) return { status: 'dry_run_ready', generation_key: prepared.generation_key, horizon_sessions: horizon, as_of: preview.as_of, scoring_permitted: false };
  return models.sequelize.transaction(async transaction => {
    await models.sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:key))', { replacements: { key: prepared.generation_key }, transaction });
    const existing = plain(await models.ForecastSnapshot.findOne({ where: { generation_key: prepared.generation_key }, transaction }));
    if (existing) {
      const { issued_at: _issuedAt, ...stable } = existing.payload;
      if (existing.schema_version !== VERSION || existing.payload_sha256 !== artifactHash(existing.payload) || artifactHash(stable) !== prepared.content_sha256) throw new Error('official_shadow_identity_conflict');
      return { status: 'snapshot_exists', id: existing.id, as_of: existing.as_of, scoring_permitted: false };
    }
    // Recheck the deadline after waiting for the lock; never backdate a late insert.
    prepareOfficialShadow(preview, { now: clock() });
    const payload = prepared.payload;
    const created = await models.ForecastSnapshot.create({ generation_key: prepared.generation_key, schema_version: VERSION, provider: payload.provider, model_version: payload.model_version,
      horizon_sessions: horizon, as_of: payload.as_of, target_session: null, synthetic: false, research_only: true, payload, payload_sha256: artifactHash(payload), expires_at: new Date(now.getTime() + 180 * 86400000) }, { transaction });
    return { status: 'created', id: created.id, as_of: payload.as_of, horizon_sessions: horizon, scoring_permitted: false };
  });
}
module.exports = { prepareOfficialShadow, issueOfficialVn30Shadow, nextSession };
