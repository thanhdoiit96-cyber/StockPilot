const { normalizeExternalFactor, createFixtureExternalFactorAdapter } = require('./externalFactorAdapter');

test('normalizes external factor provenance and status', async () => {
  const adapter = createFixtureExternalFactorAdapter([{ type: 'news', symbol: 'FPT', title: 'Quarterly update', source: 'fixture', published_at: '2026-09-19T00:00:00Z', status: 'verified', impact: 'neutral' }]);
  const rows = await adapter.fetch();
  expect(adapter.license).toBe('internal_research_only');
  expect(rows[0]).toMatchObject({ type: 'news', symbol: 'FPT', source: 'fixture', status: 'verified' });
  expect(rows[0].fetched_at).toBeTruthy();
});
