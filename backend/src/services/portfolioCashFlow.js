'use strict';

const TYPES = new Set(['DEPOSIT', 'WITHDRAWAL']);

function normalizeCashFlowInput(body, { now = Date.now() } = {}) {
  const type = String(body?.type || '').trim().toUpperCase();
  const amount = Number(body?.amount);
  const occurredAt = new Date(body?.occurred_at || '');
  const note = body?.note == null ? null : String(body.note).trim();
  if (!TYPES.has(type)) return { error: 'Loại dòng tiền phải là nạp tiền hoặc rút tiền.' };
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e15) return { error: 'Số tiền phải lớn hơn 0 và không vượt quá giới hạn cho phép.' };
  if (Number.isNaN(occurredAt.getTime()) || occurredAt.getTime() < Date.UTC(2000, 0, 1) || occurredAt.getTime() > now + 5 * 60 * 1000) return { error: 'Thời điểm dòng tiền không hợp lệ hoặc nằm trong tương lai.' };
  if (note && note.length > 240) return { error: 'Ghi chú không được vượt quá 240 ký tự.' };
  return { value: { type, amount, occurred_at: occurredAt, note: note || null } };
}

function summarizeExternalCashFlows(rows = []) {
  let deposits = 0; let withdrawals = 0;
  for (const row of rows) {
    const amount = Number(row.amount || 0);
    if (row.type === 'DEPOSIT') deposits += amount;
    if (row.type === 'WITHDRAWAL') withdrawals += amount;
  }
  return { count: rows.length, deposits, withdrawals, net: deposits - withdrawals };
}

module.exports = { normalizeCashFlowInput, summarizeExternalCashFlows };
