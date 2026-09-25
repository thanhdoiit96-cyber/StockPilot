'use strict';
const { buildRiskPlan } = require('./riskPlan');

function backtestRiskPlan(rows, horizon = 20) {
  const prices = rows.map(row => Number(row.close ?? row.price)).filter(Number.isFinite);
  const outcomes = []; let eligible = 0;
  for (let i = 20; i + horizon < prices.length; i += 1) {
    const plan = buildRiskPlan(prices.slice(0, i).map(close => ({ close })), { status: 'pass' });
    if (plan.status !== 'available') continue;
    eligible += 1; const future = prices.slice(i, i + horizon); const hitStop = future.some(value => value <= plan.horizons.short_term.stop_loss); const hitTarget = future.some(value => value >= plan.horizons.short_term.take_profit);
    outcomes.push(hitStop && !hitTarget ? 'stop_loss' : hitTarget ? 'take_profit' : 'neither');
  }
  const counts = { take_profit: outcomes.filter(value => value === 'take_profit').length, stop_loss: outcomes.filter(value => value === 'stop_loss').length, neither: outcomes.filter(value => value === 'neither').length };
  return { horizon_days: horizon, eligible, outcomes: counts, rates: Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, eligible ? Number((value / eligible * 100).toFixed(2)) : 0])), methodology: 'walk-forward, không nhìn trước dữ liệu; không phải dự báo lợi nhuận' };
}

module.exports = { backtestRiskPlan };
