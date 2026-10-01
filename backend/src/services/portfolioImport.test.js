'use strict';
const { MAX_IMPORT_ROWS, normalizePortfolioImportRows, validatePortfolioImport, validatePortfolioTimeline } = require('./portfolioImport');

test('normalizes valid rows and reports field errors with CSV row numbers', () => {
  const result = normalizePortfolioImportRows([
    { row_number: 4, symbol: ' fpt ', side: 'buy', quantity: '10', price: '120', fees: '0', traded_at: '2026-10-01T03:00:00Z' },
    { row_number: 5, symbol: '', side: 'hold', quantity: '-1', price: 'x', fees: '-2', traded_at: 'x' }
  ]);
  expect(result.rows[0]).toMatchObject({ row_number: 4, symbol: 'FPT', side: 'BUY', quantity: 10, price: 120000, fees: 0 });
  expect(result.errors.filter(error => error.row === 5).map(error => error.field)).toEqual(['symbol', 'side', 'quantity', 'price', 'fees', 'traded_at']);
});

test('bounds batch size before database validation', () => {
  const result = normalizePortfolioImportRows(Array.from({ length: MAX_IMPORT_ROWS + 1 }, () => ({})));
  expect(result.rows).toEqual([]);
  expect(result.errors[0].message).toContain(String(MAX_IMPORT_ROWS));
});

test('does not coerce a missing trade time to the Unix epoch', () => {
  const result = normalizePortfolioImportRows([{ symbol: 'FPT', side: 'BUY', quantity: '1', price: '10000', fees: '0', traded_at: null }]);
  expect(result.errors).toContainEqual(expect.objectContaining({ row: 2, field: 'traded_at' }));
  expect(result.rows[0].traded_at).toBeNull();
});

test('rejects unknown symbols, exact duplicates and oversells on the combined timeline', () => {
  const normalized = normalizePortfolioImportRows([
    { row_number: 2, symbol: 'FPT', side: 'SELL', quantity: '11', price: '130000', fees: '0', traded_at: '2026-10-02T03:00:00Z' },
    { row_number: 3, symbol: 'FPT', side: 'BUY', quantity: '5', price: '120000', fees: '0', traded_at: '2026-10-01T03:00:00Z' },
    { row_number: 4, symbol: 'AAA', side: 'BUY', quantity: '1', price: '10000', fees: '0', traded_at: '2026-10-01T03:00:00Z' }
  ]).rows;
  const existing = [{ id: 'old', stock_id: 's', side: 'BUY', quantity: 5, price: 120000, fees: 0, traded_at: '2026-10-01T03:00:00Z', created_at: '2026-10-01T03:00:01Z' }];
  const result = validatePortfolioImport({ rows: normalized, stocks: [{ id: 's', code: 'FPT' }], existingTransactions: existing, now: Date.parse('2026-10-03T00:00:00Z') });
  expect(result.errors).toEqual(expect.arrayContaining([
    expect.objectContaining({ row: 2, field: 'quantity' }),
    expect.objectContaining({ row: 3, field: 'row' }),
    expect.objectContaining({ row: 4, field: 'symbol' })
  ]));
});

test('accepts an ordered buy then sell and assigns deterministic creation order', () => {
  const rows = normalizePortfolioImportRows([
    { row_number: 2, symbol: 'FPT', side: 'BUY', quantity: '10', price: '120000', fees: '100', traded_at: '2026-10-01T03:00:00Z' },
    { row_number: 3, symbol: 'FPT', side: 'SELL', quantity: '4', price: '130000', fees: '100', traded_at: '2026-10-02T03:00:00Z' }
  ]).rows;
  const result = validatePortfolioImport({ rows, stocks: [{ id: 's', code: 'FPT' }], now: 1000 });
  expect(result.errors).toEqual([]);
  expect(result.rows.map(row => row.created_at.getTime())).toEqual([1000, 1001]);
});

test('validates the complete candidate timeline before a ledger mutation', () => {
  const valid = validatePortfolioTimeline([
    { id: 'buy', stock_id: 's', side: 'BUY', quantity: 10, traded_at: '2026-10-01T03:00:00Z', created_at: '2026-10-01T03:00:01Z' },
    { id: 'sell', stock_id: 's', side: 'SELL', quantity: 4, traded_at: '2026-10-02T03:00:00Z', created_at: '2026-10-02T03:00:01Z' }
  ]);
  expect(valid).toEqual([]);

  const invalid = validatePortfolioTimeline([
    { id: 'sell', stock_id: 's', side: 'SELL', quantity: 4, traded_at: '2026-10-02T03:00:00Z', created_at: '2026-10-02T03:00:01Z' },
    { id: 'buy', stock_id: 's', side: 'BUY', quantity: 10, traded_at: '2026-10-03T03:00:00Z', created_at: '2026-10-01T03:00:01Z' }
  ]);
  expect(invalid).toEqual([expect.objectContaining({ stock_id: 's', transaction_id: 'sell', message: expect.stringContaining('vượt vị thế') })]);
});
