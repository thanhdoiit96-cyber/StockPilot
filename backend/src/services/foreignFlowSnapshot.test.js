'use strict';
const { buildForeignFlowSnapshot } = require('./foreignFlowSnapshot');
const universe = [{ id: '1', code: 'FPT', name: 'FPT', industry: 'Công nghệ' }, { id: '2', code: 'HPG', name: 'HPG', industry: 'Thép' }];
const row = { stock_id: '1', stock: universe[0], provider_symbol: 'FPT', buy_volume: '100', sell_volume: '40', buy_value: '1000', sell_value: '600', provider: 'vnstock', source: 'vci', license: 'pending', fetched_at: '2026-10-13T10:00:00Z' };

test('empty store is unavailable and never fabricates zero totals', () => {
  expect(buildForeignFlowSnapshot({ universe })).toMatchObject({ status: 'unavailable', totals: null, coverage: { observed: 0, universe_size: 2, ratio: 0 } });
});
test('partial universe reports real coverage and symbol/sector signed net values', () => {
  const result = buildForeignFlowSnapshot({ rows: [row], universe, sessionDate: '2026-10-13' });
  expect(result).toMatchObject({ status: 'partial', reason: 'foreign_flow_coverage_below_threshold', coverage: { observed: 1, universe_size: 2, ratio: 0.5 }, policy: { scored: false } });
  expect(result.symbols[0]).toMatchObject({ symbol: 'FPT', sector: 'technology', net_volume: 60, net_value: 400 });
  expect(result.sectors[0]).toMatchObject({ sector: 'technology', totals: { net_value: 400 } });
});
test('symbol scope can be available when its one requested observation exists', () => {
  expect(buildForeignFlowSnapshot({ rows: [row], universe, sessionDate: '2026-10-13', symbol: 'FPT' })).toMatchObject({ status: 'available', coverage: { ratio: 1 } });
});
