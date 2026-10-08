'use strict';

// Diagnostics only: observed dates are not an exchange trading calendar.
function sessionDate(value) {
  if (value == null) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
    : null;
}

function auditRecommendationPrices({ prices = [], runs = [] } = {}) {
  const groups = new Map();
  const byStock = new Map();
  let invalidDates = 0;
  let invalidPrices = 0;
  for (const row of prices) {
    const date = sessionDate(row.observed_at);
    const close = Number(row.close ?? row.price);
    if (!date) { invalidDates++; continue; }
    if (!Number.isFinite(close) || close <= 0) invalidPrices++;
    const key = JSON.stringify([row.stock_id, row.provider, row.interval, date, row.currency, row.price_unit, row.is_adjusted]);
    const group = groups.get(key) || { count: 0, closes: new Set() };
    group.count++;
    group.closes.add(Number.isFinite(close) && close > 0 ? close : 'invalid');
    groups.set(key, group);
    if (!byStock.has(row.stock_id)) byStock.set(row.stock_id, new Set());
    byStock.get(row.stock_id).add(date);
  }
  const findings = [];
  let measured = 0;
  let legacyRuns = 0;
  for (const run of runs) {
    if (!run.snapshot_sha256) legacyRuns++;
    for (const item of run.recommendations || []) {
      if (!item.outcome || item.outcome === 'pending') continue;
      measured++;
      const start = sessionDate(run.as_of);
      const end = sessionDate(item.evaluated_at);
      const horizon = Number(item.horizon_days);
      const dates = [...(byStock.get(item.stock_id) || [])].filter(date => date > start && date <= end);
      const reasons = [];
      if (!start || !end || !Number.isInteger(horizon) || horizon <= 0) reasons.push('invalid_evaluation_boundary');
      else if (dates.length < horizon) reasons.push('fewer_distinct_observed_dates_than_horizon');
      if (!run.snapshot_sha256) reasons.push('missing_snapshot_hash');
      if (reasons.length) findings.push({ run_id: run.id, recommendation_id: item.id, observed_dates: dates.length, horizon_days: horizon, reasons });
    }
  }
  return {
    read_only: true, price_rows: prices.length, invalid_dates: invalidDates, invalid_prices: invalidPrices,
    duplicate_groups: [...groups.values()].filter(group => group.count > 1).length,
    extra_duplicate_rows: [...groups.values()].reduce((sum, group) => sum + group.count - 1, 0),
    conflicting_duplicate_groups: [...groups.values()].filter(group => group.closes.size > 1).length,
    runs: runs.length, legacy_runs_without_hash: legacyRuns, measured_outcomes: measured, findings,
    limitations: 'Distinct observed dates combine sources and intervals for screening only; no provider compatibility, official session calendar, gap completeness or snapshot integrity is certified. No outcomes are modified.',
  };
}

module.exports = { auditRecommendationPrices, sessionDate };
