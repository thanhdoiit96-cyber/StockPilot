'use strict';
const { artifactHash } = require('./forecastArtifact');
const { frozenOutcomeScope, inspectOfficialOutcome, readOfficialOutcomeReadiness } = require('./officialVn30OutcomeReadiness');
function fixture(horizon = 5) {
  const symbols = Array.from({ length: 30 }, (_, i) => `S${i}`);
  const payload = { version: 'official_vn30_shadow_v1', universe: 'OfficialVN30', synthetic: false, research_only: true, live: false, horizon_sessions: horizon, as_of: '2026-10-23', issued_at: '2026-10-23T10:00:00Z', first_target_session: '2026-10-26', calendar_policy: { version: 'configured_vietnam_weekdays_v1', holidays: [], cutoff_hour: 15 }, input_evidence: { histories: symbols.map(symbol => ({ symbol })) } };
  const snapshot = { id: 'fixture', schema_version: payload.version, payload, payload_sha256: artifactHash(payload) };
  const rows = symbols.flatMap(symbol => frozenOutcomeScope(snapshot).sessions.map(session_date => ({ symbol, session_date, close: 10000, provider: 'vnstock', interval: '1d', currency: 'VND', price_unit: 'VND_PER_SHARE', is_adjusted: false, source_hash: 'a'.repeat(64), fetched_at: `${session_date}T09:00:00Z` })));
  return { snapshot, rows };
}
const now = new Date('2026-11-02T09:00:00Z');
test.each([1, 5])('complete prices never imply verified performance: horizon %s', horizon => {
  const { snapshot, rows } = fixture(horizon), result = inspectOfficialOutcome(snapshot, rows, now);
  expect(result.status).toBe('pending_evidence_review');
  expect(result.scoring_permitted).toBe(false);
  expect(result.planned_target_session).toBe(horizon === 1 ? '2026-10-26' : '2026-10-30');
  expect(result).not.toHaveProperty('actual_class');
  expect(result).not.toHaveProperty('returns');
  expect(result).not.toHaveProperty('symbols');
});
test('missing intermediate date is not replaced with a later date', () => {
  const { snapshot, rows } = fixture();
  const revised = rows.filter(row => row.session_date !== '2026-10-27').concat(rows.filter(row => row.session_date === '2026-10-27').map(row => ({ ...row, session_date: '2026-11-02' })));
  const result = inspectOfficialOutcome(snapshot, revised, now);
  expect(result.reason).toBe('frozen_target_prices_missing');
  expect(result.planned_target_session).toBe('2026-10-30');
  expect(result.sessions[1].observed).toBe(0);
});
test('requires closed target and all original members', () => {
  const { snapshot, rows } = fixture();
  expect(inspectOfficialOutcome(snapshot, rows, new Date('2026-10-30T07:59:00Z')).reason).toBe('target_session_not_closed');
  expect(inspectOfficialOutcome(snapshot, rows.filter(row => row.symbol !== 'S0'), now).reason).toBe('frozen_target_prices_missing');
});
test('conflicting duplicates fail while identical duplicates are tolerated', () => {
  const { snapshot, rows } = fixture();
  expect(inspectOfficialOutcome(snapshot, [...rows, rows[0]], now).status).toBe('pending_evidence_review');
  expect(inspectOfficialOutcome(snapshot, [...rows, { ...rows[0], close: 20000 }], now).reason).toBe('conflicting_outcome_prices');
});
test.each([{ currency: 'USD' }, { is_adjusted: true }, { source_hash: '' }, { close: 0 }])('rejects invalid basis/provenance %j', override => {
  const { snapshot, rows } = fixture(); Object.assign(rows[0], override);
  expect(inspectOfficialOutcome(snapshot, rows, now).reason).toBe('invalid_outcome_price_basis_or_provenance');
});
test.each(['2026-10-26T07:00:00Z', '2030-01-01T00:00:00Z', null])('rejects unavailable evidence timestamp %s', fetched_at => {
  const { snapshot, rows } = fixture(); rows[0].fetched_at = fetched_at;
  expect(inspectOfficialOutcome(snapshot, rows, now).reason).toBe('outcome_evidence_not_available_after_close');
});
test('rejects tampering, legacy version and malformed frozen calendar', () => {
  const { snapshot } = fixture(); snapshot.payload.as_of = '2026-10-22';
  expect(inspectOfficialOutcome(snapshot).status).toBe('excluded');
  snapshot.payload_sha256 = artifactHash(snapshot.payload); snapshot.schema_version = 'forecast_live_shadow_payload_v2';
  expect(inspectOfficialOutcome(snapshot).status).toBe('excluded');
  const second = fixture().snapshot; second.payload.calendar_policy.holidays = ['invalid']; second.payload_sha256 = artifactHash(second.payload);
  expect(inspectOfficialOutcome(second).reason).toBe('invalid_frozen_calendar');
});
test('empty ledger is explicit and performs no price query', async () => {
  const models = { sequelize: { transaction: (_options, fn) => fn({}), query: jest.fn() }, ForecastSnapshot: { findAll: jest.fn(async () => []) } };
  expect(await readOfficialOutcomeReadiness(models)).toMatchObject({ status: 'no_shadow_snapshots', inspected: 0, scoring_permitted: false });
  expect(models.sequelize.query).not.toHaveBeenCalled();
  expect(models.ForecastSnapshot.findAll.mock.calls[0][0].where).toEqual({ schema_version: 'official_vn30_shadow_v1', synthetic: false, research_only: true });
});
