'use strict';
const { normalizePortfolioEventInput, presentPortfolioEvent } = require('./portfolioEvent');

const base = { symbol: 'FPT', record_date: '2026-09-20', entitlement_quantity: 1000 };

test('normalizes a VND cash dividend with a required payment date', () => {
  const result = normalizePortfolioEventInput({ ...base, event_type: 'cash_dividend', payment_date: '2026-10-10', payload: { gross_per_share: '2000', withholding_tax: 100000, net_cash_amount: 1900000, currency: 'vnd' } });
  expect(result.error).toBeUndefined();
  expect(result.value).toMatchObject({ symbol: 'FPT', event_type: 'CASH_DIVIDEND', schema_version: 1, payment_date: '2026-10-10', payload: { gross_per_share: 2000, currency: 'VND' } });
});

test.each([
  ['STOCK_DIVIDEND', { ratio_numerator: 20, ratio_denominator: 100, received_quantity: 200 }],
  ['STOCK_SPLIT', { ratio_numerator: 2, ratio_denominator: 1 }],
  ['RIGHTS_ISSUE', { ratio_numerator: 1, ratio_denominator: 5, subscription_price: 15000, exercised_quantity: 0, exercise_cash_amount: 0 }]
])('normalizes %s payload', (eventType, payload) => {
  expect(normalizePortfolioEventInput({ ...base, event_type: eventType, effective_date: '2026-10-01', payload }).value.payload).toEqual(payload);
});

test('rejects invalid dates, unsupported types, negative entitlement and malformed payloads', () => {
  expect(normalizePortfolioEventInput({ ...base, event_type: 'MERGER' }).error).toBeTruthy();
  expect(normalizePortfolioEventInput({ ...base, event_type: 'CASH_DIVIDEND', payment_date: 'bad', payload: {} }).error).toBeTruthy();
  expect(normalizePortfolioEventInput({ ...base, entitlement_quantity: -1, event_type: 'STOCK_SPLIT', effective_date: '2026-10-01', payload: { ratio_numerator: 2, ratio_denominator: 1 } }).error).toBeTruthy();
  expect(normalizePortfolioEventInput({ ...base, event_type: 'RIGHTS_ISSUE', effective_date: '2026-10-01', payload: { ratio_numerator: 1, ratio_denominator: 0 } }).error).toBeTruthy();
});

test('presents numeric entitlement and bounded public provenance', () => {
  expect(presentPortfolioEvent({ id: 'e', stock_id: 's', Stock: { code: 'FPT' }, entitlement_quantity: '10.500000', payload: {}, source_type: 'MANUAL', verification_status: 'UNVERIFIED' })).toMatchObject({ id: 'e', symbol: 'FPT', entitlement_quantity: 10.5, source_type: 'MANUAL' });
});
