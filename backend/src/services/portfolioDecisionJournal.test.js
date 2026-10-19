const { normalizeDecisionInput, snapshotRecommendationEvidence, presentDecisionEvidence } = require('./portfolioDecisionJournal');

test('normalizes a bounded decision journal entry without client evidence payload', () => {
  const result = normalizeDecisionInput({ symbol: 'fpt', decision_type: 'buy', thesis: 'Xu hướng và thanh khoản vẫn đáp ứng tiêu chí đã đặt.', review_date: '2026-11-20', invalidation_condition: 'Đóng cửa dưới vùng hỗ trợ trong ba phiên.', evidence_transaction_id: 'tx-1' }, { now: new Date('2026-10-19T00:00:00Z') });
  expect(result.value).toMatchObject({ symbol: 'FPT', decision_type: 'BUY', evidence_transaction_id: 'tx-1' });
});

test('rejects a decision with stale review date or insufficient reflection fields', () => {
  expect(normalizeDecisionInput({ symbol: 'FPT', decision_type: 'BUY', thesis: 'short', review_date: '2026-10-18', invalidation_condition: 'x' }, { now: new Date('2026-10-19T00:00:00Z') }).error).toBeTruthy();
});

test('creates an immutable projection of normalized transaction evidence', () => {
  const transaction = { id: 'tx-1', stock_id: 's-1', traded_at: '2026-10-19T03:00:00Z', Stock: { code: 'FPT', name: 'FPT Corp' }, recommendation_context: { source: 'personalized', symbol: 'FPT', model: 'rule_v1', generated_at: '2026-10-18T03:00:00Z', horizon_days: 20, score: 78.2, rank: 2, expected_entry_price: 100000, criteria: { trend: 30 } } };
  const snapshot = snapshotRecommendationEvidence(transaction);
  transaction.recommendation_context.score = 10;
  expect(snapshot).toMatchObject({ transaction_id: 'tx-1', symbol: 'FPT', score: 78.2, horizon_days: 20 });
  expect(presentDecisionEvidence(transaction)).toMatchObject({ transaction_id: 'tx-1', symbol: 'FPT' });
});
