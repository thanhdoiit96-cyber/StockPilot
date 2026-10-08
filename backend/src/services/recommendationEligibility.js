'use strict';

const { Op } = require('sequelize');
const { recommendationSnapshotHash } = require('./recommendationPersistence');
const { sessionDate } = require('./recommendationPriceAudit');

const measured = item => ['positive', 'negative', 'flat'].includes(item.outcome);
const positivePrice = value => value != null && Number.isFinite(Number(value)) && Number(value) > 0;

// A read-time eligibility view. Never rewrite the stored outcome or trust the
// evaluator's development verification bypass as reporting evidence.
function assessRun(run, prices = []) {
  const plain = run.toJSON ? run.toJSON() : run;
  const integrity = Boolean(plain.snapshot_sha256 && plain.snapshot_sha256 === recommendationSnapshotHash(plain));
  const start = sessionDate(plain.as_of);
  return { ...plain, recommendations: (plain.recommendations || []).map(item => {
    const reasons = [];
    if (!measured(item)) return { ...item, statistics_eligible: false, measurement_status: 'pending', exclusion_reasons: [] };
    if (!integrity) reasons.push('snapshot_unverified');
    const end = sessionDate(item.evaluated_at);
    const horizon = Number(item.horizon_days);
    const groups = new Map();
    for (const row of prices) {
      if (row.stock_id !== item.stock_id) continue;
      const day = sessionDate(row.observed_at);
      if (row.stock_id !== item.stock_id || !day || !start || day <= start || !end || day > end) continue;
      if (!plain.provider || row.provider !== plain.provider || row.interval !== '1d') continue;
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day).push(row);
    }
    const days = [...groups.keys()].sort();
    if (!start || !end || !Number.isInteger(horizon) || horizon <= 0) reasons.push('invalid_evaluation_boundary');
    else if (days.length < horizon) reasons.push('insufficient_observed_sessions');
    else if (days[horizon - 1] !== end) reasons.push('evaluation_date_mismatch');
    const rows = days.slice(0, horizon).flatMap(day => groups.get(day));
    const compatible = rows.length > 0 && rows.every(row => row.currency === 'VND' && row.price_unit === 'VND_PER_SHARE' && row.is_adjusted === false && positivePrice(row.close ?? row.price));
    if (!compatible) reasons.push('price_evidence_unavailable');
    if (days.slice(0, horizon).some(day => new Set(groups.get(day).map(row => Number(row.close ?? row.price))).size > 1)) reasons.push('conflicting_session_prices');
    const target = groups.get(end)?.[0];
    const value = item.forward_return_pct;
    if (!positivePrice(item.entry_price) || value == null || value === '' || !Number.isFinite(Number(value))) reasons.push('invalid_return');
    else if (target && positivePrice(target.close ?? target.price)) {
      const expected = Number(((Number(target.close ?? target.price) / Number(item.entry_price) - 1) * 100).toFixed(4));
      const outcome = expected > 0 ? 'positive' : expected < 0 ? 'negative' : 'flat';
      if (Math.abs(expected - Number(value)) > 0.0001 || outcome !== item.outcome) reasons.push('return_mismatch');
    }
    return { ...item, statistics_eligible: reasons.length === 0, measurement_status: reasons.length ? 'excluded' : 'eligible', exclusion_reasons: reasons, observed_session_count: days.length };
  }) };
}

async function assessRuns(runs, StockPrice) {
  const items = runs.flatMap(run => (run.recommendations || []).filter(measured));
  if (!items.length) return runs.map(run => assessRun(run));
  const dates = runs.map(run => sessionDate(run.as_of)).filter(Boolean).sort();
  const ends = items.map(item => sessionDate(item.evaluated_at)).filter(Boolean).sort();
  const prices = dates.length && ends.length ? await StockPrice.findAll({
    attributes: ['stock_id', 'provider', 'interval', 'observed_at', 'close', 'price', 'currency', 'price_unit', 'is_adjusted'],
    where: { stock_id: { [Op.in]: [...new Set(items.map(item => item.stock_id).filter(Boolean))] }, observed_at: { [Op.gte]: new Date(`${dates[0]}T00:00:00+07:00`), [Op.lt]: new Date(new Date(`${ends.at(-1)}T00:00:00+07:00`).getTime() + 86400000) } }, raw: true,
  }) : [];
  return runs.map(run => assessRun(run, prices));
}

module.exports = { assessRun, assessRuns };
