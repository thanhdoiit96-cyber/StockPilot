'use strict';
const { evaluatePositionExitGuidance } = require('./positionExitShadowEvaluation');

const guidance = { as_of: '2026-01-01', reference: { close: 100 }, levels: { active_stop: 95, take_profit_review: 106 } };
const rows = count => Array.from({ length: count }, (_, index) => ({ observed_at: new Date(Date.UTC(2026, 0, index + 2)).toISOString(), close: index === 2 ? 94 : 101 + index }));

test('keeps a short post-snapshot cohort pending while exposing only observed horizons', () => {
  expect(evaluatePositionExitGuidance({ guidance, priceRows: rows(5) })).toMatchObject({
    as_of: '2026-01-01',
    status: 'pending', coverage: { observed_subsequent_sessions: 5, required_sessions: 20 },
    observations: { '1': { return_pct: 1 }, '5': { return_pct: 5 }, '20': null },
    excursion: { mae_pct: -6, mfe_pct: 5 }, boundaries: { active_stop_crossed: true, take_profit_review_crossed: false }
  });
});

test('evaluates only after twenty distinct subsequent EOD sessions without claiming correctness', () => {
  const result = evaluatePositionExitGuidance({ guidance, priceRows: rows(20) });
  expect(result).toMatchObject({ status: 'evaluated', observations: { '20': { return_pct: 20 } } });
  expect(result).not.toHaveProperty('correct');
});

test('excludes malformed frozen guidance', () => {
  expect(evaluatePositionExitGuidance({ guidance: {}, priceRows: rows(20) })).toEqual({ status: 'excluded', reason: 'invalid_frozen_guidance' });
});
