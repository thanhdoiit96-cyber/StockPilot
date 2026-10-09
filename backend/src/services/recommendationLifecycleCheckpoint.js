'use strict';

const { vietnamSessionDate, latestEodSession, verifyRecommendationSnapshot } = require('./recommendationPersistence');
const { lifecycleReadiness } = require('./recommendationLifecycleReadiness');

async function readRecommendationLifecycleCheckpoint({ StockPrice, RecommendationRun, provider = 'vnstock', horizonDays = 20, now = new Date() } = {}) {
  const expectedSession = vietnamSessionDate(now);
  const [latestPrice, run] = await Promise.all([
    StockPrice.findOne({ attributes: ['observed_at'], where: { provider, interval: '1d' }, order: [['observed_at', 'DESC']] }),
    RecommendationRun.findOne({ where: { as_of: expectedSession, provider, model: 'short_term_rule_v2', horizon_days: Number(horizonDays) }, order: [['created_at', 'DESC']], include: [{ association: 'recommendations', include: [{ association: 'stock', attributes: ['code'] }] }] }),
  ]);
  const latestSession = latestPrice ? latestEodSession([latestPrice.toJSON ? latestPrice.toJSON() : latestPrice]) : null;
  const integrity = run?.snapshot_sha256 ? verifyRecommendationSnapshot(run) : null;
  return { provider, ...lifecycleReadiness({ expectedSession, latestEodSession: latestSession, run, integrity }) };
}

module.exports = { readRecommendationLifecycleCheckpoint };
