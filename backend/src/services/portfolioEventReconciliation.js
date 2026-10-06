'use strict';

const { vietnamTradingDate } = require('./portfolioAccounting');
const TOLERANCE = 0.000001;
const plain = row => row?.toJSON ? row.toJSON() : row;

function reconcilePortfolioEvent(eventInput, transactionInputs = []) {
  const event = plain(eventInput) || {};
  const recordDate = String(event.record_date || '');
  const stockId = String(event.stock_id || '');
  let ledgerQuantity = 0; let includedTransactions = 0; let sameDayTransactions = 0;
  for (const input of transactionInputs) {
    const transaction = plain(input); const date = vietnamTradingDate(transaction?.traded_at);
    if (!date || String(transaction.stock_id || '') !== stockId || date > recordDate) continue;
    const quantity = Number(transaction.quantity || 0);
    if (!Number.isFinite(quantity) || quantity <= 0 || !['BUY', 'SELL'].includes(transaction.side)) continue;
    ledgerQuantity += transaction.side === 'BUY' ? quantity : -quantity;
    includedTransactions += 1; if (date === recordDate) sameDayTransactions += 1;
  }
  if (Math.abs(ledgerQuantity) < TOLERANCE) ledgerQuantity = 0;
  const recorded = Number(event.entitlement_quantity);
  const difference = Number.isFinite(recorded) ? recorded - ledgerQuantity : null;
  const reasons = [];
  if (!Number.isFinite(recorded) || recorded < 0) reasons.push('invalid_entitlement_quantity');
  else if (Math.abs(difference) > TOLERANCE) reasons.push('entitlement_quantity_mismatch');
  const payload = event.payload || {};
  const numerator = Number(payload.ratio_numerator); const denominator = Number(payload.ratio_denominator);
  let theoreticalBenefit = null;
  if (event.event_type === 'CASH_DIVIDEND') {
    theoreticalBenefit = ledgerQuantity * Number(payload.gross_per_share || 0);
    if (Number(payload.net_cash_amount || 0) + Number(payload.withholding_tax || 0) > theoreticalBenefit + TOLERANCE) reasons.push('cash_amount_exceeds_gross_entitlement');
  } else if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0) {
    theoreticalBenefit = ledgerQuantity * numerator / denominator;
    if (event.event_type === 'STOCK_DIVIDEND' && Number(payload.received_quantity || 0) > theoreticalBenefit + 1) reasons.push('received_quantity_exceeds_theoretical');
    if (event.event_type === 'RIGHTS_ISSUE' && Number(payload.exercised_quantity || 0) > theoreticalBenefit + TOLERANCE) reasons.push('exercised_quantity_exceeds_entitlement');
  }
  return {
    status: reasons.length ? 'mismatch' : 'matched',
    record_date: recordDate,
    stock_id: stockId,
    recorded_entitlement_quantity: Number.isFinite(recorded) ? recorded : null,
    ledger_quantity: ledgerQuantity,
    difference: Number.isFinite(difference) ? difference : null,
    theoretical_benefit: Number.isFinite(theoreticalBenefit) ? theoreticalBenefit : null,
    included_transactions: includedTransactions,
    same_day_transactions: sameDayTransactions,
    calculation_basis: 'trade_date_end_of_day_proxy_v1',
    same_day_rule: 'include_all_transactions_on_record_date',
    settlement_status: 'unverified_t_plus_settlement',
    reasons
  };
}

module.exports = { TOLERANCE, reconcilePortfolioEvent };
