'use strict';

const TYPES = new Set(['RESEARCH', 'BUY', 'HOLD', 'SELL']);
const MAX_DECISIONS = 200;

function text(value, min, max) {
  const result = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  return result.length >= min && result.length <= max ? result : null;
}

function utcDate(value) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
}

function normalizeDecisionInput(payload, { now = new Date() } = {}) {
  const symbol = typeof payload?.symbol === 'string' ? payload.symbol.trim().toUpperCase() : '';
  const decisionType = typeof payload?.decision_type === 'string' ? payload.decision_type.trim().toUpperCase() : '';
  const thesis = text(payload?.thesis, 10, 2000);
  const invalidation = text(payload?.invalidation_condition, 5, 1000);
  const reviewDate = typeof payload?.review_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(payload.review_date) ? payload.review_date : '';
  const evidenceTransactionId = payload?.evidence_transaction_id == null ? null : typeof payload.evidence_transaction_id === 'string' ? payload.evidence_transaction_id.trim() : '';
  if (!/^[A-Z0-9]{1,10}$/.test(symbol) || !TYPES.has(decisionType) || !thesis || !invalidation || !reviewDate || evidenceTransactionId === '') return { error: 'Thông tin nhật ký quyết định không hợp lệ.' };
  const reviewTime = Date.parse(`${reviewDate}T00:00:00.000Z`);
  const today = Date.parse(`${utcDate(now)}T00:00:00.000Z`);
  if (!Number.isFinite(reviewTime) || reviewTime < today || reviewTime > today + 730 * 86400000) return { error: 'Ngày rà soát cần nằm trong 730 ngày tới.' };
  return { value: { symbol, decision_type: decisionType, thesis, review_date: reviewDate, invalidation_condition: invalidation, evidence_transaction_id: evidenceTransactionId || null } };
}

function snapshotRecommendationEvidence(transaction) {
  const context = transaction?.recommendation_context;
  if (!context || typeof context !== 'object' || Array.isArray(context)) return null;
  return {
    version: 'recommendation_transaction_v1', transaction_id: transaction.id,
    source: context.source || null, symbol: context.symbol || transaction.Stock?.code || null,
    model: context.model || null, generated_at: context.generated_at || null,
    horizon_days: Number.isInteger(Number(context.horizon_days)) ? Number(context.horizon_days) : null,
    score: Number.isFinite(Number(context.score)) ? Number(context.score) : null,
    rank: Number.isInteger(Number(context.rank)) ? Number(context.rank) : null,
    expected_entry_price: Number.isFinite(Number(context.expected_entry_price)) ? Number(context.expected_entry_price) : null,
    criteria: context.criteria && typeof context.criteria === 'object' && !Array.isArray(context.criteria) ? context.criteria : null
  };
}

function presentDecision(value) {
  const row = value?.toJSON ? value.toJSON() : value;
  return {
    id: row.id, stock_id: row.stock_id, symbol: row.Stock?.code || row.symbol || null, name: row.Stock?.name || row.name || null,
    decision_type: row.decision_type, status: row.status, thesis: row.thesis, review_date: row.review_date,
    invalidation_condition: row.invalidation_condition, evidence_snapshot: row.evidence_snapshot || null,
    closed_at: row.closed_at || null, created_at: row.created_at, updated_at: row.updated_at
  };
}

function presentDecisionEvidence(transaction) {
  const snapshot = snapshotRecommendationEvidence(transaction);
  if (!snapshot) return null;
  return { transaction_id: transaction.id, stock_id: transaction.stock_id, symbol: transaction.Stock?.code || snapshot.symbol || null, name: transaction.Stock?.name || null, traded_at: transaction.traded_at, evidence_snapshot: snapshot };
}

module.exports = { MAX_DECISIONS, normalizeDecisionInput, snapshotRecommendationEvidence, presentDecision, presentDecisionEvidence };
