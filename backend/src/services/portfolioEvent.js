'use strict';

const EVENT_TYPES = new Set(['CASH_DIVIDEND', 'STOCK_DIVIDEND', 'STOCK_SPLIT', 'RIGHTS_ISSUE']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const finite = (value, { zero = false } = {}) => Number.isFinite(Number(value)) && (zero ? Number(value) >= 0 : Number(value) > 0) && Number(value) <= 1e15;
const validDate = value => DATE_RE.test(String(value || '')) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

function normalizePayload(type, input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'Chi tiết sự kiện không hợp lệ.' };
  if (type === 'CASH_DIVIDEND') {
    if (!finite(input.gross_per_share) || !finite(input.withholding_tax, { zero: true }) || !finite(input.net_cash_amount, { zero: true }) || String(input.currency || '').toUpperCase() !== 'VND') return { error: 'Cổ tức tiền mặt cần đơn giá, thuế, tiền thực nhận và tiền tệ VND hợp lệ.' };
    return { value: { gross_per_share: Number(input.gross_per_share), withholding_tax: Number(input.withholding_tax), net_cash_amount: Number(input.net_cash_amount), currency: 'VND' } };
  }
  if (!finite(input.ratio_numerator) || !finite(input.ratio_denominator)) return { error: 'Tỷ lệ sự kiện phải gồm tử số và mẫu số lớn hơn 0.' };
  const ratio = { ratio_numerator: Number(input.ratio_numerator), ratio_denominator: Number(input.ratio_denominator) };
  if (type === 'STOCK_DIVIDEND') {
    if (!finite(input.received_quantity, { zero: true })) return { error: 'Số lượng cổ phiếu nhận không hợp lệ.' };
    return { value: { ...ratio, received_quantity: Number(input.received_quantity) } };
  }
  if (type === 'STOCK_SPLIT') return { value: ratio };
  if (!finite(input.subscription_price, { zero: true }) || !finite(input.exercised_quantity, { zero: true }) || !finite(input.exercise_cash_amount, { zero: true })) return { error: 'Thông tin thực hiện quyền mua không hợp lệ.' };
  const subscriptionPrice = Number(input.subscription_price); const exercisedQuantity = Number(input.exercised_quantity); const exerciseCashAmount = Number(input.exercise_cash_amount);
  if (Math.abs(exerciseCashAmount - exercisedQuantity * subscriptionPrice) > 0.01) return { error: 'Số tiền thực hiện quyền phải khớp với số lượng và giá đăng ký.' };
  return { value: { ...ratio, subscription_price: subscriptionPrice, exercised_quantity: exercisedQuantity, exercise_cash_amount: exerciseCashAmount } };
}

function normalizePortfolioEventInput(body) {
  const eventType = String(body?.event_type || '').trim().toUpperCase();
  const symbol = String(body?.symbol || '').trim().toUpperCase();
  const entitlement = Number(body?.entitlement_quantity);
  const recordDate = String(body?.record_date || ''); const effectiveDate = body?.effective_date || null; const paymentDate = body?.payment_date || null;
  const note = body?.note == null ? null : String(body.note).trim();
  if (!EVENT_TYPES.has(eventType)) return { error: 'Loại sự kiện danh mục không được hỗ trợ.' };
  if (!/^[A-Z0-9]{1,10}$/.test(symbol)) return { error: 'Mã chứng khoán không hợp lệ.' };
  if (!finite(entitlement, { zero: true })) return { error: 'Số lượng hưởng quyền không hợp lệ.' };
  if (!validDate(recordDate)) return { error: 'Ngày chốt quyền không hợp lệ.' };
  if (eventType === 'CASH_DIVIDEND' && !validDate(paymentDate)) return { error: 'Cổ tức tiền mặt cần ngày thanh toán hợp lệ.' };
  if (eventType !== 'CASH_DIVIDEND' && !validDate(effectiveDate)) return { error: 'Sự kiện cổ phiếu cần ngày hiệu lực hợp lệ.' };
  if (effectiveDate && !validDate(effectiveDate)) return { error: 'Ngày hiệu lực không hợp lệ.' };
  if (paymentDate && !validDate(paymentDate)) return { error: 'Ngày thanh toán không hợp lệ.' };
  if (note && note.length > 240) return { error: 'Ghi chú không được vượt quá 240 ký tự.' };
  const payload = normalizePayload(eventType, body?.payload); if (payload.error) return payload;
  return { value: { symbol, event_type: eventType, schema_version: 1, record_date: recordDate, effective_date: effectiveDate, payment_date: paymentDate, entitlement_quantity: entitlement, payload: payload.value, note: note || null } };
}

function presentPortfolioEvent(row) {
  const item = row?.toJSON ? row.toJSON() : row;
  return { id: item.id, stock_id: item.stock_id, symbol: item.Stock?.code || null, event_type: item.event_type, status: item.status, schema_version: item.schema_version, record_date: item.record_date, effective_date: item.effective_date, payment_date: item.payment_date, entitlement_quantity: Number(item.entitlement_quantity), payload: item.payload, source_type: item.source_type, source_name: item.source_name || null, source_url: item.source_url || null, source_reference: item.source_reference || null, announced_at: item.announced_at || null, fetched_at: item.fetched_at || null, verification_status: item.verification_status, supersedes_event_id: item.supersedes_event_id || null, note: item.note || null, created_at: item.created_at, updated_at: item.updated_at };
}

module.exports = { EVENT_TYPES, normalizePortfolioEventInput, presentPortfolioEvent };
