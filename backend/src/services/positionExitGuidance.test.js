const { buildPositionExitGuidance } = require('./positionExitGuidance');

const rows = ({ close = 100, count = 65, provider = 'vnstock', unit = 'VND', adjusted = false } = {}) => Array.from({ length: count }, (_, index) => ({
  observed_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(), close: close + index * .1,
  high: close + index * .1 + 1, low: close + index * .1 - 1, provider, interval: '1d', price_unit: unit, currency: 'VND', is_adjusted: adjusted
}));
const position = { stock_id: 'stock-1', symbol: 'ABC', quantity: 10, avg_cost: 100, first_traded_at: '2026-01-01T00:00:00.000Z' };

test('fails closed when price basis or a corporate action is not safe', () => {
  expect(buildPositionExitGuidance({ position, priceRows: rows({ count: 59 }) })).toMatchObject({ status: 'unavailable', reason: 'insufficient_eod_sessions' });
  expect(buildPositionExitGuidance({ position, priceRows: rows(), hasUnappliedCorporateAction: true })).toMatchObject({ status: 'unavailable', reason: 'unapplied_corporate_action' });
  const mixed = rows(); mixed[20].price_unit = 'thousand VND';
  expect(buildPositionExitGuidance({ position, priceRows: mixed })).toMatchObject({ status: 'unavailable', reason: 'mixed_price_basis' });
});

test('fails closed when the bounded EOD window cannot establish the high-water mark since entry', () => {
  const olderPosition = { ...position, first_traded_at: '2025-12-01T00:00:00.000Z' };
  expect(buildPositionExitGuidance({ position: olderPosition, priceRows: rows() })).toMatchObject({
    status: 'unavailable', reason: 'entry_before_available_eod', coverage: { earliest_session: '2026-01-01' }
  });
});

test('emits a reproducible protective exit state only from stored EOD inputs', () => {
  const falling = rows({ close: 120 }).map((row, index) => ({ ...row, close: 120 - index, high: 121 - index, low: 119 - index }));
  const result = buildPositionExitGuidance({ position, priceRows: falling });
  expect(result).toMatchObject({ version: 'position_exit_rule_v1', status: 'cut_loss', research_only: true, provider: 'vnstock', interval: '1d' });
  expect(result.levels.active_stop).toBeGreaterThan(result.reference.close);
  expect(result.reasons).toEqual(['close_at_or_below_active_stop']);
});

test('does not turn a profit target into a sell state without weakening momentum', () => {
  const result = buildPositionExitGuidance({ position, priceRows: rows({ close: 100 }) });
  expect(result.status).toBe('hold');
  expect(result.levels.take_profit_review).toBeGreaterThan(position.avg_cost);
});

test('asks to review profit protection when an armed trailing position has a bearish trend', () => {
  const weakening = rows({ close: 108 }).map((row, index) => {
    const close = index < 40 ? 108 : 108 - (index - 40) * .15;
    return { ...row, close, high: close + 1, low: close - 1 };
  });
  const result = buildPositionExitGuidance({ position, priceRows: weakening });
  expect(result).toMatchObject({ status: 'trailing_protect', reasons: ['trailing_stop_armed', 'trend_weakened'] });
  expect(result.reference.close).toBeGreaterThan(result.levels.active_stop);
});
