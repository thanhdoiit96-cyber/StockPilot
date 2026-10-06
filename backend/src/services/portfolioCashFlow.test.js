const { normalizeCashFlowInput, summarizeExternalCashFlows } = require('./portfolioCashFlow');

test('normalizes a bounded historical deposit or withdrawal', () => {
  const now = Date.parse('2026-10-06T10:00:00Z');
  expect(normalizeCashFlowInput({ type: 'deposit', amount: '1500000.50', occurred_at: '2026-10-05T03:00:00Z', note: ' Vốn ban đầu ' }, { now })).toEqual({ value: { type: 'DEPOSIT', amount: 1500000.5, occurred_at: new Date('2026-10-05T03:00:00Z'), note: 'Vốn ban đầu' } });
  expect(normalizeCashFlowInput({ type: 'WITHDRAWAL', amount: 1, occurred_at: '2026-10-06T10:04:00Z' }, { now }).value.type).toBe('WITHDRAWAL');
});

test('rejects unsupported, unsafe or future cash flows', () => {
  const options = { now: Date.parse('2026-10-06T10:00:00Z') };
  expect(normalizeCashFlowInput({ type: 'DIVIDEND', amount: 1, occurred_at: '2026-10-05' }, options).error).toMatch(/Loại dòng tiền/);
  expect(normalizeCashFlowInput({ type: 'DEPOSIT', amount: 0, occurred_at: '2026-10-05' }, options).error).toMatch(/Số tiền/);
  expect(normalizeCashFlowInput({ type: 'DEPOSIT', amount: 1, occurred_at: '2026-10-07' }, options).error).toMatch(/tương lai/);
  expect(normalizeCashFlowInput({ type: 'DEPOSIT', amount: 1, occurred_at: '2026-10-05', note: 'x'.repeat(241) }, options).error).toMatch(/240/);
});

test('summarizes external flows without treating them as investment profit', () => {
  expect(summarizeExternalCashFlows([{ type: 'DEPOSIT', amount: '1000000' }, { type: 'WITHDRAWAL', amount: '250000' }])).toEqual({ count: 2, deposits: 1000000, withdrawals: 250000, net: 750000 });
});
