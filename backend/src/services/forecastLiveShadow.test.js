const { validateLiveShadowInput, createLiveShadowSnapshot } = require('./forecastLiveShadow');
const { snapshotGenerationKey } = require('./forecastSnapshotStore');
const currentData = { status: 'current_data_ready', provider: 'vnstock', synthetic: false, live: true, rows: [{ instrument: { symbol: 'FPT' }, observed_at: '2026-10-12T00:00:00Z', quote: { close: '100' }, source: { provider: 'vnstock', dataset: 'daily' }, fetched_at: '2026-10-13T00:00:00Z' }] };
const preview = { status: 'live_preview', provider: 'vnstock', synthetic: false, research_only: false, live: true, market_accuracy_verified: false, horizon_sessions: 5,
  as_of: '2026-10-12T00:00:00Z', fetched_at: '2026-10-13T00:00:00Z', probabilities: [{ class: 'advancing', value: .4 }, { class: 'balanced', value: .35 }, { class: 'declining', value: .25 }] };
test('seals current-data probabilities and provenance without pretending target outcome exists', () => {
  expect(validateLiveShadowInput({ preview, currentData })).toMatchObject({ version: 'forecast_live_shadow_payload_v1', shadow: true, as_of: '2026-10-12', target_session: null,
    provenance: { observations: 1, symbols: ['FPT'], license_status: 'pending_validation' }, outcome_policy: { status: 'pending' } });
});

test('freezes participating symbols and separates contract generation identities', () => {
  const scope = { contract_version: 'vn_observation_dates_v3', as_of_date: '2026-10-12', used_symbols: ['FPT'], missing_symbols: ['HPG'] };
  const data = { ...currentData, rows: [...currentData.rows, { ...currentData.rows[0], instrument: { symbol: 'HPG' } }] };
  const legacy = validateLiveShadowInput({ preview, currentData: data });
  const payload = validateLiveShadowInput({ preview: { ...preview, current_data: { input_scope: scope } }, currentData: data });
  expect(payload.provenance.symbols).toEqual(['FPT']);
  expect(payload.provenance.input_scope).toEqual(scope);
  expect(snapshotGenerationKey(payload)).not.toBe(snapshotGenerationKey(legacy));
  scope.used_symbols.push('HPG');
  expect(payload.provenance.input_scope.used_symbols).toEqual(['FPT']);
});
test('creates a live shadow once and requires explicit development opt-in', async () => {
  let saved;
  const models = { ForecastSnapshot: { findOne: async () => null, create: async values => (saved = { id: '11111111-1111-4111-8111-111111111111', ...values }) }, sequelize: { transaction: fn => fn({}) } };
  const result = await createLiveShadowSnapshot({ models, preview, currentData, env: { NODE_ENV: 'development', FORECAST_LIVE_PREVIEW: 'true' }, now: new Date('2026-10-13T00:00:00Z') });
  expect(result.status).toBe('created'); expect(saved.synthetic).toBe(false); expect(saved.research_only).toBe(false);
  await expect(createLiveShadowSnapshot({ models, preview, currentData, env: { NODE_ENV: 'production', FORECAST_LIVE_PREVIEW: 'true' } })).rejects.toThrow('development-only');
});
test('keeps the first immutable issuance when the same session is fetched again', async () => {
  let stored;
  const models = { ForecastSnapshot: { findOne: async () => stored, create: async values => (stored = { id: '11111111-1111-4111-8111-111111111111', ...values }) }, sequelize: { transaction: fn => fn({}) } };
  const first = await createLiveShadowSnapshot({ models, preview, currentData, env: { NODE_ENV: 'development', FORECAST_LIVE_PREVIEW: 'true' }, now: new Date('2026-10-13T00:00:00Z') });
  const refetched = { ...preview, fetched_at: '2026-10-13T01:00:00Z' };
  const second = await createLiveShadowSnapshot({ models, preview: refetched, currentData, env: { NODE_ENV: 'development', FORECAST_LIVE_PREVIEW: 'true' }, now: new Date('2026-10-13T01:00:00Z') });
  expect(first.status).toBe('created');
  expect(second.status).toBe('snapshot_exists');
  expect(second.snapshot.payload_sha256).toBe(first.snapshot.payload_sha256);
});
