const { preparePositionExitSnapshot, positionExitGenerationKey, positionExitSnapshotHash } = require('./positionExitPersistence');
const prices = Array.from({ length: 65 }, (_, index) => ({ stock_id: 's', observed_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(), provider: 'vnstock', interval: '1d', close: 100 + index, high: 101 + index, low: 99 + index, price_unit: 'VND', currency: 'VND', is_adjusted: false }));
const transaction = { stock_id: 's', side: 'BUY', quantity: 10, price: 100, fees: 0, traded_at: '2026-01-01T00:00:00.000Z', Stock: { code: 'ABC' } };

test('prepares a reproducible, per-portfolio shadow snapshot without a provider call', () => {
  const first = preparePositionExitSnapshot({ portfolioId: 'p', transactions: [transaction], priceRows: prices });
  const second = preparePositionExitSnapshot({ portfolioId: 'p', transactions: [transaction], priceRows: prices });
  expect(first.input_provenance).toMatchObject({ portfolio_id: 'p', open_positions: 1, price_rows: 65 });
  expect(first.guidance[0]).toMatchObject({ stock_id: 's', research_only: true });
  const key = positionExitGenerationKey({ portfolioId: 'p', asOf: first.as_of, provider: 'vnstock', inputHash: first.input_provenance_sha256 });
  expect(key).toHaveLength(64);
  expect(positionExitSnapshotHash({ portfolioId: 'p', asOf: first.as_of, provider: 'vnstock', inputHash: first.input_provenance_sha256, guidance: first.guidance })).toBe(positionExitSnapshotHash({ portfolioId: 'p', asOf: second.as_of, provider: 'vnstock', inputHash: second.input_provenance_sha256, guidance: second.guidance }));
});

test('marks a position with a pending corporate action unavailable in its immutable payload', () => {
  const result = preparePositionExitSnapshot({ portfolioId: 'p', transactions: [transaction], priceRows: prices, events: [{ stock_id: 's', status: 'PENDING' }] });
  expect(result.guidance[0]).toMatchObject({ status: 'unavailable', reason: 'unapplied_corporate_action' });
});
