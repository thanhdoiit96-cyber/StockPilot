'use strict';
const timestamp = value => typeof value === 'string' && /T.*(Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;

// Evidence is an upstream attestation, not a signature or a rights verification.
// Bind it to the exact stored row and source hash, and make verification time
// part of availability so later attestations cannot leak into earlier cutoffs.
function adaptForecastEvidence({ rows = [], evidence = [], cutoff } = {}) {
  const at = timestamp(cutoff);
  if (!Number.isFinite(at)) throw new Error('Timezone-qualified cutoff required');
  const byId = new Map();
  for (const proof of evidence) {
    if (!byId.has(proof.row_id)) byId.set(proof.row_id, []);
    byId.get(proof.row_id).push(proof);
  }
  const accepted = [], excluded = [], counts = {};
  for (const row of rows) {
    const reasons = [];
    const proofs = byId.get(row.id) || [];
    const known = proofs.filter(p => Number.isFinite(timestamp(p.verified_at)) && timestamp(p.verified_at) <= at);
    const proof = known.length === 1 ? known[0] : null;
    if (!proof) reasons.push(!proofs.length ? 'evidence_missing' : known.length > 1 ? 'evidence_ambiguous' : 'evidence_not_available');
    const observed = row.observed_at instanceof Date ? row.observed_at.toISOString() : row.observed_at;
    const observedTime = timestamp(observed);
    if (!Number.isFinite(observedTime)) reasons.push('observation_time_invalid');
    const session = Number.isFinite(observedTime) ? new Date(observedTime + 7 * 3600000).toISOString().slice(0, 10) : null;
    if (row.interval !== '1d' || !row.stock_id || !row.provider) reasons.push('observation_contract_invalid');
    if (!Number.isFinite(Number(row.close)) || Number(row.close) <= 0) reasons.push('price_invalid');
    let availability;
    if (proof) {
      if (!row.source_hash || proof.source_hash !== row.source_hash || proof.provider !== row.provider || !proof.id || !proof.source) reasons.push('evidence_binding_invalid');
      if (proof.basis_verified !== true || !proof.price_basis || proof.events_verified !== true) reasons.push('basis_or_events_unverified');
      const published = timestamp(proof.available_at);
      availability = Math.max(published, timestamp(proof.verified_at));
      if (!Number.isFinite(availability) || !session || published < Date.parse(session + 'T15:00:00+07:00')) reasons.push('availability_invalid');
      else if (availability > at) reasons.push('observation_not_available');
    }
    if (reasons.length) {
      excluded.push({ row_id: row.id, stock_id: row.stock_id, session, reasons });
      for (const reason of reasons) counts[reason] = (counts[reason] || 0) + 1;
      continue;
    }
    accepted.push({ stock_id: row.stock_id, session, provider: row.provider, interval: '1d', close: Number(row.close),
      available_at: new Date(availability).toISOString(), price_basis: proof.price_basis, basis_verified: true, events_verified: true,
      evidence_id: proof.id, source_hash: row.source_hash });
  }
  return { version: 'forecast_evidence_adapter_v1', cutoff, status: accepted.length ? 'rows_available' : 'unavailable',
    input_count: rows.length, accepted_count: accepted.length, excluded_count: excluded.length, reason_counts: counts, rows: accepted, excluded };
}
module.exports = { adaptForecastEvidence };
