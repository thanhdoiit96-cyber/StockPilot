const { portfolioCashBalance } = require('./portfolioCashBalance');
const buy = { side: 'BUY', quantity: 10, price: 10000, fees: 100, traded_at: '2026-10-02T09:00:00Z' };
const deposit = { type: 'DEPOSIT', amount: 100100, occurred_at: '2026-10-01T09:00:00Z' };
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
