'use strict';

const cron = require('node-cron');
const models = require('../models');
const { evaluateLatestRecommendations } = require('../services/recommendationPersistence');

/**
 * Re-evaluates the latest recommendation run as future market sessions arrive.
 * Pending recommendations remain pending until their configured horizon is available.
 */
function startRecommendationEvaluationJob({ logger = console, schedule = process.env.RECOMMENDATION_EVALUATION_CRON || '45 16 * * 1-5' } = {}) {
  if (process.env.RECOMMENDATION_EVALUATION_ENABLED !== 'true') return null;
  const task = cron.schedule(schedule, async () => {
    try {
      const report = await evaluateLatestRecommendations(models);
      logger.info(`[Recommendations evaluation] ${JSON.stringify(report)}`);
    } catch (error) {
      logger.error(`[Recommendations evaluation] ${error.stack || error.message}`);
    }
  }, { timezone: process.env.RECOMMENDATION_EVALUATION_TIMEZONE || 'Asia/Ho_Chi_Minh' });
  return task;
}

module.exports = startRecommendationEvaluationJob;
