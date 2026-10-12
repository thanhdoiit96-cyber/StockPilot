const { adaptForecastEvidence } = require('./forecastEvidenceAdapter');
const row = { id: 'row', stock_id: 'stock', provider: 'fixture', source_hash: 'hash', interval: '1d', close: 100, observed_at: '2026-01-09T00:00:00Z' };
const proof = { id: 'proof', row_id: 'row', provider: 'fixture', source_hash: 'hash', source: 'fixture-attestation', available_at: '2026-01-09T17:00:00+07:00', verified_at: '2026-01-10T12:00:00+07:00', price_basis: 'fixture', basis_verified: true, events_verified: true };
test('later verification cannot make rows available at an earlier cutoff', () => {
  const early = adaptForecastEvidence({ rows: [row], evidence: [proof], cutoff: '2026-01-09T23:00:00+07:00' });
  expect(early.reason_counts.evidence_not_available).toBe(1);
  const later = adaptForecastEvidence({ rows: [row], evidence: [proof], cutoff: '2026-01-10T23:00:00+07:00' });
  expect(later.rows[0].available_at).toBe('2026-01-10T05:00:00.000Z');
});
test('rejects mismatched and ambiguous evidence', () => {
  expect(adaptForecastEvidence({ rows: [row], evidence: [{ ...proof, source_hash: 'other' }], cutoff: '2026-01-11T00:00:00Z' }).reason_counts.evidence_binding_invalid).toBe(1);
  expect(adaptForecastEvidence({ rows: [row], evidence: [proof, proof], cutoff: '2026-01-11T00:00:00Z' }).reason_counts.evidence_ambiguous).toBe(1);
});
test('fetched time and adjustment flag cannot substitute for evidence', () => {
  const result = adaptForecastEvidence({ rows: [{ ...row, fetched_at: proof.available_at, is_adjusted: true }], cutoff: '2026-01-11T00:00:00Z' });
  expect(result.accepted_count).toBe(0);
  expect(result.reason_counts).toEqual({ evidence_missing: 1 });
});
