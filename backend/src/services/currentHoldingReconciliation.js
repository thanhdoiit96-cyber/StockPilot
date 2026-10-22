'use strict';

const { normalizeTransactionPrice, vietnamTradingDate } = require('./portfolioAccounting');

const EPSILON = 0.000001;
const plain = value => value?.toJSON ? value.toJSON() : value;
const number = value => Number.isFinite(Number(value)) ? Number(value) : null;
const dateOf = value => vietnamTradingDate(value);
const activeEvent = event => ['PENDING', 'CONFIRMED'].includes(String(event.status || '').toUpperCase());
const supportedEvent = event => ['STOCK_DIVIDEND', 'STOCK_SPLIT', 'RIGHTS_ISSUE'].includes(event.event_type);

function unavailable(stockId, reason, details = {}) { return { stock_id: stockId, status: 'unavailable', reason, reconciliation_version: 'current_holding_reconciliation_v1', ...details }; }
function roundingSafe(value) { return Number.isFinite(value) && Math.abs(value - Math.round(value)) <= EPSILON; }

function eventOrder(a, b) {
  return String(a.effective_date || a.record_date).localeCompare(String(b.effective_date || b.record_date)) || String(a.record_date).localeCompare(String(b.record_date)) || String(a.created_at || '').localeCompare(String(b.created_at || '')) || String(a.id || '').localeCompare(String(b.id || ''));
}

function transactionOrder(a, b) {
  return new Date(a.traded_at).getTime() - new Date(b.traded_at).getTime() || String(a.created_at || '').localeCompare(String(b.created_at || '')) || String(a.id || '').localeCompare(String(b.id || ''));
}

function applyEvent(state, event) {
  if (event.status !== 'CONFIRMED') return { error: 'pending_corporate_action' };
  if (event.verification_status !== 'SOURCE_VERIFIED') return { error: 'corporate_action_source_unverified' };
  if (!supportedEvent(event)) return { error: 'corporate_action_type_not_applicable' };
  if (!event.effective_date || event.effective_date !== event.record_date) return { error: 'corporate_action_timing_unreconciled' };
  const entitlement = number(event.entitlement_quantity);
  if (entitlement == null || Math.abs(entitlement - state.quantity) > EPSILON) return { error: 'corporate_action_entitlement_mismatch' };
  const payload = event.payload || {}; const numerator = number(payload.ratio_numerator); const denominator = number(payload.ratio_denominator);
  if (numerator == null || numerator <= 0 || denominator == null || denominator <= 0) return { error: 'corporate_action_ratio_invalid' };
  if (event.event_type === 'STOCK_SPLIT') {
    const quantity = state.quantity * numerator / denominator;
    if (!roundingSafe(quantity)) return { error: 'corporate_action_fractional_share_unsupported' };
    return { value: { ...state, quantity: Math.round(quantity) } };
  }
  if (event.event_type === 'STOCK_DIVIDEND') {
    const received = number(payload.received_quantity); const theoretical = state.quantity * numerator / denominator;
    if (received == null || received < 0 || received - theoretical > EPSILON || !roundingSafe(received)) return { error: 'corporate_action_stock_dividend_unreconciled' };
    return { value: { ...state, quantity: state.quantity + Math.round(received) } };
  }
  const exercised = number(payload.exercised_quantity); const price = number(payload.subscription_price); const cash = number(payload.exercise_cash_amount); const theoretical = state.quantity * numerator / denominator;
  if (exercised == null || exercised < 0 || exercised - theoretical > EPSILON || !roundingSafe(exercised) || price == null || price < 0 || cash == null || cash < 0 || Math.abs(cash - exercised * price) > 0.01) return { error: 'corporate_action_rights_unreconciled' };
  return { value: { ...state, quantity: state.quantity + Math.round(exercised), cost: state.cost + cash } };
}

function reconcileStockHolding(stockId, transactions = [], events = []) {
  const relevantEvents = events.map(plain).filter(event => String(event.stock_id) === String(stockId) && activeEvent(event));
  const cashEvents = relevantEvents.filter(event => event.event_type === 'CASH_DIVIDEND');
  const shareEvents = relevantEvents.filter(event => event.event_type !== 'CASH_DIVIDEND').sort(eventOrder);
  const rows = transactions.map(plain).filter(transaction => String(transaction.stock_id) === String(stockId)).sort(transactionOrder);
  if (!rows.length) return unavailable(stockId, 'no_transaction_history');
  let state = { quantity: 0, cost: 0, first_traded_at: rows[0].traded_at, last_traded_at: rows.at(-1).traded_at };
  const timeline = [...rows.map(row => ({ kind: 'transaction', date: dateOf(row.traded_at), row })), ...shareEvents.map(row => ({ kind: 'event', date: row.effective_date, row }))].sort((a, b) => String(a.date).localeCompare(String(b.date)) || (a.kind === 'event' ? -1 : b.kind === 'event' ? 1 : transactionOrder(a.row, b.row)));
  for (const item of timeline) {
    if (!item.date) return unavailable(stockId, item.kind === 'event' ? 'corporate_action_timing_unreconciled' : 'transaction_date_invalid');
    if (item.kind === 'event') {
      const applied = applyEvent(state, item.row); if (applied.error) return unavailable(stockId, applied.error, { event_id: item.row.id || null }); state = applied.value; continue;
    }
    const quantity = number(item.row.quantity); const price = normalizeTransactionPrice(item.row.price); const fees = number(item.row.fees) || 0;
    if (quantity == null || quantity <= 0 || !Number.isFinite(price) || price <= 0 || !['BUY', 'SELL'].includes(item.row.side)) return unavailable(stockId, 'transaction_input_invalid');
    if (item.row.side === 'BUY') state = { ...state, quantity: state.quantity + quantity, cost: state.cost + quantity * price + fees, last_traded_at: item.row.traded_at };
    else {
      if (quantity - state.quantity > EPSILON) return unavailable(stockId, 'transaction_oversell');
      const disposedCost = state.quantity > EPSILON ? quantity * state.cost / state.quantity : 0;
      state = { ...state, quantity: state.quantity - quantity, cost: state.cost - disposedCost, last_traded_at: item.row.traded_at };
    }
  }
  if (state.quantity <= EPSILON) return { stock_id: stockId, status: 'closed', reconciliation_version: 'current_holding_reconciliation_v1', cash_event_count: cashEvents.length };
  return { stock_id: stockId, status: 'reconciled', reconciliation_version: 'current_holding_reconciliation_v1', quantity: state.quantity, cost: Number(state.cost.toFixed(6)), avg_cost: Number((state.cost / state.quantity).toFixed(6)), first_traded_at: state.first_traded_at, last_traded_at: state.last_traded_at, cash_event_count: cashEvents.length, applied_event_ids: shareEvents.map(event => event.id).filter(Boolean) };
}

function reconcileCurrentHoldings({ transactions = [], events = [] } = {}) {
  const stockIds = [...new Set(transactions.map(plain).map(transaction => transaction?.stock_id).filter(Boolean))];
  return stockIds.map(stockId => reconcileStockHolding(stockId, transactions, events));
}

module.exports = { reconcileCurrentHoldings, reconcileStockHolding };
