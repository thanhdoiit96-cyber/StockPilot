'use strict';
const { createForecastSnapshot, recordForecastOutcome, snapshotGenerationKey, validateSnapshot } = require('./forecastSnapshotStore');

function assertDevelopment(env) {
  if (env?.NODE_ENV !== 'development' || env?.FORECAST_RESEARCH_PREVIEW === 'false') throw new Error('Forecast materialization is development-only');
}
function artifactEntries(artifact) {
  if (artifact?.payload?.synthetic !== true || artifact?.payload?.research_only !== true || !Array.isArray(artifact.payload.histories)) throw new Error('Validated synthetic preview artifact required');
  return artifact.payload.histories.flatMap(history => history.entries || []);
}
function snapshotInput(entry) {
  return { synthetic: true, research_only: true, live: false, market_accuracy_verified: false, provider: entry.provider, model_version: entry.model_version,
    horizon_sessions: entry.horizon_sessions, as_of: entry.as_of, target_session: entry.target_session, split_hash: entry.split_hash,
    training_hash: entry.training_hash, probabilities: entry.probabilities, baseline_snapshot: entry.baseline_snapshot };
}
async function materializeForecastArtifact({ artifact, models, env = process.env, retentionDays = 180, now = new Date() }) {
  assertDevelopment(env);
  const counts = { created: 0, existing: 0, legacy_existing: 0 };
  for (const entry of artifactEntries(artifact)) {
    const result = await createForecastSnapshot(models, snapshotInput(entry), { retentionDays, now });
    counts[result.status === 'created' ? 'created' : result.status === 'snapshot_legacy_exists' ? 'legacy_existing' : 'existing']++;
  }
  return { status: 'materialized', synthetic: true, artifact_sha256: artifact.sha256, predictions: counts.created + counts.existing + counts.legacy_existing, ...counts };
}
async function evaluateForecastArtifactOutcomes({ artifact, models, env = process.env, now = new Date() }) {
  assertDevelopment(env);
  const counts = { measured: 0, existing: 0, pending: 0, missing_snapshot: 0 };
  for (const entry of artifactEntries(artifact)) {
    if (entry.outcome_status !== 'measured' || !entry.outcome_available_at || Date.parse(entry.outcome_available_at) > now.getTime()) { counts.pending++; continue; }
    const generation_key = snapshotGenerationKey(validateSnapshot(snapshotInput(entry)));
    const snapshot = await models.ForecastSnapshot.findOne({ where: { generation_key } });
    if (!snapshot) { counts.missing_snapshot++; continue; }
    const result = await recordForecastOutcome(models, snapshot.id, { actual_class: entry.actual_class, target_session: entry.target_session, outcome_available_at: entry.outcome_available_at });
    if (result.status === 'measured') counts.measured++;
    else if (result.status === 'outcome_exists') counts.existing++;
    else counts.missing_snapshot++;
  }
  return { status: 'evaluated', synthetic: true, artifact_sha256: artifact.sha256, outcomes: counts.measured + counts.existing, ...counts };
}
module.exports = { assertDevelopment, artifactEntries, snapshotInput, materializeForecastArtifact, evaluateForecastArtifactOutcomes };
