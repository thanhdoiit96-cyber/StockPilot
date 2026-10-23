const { artifactHash } = require('./forecastArtifact');
const { evaluateLiveShadowEvidence, appendLiveShadowOutcome } = require('./forecastLiveShadowEvaluator');
const snapshot = () => { const payload = { version: 'forecast_live_shadow_payload_v1', provenance: { symbols: ['FPT', 'HPG', 'VHM'] } }; return { id: '11111111-1111-4111-8111-111111111111', provider: 'vnstock', horizon_sessions: 1, as_of: '2026-10-13', synthetic: false, research_only: false, payload, payload_sha256: artifactHash(payload) }; };
const row = (symbol, day, close) => ({ instrument: { symbol }, observed_at: `${day}T00:00:00Z`, quote: { close }, source: { provider: 'vnstock', dataset: 'daily' }, fetched_at: `${day}T16:00:00Z` });

test('v3 uses Vietnam dates, waits for close and rejects conflicting prices', () => {
  const stored = snapshot();
  stored.payload.provenance = { symbols: ['FPT'], input_contract_version: 'vn_observation_dates_v3' };
  stored.payload_sha256 = artifactHash(stored.payload);
  const origin = { ...row('FPT', '2026-10-12', 100), observed_at: '2026-10-12T18:00:00Z' };
  const target = { ...row('FPT', '2026-10-13', 110), observed_at: '2026-10-13T18:00:00Z' };
  expect(evaluateLiveShadowEvidence(stored, [origin, target], new Date('2026-10-14T07:00:00Z')).reason).toBe('target_session_not_closed');
  expect(evaluateLiveShadowEvidence(stored, [origin, target], new Date('2026-10-14T09:00:00Z'))).toMatchObject({ status: 'ready', payload: { version: 'forecast_live_outcome_payload_v2', target_session: '2026-10-14', actual_class: 'advancing' } });
  expect(evaluateLiveShadowEvidence(stored, [origin, target, { ...target, quote: { close: 90 } }]).reason).toBe('conflicting_session_prices');
});
test('keeps a live shadow pending until N complete provider sessions exist', () => {
  const rows = ['FPT','HPG','VHM'].map(symbol => row(symbol, '2026-10-13', 100));
  expect(evaluateLiveShadowEvidence(snapshot(), rows)).toMatchObject({ status: 'pending', reason: 'target_session_not_observed', sessions_observed: 0, sessions_required: 1 });
});
test('uses the nth shared provider session and full sealed basket breadth', async () => {
  const rows = [...['FPT','HPG','VHM'].map(symbol => row(symbol, '2026-10-13', 100)), row('FPT','2026-10-14',110), row('HPG','2026-10-14',101), row('VHM','2026-10-14',90)];
  expect(evaluateLiveShadowEvidence(snapshot(), rows, new Date('2026-10-14T09:00:00Z'))).toMatchObject({ status: 'ready', payload: { target_session: '2026-10-14', actual_class: 'advancing', breadth: 2/3, coverage: 1 } });
  let saved; const models = { ForecastOutcomeEvent: { findOne: async () => null, create: async values => (saved = values) }, sequelize: { transaction: fn => fn({}) } };
  const result = await appendLiveShadowOutcome(models, snapshot(), rows, { now: new Date('2026-10-14T09:00:00Z') });
  expect(result.status).toBe('measured'); expect(saved.schema_version).toBe('forecast_live_outcome_payload_v1');
});
