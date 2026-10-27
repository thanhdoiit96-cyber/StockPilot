'use strict';
const { parseListingSymbols, selectRequestedListings } = require('./scopedListingSelection');
const row = { symbol: 'MCH', name: 'Provider company name', exchange: 'HSX', type: 'STOCK' };
test('default remains existing-only; explicit scope is normalized', () => {
  expect(parseListingSymbols([])).toBeNull();
  expect(parseListingSymbols(['--symbols=mch, VJC'])).toEqual(['MCH', 'VJC']);
});
test.each([['--symbols='], ['--symbols=MCH,MCH'], ['--all'], ['--symbols=MCH', '--all'], [`--symbols=${Array.from({ length: 31 }, (_, i) => `S${i}`).join(',')}`]])('rejects invalid scope %j', (...args) => expect(() => parseListingSymbols(args)).toThrow());
test('selects only requested provider metadata', () => expect(selectRequestedListings([row, { ...row, symbol: 'FPT' }], ['MCH'])).toEqual([row]));
test.each([[], [row, row], [{ ...row, type: 'ETF' }], [{ ...row, name: '' }], [{ ...row, exchange: 'DELISTED' }]].map(rows => ({ rows })))('rejects missing, ambiguous or unsupported metadata', ({ rows }) => expect(() => selectRequestedListings(rows, ['MCH'])).toThrow());
