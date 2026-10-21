'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const models = require('../src/models');
const { recommendationUniverseReadiness } = require('../src/services/recommendationUniverseReadiness');

async function main() {
  const provider = process.env.RECOMMENDATION_PROVIDER || 'vnstock';
  const stocks = await models.Stock.findAll({ where: { listing_status: 'listed' }, attributes: ['id', 'code'], order: [['code', 'ASC']] });
  const prices = await models.StockPrice.findAll({ where: { provider, interval: '1d' }, attributes: ['stock_id', 'observed_at', 'close', 'price'], order: [['observed_at', 'ASC']] });
  const readiness = recommendationUniverseReadiness({ stocks, prices, minimumHistoricalSessions: 50 });
  const latestRun = await models.RecommendationRun.findOne({ order: [['created_at', 'DESC']] });
  const report = {
    generated_at: new Date().toISOString(),
    provider,
    ...readiness,
    latest_run: latestRun ? { id: latestRun.id, as_of: latestRun.as_of, selected_count: latestRun.selected_count, model: latestRun.model } : null,
  };
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.ready_for_recommendations ? 0 : 2;
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; }).finally(async () => { await models.sequelize.close(); });
