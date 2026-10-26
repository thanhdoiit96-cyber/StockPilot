'use strict';

const { vietnamSessionDate, latestEodSession, verifyRecommendationSnapshot } = require('./recommendationPersistence');
const { lifecycleReadiness } = require('./recommendationLifecycleReadiness');
const { eodCoverage } = require('../market-data/eodCoverage');

async function readRecommendationLifecycleCheckpoint({ StockPrice, RecommendationRun, sequelize, provider = 'vnstock', horizonDays = 20, now = new Date() } = {}) {
  const expectedSession = vietnamSessionDate(now);
  const [latestPrice, run] = await Promise.all([
    StockPrice.findOne({ attributes: ['observed_at'], where: { provider, interval: '1d' }, order: [['observed_at', 'DESC']] }),
    RecommendationRun.findOne({ where: { as_of: expectedSession, provider, model: 'short_term_rule_v2', horizon_days: Number(horizonDays) }, order: [['created_at', 'DESC']], include: [{ association: 'recommendations', include: [{ association: 'stock', attributes: ['code'] }] }] }),
  ]);
  const latestSession = latestPrice ? latestEodSession([latestPrice.toJSON ? latestPrice.toJSON() : latestPrice]) : null;
  const integrity = run?.snapshot_sha256 ? verifyRecommendationSnapshot(run) : null;
  const readiness = lifecycleReadiness({ expectedSession, latestEodSession: latestSession, run, integrity });
  if (readiness.can_generate) {
    const db = sequelize || require('../models').sequelize;
    const coverage = db?.query ? await eodCoverage(db, expectedSession, null, { minimumHistoricalSessions: 50 }) : null;
    if (!coverage || !coverage.symbols || coverage.missing_symbols.length) return { provider, ...readiness, status: 'awaiting_coverage', can_generate: false, coverage };
    return { provider, ...readiness, coverage };
  }
  return { provider, ...readiness };
}

module.exports = { readRecommendationLifecycleCheckpoint };
