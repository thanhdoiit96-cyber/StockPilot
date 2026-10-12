'use strict';
const { buildForecastSample } = require('./forecastDataset');
const { evaluateForecastBaseline } = require('./forecastBaseline');
const timestamp = value => typeof value === 'string' && /T.*(Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;

function replayForecastDataset({ rows, calendar, provider, synthetic, origins = [], evaluationCutoffs = [], folds = [], evidenceStore, calendarKey, reviewCutoff }) {
  if (typeof synthetic !== 'boolean') throw new Error('Explicit synthetic flag required');
  if (evidenceStore && evidenceStore.synthetic !== synthetic) throw new Error('Evidence dataset context mismatch');
  if (origins.length > 500 || evaluationCutoffs.length > 1000) throw new Error('Replay size limit exceeded');
  const times = evaluationCutoffs.map(timestamp);
  if (times.some((t, i) => !Number.isFinite(t) || (i && t <= times[i - 1]))) throw new Error('Evaluation cutoffs must be strictly ordered');
  const seen = new Set();
  const samples = origins.map(({ asOf, cutoff }) => {
    if (seen.has(asOf) || !Number.isFinite(timestamp(cutoff))) throw new Error('Invalid or duplicate origin');
    seen.add(asOf);
    const originEvidence = evidenceStore?.at(cutoff, rows, calendarKey);
    const originRows = originEvidence ? originEvidence.rows : rows;
    const input = { rows: originRows, calendar: originEvidence ? originEvidence.calendar : calendar, provider, synthetic, asOf, cutoff };
    const frozen = buildForecastSample({ ...input, evaluatedAt: cutoff });
    if (originEvidence) frozen.evidence_manifest = { ...originEvidence.evidence_manifest,
      revision_ids: [...new Set([...(frozen.evidence_ids || []), ...(input.calendar ? [input.calendar.version] : [])])].sort() };
    if (frozen.status !== 'features_available') return frozen;
    const labels = new Map(frozen.labels.map(label => [label.horizon_sessions, label]));
    for (let i = 0; i < times.length; i++) {
      if (times[i] < timestamp(cutoff)) continue;
      if ([...labels.values()].every(label => label.status === 'available')) break;
      const futureEvidence = evidenceStore?.at(evaluationCutoffs[i], rows, calendarKey);
      // Historical origin inputs are immutable; only forward observations use later evidence.
      const evaluationRows = futureEvidence ? [...originRows.filter(r => r.session <= asOf), ...futureEvidence.rows.filter(r => r.session > asOf)] : rows;
      const evaluation = buildForecastSample({ ...input, rows: evaluationRows, evaluatedAt: evaluationCutoffs[i] });
      if (evaluation.input_hash !== frozen.input_hash || evaluation.membership_hash !== frozen.membership_hash) throw new Error('Origin changed during replay');
      for (const label of evaluation.labels) {
        if (futureEvidence) label.evidence_manifest = { ...futureEvidence.evidence_manifest,
          revision_ids: [...new Set([...(label.evidence_ids || []), input.calendar.version])].sort() };
        if (labels.get(label.horizon_sessions)?.status !== 'available') labels.set(label.horizon_sessions, label);
      }
    }
    return { ...frozen, labels: [...labels.values()] };
  }).sort((a, b) => a.as_of.localeCompare(b.as_of));
  const excluded = samples.filter(sample => sample.status !== 'features_available').map(sample => ({ session: sample.as_of, reasons: sample.reasons || ['universe_below_minimum'] }));
  const auditCutoff = reviewCutoff || evaluationCutoffs.at(-1);
  if (evidenceStore && (!Number.isFinite(timestamp(auditCutoff)) || times.some(t => t > timestamp(auditCutoff)) || origins.some(o => timestamp(o.cutoff) > timestamp(auditCutoff)))) throw new Error('Review cutoff precedes replay');
  const audits = [];
  const eligibleSamples = samples.map(sample => ({ ...sample, labels: sample.labels.map(label => {
    if (!evidenceStore || label.status !== 'available') return label;
    const ids = [...(sample.evidence_manifest?.revision_ids || []), ...(label.evidence_manifest?.revision_ids || [])];
    const audit = evidenceStore.audit(ids, auditCutoff);
    audits.push({ session: sample.as_of, horizon_sessions: label.horizon_sessions, ...audit });
    return audit.status === 'invalidated' ? { ...label, status: 'unavailable', reason: 'evidence_invalidated' } : label;
  }) }));
  return { version: 'forecast_replay_v1', synthetic, research_only: true,
    evaluation_cutoffs: evaluationCutoffs, samples, excluded, outcome_audits: audits,
    baseline_policy: 'review_cutoff_eligible_only; original samples retained; not historical as-issued metrics',
    baselines: [1, 5].map(horizon => evaluateForecastBaseline({ samples: eligibleSamples.filter(sample => sample.status === 'features_available'), folds, horizon })) };
}
module.exports = { replayForecastDataset };
