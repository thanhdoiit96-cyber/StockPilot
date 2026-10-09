'use strict';

const cron = require('node-cron');
const models = require('../models');
const { readRecommendationLifecycleCheckpoint } = require('../services/recommendationLifecycleCheckpoint');

function startRecommendationLifecycleCheckpointJob({ logger = console, schedule = process.env.RECOMMENDATION_LIFECYCLE_CHECK_CRON || '40 16 * * 1-5', readCheckpoint = () => readRecommendationLifecycleCheckpoint({ StockPrice: models.StockPrice, RecommendationRun: models.RecommendationRun, provider: process.env.RECOMMENDATION_PROVIDER || 'vnstock', horizonDays: Number(process.env.RECOMMENDATION_HORIZON || 20) }) } = {}) {
  if (process.env.RECOMMENDATION_LIFECYCLE_CHECK_ENABLED === 'false') return null;
  return cron.schedule(schedule, async () => {
    try {
      const report = await readCheckpoint();
      logger.info(`[Recommendations lifecycle checkpoint] ${JSON.stringify(report)}`);
    } catch (error) {
      logger.error(`[Recommendations lifecycle checkpoint] ${error.stack || error.message}`);
    }
  }, { timezone: process.env.RECOMMENDATION_LIFECYCLE_CHECK_TIMEZONE || 'Asia/Ho_Chi_Minh' });
}

module.exports = startRecommendationLifecycleCheckpointJob;
