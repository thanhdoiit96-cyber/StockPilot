'use strict';
const { createHash } = require('crypto');
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const dateValid = day => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day;
const time = value => value == null ? NaN : Date.parse(value);

// Normalized research input: callers must supply independently verified calendar
// and price-basis evidence. Database fetched_at alone cannot satisfy this contract.
function buildForecastSample({ rows = [], calendar, asOf, cutoff, evaluatedAt, provider, synthetic = false } = {}) {
  const base = { target_version: 'breadth_forward_v1', as_of: asOf, cutoff, provider, synthetic, research_only: true };
  const blocked = reason => ({ ...base, status: 'unavailable', reasons: [reason], members: [], labels: [] });
  if (!calendar?.verified || !calendar.source || !calendar.version) return blocked('calendar_unverified');
  const days = calendar.sessions;
  if (!Array.isArray(days) || days.some((day, i) => !dateValid(day) || (i > 0 && day <= days[i - 1]))) return blocked('calendar_invalid');
  const index = days.indexOf(asOf);
  if (index < 59) return blocked('history_window_missing');
  if (!provider || !Number.isFinite(time(cutoff)) || !Number.isFinite(time(evaluatedAt)) || time(evaluatedAt) < time(cutoff)) return blocked('cutoff_invalid');
  if (time(cutoff) < time(asOf + 'T15:00:00+07:00')) return blocked('session_not_closed');
  const history = days.slice(index - 59, index + 1);
  const bySymbol = new Map();
  for (const row of rows) {
    if (row.provider !== provider || row.interval !== '1d' || !row.stock_id) continue;
    if (!bySymbol.has(row.stock_id)) bySymbol.set(row.stock_id, new Map());
    const map = bySymbol.get(row.stock_id);
    if (!map.has(row.session)) map.set(row.session, []);
    map.get(row.session).push(row);
  }
  function observation(map, day, at) {
    const candidates = (map.get(day) || []).filter(r => Number.isFinite(time(r.available_at)) && time(r.available_at) >= time(day + 'T15:00:00+07:00') && time(r.available_at) <= time(at));
    if (!candidates.length) return { reason: 'observation_missing_or_late' };
    if (candidates.length !== 1) return { reason: 'duplicate_observation' };
    const row = candidates[0];
    if (!(Number.isFinite(Number(row.close)) && Number(row.close) > 0)) return { reason: 'invalid_price' };
    if (row.basis_verified !== true || !row.price_basis || row.events_verified !== true) return { reason: 'price_basis_or_events_unverified' };
    return { row };
  }
  const members = [], excluded = [], features = [], entries = new Map(), inputEvidence = new Set();
  for (const id of [...bySymbol.keys()].sort()) {
    const map = bySymbol.get(id);
    // Symbols with no known observation by cutoff are not part of the candidate universe.
    if (!history.some(day => (map.get(day) || []).some(r => time(r.available_at) <= time(cutoff)))) continue;
    const observations = history.map(day => observation(map, day, cutoff));
    const reason = observations.find(o => o.reason)?.reason;
    if (reason) { excluded.push({ stock_id: id, reason }); continue; }
    const values = observations.map(o => o.row);
    if (values.some(r => r.price_basis !== values[0].price_basis)) { excluded.push({ stock_id: id, reason: 'price_basis_mismatch' }); continue; }
    const close = Number(values.at(-1).close);
    members.push(id); entries.set(id, values.at(-1));
    values.forEach(row => { if (row.evidence_id) inputEvidence.add(row.evidence_id); });
    features.push({ stock_id: id, return_1: close / Number(values.at(-2).close) - 1, return_5: close / Number(values.at(-6).close) - 1, return_20: close / Number(values.at(-21).close) - 1 });
  }
  const manifest = { ...base, calendar_version: calendar.version, calendar_source: calendar.source, members, membership_hash: hash(members), features, excluded, evidence_ids: [...inputEvidence].sort(),
    input_hash: hash(members.map(id => history.map(day => observation(bySymbol.get(id), day, cutoff).row))) };
  const labels = [1, 5].map(horizon => {
    const target = days[index + horizon];
    const result = { horizon_sessions: horizon, target_session: target || null, status: 'unavailable', breadth: null, label: null };
    if (members.length < 50) return { ...result, reason: 'universe_below_minimum' };
    if (!target) return { ...result, reason: 'target_session_missing' };
    let positive = 0, valid = 0; const missing = [], outcomeEvidence = new Set();
    for (const id of members) {
      const window = days.slice(index + 1, index + horizon + 1).map(day => observation(bySymbol.get(id), day, evaluatedAt));
      const reason = window.find(o => o.reason)?.reason || (window.some(o => o.row.price_basis !== entries.get(id).price_basis) ? 'price_basis_mismatch' : null);
      if (reason) { missing.push({ stock_id: id, reason }); continue; }
      window.forEach(o => { if (o.row.evidence_id) outcomeEvidence.add(o.row.evidence_id); });
      valid++; if (Number(window.at(-1).row.close) > Number(entries.get(id).close)) positive++;
    }
    const coverage = valid / members.length;
    if (coverage < 0.95) return { ...result, reason: 'outcome_coverage_insufficient', coverage, missing };
    const breadth = positive / valid;
    // Conservative availability: the coverage decision itself was made at evaluatedAt.
    // Do not backdate a label to the last price timestamp when missing rows may arrive later.
    return { ...result, evidence_ids: [...outcomeEvidence].sort(), status: 'available', label_available_at: new Date(evaluatedAt).toISOString(), coverage, missing, breadth, label: breadth < 0.45 ? 'declining' : breadth > 0.55 ? 'advancing' : 'balanced' };
  });
  return { ...manifest, status: members.length >= 50 ? 'features_available' : 'unavailable', labels };
}
module.exports = { buildForecastSample };
