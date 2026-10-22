'use strict';
const { reconcileStockHolding } = require('./currentHoldingReconciliation');

const buy = { id: 'buy', stock_id: 's', side: 'BUY', quantity: 100, price: 10000, fees: 0, traded_at: '2026-01-01T03:00:00Z' };
const verified = event => ({ id: 'event', stock_id: 's', status: 'CONFIRMED', verification_status: 'SOURCE_VERIFIED', record_date: '2026-01-05', effective_date: '2026-01-05', entitlement_quantity: 100, ...event });

test('reconciles a source-verified same-day stock split without changing total cost', () => {
  const result = reconcileStockHolding('s', [buy], [verified({ event_type: 'STOCK_SPLIT', payload: { ratio_numerator: 2, ratio_denominator: 1 } })]);
  expect(result).toMatchObject({ status: 'reconciled', quantity: 200, cost: 1000000, avg_cost: 5000, applied_event_ids: ['event'] });
});

test('reconciles a verified stock dividend and rights exercise only with matching evidence', () => {
  const dividend = reconcileStockHolding('s', [buy], [verified({ id: 'dividend', event_type: 'STOCK_DIVIDEND', payload: { ratio_numerator: 1, ratio_denominator: 10, received_quantity: 10 } })]);
  expect(dividend).toMatchObject({ status: 'reconciled', quantity: 110, cost: 1000000, avg_cost: 9090.909091 });
  const rights = reconcileStockHolding('s', [buy], [verified({ id: 'rights', event_type: 'RIGHTS_ISSUE', payload: { ratio_numerator: 1, ratio_denominator: 5, exercised_quantity: 20, subscription_price: 8000, exercise_cash_amount: 160000 } })]);
  expect(rights).toMatchObject({ status: 'reconciled', quantity: 120, cost: 1160000, avg_cost: 9666.666667 });
});

test('fails closed for pending, manually confirmed, timing-mismatched and oversold inputs', () => {
  expect(reconcileStockHolding('s', [buy], [{ ...verified({ event_type: 'STOCK_SPLIT', payload: { ratio_numerator: 2, ratio_denominator: 1 } }), status: 'PENDING' }])).toMatchObject({ status: 'unavailable', reason: 'pending_corporate_action' });
  expect(reconcileStockHolding('s', [buy], [{ ...verified({ event_type: 'STOCK_SPLIT', payload: { ratio_numerator: 2, ratio_denominator: 1 } }), verification_status: 'USER_CONFIRMED' }])).toMatchObject({ status: 'unavailable', reason: 'corporate_action_source_unverified' });
  expect(reconcileStockHolding('s', [buy], [{ ...verified({ event_type: 'STOCK_SPLIT', effective_date: '2026-01-06', payload: { ratio_numerator: 2, ratio_denominator: 1 } }) }])).toMatchObject({ status: 'unavailable', reason: 'corporate_action_timing_unreconciled' });
  expect(reconcileStockHolding('s', [buy, { stock_id: 's', side: 'SELL', quantity: 101, price: 10000, fees: 0, traded_at: '2026-01-02T03:00:00Z' }])).toMatchObject({ status: 'unavailable', reason: 'transaction_oversell' });
});
