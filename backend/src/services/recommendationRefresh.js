'use strict';
const { eodCoverage } = require('../market-data/eodCoverage');
const { generateRecommendationSnapshot, vietnamSessionDate } = require('./recommendationPersistence');

async function refreshRecommendations({ models, now = new Date(), env = process.env } = {}) {
  if (env.RECOMMENDATIONS_AFTER_INGEST !== 'true') return { status: 'disabled' };
  const session = vietnamSessionDate(now);
  const coverage = await eodCoverage(models.sequelize, session, null, { minimumHistoricalSessions: 50 });
  if (!coverage.symbols || coverage.missing_symbols.length) return { status: 'skipped_incomplete_recommendation_coverage', expected_session: session, covered_symbols: coverage.covered, missing_symbols: coverage.missing_symbols.length, minimum_historical_sessions: 50, coverage };
  const result = await generateRecommendationSnapshot({ ...models, provider: env.RECOMMENDATION_PROVIDER || 'vnstock', useIntradayReference: false, limit: Math.min(5, Math.max(3, Number(env.RECOMMENDATION_LIMIT || 5))), horizonDays: Number(env.RECOMMENDATION_HORIZON || 20), now });
  return { ...result, expected_session: session, coverage };
}
module.exports = { refreshRecommendations };
