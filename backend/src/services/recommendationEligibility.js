'use strict';

const { Op } = require('sequelize');
const { recommendationSnapshotHash } = require('./recommendationPersistence');
const { sessionDate } = require('./recommendationPriceAudit');
const { observationWindow } = require('./recommendationSessions');

const measured = item => ['positive', 'negative', 'flat'].includes(item.outcome);
const positivePrice = value => value != null && Number.isFinite(Number(value)) && Number(value) > 0;

// A read-time eligibility view. Never rewrite the stored outcome or trust the
// evaluator's development verification bypass as reporting evidence.
function assessRun(run, prices = []) {
  const plain = run.toJSON ? run.toJSON() : run;
  const integrity = Boolean(plain.snapshot_sha256 && plain.snapshot_sha256 === recommendationSnapshotHash(plain));
  return { ...plain, recommendations: (plain.recommendations || []).map(item => {
    const reasons = [];
    if (!measured(item)) return { ...item, statistics_eligible: false, measurement_status: 'pending', exclusion_reasons: [] };
    if (!integrity) reasons.push('snapshot_unverified');
    const end = sessionDate(item.evaluated_at);
    if (!end) reasons.push('invalid_evaluation_boundary');
    const horizon = Number(item.horizon_days);
    const window = observationWindow({ rows: prices.filter(row => row.stock_id === item.stock_id), asOf: plain.as_of, provider: plain.provider, horizonDays: horizon, through: item.evaluated_at });
    const days = window.days;
    reasons.push(...window.reasons);
    const target = window.target;
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
