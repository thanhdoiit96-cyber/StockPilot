const { validateExternalFactor } = require('./externalFactorContract');
test('requires provenance and supported external factor type', () => {
  expect(validateExternalFactor({ type: 'news', title: 'Update', source: 'fixture', published_at: '2026-09-19T00:00:00Z', fetched_at: '2026-09-19T01:00:00Z', status: 'verified' })).toEqual([]);
  expect(validateExternalFactor({ type: 'social', title: 'Untrusted' })).toContain('type must be news, macro or corporate_event');
});
