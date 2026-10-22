'use strict';
const { buildOfficialVn30MembershipManifest } = require('./officialIndexMembershipIngest');
const symbols = Array.from({ length: 30 }, (_, index) => `S${String(index).padStart(2, '0')}`);

test('seals a normalized internal-research manifest from an official HOSE source', () => {
  const manifest = buildOfficialVn30MembershipManifest({ source_identifier: 'hose-vn30-2026-10', source_url: 'https://staticfile.hsx.vn/official-vn30.pdf', source_published_at: '2026-10-20T00:00:00.000Z', effective_from: '2026-11-01', symbols: [...symbols].reverse() });
  expect(manifest).toMatchObject({ index_code: 'VN30', status: 'sealed', member_count: 30, usage_scope: 'internal_research_only', rights_evidence_ref: 'owner-attested-internal-research-pending' });
  expect(manifest.symbols).toEqual(symbols);
  expect(manifest.membership_sha256).toMatch(/^[a-f0-9]{64}$/);
});

test('rejects a non-HOSE source and an incomplete membership list', () => {
  expect(() => buildOfficialVn30MembershipManifest({ source_url: 'https://example.test/vn30', symbols })).toThrow('HOSE');
  expect(() => buildOfficialVn30MembershipManifest({ source_url: 'https://hsx.vn/vn30', symbols: symbols.slice(0, 29) })).toThrow('exactly 30');
});
