'use strict';

const { conciseReport } = require('./check-sector-readiness.cjs');

describe('sector readiness CLI summary', () => {
  const report = {
    generated_at: '2026-10-21T00:00:00.000Z',
    minimum_observations: 50,
    universe_size: 3,
    eligible_symbols: 1,
    incomplete_symbols: 2,
    sectors: {
      technology: { universe: 2, eligible: 1, incomplete: 1, symbols: ['FPT'], incomplete_symbols: [{ code: 'ELC', observations: 27 }] },
      other: { universe: 1, eligible: 0, incomplete: 1, symbols: [], incomplete_symbols: [{ code: 'ABC', observations: 0 }] }
    },
    incomplete: [{ code: 'ELC', observations: 27 }, { code: 'ABC', observations: 0 }]
  };

  test('prints only actionable sector counts by default', () => {
    const result = conciseReport(report, '/tmp/sector-readiness.json');
    expect(result).toEqual(expect.objectContaining({ universe_size: 3, eligible_symbols: 1, incomplete_symbols: 2, detail_output: '/tmp/sector-readiness.json' }));
    expect(result.sectors.technology).toEqual({ universe: 2, eligible: 1, incomplete: 1 });
    expect(result.sectors.technology.symbols).toBeUndefined();
    expect(result.incomplete).toBeUndefined();
  });
});
