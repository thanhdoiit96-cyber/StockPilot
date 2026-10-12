const { buildForecastSample } = require('./forecastDataset');
function fixture() {
  const sessions = Array.from({ length: 65 }, (_, i) => new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10));
  return { provider: 'fixture', synthetic: true, calendar: { verified: true, source: 'synthetic-test-calendar', version: 'test-v1', sessions },
    asOf: sessions[59], cutoff: sessions[59] + 'T23:00:00Z', evaluatedAt: sessions[64] + 'T23:00:00Z',
    rows: Array.from({ length: 50 }, (_, s) => sessions.map((session, i) => ({ stock_id: String(s), session, available_at: session + 'T16:00:00Z', provider: 'fixture', interval: '1d', close: 100 + i, price_basis: 'test', basis_verified: true, events_verified: true }))).flat() };
}
test('creates fixed membership and exact 1/5-session labels', () => {
  const input = fixture(), result = buildForecastSample(input);
  expect(result.members).toHaveLength(50);
  expect(result.labels[0].label_available_at).toBe(new Date(input.evaluatedAt).toISOString());
  expect(result.labels.map(l => [l.target_session, l.label])).toEqual([[input.calendar.sessions[60], 'advancing'], [input.calendar.sessions[64], 'advancing']]);
});
test('future prices cannot change features or membership', () => {
  const input = fixture(), before = buildForecastSample(input);
  input.rows.filter(r => r.session > input.asOf).forEach(r => { r.close = 1; });
  const after = buildForecastSample(input);
  expect(after.features).toEqual(before.features);
  expect(after.input_hash).toBe(before.input_hash);
  expect(after.membership_hash).toBe(before.membership_hash);
  expect(after.labels[1].label).toBe('declining');
});
test('late historical rows and duplicates are excluded', () => {
  const input = fixture(); input.rows[0].available_at = input.evaluatedAt;
  input.rows.push({ ...input.rows[65] });
  const result = buildForecastSample(input);
  expect(result.members).toHaveLength(48);
  expect(result.excluded.map(e => e.reason)).toEqual(expect.arrayContaining(['observation_missing_or_late', 'duplicate_observation']));
});
test('missing target prices do not shift forward or remove frozen members', () => {
  const input = fixture(); input.rows = input.rows.filter(r => !(Number(r.stock_id) < 3 && r.session === input.calendar.sessions[60]));
  const result = buildForecastSample(input);
  expect(result.members).toHaveLength(50);
  expect(result.labels[0]).toMatchObject({ coverage: 0.94, status: 'unavailable' });
});
test('unverified event windows block outcomes', () => {
  const input = fixture(); input.rows.filter(r => r.session > input.asOf).forEach(r => { r.events_verified = false; });
  expect(buildForecastSample(input).labels[1]).toMatchObject({ status: 'unavailable', coverage: 0 });
});
test('unverified calendar fails closed', () => {
  const input = fixture(); input.calendar.verified = false;
  expect(buildForecastSample(input).reasons).toEqual(['calendar_unverified']);
});
