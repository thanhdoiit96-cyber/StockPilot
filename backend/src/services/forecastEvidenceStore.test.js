const { createForecastEvidenceStore } = require('./forecastEvidenceStore');
const { forecastResearchFixture } = require('./forecastResearchFixture');
const { replayForecastDataset } = require('./forecastReplay');
function input() {
  const fixture = forecastResearchFixture();
  const rows = fixture.rows.map((r, i) => ({ ...r, id: String(i), source_hash: 'hash-' + i, observed_at: r.session + 'T00:00:00Z' }));
  const revisions = [{ id: 'calendar-1', key: 'market', kind: 'calendar', revision: 1, recorded_at: '2024-12-01T00:00:00Z', status: 'verified', payload: fixture.calendar },
    ...rows.map(r => ({ id: 'proof-' + r.id, key: r.id, kind: 'price', revision: 1, recorded_at: r.available_at, status: 'verified', payload: { ...r, verified_at: r.available_at, source: 'fixture' } }))];
  return { fixture, rows, bundle: { version: 'forecast_evidence_bundle_v1', synthetic: true, revisions } };
}
test('revocation affects only later cutoffs and never falls back to old evidence', () => {
  const { rows, bundle } = input();
  bundle.revisions.push({ id: 'revoked', key: '0', kind: 'price', revision: 2, recorded_at: '2025-01-03T00:00:00Z', status: 'revoked' });
  const store = createForecastEvidenceStore(bundle);
  expect(store.at('2025-01-02T00:00:00Z', [rows[0]], 'market').rows).toHaveLength(1);
  expect(store.at('2025-01-04T00:00:00Z', [rows[0]], 'market').rows).toHaveLength(0);
  bundle.revisions.length = 0;
  expect(store.at('2025-01-02T00:00:00Z', [rows[0]], 'market').rows).toHaveLength(1);
});
test('rejects revision gaps and binds replay to the bundle context', () => {
  const { bundle } = input(); bundle.revisions[0].revision = 2;
  expect(() => createForecastEvidenceStore(bundle)).toThrow('Nonsequential');
});
test('runs the evidence adapter through replay with frozen origin and provenance', () => {
  const { fixture, rows, bundle } = input();
  const report = replayForecastDataset({ ...fixture, rows, origins: fixture.origins.slice(0, 1), folds: [], evidenceStore: createForecastEvidenceStore(bundle), calendarKey: 'market' });
  expect(report.samples[0].members).toHaveLength(50);
  expect(report.samples[0].labels.every(l => l.status === 'available')).toBe(true);
  expect(report.samples[0].evidence_manifest.revision_ids).toHaveLength(3001);
  expect(report.samples[0].labels[0].evidence_manifest.revision_ids).toHaveLength(51);
  expect(report.samples[0].labels[1].evidence_manifest.revision_ids).toHaveLength(251);
});

test.each(['revoked', 'verified'])('later %s revision preserves original outcomes but excludes their metrics', status => {
  const { fixture, rows, bundle } = input();
  const original = bundle.revisions.find(r => r.kind === 'price');
  bundle.revisions.push({ ...original, id: 'correction', revision: 2, status, recorded_at: '2025-04-01T00:00:00Z' });
  const store = createForecastEvidenceStore(bundle);
  const args = { ...fixture, rows, origins: fixture.origins.slice(0, 1), folds: [], evidenceStore: store, calendarKey: 'market' };
  const before = replayForecastDataset(args);
  const after = replayForecastDataset({ ...args, reviewCutoff: '2025-04-02T00:00:00Z' });
  expect(after.samples).toEqual(before.samples);
  expect(before.outcome_audits.every(a => a.status === 'unchanged')).toBe(true);
  expect(after.outcome_audits.every(a => a.status === 'invalidated')).toBe(true);
  expect(after.baselines[0].excluded[0].reason).toBe('evidence_invalidated');
  expect(after.outcome_audits[0].findings[0].reason).toBe(status === 'revoked' ? 'evidence_revoked' : 'evidence_superseded');
});

test('review cannot predate the replay evaluation window', () => {
  const { fixture, rows, bundle } = input();
  expect(() => replayForecastDataset({ ...fixture, rows, origins: [], reviewCutoff: '2025-01-01T00:00:00Z', evidenceStore: createForecastEvidenceStore(bundle), calendarKey: 'market' })).toThrow('Review cutoff');
});

test('an unrelated symbol revision does not invalidate frozen outcomes', () => {
  const { fixture, rows, bundle } = input();
  const unrelated = { ...rows[0], id: 'outside', stock_id: 'outside', source_hash: 'outside' };
  rows.push(unrelated);
  const proof = { ...bundle.revisions[1], id: 'outside-1', key: 'outside', payload: { ...unrelated, verified_at: unrelated.available_at, source: 'fixture' } };
  bundle.revisions.push(proof, { ...proof, id: 'outside-2', revision: 2, status: 'revoked', recorded_at: '2025-04-01T00:00:00Z' });
  const report = replayForecastDataset({ ...fixture, rows, origins: fixture.origins.slice(0, 1), folds: [], evidenceStore: createForecastEvidenceStore(bundle), calendarKey: 'market', reviewCutoff: '2025-04-02T00:00:00Z' });
  expect(report.samples[0].members).not.toContain('outside');
  expect(report.outcome_audits.every(a => a.status === 'unchanged')).toBe(true);
});

test('forward revision only invalidates the horizon that consumed it', () => {
  const { fixture, rows, bundle } = input();
  const proof = bundle.revisions.find(r => r.kind === 'price' && r.payload.session === fixture.calendar.sessions[64]);
  bundle.revisions.push({ ...proof, id: 'forward-revoked', revision: 2, status: 'revoked', recorded_at: '2025-04-01T00:00:00Z' });
  const report = replayForecastDataset({ ...fixture, rows, origins: fixture.origins.slice(0, 1), folds: [], evidenceStore: createForecastEvidenceStore(bundle), calendarKey: 'market', reviewCutoff: '2025-04-02T00:00:00Z' });
  expect(report.outcome_audits.map(a => a.status)).toEqual(['unchanged', 'invalidated']);
});
