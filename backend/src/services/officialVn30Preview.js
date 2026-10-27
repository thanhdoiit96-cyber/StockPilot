'use strict';
const crypto = require('node:crypto');
const { Op, QueryTypes } = require('sequelize');
const { buildOfficialVn30MembershipManifest } = require('./officialIndexMembershipIngest');
const { buildLiveForecastPreview } = require('./forecastLivePreview');
const { vietnamSessionDate } = require('./recommendationPersistence');
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

function buildOfficialVn30Preview({ snapshot, prices = [], asOf, horizon = 5, now = new Date() }) {
  const base = { version: 'official_vn30_preview_v1', universe: 'OfficialVN30', horizon_sessions: horizon, as_of: asOf,
    research_only: true, synthetic: false, live: false, publication_permitted: false, market_accuracy_verified: false,
    distribution: 'internal_research_only', mode: 'internal_research' };
  const unavailable = (reason, extra = {}) => ({ ...base, status: 'unavailable', reason, ...extra });
  if (!snapshot || snapshot.status !== 'sealed' || snapshot.index_code !== 'VN30') return unavailable('membership_snapshot_unavailable');
  if (snapshot.usage_scope !== 'internal_research_only' || !snapshot.rights_evidence_ref || snapshot.rights_evidence_ref === 'pending-verification') return unavailable('membership_rights_unverified');
  let manifest;
  try { manifest = buildOfficialVn30MembershipManifest({ ...snapshot, symbols: snapshot.constituents.map(item => item.symbol) }); }
  catch { return unavailable('membership_snapshot_invalid'); }
  if (snapshot.member_count !== 30 || snapshot.constituents.length !== 30 || manifest.membership_sha256 !== snapshot.membership_sha256 || manifest.source_sha256 !== snapshot.source_sha256) return unavailable('membership_snapshot_invalid');
  if (manifest.effective_from > asOf || (manifest.effective_to && manifest.effective_to < asOf) || Date.parse(manifest.source_published_at) > now.getTime()) return unavailable('membership_not_effective_for_session');
  if (prices.length > 6000) return unavailable('input_limit_exceeded');
  const histories = [];
  for (const symbol of manifest.symbols) {
    const dates = new Map(); let invalid = false;
    for (const row of prices.filter(item => item.symbol === symbol)) {
      const date = row.session_date;
      const close = Number(row.close);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || date > asOf || !Number.isFinite(close) || close <= 0 || row.currency !== 'VND' || row.price_unit !== 'VND_PER_SHARE' || row.is_adjusted !== false || !/^[a-f0-9]{64}$/i.test(row.source_hash || '')) { invalid = true; continue; }
      if (dates.has(date) && dates.get(date).close !== close) invalid = true;
      dates.set(date, { close, source_hash: row.source_hash });
    }
    const ordered = [...dates.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-60);
    if (!invalid && ordered.length === 60 && ordered.at(-1)[0] === asOf) histories.push({ symbol, ordered, calendar: ordered.map(([date]) => date).join(',') });
  }
  // Compare identical session windows, never averages of mismatched histories.
  const calendars = new Map();
  for (const item of histories) calendars.set(item.calendar, (calendars.get(item.calendar) || 0) + 1);
  const calendar = [...calendars].sort((a, b) => b[1] - a[1])[0]?.[0];
  const included = histories.filter(item => item.calendar === calendar);
  const coverage = { observed: included.length, universe: 30, ratio: included.length / 30, minimum: .95, history_sessions: 60 };
  if (included.length < 29) return unavailable('member_history_coverage_below_threshold', { coverage });
  const rows = included.flatMap(item => item.ordered.map(([date, value]) => ({ instrument: { symbol: item.symbol }, quote: { close: value.close }, observed_at: `${date}T08:00:00.000Z` })));
  const preview = buildLiveForecastPreview({ currentData: { rows, as_of: `${asOf}T08:00:00.000Z`, provider: 'vnstock_stored_eod' }, horizon, modelVersion: 'official-vn30-softmax-prototype-v1' });
  return { ...base, status: 'official_vn30_preview', provider: 'vnstock_stored_eod', coverage,
    membership: { membership_sha256: manifest.membership_sha256, source_sha256: manifest.source_sha256, source_identifier: manifest.source_identifier, effective_from: manifest.effective_from, effective_to: manifest.effective_to },
    rights_verification: snapshot.rights_evidence_ref === 'owner-attested-internal-research-pending' ? 'owner_attested_pending' : 'recorded',
    input_sha256: hash(included), calibrated: false, model_version: preview.model_version,
    probabilities: preview.probabilities, breadth_target: preview.breadth_target,
    validation: { ...preview.validation, provider_validation_completed: false },
    notice: 'Internal research only. Uncalibrated fixed-weight prototype; horizons are not independently trained. No public or commercial release.' };
}

async function readOfficialVn30Preview(models, { horizon = 5, now = new Date() } = {}) {
  const asOf = vietnamSessionDate(now);
  return models.sequelize.transaction({ isolationLevel: 'REPEATABLE READ', readOnly: true }, async transaction => {
    const record = await models.IndexMembershipSnapshot.findOne({ where: { index_code: 'VN30', status: 'sealed', effective_from: { [Op.lte]: asOf }, [Op.or]: [{ effective_to: null }, { effective_to: { [Op.gte]: asOf } }] }, include: [{ model: models.IndexMembershipConstituent, as: 'constituents' }], order: [['effective_from', 'DESC'], ['ingested_at', 'DESC']], transaction });
    const snapshot = record?.get({ plain: true });
    if (!snapshot) return buildOfficialVn30Preview({ asOf, horizon, now });
    const symbols = snapshot.constituents.map(item => item.symbol);
    if (symbols.length !== 30) return buildOfficialVn30Preview({ snapshot, asOf, horizon, now });
    const prices = await models.sequelize.query(`SELECT symbol, close, currency, price_unit, is_adjusted, source_hash, session_date::text FROM (
      SELECT s.code AS symbol, p.close, p.currency, p.price_unit, p.is_adjusted, p.source_hash,
        (p.observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS session_date,
        dense_rank() OVER (PARTITION BY s.code ORDER BY (p.observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date DESC) AS session_rank
      FROM stocks s JOIN stock_prices p ON p.stock_id = s.id
      WHERE s.code IN (:symbols) AND p.provider = 'vnstock' AND p.interval = '1d'
      AND (p.observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= CAST(:asOf AS date)
    ) history WHERE session_rank <= 60 ORDER BY symbol, session_date, source_hash LIMIT 6001`, { replacements: { symbols, asOf }, type: QueryTypes.SELECT, transaction });
    return buildOfficialVn30Preview({ snapshot, prices, asOf, horizon, now });
  });
}
module.exports = { buildOfficialVn30Preview, readOfficialVn30Preview };
