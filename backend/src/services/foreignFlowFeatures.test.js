'use strict';
const { buildForeignFlowFeatures, buildForeignFlowBreadth } = require('./foreignFlowFeatures');
const row = (day, netValue, netVolume = netValue) => ({ session_date: `2026-09-${String(day).padStart(2, '0')}`, buy_value: String(1000 + netValue), sell_value: '1000', buy_volume: String(100 + netVolume), sell_volume: '100', traded_value: '10000', total_volume: '1000' });

test('builds bounded ratios, z-score and persistence without rows after cutoff', () => {
  const rows = Array.from({ length: 21 }, (_, index) => row(index + 1, index * 10));
  const result = buildForeignFlowFeatures(rows, { cutoff: '2026-09-20T23:59:59.999Z' });
  expect(result).toMatchObject({ status: 'available', as_of: '2026-09-20', observations: 20, policy: { scored: false }, features: { net_value: 190, net_value_to_traded_value: 0.019, net_volume_to_total_volume: 0.19, positive_persistence_5: 1 } });
  expect(result.features.net_value_zscore_20).not.toBeNull();
});
test('missing denominators fail closed and short history stays partial', () => {
  expect(buildForeignFlowFeatures([{ ...row(1, 10), traded_value: null }])).toMatchObject({ status: 'unavailable', reason: 'foreign_flow_denominator_unavailable', features: null });
  expect(buildForeignFlowFeatures([row(1, 10)])).toMatchObject({ status: 'partial', reason: 'insufficient_zscore_history', features: { net_value_zscore_20: null, positive_persistence_5: null } });
});
test('breadth reports coverage and does not count missing rows as neutral', () => {
  expect(buildForeignFlowBreadth([{ buy_value: 12, sell_value: 10 }, { buy_value: 7, sell_value: 10 }, {}], { universeSize: 4 })).toMatchObject({ status: 'partial', coverage: 0.5, positive_share: 0.5, net_buying: 1, net_selling: 1, policy: { missing_is_neutral: false, scored: false } });
  expect(buildForeignFlowBreadth([{}], { universeSize: 1 })).toMatchObject({ status: 'unavailable', positive_share: null });
});
