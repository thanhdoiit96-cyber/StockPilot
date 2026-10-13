'use strict';
const VnstockForeignFlowAdapter = require('./adapters/VnstockForeignFlowAdapter');
const { ingestForeignFlow } = require('./foreignFlowIngestion');

test('adapter normalizes complete per-symbol daily foreign flow with provenance', async () => {
  const adapter = new VnstockForeignFlowAdapter({ now: () => new Date('2026-10-13T10:00:00Z'), fetcher: async () => [{ symbol: 'fpt', trading_date: '2026-10-13', fr_buy_volume: 120, fr_sell_volume: 80, fr_buy_value_matched: 12000, fr_sell_value_matched: 7600 }] });
  const [row] = await adapter.fetch({ symbols: ['FPT'] });
  expect(row).toMatchObject({ symbol: 'FPT', session_date: '2026-10-13', buy_volume: '120', sell_volume: '80', buy_value: '12000', sell_value: '7600', provider: 'vnstock', source: 'vci', license: 'sponsor_access_pending_display_rights' });
  expect(row.source_hash).toMatch(/^[a-f0-9]{64}$/);
});

test('adapter rejects net-only or incomplete rows instead of inventing buy/sell sides', async () => {
  const adapter = new VnstockForeignFlowAdapter({ fetcher: async () => [{ symbol: 'FPT', date: '2026-10-13', net_value: 10 }] });
  await expect(adapter.fetch({ symbols: ['FPT'] })).rejects.toThrow('incomplete foreign-flow row');
});

test('ingestion is idempotent and updates provider corrections', async () => {
  const rows = [];
  const ForeignFlowDaily = { findOne: jest.fn(async ({ where }) => rows.find(row => row.stock_id === where.stock_id && row.session_date === where.session_date) || null), create: jest.fn(async value => { rows.push({ ...value }); }) };
  const Stock = { findOne: jest.fn(async () => ({ id: 'stock-1' })) };
  const sequelize = { transaction: jest.fn(async () => ({ commit: jest.fn(), rollback: jest.fn() })) };
  const base = { symbol: 'FPT', provider_symbol: 'FPT', session_date: '2026-10-13', provider: 'vnstock', source: 'vci', buy_volume: '10', sell_volume: '5', buy_value: '100', sell_value: '50', currency: 'VND', license: 'pending', license_url: null, source_hash: 'a'.repeat(64), fetched_at: '2026-10-13T10:00:00Z' };
  expect(await ingestForeignFlow({ records: [base], Stock, ForeignFlowDaily, sequelize })).toMatchObject({ inserted: 1 });
  expect(await ingestForeignFlow({ records: [base], Stock, ForeignFlowDaily, sequelize })).toMatchObject({ skipped: 1 });
  rows[0].update = jest.fn(async value => Object.assign(rows[0], value));
  expect(await ingestForeignFlow({ records: [{ ...base, buy_value: '110', source_hash: 'b'.repeat(64) }], Stock, ForeignFlowDaily, sequelize })).toMatchObject({ updated: 1 });
});
