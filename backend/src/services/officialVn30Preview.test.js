'use strict';
const { buildOfficialVn30Preview } = require('./officialVn30Preview');
const { buildOfficialVn30MembershipManifest } = require('./officialIndexMembershipIngest');
const symbols = Array.from({ length: 30 }, (_, i) => `S${i}`);
function fixture(count = 30) {
  const manifest = buildOfficialVn30MembershipManifest({ symbols, source_identifier: 'test-only', source_url: 'https://hsx.vn/test.pdf', source_published_at: '2026-01-01', effective_from: '2026-01-02' });
  const dates = [];
  for (let d = new Date('2026-10-26T00:00:00Z'); dates.length < 60; d.setUTCDate(d.getUTCDate() - 1)) if (![0, 6].includes(d.getUTCDay())) dates.unshift(d.toISOString().slice(0, 10));
  return { snapshot: { ...manifest, constituents: symbols.map(symbol => ({ symbol })) }, asOf: '2026-10-26', horizon: 5, now: new Date('2026-10-27'), prices: symbols.slice(0, count).flatMap(symbol => dates.map((session_date, i) => ({ symbol, session_date, close: 10000 + i, currency: 'VND', price_unit: 'VND_PER_SHARE', is_adjusted: false, source_hash: 'a'.repeat(64) }))) };
}
test('missing membership does not synthesize inputs', () => expect(buildOfficialVn30Preview({ asOf: '2026-10-26' }).reason).toBe('membership_snapshot_unavailable'));
test.each([28, 29, 30])('requires 29 complete histories: %s', count => {
  const result = buildOfficialVn30Preview(fixture(count));
  expect(result.coverage.observed).toBe(count);
  expect(result.status).toBe(count < 29 ? 'unavailable' : 'official_vn30_preview');
  expect(result).toMatchObject({ live: false, synthetic: false, research_only: true, publication_permitted: false });
  expect(result.current_data).toBeUndefined();
  if (count < 29) expect(result.probabilities).toBeUndefined();
  else expect(result.probabilities.reduce((sum, p) => sum + p.value, 0)).toBeCloseTo(1, 6);
});
test.each(['membership_sha256', 'source_sha256'])('rejects corrupt %s', field => {
  const input = fixture(); input.snapshot[field] = '0'.repeat(64);
  expect(buildOfficialVn30Preview(input).reason).toBe('membership_snapshot_invalid');
});
test('checks rights and effective dates', () => {
  const input = fixture(); input.snapshot.rights_evidence_ref = '';
  expect(buildOfficialVn30Preview(input).reason).toBe('membership_rights_unverified');
  input.snapshot.rights_evidence_ref = 'owner-attested-internal-research-pending'; input.asOf = '2025-12-01';
  expect(buildOfficialVn30Preview(input).reason).toBe('membership_not_effective_for_session');
});
test.each(['close', 'currency', 'price_unit', 'is_adjusted', 'source_hash', 'stale', 'short'])('excludes invalid member history: %s', field => {
  const input = fixture(29), row = input.prices[0];
  if (field === 'stale') input.prices = input.prices.filter(p => p.symbol !== row.symbol || p.session_date !== input.asOf);
  else if (field === 'short') input.prices.shift();
  else row[field] = { close: 0, currency: 'USD', price_unit: 'THOUSAND_VND', is_adjusted: true, source_hash: null }[field];
  expect(buildOfficialVn30Preview(input).coverage.observed).toBe(28);
});
test('identical duplicates allowed, conflicting duplicates exclude member', () => {
  const input = fixture(29); input.prices.push({ ...input.prices[0] });
  expect(buildOfficialVn30Preview(input).status).toBe('official_vn30_preview');
  input.prices.at(-1).close++;
  expect(buildOfficialVn30Preview(input).coverage.observed).toBe(28);
});
test('requires aligned calendars', () => {
  const input = fixture(29); input.prices[0].session_date = '2026-01-05';
  expect(buildOfficialVn30Preview(input).coverage.observed).toBe(28);
});
test('date values round trip without changing hashes', () => {
  const input = fixture();
  const manifest = buildOfficialVn30MembershipManifest({ ...input.snapshot, effective_from: new Date(input.snapshot.effective_from), source_published_at: new Date(input.snapshot.source_published_at), symbols });
  expect(manifest.membership_sha256).toBe(input.snapshot.membership_sha256);
  expect(manifest.source_sha256).toBe(input.snapshot.source_sha256);
});
