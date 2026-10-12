const { artifactHash } = require('./forecastArtifact');
const { validateSnapshot, snapshotGenerationKey, verifySnapshot, validateOutcome, createForecastSnapshot, recordForecastOutcome, writeForecastCursor, readForecastCursor, listForecastSnapshots, buildStoredForecastHistory, buildForecastCohortSummary } = require('./forecastSnapshotStore');
const ID1 = '11111111-1111-4111-8111-111111111111', ID2 = '22222222-2222-4222-8222-222222222222';
const input = () => ({ synthetic: true, research_only: true, live: false, market_accuracy_verified: false, provider: 'fixture', model_version: 'softmax-v1', horizon_sessions: 5,
  as_of: '2025-03-18', target_session: '2025-03-23', split_hash: 'a'.repeat(64), training_hash: 'b'.repeat(64),
  probabilities: [{ class: 'advancing', value: .6 }, { class: 'balanced', value: .3 }, { class: 'declining', value: .1 }] });
const inputV2 = () => ({ ...input(), baseline_snapshot: { version: 'forecast_frequency_baseline_v1', fit_cutoff: '2025-03-17T23:00:00+07:00',
  frequency_probabilities: [{ class: 'advancing', value: .4 }, { class: 'balanced', value: .4 }, { class: 'declining', value: .2 }],
  persistence_version: 'forecast_persistence_baseline_v1', persistence_probabilities: [{ class: 'advancing', value: .8 }, { class: 'balanced', value: .1 }, { class: 'declining', value: .1 }] } });
const stored = (overrides = {}) => { const payload = validateSnapshot(input()); return { id: ID1, generation_key: snapshotGenerationKey(payload), schema_version: payload.version, provider: payload.provider,
  model_version: payload.model_version, horizon_sessions: 5, as_of: payload.as_of, target_session: payload.target_session, synthetic: true, research_only: true,
  payload, payload_sha256: artifactHash(payload), expires_at: new Date('2027-01-01T00:00:00Z'), created_at: new Date('2026-10-12T00:00:00Z'), ...overrides }; };

test('normalizes a synthetic snapshot and hashes its immutable identity', () => {
  const payload = validateSnapshot(input());
  expect(payload.probabilities.map(item => item.class)).toEqual(['declining', 'balanced', 'advancing']);
  expect(snapshotGenerationKey(payload)).toMatch(/^[a-f0-9]{64}$/);
  expect(verifySnapshot(stored())).toBe(true);
  expect(verifySnapshot(stored({ payload: { changed: true } }))).toBe(false);
  expect(() => validateSnapshot({ ...input(), live: true })).toThrow('synthetic');
  expect(() => validateSnapshot({ ...input(), as_of: '2025-02-31' })).toThrow('identity');
});
test('seals contemporaneous baselines in v2 without rewriting a legacy identity', async () => {
  const payload = validateSnapshot(inputV2());
  expect(payload).toMatchObject({ version: 'forecast_snapshot_payload_v2', baseline_snapshot: { version: 'forecast_frequency_baseline_v1', persistence_version: 'forecast_persistence_baseline_v1' } });
  const legacy = stored();
  const result = await createForecastSnapshot({ ForecastSnapshot: { findOne: async () => legacy }, sequelize: { transaction: jest.fn() } }, inputV2());
  expect(result).toMatchObject({ status: 'snapshot_legacy_exists', snapshot: { id: ID1 } });
  expect(validateSnapshot({ ...inputV2(), baseline_snapshot: { ...inputV2().baseline_snapshot, fit_cutoff: '2025-03-18T18:00:00+07:00' } }).version).toBe('forecast_snapshot_payload_v2');
  expect(() => validateSnapshot({ ...inputV2(), baseline_snapshot: { ...inputV2().baseline_snapshot, fit_cutoff: '2025-03-19T00:00:00+07:00' } })).toThrow('baseline');
});
test('creates once and returns an identical existing snapshot without mutation', async () => {
  let saved;
  const dependencies = { ForecastSnapshot: { findOne: async () => null, create: async values => (saved = { id: ID1, ...values }) }, sequelize: { transaction: fn => fn({ id: 'tx' }) } };
  expect((await createForecastSnapshot(dependencies, input(), { now: new Date('2026-10-12T00:00:00Z'), retentionDays: 180 })).status).toBe('created');
  expect(saved.expires_at.toISOString()).toBe('2027-04-10T00:00:00.000Z');
  dependencies.ForecastSnapshot.findOne = async () => saved;
  dependencies.ForecastSnapshot.create = async () => { throw new Error('must not create'); };
  expect((await createForecastSnapshot(dependencies, input())).status).toBe('snapshot_exists');
  expect(() => createForecastSnapshot(dependencies, input(), { retentionDays: 2 })).rejects.toThrow('retention');
});
test('records only one integrity-bound outcome and rejects conflicting evidence', async () => {
  const snapshot = stored(); let existing = null;
  const dependencies = { ForecastSnapshot: { findByPk: async () => snapshot }, ForecastOutcomeEvent: {
    findOne: async () => existing, create: async values => (existing = { id: ID2, ...values }) }, sequelize: { transaction: fn => fn({ id: 'tx' }) } };
  const outcome = { actual_class: 'balanced', target_session: '2025-03-23', outcome_available_at: '2025-03-23T19:00:00+07:00' };
  const result = await recordForecastOutcome(dependencies, ID1, outcome);
  expect(result.status).toBe('measured');
  expect(result.outcome.payload).toMatchObject({ snapshot_sha256: snapshot.payload_sha256, actual_class: 'balanced' });
  expect((await recordForecastOutcome(dependencies, ID1, outcome)).status).toBe('outcome_exists');
  await expect(recordForecastOutcome(dependencies, ID1, { ...outcome, actual_class: 'advancing' })).rejects.toThrow('different evidence');
  existing = null;
  await expect(recordForecastOutcome(dependencies, ID1, { ...outcome, outcome_available_at: '2025-03-23T10:00:00+07:00' })).rejects.toThrow('Invalid forecast outcome');
});
test('uses bounded opaque cursor pagination and derives pending/measured lifecycle', async () => {
  const rows = [stored({ id: ID2, as_of: '2025-03-19', outcome: { id: 'event' } }), stored(), stored({ id: '33333333-3333-4333-8333-333333333333', as_of: '2025-03-17' })];
  const page = await listForecastSnapshots({ ForecastSnapshot: { findAll: async options => { expect(options.limit).toBe(3); return rows; } }, ForecastOutcomeEvent: {} }, { horizon: 5, limit: 2, now: new Date('2026-10-12T00:00:00Z') });
  expect(page.items.map(item => item.lifecycle_status)).toEqual(['measured', 'pending']);
  expect(page.has_more).toBe(true);
  expect(readForecastCursor(page.next_cursor)).toEqual({ as_of: '2025-03-18', id: ID1 });
  expect(readForecastCursor(writeForecastCursor(rows[0]))).toEqual({ as_of: '2025-03-19', id: ID2 });
  expect(() => readForecastCursor('invalid')).toThrow('cursor');
});
test('builds page scores from integrity-verified outcome events and fails closed on tampering', () => {
  const snapshot = stored(), outcomePayload = validateOutcome(snapshot, { actual_class: 'balanced', target_session: '2025-03-23', outcome_available_at: '2025-03-23T19:00:00+07:00' });
  const outcome = { payload: outcomePayload, payload_sha256: artifactHash(outcomePayload) };
  const history = buildStoredForecastHistory({ items: [{ ...snapshot, outcome, integrity_valid: true }, { ...stored({ id: ID2, as_of: '2025-03-17' }), integrity_valid: true }], has_more: true, next_cursor: 'next' }, 5);
  expect(history).toMatchObject({ status: 'research_history', source: 'snapshot_store', summary: { predictions: 2, measured: 1, pending: 1 }, pagination: { has_more: true, next_cursor: 'next' } });
  expect(history.summary.brier_multiclass_sum).toBe(outcomePayload.brier_multiclass_sum);
  expect(history.summary.baseline_comparison).toMatchObject({ status: 'unavailable' });
  expect(() => buildStoredForecastHistory({ items: [{ ...snapshot, outcome: { ...outcome, payload: { tampered: true } }, integrity_valid: true }] }, 5)).toThrow('outcome integrity');
});
test('computes sealed baseline comparison only when every measured snapshot is v2', () => {
  const payload = validateSnapshot(inputV2());
  const snapshot = { ...stored(), schema_version: payload.version, payload, payload_sha256: artifactHash(payload) };
  const outcomePayload = validateOutcome(snapshot, { actual_class: 'balanced', target_session: '2025-03-23', outcome_available_at: '2025-03-23T19:00:00+07:00' });
  const outcome = { payload: outcomePayload, payload_sha256: artifactHash(outcomePayload) };
  const history = buildStoredForecastHistory({ items: [{ ...snapshot, outcome, integrity_valid: true }], has_more: false }, 5);
  expect(history.summary.baseline_comparison).toMatchObject({ status: 'available', frequency: { samples: 1 }, persistence: { samples: 1 } });
  expect(history.summary.baseline_comparison.frequency.brier_delta).toBeCloseTo(outcomePayload.brier_multiclass_sum - .56, 12);
});
test('cohort summary separates v1/v2 coverage and gates baseline comparison independently from pages', () => {
  const v1 = stored();
  const payload = validateSnapshot(inputV2());
  const v2 = { ...stored({ id: ID2, as_of: '2025-03-17' }), schema_version: payload.version, payload, payload_sha256: artifactHash(payload) };
  for (const row of [v1, v2]) {
    const outcomePayload = validateOutcome(row, { actual_class: 'balanced', target_session: '2025-03-23', outcome_available_at: '2025-03-23T19:00:00+07:00' });
    row.outcome = { payload: outcomePayload, payload_sha256: artifactHash(outcomePayload) };
  }
  const summary = buildForecastCohortSummary([{ ...v1, integrity_valid: true }, { ...v2, integrity_valid: true }], { minimumSamples: 2 });
  expect(summary).toMatchObject({ total_rows: 2, cohorts: [{ predictions: 2, measured: 2, coverage: { v1: { predictions: 1, measured: 1 }, v2: { predictions: 1, measured: 1 }, baseline_eligible_measured: 1 }, baseline_comparison: { status: 'insufficient_samples', samples: 1 } }] });
  expect(summary.monthly_cohorts).toHaveLength(1);
  expect(buildForecastCohortSummary([{ ...v2, integrity_valid: true }, { ...v2, id: '33333333-3333-4333-8333-333333333333', integrity_valid: true }], { minimumSamples: 2 }).cohorts[0].baseline_comparison.status).toBe('available');
});
