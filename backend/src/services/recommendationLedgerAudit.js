'use strict';

const { verifyRecommendationEvaluationEvent } = require('./recommendationPersistence');

function equivalentTimestamp(left, right) {
  if (left == null || right == null) return left == null && right == null;
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  return Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime === rightTime;
}

function equivalentNumber(left, right) {
  if (left == null || right == null) return left == null && right == null;
  return Number.isFinite(Number(left)) && Number.isFinite(Number(right)) && Number(left) === Number(right);
}

function canonicalValue(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalValue).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalValue(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function auditRecommendationEvaluationLedger({ events = [] } = {}) {
  const findings = [];
  let verifiedEvents = 0;
  for (const rawEvent of events) {
    const event = rawEvent?.toJSON ? rawEvent.toJSON() : rawEvent;
    const reasons = [];
    const integrity = verifyRecommendationEvaluationEvent(event);
    if (!integrity.valid) reasons.push(integrity.reason || 'payload_sha256_mismatch');
    const payload = event?.payload;
    if (!payload || payload.recommendation_id !== event.recommendation_id) reasons.push('payload_recommendation_id_mismatch');
    if (!payload || payload.run_id !== event.run_id) reasons.push('payload_run_id_mismatch');
    if (!payload || payload.version !== event.schema_version) reasons.push('payload_schema_version_mismatch');
    if (event.event_type !== 'evaluation_recorded') reasons.push('unexpected_event_type');
    const recommendation = event.recommendation;
    if (!recommendation) reasons.push('recommendation_relation_missing');
    else {
      if (payload?.outcome !== recommendation.outcome) reasons.push('outcome_drift');
      if (!equivalentTimestamp(payload?.evaluated_at, recommendation.evaluated_at)) reasons.push('evaluated_at_drift');
      if (!equivalentNumber(payload?.forward_return_pct, recommendation.forward_return_pct)) reasons.push('forward_return_drift');
      if (canonicalValue(payload?.evaluation_evidence) !== canonicalValue(recommendation.evaluation_evidence)) reasons.push('evaluation_evidence_drift');
    }
    if (reasons.length) findings.push({ event_id: event?.id || null, recommendation_id: event?.recommendation_id || null, run_id: event?.run_id || null, reasons });
    else verifiedEvents += 1;
  }
  return {
    read_only: true,
    total_events: events.length,
    verified_events: verifiedEvents,
    invalid_events: findings.length,
    findings,
    limitations: 'This checks canonical event payload hashes and agreement with the current recommendation row. It does not certify price evidence, snapshot eligibility, external signatures, privileged database access, or archival retention.',
  };
}

module.exports = { auditRecommendationEvaluationLedger, canonicalValue, equivalentNumber, equivalentTimestamp };
