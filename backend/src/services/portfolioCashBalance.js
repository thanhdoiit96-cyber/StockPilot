'use strict';
const { normalizeTransactionPrice } = require('./portfolioAccounting');
function portfolioCashBalance({ transactions = [], cashFlows = [], events = [], now = Date.now() } = {}) {
  const entries = []; let valid = true;
  const add = (time, amount, priority = 1) => {
    const timestamp = new Date(time).getTime();
    if (!Number.isFinite(timestamp) || !Number.isFinite(amount) || Math.abs(amount) > Number.MAX_SAFE_INTEGER) { valid = false; return; }
    if (timestamp <= now) entries.push({ time: timestamp, amount, priority });
  };
  cashFlows.forEach(row => {
    if (!['DEPOSIT', 'WITHDRAWAL'].includes(row.type) || !(Number(row.amount) > 0)) valid = false;
    add(row.occurred_at, (row.type === 'DEPOSIT' ? 1 : -1) * Number(row.amount), row.type === 'DEPOSIT' ? 0 : 2);
  });
  transactions.forEach(row => {
    const value = Number(row.quantity) * normalizeTransactionPrice(row.price), fees = Number(row.fees || 0);
    if (!['BUY', 'SELL'].includes(row.side) || !(value > 0) || fees < 0 || new Date(row.traded_at).getTime() > now) valid = false;
    add(row.traded_at, (row.side === 'BUY' ? -value : value) - fees, row.side === 'SELL' ? 1 : 2);
  });
  events.forEach(row => {
    if (row.status === 'CANCELLED') return;
    const time = `${row.event_type === 'CASH_DIVIDEND' ? row.payment_date : row.effective_date}T00:00:00+07:00`;
    if (new Date(time).getTime() > now) return;
    if (row.status !== 'CONFIRMED') { valid = false; return; }
    if (row.event_type === 'CASH_DIVIDEND') {
      const amount = Number(row.payload?.net_cash_amount);
      if (row.payload?.net_cash_amount == null || amount < 0) valid = false;
      add(time, amount, 0);
    } else if (row.event_type === 'RIGHTS_ISSUE') {
      const amount = Number(row.payload?.exercise_cash_amount);
      if (row.payload?.exercise_cash_amount == null || amount < 0) valid = false;
      add(time, -amount, 2);
    }
  });
  entries.sort((a, b) => a.time - b.time || a.priority - b.priority);
  let balance = 0, minimum = 0;
  for (const entry of entries) { balance += entry.amount; minimum = Math.min(minimum, balance); }
  const status = !valid || !Number.isFinite(balance) ? 'unavailable' : minimum < -0.005 ? 'deficit' : 'available';
  return { status, balance: valid ? Math.round(balance * 100) / 100 : null, available_to_buy: status === 'available' ? Math.max(0, Math.round(balance * 100) / 100) : 0, as_of: new Date(now).toISOString(), basis: 'recorded_ledger_not_broker_buying_power' };
}
module.exports = { portfolioCashBalance };
