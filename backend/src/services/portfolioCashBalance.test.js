const { portfolioCashBalance } = require('./portfolioCashBalance');
const buy = { side: 'BUY', quantity: 10, price: 10000, fees: 100, traded_at: '2026-10-02T09:00:00Z' };
const deposit = { type: 'DEPOSIT', amount: 100100, occurred_at: '2026-10-01T09:00:00Z' };

test('reports the first deficit even when later funding restores the current balance', () => {
  expect(portfolioCashBalance({ transactions: [buy], cashFlows: [{ ...deposit, occurred_at: '2026-10-03T09:00:00Z' }] })).toMatchObject({ status: 'deficit', balance: 0, available_to_buy: 0, first_deficit: { occurred_at: buy.traded_at.replace('Z', '.000Z'), amount: 100100 } });
});
test.each([
  { transactions: [{ ...buy, traded_at: null }] },
  { transactions: [{ ...buy, quantity: -10, price: -10000 }] },
  { cashFlows: [{ ...deposit, occurred_at: null }] },
  { events: [{ status: 'CONFIRMED', event_type: 'STOCK_SPLIT', effective_date: '2026-02-30' }] },
  { events: [{ status: 'CONFIRMED', event_type: 'UNKNOWN', effective_date: '2026-10-01' }] },
  { events: [{ status: 'CONFIRMED', event_type: 'RIGHTS_ISSUE', effective_date: '2026-10-01', payload: { exercised_quantity: 10, subscription_price: 10000, exercise_cash_amount: 1 } }] },
  { cashFlows: [{ ...deposit, amount: Number.MAX_SAFE_INTEGER }, { ...deposit, amount: Number.MAX_SAFE_INTEGER }] }
])('malformed evidence never grants buying cash %#', input => {
  expect(portfolioCashBalance(input)).toMatchObject({ status: 'unavailable', balance: null, available_to_buy: 0, first_deficit: null });
});
test('cash includes fees and permits exact funding', () => {
  expect(portfolioCashBalance({ transactions: [buy], cashFlows: [deposit] })).toMatchObject({ status: 'available', balance: 0 });
  expect(portfolioCashBalance({ transactions: [buy], cashFlows: [{ ...deposit, amount: 100000 }] }).status).toBe('deficit');
});
test('no funding and later deposits cannot finance a prior purchase', () => {
  expect(portfolioCashBalance({ transactions: [buy] }).status).toBe('deficit');
  expect(portfolioCashBalance({ transactions: [buy], cashFlows: [{ ...deposit, occurred_at: '2026-10-03T09:00:00Z' }] }).status).toBe('deficit');
});
test('sales replenish cash less fees and pending events fail closed', () => {
  expect(portfolioCashBalance({ transactions: [buy, { ...buy, side: 'SELL', traded_at: '2026-10-03T09:00:00Z' }], cashFlows: [deposit] })).toMatchObject({ balance: 99900, available_to_buy: 99900 });
  expect(portfolioCashBalance({ events: [{ status: 'PENDING', effective_date: '2026-10-01' }] }).status).toBe('unavailable');
});
