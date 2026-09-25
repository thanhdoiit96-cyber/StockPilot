const { createWorldBankMacroAdapter, createGdeltNewsAdapter } = require('./externalFactorProviders');

test('World Bank adapter maps macro observations with license and provenance', async () => {
  const adapter = createWorldBankMacroAdapter({ http: { get: async () => ({ data: [{}, [{ date: '2024', value: 3.2 }]] }) } });
  const rows = await adapter.fetch({ country: 'VNM', indicator: 'FP.CPI.TOTL.ZG' });
  expect(rows[0]).toMatchObject({ type: 'macro', source: 'World Bank Open Data', provider_license: 'CC BY-4.0', status: 'verified' });
  expect(rows[0].source_hash).toHaveLength(64);
});

test('GDELT adapter keeps news unverified until display rights are confirmed', async () => {
  const adapter = createGdeltNewsAdapter({ http: { get: async () => ({ data: { articles: [{ title: 'Market update', domain: 'example.org', url: 'https://example.org/a', seendate: '20260919090000' }] } }) } });
  const rows = await adapter.fetch({ query: 'FPT' });
  expect(rows[0]).toMatchObject({ type: 'news', status: 'unverified', source: 'example.org' });
  expect(rows[0].provider_license).toMatch(/verify display rights/);
});
