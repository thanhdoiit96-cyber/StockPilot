'use strict';
const { buildOfficialVn30Preview } = require('./officialVn30Preview');
const { buildOfficialVn30MembershipManifest } = require('./officialIndexMembershipIngest');
const { prepareOfficialShadow, issueOfficialVn30Shadow, nextSession } = require('./officialVn30Shadow');
const now = new Date('2026-10-26T09:00:00Z');
function preview() {
  const symbols = Array.from({ length: 30 }, (_, i) => `S${i}`), dates = [];
  for (let day = new Date('2026-10-26T00:00:00Z'); dates.length < 60; day.setUTCDate(day.getUTCDate() - 1)) if (![0, 6].includes(day.getUTCDay())) dates.unshift(day.toISOString().slice(0, 10));
  const manifest = buildOfficialVn30MembershipManifest({ symbols, source_identifier: 'fixture', source_url: 'https://hsx.vn/test.pdf', source_published_at: '2026-01-01', effective_from: '2026-01-02' });
  const snapshot = { ...manifest, id: 'fixture-membership', ingested_at: '2026-01-02T00:00:00Z', constituents: symbols.map(symbol => ({ symbol })) };
  const prices = symbols.flatMap(symbol => dates.map((session_date, index) => ({ symbol, session_date, close: 10000 + index, currency: 'VND', price_unit: 'VND_PER_SHARE', is_adjusted: false, source_hash: 'a'.repeat(64), fetched_at: '2026-10-26T08:30:00Z', created_at: '2026-10-26T08:30:00Z', updated_at: '2026-10-26T08:30:00Z' })));
  return buildOfficialVn30Preview({ snapshot, prices, now, asOf: '2026-10-26', horizon: 5, includeEvidence: true });
}
test('freezes evidence without claiming scores and separates horizons', () => {
  const value = preview(), result = prepareOfficialShadow(value, { now });
  expect(result.payload).toMatchObject({ version: 'official_vn30_shadow_v1', research_only: true, synthetic: false, live: false, scoring_permitted: false, first_target_session: '2026-10-27' });
  expect(result.payload.input_evidence.histories).toHaveLength(30);
  expect(prepareOfficialShadow({ ...value, horizon_sessions: 1 }, { now }).generation_key).not.toBe(result.generation_key);
  expect(prepareOfficialShadow(value, { now: new Date('2026-10-26T10:00:00Z') }).content_sha256).toBe(result.content_sha256);
});
test('cannot issue after next session starts or backdate to earlier as-of', () => {
  const value = preview();
  expect(() => prepareOfficialShadow(value, { now: new Date('2026-10-27T02:00:00Z') })).toThrow('window_closed');
  expect(() => prepareOfficialShadow(value, { now: new Date('2026-10-28T01:00:00Z') })).toThrow('window_closed');
  expect(() => prepareOfficialShadow(value, { now: new Date('2026-10-27T01:59:59Z') })).not.toThrow();
});
test('weekends and configured holidays determine next open', () => expect(nextSession('2026-10-23', new Set(['2026-10-26']))).toBe('2026-10-27'));
test.each(['fetched_at', 'created_at', 'updated_at'])('rejects unavailable evidence: %s', field => {
  const value = preview(); value.private_evidence.availability[0][field] = '2026-10-28T00:00:00Z';
  expect(() => prepareOfficialShadow(value, { now })).toThrow('input_not_available');
});
test('rejects pre-close fetch, late membership, hash corruption and legacy flags', () => {
  const value = preview(); value.private_evidence.availability.at(-1).fetched_at = '2026-10-26T07:00:00Z';
  expect(() => prepareOfficialShadow(value, { now })).toThrow('input_not_available');
  const late = preview(); late.private_evidence.membership_ingested_at = '2026-10-27T00:00:00Z';
  expect(() => prepareOfficialShadow(late, { now })).toThrow('membership_not_available');
  expect(() => prepareOfficialShadow({ ...preview(), input_sha256: '0'.repeat(64) }, { now })).toThrow('hash_mismatch');
  expect(() => prepareOfficialShadow({ ...preview(), live: true }, { now })).toThrow('invalid_official');
});
function store() {
  let row;
  const models = { sequelize: { transaction: fn => fn({}), query: jest.fn(async () => []) }, ForecastSnapshot: { findOne: jest.fn(async () => row), create: jest.fn(async values => (row = { ...values, id: 'created-id' })) } };
  return models;
}
const env = { NODE_ENV: 'development', FORECAST_OFFICIAL_SHADOW: 'true' };
test('write gate and dry run do not mutate ledger', async () => {
  const models = store(), reader = jest.fn(async () => preview());
  await expect(issueOfficialVn30Shadow(models, { env: { NODE_ENV: 'production' }, reader })).rejects.toThrow('development_only');
  await expect(issueOfficialVn30Shadow(models, { env: { NODE_ENV: 'development' }, write: true, reader })).rejects.toThrow('write_disabled');
  expect(reader).not.toHaveBeenCalled();
  expect((await issueOfficialVn30Shadow(models, { env, reader, clock: () => now })).status).toBe('dry_run_ready');
  expect(models.ForecastSnapshot.create).not.toHaveBeenCalled();
});
test('one immutable insert, repeat is idempotent, changed content conflicts', async () => {
  const models = store(), value = preview(), options = { env, write: true, clock: () => now, reader: async () => value };
  expect((await issueOfficialVn30Shadow(models, options)).status).toBe('created');
  expect((await issueOfficialVn30Shadow(models, options)).status).toBe('snapshot_exists');
  expect(models.ForecastSnapshot.create).toHaveBeenCalledTimes(1);
  value.probabilities = [{ class: 'advancing', value: .5 }, { class: 'balanced', value: .3 }, { class: 'declining', value: .2 }];
  await expect(issueOfficialVn30Shadow(models, options)).rejects.toThrow('identity_conflict');
});
test('late dry run is explicitly not issued', async () => {
  const models = store();
  expect((await issueOfficialVn30Shadow(models, { env, reader: async () => preview(), clock: () => new Date('2026-10-27T03:00:00Z') })).reason).toBe('prospective_issuance_window_closed');
  expect(models.ForecastSnapshot.create).not.toHaveBeenCalled();
});
test('lock wait cannot cross issuance deadline', async () => {
  const models = store(); let ticks = 0;
  await expect(issueOfficialVn30Shadow(models, { env, write: true, reader: async () => preview(), clock: () => ticks++ ? new Date('2026-10-27T02:00:00Z') : now })).rejects.toThrow('window_closed');
  expect(models.ForecastSnapshot.create).not.toHaveBeenCalled();
});
