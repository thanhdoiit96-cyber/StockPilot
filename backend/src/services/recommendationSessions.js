'use strict';
const { sessionDate } = require('./recommendationPriceAudit');

function observationWindow({ rows = [], asOf, provider, horizonDays, through } = {}) {
  const start = sessionDate(asOf);
  const end = through == null ? null : sessionDate(through);
  const horizon = Number(horizonDays);
  if (!start || !provider || !Number.isInteger(horizon) || horizon <= 0 || (through != null && !end)) return { reasons: ['invalid_evaluation_boundary'], days: [], target: null };
  const groups = new Map();
  for (const row of rows) {
    const day = sessionDate(row.observed_at);
    if (!day || day <= start || (end && day > end) || row.provider !== provider || row.interval !== '1d') continue;
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day).push(row);
  }
  const days = [...groups.keys()].sort();
  const selected = days.slice(0, horizon);
  const reasons = [];
  if (days.length < horizon) reasons.push('insufficient_observed_sessions');
  else if (end && days[horizon - 1] !== end) reasons.push('evaluation_date_mismatch');
  if (!selected.length || selected.some(day => groups.get(day).some(row => row.currency !== 'VND' || row.price_unit !== 'VND_PER_SHARE' || row.is_adjusted !== false || !Number.isFinite(Number(row.close ?? row.price)) || Number(row.close ?? row.price) <= 0))) reasons.push('price_evidence_unavailable');
  if (selected.some(day => new Set(groups.get(day).map(row => Number(row.close ?? row.price))).size > 1)) reasons.push('conflicting_session_prices');
  // Stable timestamp for equivalent same-day duplicates, independent of query order.
  const target = days.length >= horizon ? [...groups.get(days[horizon - 1])].sort((a, b) => new Date(a.observed_at) - new Date(b.observed_at))[0] : null;
  return { days, target, reasons };
}
module.exports = { observationWindow };
