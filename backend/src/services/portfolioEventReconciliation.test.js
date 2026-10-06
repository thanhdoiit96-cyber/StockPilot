'use strict';
const { reconcilePortfolioEvent } = require('./portfolioEventReconciliation');

const event = { stock_id: 's', event_type: 'STOCK_SPLIT', record_date: '2026-10-01', entitlement_quantity: 80, payload: { ratio_numerator: 2, ratio_denominator: 1 } };
test('reconciles Vietnam-local end-of-record-date holdings and includes same-day trades', () => {
  const result = reconcilePortfolioEvent(event, [
    { stock_id: 's', side: 'BUY', quantity: 100, traded_at: '2026-09-30T16:30:00Z' },
    { stock_id: 's', side: 'SELL', quantity: 20, traded_at: '2026-10-01T03:00:00Z' },
    { stock_id: 's', side: 'BUY', quantity: 50, traded_at: '2026-10-01T18:00:00Z' }
  ]);
  expect(result).toMatchObject({ status: 'matched', ledger_quantity: 80, included_transactions: 2, same_day_transactions: 1, theoretical_benefit: 160, settlement_status: 'unverified_t_plus_settlement' });
});
test('reports entitlement mismatch without mutating the event', () => {
  const result = reconcilePortfolioEvent({ ...event, entitlement_quantity: 100 }, [{ stock_id: 's', side: 'BUY', quantity: 80, traded_at: '2026-09-30T03:00:00Z' }]);
  expect(result).toMatchObject({ status: 'mismatch', difference: 20, reasons: ['entitlement_quantity_mismatch'] });
});
test('ignores other symbols and future trades', () => {
  const result = reconcilePortfolioEvent({ ...event, entitlement_quantity: 0 }, [{ stock_id: 'x', side: 'BUY', quantity: 80, traded_at: '2026-09-30T03:00:00Z' }, { stock_id: 's', side: 'BUY', quantity: 80, traded_at: '2026-10-02T03:00:00Z' }]);
  expect(result).toMatchObject({ status: 'matched', ledger_quantity: 0, included_transactions: 0 });
});
test('blocks impossible cash, stock dividend and rights benefits', () => {
  const transactions = [{ stock_id: 's', side: 'BUY', quantity: 10, traded_at: '2026-09-30T03:00:00Z' }];
  expect(reconcilePortfolioEvent({ stock_id: 's', event_type: 'CASH_DIVIDEND', record_date: '2026-10-01', entitlement_quantity: 10, payload: { gross_per_share: 1000, withholding_tax: 0, net_cash_amount: 20000 } }, transactions).reasons).toContain('cash_amount_exceeds_gross_entitlement');
  expect(reconcilePortfolioEvent({ stock_id: 's', event_type: 'STOCK_DIVIDEND', record_date: '2026-10-01', entitlement_quantity: 10, payload: { ratio_numerator: 1, ratio_denominator: 10, received_quantity: 3 } }, transactions).reasons).toContain('received_quantity_exceeds_theoretical');
  expect(reconcilePortfolioEvent({ stock_id: 's', event_type: 'RIGHTS_ISSUE', record_date: '2026-10-01', entitlement_quantity: 10, payload: { ratio_numerator: 1, ratio_denominator: 10, exercised_quantity: 2 } }, transactions).reasons).toContain('exercised_quantity_exceeds_entitlement');
});
