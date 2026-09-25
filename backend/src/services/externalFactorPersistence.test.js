const { persistExternalFactors } = require('./externalFactorPersistence');

test('persists valid factors and skips duplicate hashes', async () => {
  const seen = new Set();
  const db = { ExternalFactor: { findOrCreate: async ({ where }) => { const created = !seen.has(where.source_hash); seen.add(where.source_hash); return [{}, created]; } } };
  const base = { type: 'macro', title: 'CPI', source: 'World Bank', published_at: '2024-12-31T00:00:00Z', fetched_at: '2025-01-01T00:00:00Z', status: 'verified', source_hash: 'a'.repeat(64) };
  expect(await persistExternalFactors(db, [base, base])).toMatchObject({ inserted: 1, skipped: 1, rejected: 0 });
  expect((await persistExternalFactors(db, [{ ...base, source_hash: null }])).rejected).toBe(1);
});
