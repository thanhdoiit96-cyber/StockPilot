'use strict';
const { buildOfficialIndexReadiness } = require('./officialIndexUniverse');

const symbols = Array.from({ length: 30 }, (_, index) => `S${String(index).padStart(2, '0')}`);
const snapshot = {
  index_code: 'VN30', status: 'sealed', effective_from: '2026-10-01', member_count: 30,
  membership_sha256: 'a'.repeat(64), source_identifier: 'hose-index-factsheet', source_url: 'https://example.test/vn30',
  constituents: symbols.map(symbol => ({ symbol }))
};

test('fails closed without a source-backed sealed membership snapshot', () => {
  expect(buildOfficialIndexReadiness()).toMatchObject({ status: 'unavailable', reason: 'membership_snapshot_unavailable', constituents: [] });
});

test('only becomes ready for shadow after 95 percent member EOD coverage', () => {
  const prices = symbols.slice(0, 29).map(symbol => ({ symbol, observed_at: '2026-10-21', close: 10 }));
  expect(buildOfficialIndexReadiness({ snapshot, prices })).toMatchObject({
    status: 'ready_for_shadow', scope: 'official_membership', research_only: true,
    coverage: { observed: 29, universe: 30, minimum: .95 }
  });
});
