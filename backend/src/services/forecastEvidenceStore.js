'use strict';
const { createHash } = require('crypto');
const { adaptForecastEvidence } = require('./forecastEvidenceAdapter');
const time = value => typeof value === 'string' && /T.*(Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;

// Immutable in-memory view of an explicitly supplied revision bundle.
// It validates revision ordering, not the authenticity of external attestations.
function createForecastEvidenceStore(bundle) {
  const records = JSON.parse(JSON.stringify(bundle));
  if (records.version !== 'forecast_evidence_bundle_v1' || typeof records.synthetic !== 'boolean' || !Array.isArray(records.revisions)) throw new Error('Invalid evidence bundle');
  const ids = new Set(), streams = new Map();
  for (const record of records.revisions) {
    if (!record.id || ids.has(record.id) || !['calendar', 'price'].includes(record.kind) || !record.key || !Number.isInteger(record.revision) || record.revision < 1 || !Number.isFinite(time(record.recorded_at)) || !['verified','revoked'].includes(record.status)) throw new Error('Invalid evidence revision');
    ids.add(record.id);
    const key = record.kind + ':' + record.key;
    if (!streams.has(key)) streams.set(key, []);
    streams.get(key).push(record);
  }
  for (const stream of streams.values()) {
    stream.sort((a, b) => a.revision - b.revision);
    stream.forEach((r, i) => {
      if (r.revision !== i + 1 || (i && time(r.recorded_at) <= time(stream[i - 1].recorded_at))) throw new Error('Nonsequential evidence revisions');
    });
  }
  const bundleHash = createHash('sha256').update(JSON.stringify(records)).digest('hex');
  return {
    synthetic: records.synthetic,
    audit(revisionIds, cutoff) {
      if (!Number.isFinite(time(cutoff)) || !Array.isArray(revisionIds)) throw new Error('Invalid evidence audit request');
      const findings = [];
      for (const id of new Set(revisionIds)) {
        const original = records.revisions.find(r => r.id === id);
        if (!original) { findings.push({ revision_id: id, reason: 'revision_missing' }); continue; }
        const latest = streams.get(original.kind + ':' + original.key).filter(r => time(r.recorded_at) <= time(cutoff)).at(-1);
        if (!latest) findings.push({ revision_id: id, reason: 'revision_not_available' });
        else if (latest.status === 'revoked') findings.push({ revision_id: id, latest_revision_id: latest.id, reason: 'evidence_revoked' });
        else if (latest.id !== id) findings.push({ revision_id: id, latest_revision_id: latest.id, reason: 'evidence_superseded' });
      }
      return { cutoff, status: findings.length ? 'invalidated' : 'unchanged', findings };
    },
    at(cutoff, rawRows, calendarKey) {
      if (!Number.isFinite(time(cutoff))) throw new Error('Invalid evidence cutoff');
      const selected = [...streams.values()].map(stream => stream.filter(r => time(r.recorded_at) <= time(cutoff)).at(-1)).filter(Boolean);
      const calendarRecord = selected.find(r => r.kind === 'calendar' && r.key === calendarKey);
      const calendar = calendarRecord?.status === 'verified' ? { ...calendarRecord.payload, version: calendarRecord.id, verified: true } : null;
      const evidence = selected.filter(r => r.kind === 'price' && r.status === 'verified').map(r => {
        const payload = r.payload || {};
        const verified = Math.max(time(payload.verified_at), time(r.recorded_at));
        return { ...payload, id: r.id, row_id: r.key, verified_at: Number.isFinite(verified) ? new Date(verified).toISOString() : null };
      });
      const adapted = adaptForecastEvidence({ rows: rawRows, evidence, cutoff });
      return { calendar, rows: adapted.rows, evidence_manifest: { bundle_hash: bundleHash, cutoff, revision_ids: selected.map(r => r.id).sort(), reason_counts: adapted.reason_counts } };
    }
  };
}
module.exports = { createForecastEvidenceStore };
