'use strict';
const { summarizeForeignFlow, summarizeForeignFlowBySector } = require('./foreignFlow');

test('foreign flow derives signed net volume and value without storing ambiguous net fields', () => {
  expect(summarizeForeignFlow([
    { foreign_buy_volume: '100', foreign_sell_volume: '40', foreign_buy_value: '1000', foreign_sell_value: '600' },
    { foreign_buy_volume: '20', foreign_sell_volume: '50', foreign_buy_value: '300', foreign_sell_value: '700' }
  ])).toMatchObject({ status: 'available', coverage: 1, totals: { buy_volume: 120, sell_volume: 90, net_volume: 30, buy_value: 1300, sell_value: 1300, net_value: 0 }, policy: { scored: false } });
});

test('missing foreign observations are unavailable or partial, never neutral flow', () => {
  expect(summarizeForeignFlow([{ volume: '1000' }])).toMatchObject({ status: 'unavailable', totals: null });
  expect(summarizeForeignFlow([
    { sector: 'banking', foreign_buy_volume: '10', foreign_sell_volume: '5', foreign_buy_value: '100', foreign_sell_value: '50' },
    { sector: 'banking', foreign_buy_volume: null, foreign_sell_volume: null, foreign_buy_value: null, foreign_sell_value: null }
  ], { minimumCoverage: 0.8 })).toMatchObject({ status: 'partial', coverage: 0.5 });
});

test('sector aggregation preserves each group coverage and signed totals', () => {
  const result = summarizeForeignFlowBySector([
    { sector: 'banking', foreign_buy_volume: 10, foreign_sell_volume: 5, foreign_buy_value: 100, foreign_sell_value: 40 },
    { sector: 'technology', foreign_buy_volume: 2, foreign_sell_volume: 8, foreign_buy_value: 20, foreign_sell_value: 90 }
  ]);
  expect(result).toEqual(expect.arrayContaining([
    expect.objectContaining({ sector: 'banking', totals: expect.objectContaining({ net_value: 60 }) }),
    expect.objectContaining({ sector: 'technology', totals: expect.objectContaining({ net_value: -70 }) })
  ]));
});
