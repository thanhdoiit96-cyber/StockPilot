'use strict';
const { evaluatePositionExitGuidance } = require('./positionExitShadowEvaluation');
const { evaluatePositionExitHorizon } = require('./positionExitShadowEvaluation');

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

test('v2 matures separate horizons, excludes the signal day and freezes each window', () => {
  const input = { ...guidance, version: 'position_exit_rule_v1', research_only: true, status: 'hold', provider: 'vnstock', price_basis: { currency: 'VND', price_unit: 'VND', is_adjusted: false } };
  const prices = rows(25).map(row => ({ ...row, provider: 'vnstock', interval: '1d', currency: 'VND', price_unit: 'VND', is_adjusted: false }));
  const evaluate = (count, horizonDays) => evaluatePositionExitHorizon({ guidance: input, priceRows: prices.slice(0, count), horizonDays });
  expect(evaluate(1, 5).status).toBe('pending');
  expect(evaluate(5, 5).status).toBe('evaluated');
  expect(evaluate(25, 5)).toEqual(evaluate(5, 5));
  expect(evaluate(25, 20)).toEqual(evaluate(20, 20));
  expect(evaluatePositionExitHorizon({ guidance: input, priceRows: [{ ...prices[0], observed_at: '2026-01-01T10:00:00Z' }], horizonDays: 1 }).status).toBe('pending');
  expect(evaluatePositionExitHorizon({ guidance: input, priceRows: [{ ...prices[0], price_unit: 'thousand VND' }], horizonDays: 1 }).reason).toBe('mixed_price_basis');
  expect(evaluate(1, 1).excursion.mae_pct).toBe(0);
});
