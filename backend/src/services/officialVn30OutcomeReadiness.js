'use strict';
const { QueryTypes } = require('sequelize');
const { artifactHash } = require('./forecastArtifact');
const { nextSession } = require('./officialVn30Shadow');
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

function frozenOutcomeScope(snapshot) {
  const p = snapshot?.payload;
  if (!p || snapshot.schema_version !== 'official_vn30_shadow_v1' || p.version !== snapshot.schema_version || artifactHash(p) !== snapshot.payload_sha256 || p.synthetic !== false || p.research_only !== true || p.live !== false || p.universe !== 'OfficialVN30' || ![1, 5].includes(p.horizon_sessions) || !validDate(p.as_of)) throw new Error('invalid_official_shadow_snapshot');
  const policy = p.calendar_policy;
  if (policy?.version !== 'configured_vietnam_weekdays_v1' || !Array.isArray(policy.holidays) || policy.holidays.some(date => !validDate(date)) || !Number.isInteger(policy.cutoff_hour) || policy.cutoff_hour < 0 || policy.cutoff_hour > 23) throw new Error('invalid_frozen_calendar');
  const histories = p.input_evidence?.histories;
  const symbols = histories?.map(item => item.symbol);
  if (!symbols || ![29, 30].includes(symbols.length) || new Set(symbols).size !== symbols.length || symbols.some(symbol => !/^[A-Z0-9]{1,12}$/.test(symbol))) throw new Error('invalid_frozen_members');
  const sessions = []; let session = p.as_of;
  for (let i = 0; i < p.horizon_sessions; i++) { session = nextSession(session, new Set(policy.holidays)); sessions.push(session); }
  if (sessions[0] !== p.first_target_session || !Number.isFinite(Date.parse(p.issued_at)) || Date.parse(p.issued_at) >= Date.parse(`${sessions[0]}T09:00:00+07:00`)) throw new Error('invalid_prospective_issuance');
  return { symbols, sessions, cutoffHour: policy.cutoff_hour };
}

function inspectOfficialOutcome(snapshot, rows = [], now = new Date()) {
  const base = { snapshot_id: snapshot?.id, research_only: true, scoring_permitted: false, calendar_verified: false, corporate_actions_verified: false };
  let scope;
  try { scope = frozenOutcomeScope(snapshot); } catch (error) { return { ...base, status: 'excluded', reason: error.message }; }
  const { symbols, sessions, cutoffHour } = scope;
  const report = { ...base, as_of: snapshot.payload.as_of, horizon_sessions: sessions.length, planned_target_session: sessions.at(-1), target_basis: 'frozen_configured_calendar_unverified', members: symbols.length };
  const pending = reason => ({ ...report, status: 'pending', reason });
  if (!Number.isFinite(now.getTime())) return pending('invalid_inspection_time');
  if (rows.length > 600) return pending('outcome_input_limit_exceeded');
  if (now.getTime() < Date.parse(`${sessions.at(-1)}T${String(cutoffHour).padStart(2, '0')}:00:00+07:00`)) return pending('target_session_not_closed');
  const byKey = new Map();
  for (const row of rows) {
    if (!symbols.includes(row.symbol) || !sessions.includes(row.session_date)) continue;
    const closed = Date.parse(`${row.session_date}T${String(cutoffHour).padStart(2, '0')}:00:00+07:00`);
    const fetched = row.fetched_at == null ? NaN : new Date(row.fetched_at).getTime();
    if (row.provider !== 'vnstock' || row.interval !== '1d' || row.currency !== 'VND' || row.price_unit !== 'VND_PER_SHARE' || row.is_adjusted !== false || !Number.isFinite(Number(row.close)) || Number(row.close) <= 0 || !/^[a-f0-9]{64}$/i.test(row.source_hash || '')) return pending('invalid_outcome_price_basis_or_provenance');
    if (!Number.isFinite(fetched) || fetched < closed || fetched > now.getTime()) return pending('outcome_evidence_not_available_after_close');
    const key = `${row.symbol}:${row.session_date}`;
    if (byKey.has(key) && byKey.get(key) !== Number(row.close)) return pending('conflicting_outcome_prices');
    byKey.set(key, Number(row.close));
  }
  const observed = sessions.map(session => ({ session, observed: symbols.filter(symbol => byKey.has(`${symbol}:${session}`)).length, required: symbols.length }));
  return { ...report, status: observed.every(item => item.observed === item.required) ? 'pending_evidence_review' : 'pending', reason: observed.every(item => item.observed === item.required) ? 'calendar_and_corporate_action_evidence_unverified' : 'frozen_target_prices_missing', sessions: observed };
}

async function readOfficialOutcomeReadiness(models, { limit = 10, now = new Date() } = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) throw new Error('invalid_inspection_limit');
  return models.sequelize.transaction({ isolationLevel: 'REPEATABLE READ', readOnly: true }, async transaction => {
    const records = await models.ForecastSnapshot.findAll({ where: { schema_version: 'official_vn30_shadow_v1', synthetic: false, research_only: true }, order: [['created_at', 'DESC'], ['id', 'DESC']], limit: limit + 1, transaction });
    const results = [];
    for (const record of records.slice(0, limit)) {
      const snapshot = record.get ? record.get({ plain: true }) : record;
      let scope;
      try { scope = frozenOutcomeScope(snapshot); } catch { results.push(inspectOfficialOutcome(snapshot, [], now)); continue; }
      const rows = await models.sequelize.query(`SELECT s.code AS symbol, p.close, p.provider, p.interval, p.currency, p.price_unit, p.is_adjusted, p.source_hash, p.fetched_at,
        (p.observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date::text AS session_date
        FROM stock_prices p JOIN stocks s ON s.id=p.stock_id
        WHERE s.code IN (:symbols) AND p.provider='vnstock' AND p.interval='1d'
        AND (p.observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date::text IN (:sessions)
        ORDER BY s.code, p.observed_at, p.source_hash LIMIT 601`, { replacements: { symbols: scope.symbols, sessions: scope.sessions }, type: QueryTypes.SELECT, transaction });
      results.push(inspectOfficialOutcome(snapshot, rows, now));
    }
    return { version: 'official_vn30_outcome_readiness_v1', status: results.length ? 'inspected' : 'no_shadow_snapshots', inspected: results.length, has_more: records.length > limit, scoring_permitted: false, results };
  });
}
module.exports = { frozenOutcomeScope, inspectOfficialOutcome, readOfficialOutcomeReadiness };
