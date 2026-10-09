'use strict';

const { recommendationEvaluationEvent } = require('./recommendationPersistence');
const { auditRecommendationEvaluationLedger } = require('./recommendationLedgerAudit');

function fixture() {
  const recommendation = { id: 'rec-1', outcome: 'positive', evaluated_at: '2026-01-02T00:00:00.000Z', forward_return_pct: 5, evaluation_evidence: { version: 'recommendation_evaluation_v1', target: { close: 105 } } };
  return { recommendation, event: { id: 'event-1', ...recommendationEvaluationEvent({ recommendation, run: { id: 'run-1' }, now: '2026-01-03T00:00:00.000Z' }), recommendation } };
}

test('accepts a hashed event that still agrees with its recommendation row', () => {
  const { event } = fixture();
  expect(auditRecommendationEvaluationLedger({ events: [event] })).toMatchObject({ read_only: true, total_events: 1, verified_events: 1, invalid_events: 0, findings: [] });
});

test('reports tampered payloads and current-row drift without mutating either input', () => {
  const { event, recommendation } = fixture();
  event.payload.forward_return_pct = 7;
  recommendation.outcome = 'negative';
  const beforeAudit = JSON.stringify(event);
  const report = auditRecommendationEvaluationLedger({ events: [event] });
  expect(report).toMatchObject({ verified_events: 0, invalid_events: 1 });
  expect(report.findings[0].reasons).toEqual(expect.arrayContaining(['payload_sha256_mismatch', 'outcome_drift', 'forward_return_drift']));
  expect(JSON.stringify(event)).toBe(beforeAudit);
});

test('reports empty ledgers without treating them as failure', () => {
  expect(auditRecommendationEvaluationLedger()).toMatchObject({ total_events: 0, verified_events: 0, invalid_events: 0, findings: [] });
});
