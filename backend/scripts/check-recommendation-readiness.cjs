'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const models = require('../src/models');

async function main() {
  const stocks = await models.Stock.findAll({ attributes: ['id', 'code'], order: [['code', 'ASC']] });
  const prices = await models.StockPrice.findAll({ attributes: ['stock_id', 'observed_at'], order: [['observed_at', 'ASC']] });
  const counts = new Map();
  const dates = new Set();
  for (const row of prices) {
    const stockId = String(row.stock_id);
    counts.set(stockId, (counts.get(stockId) || 0) + 1);
    if (row.observed_at) dates.add(new Date(row.observed_at).toISOString().slice(0, 10));
  }
  const coverage = stocks.map(stock => ({ code: stock.code, observations: counts.get(String(stock.id)) || 0, eligible: (counts.get(String(stock.id)) || 0) >= 50 }));
  const eligible = coverage.filter(item => item.eligible);
  const latestRun = await models.RecommendationRun.findOne({ order: [['created_at', 'DESC']] });
  const report = {
    generated_at: new Date().toISOString(),
    universe_size: stocks.length,
    price_rows: prices.length,
    distinct_sessions: dates.size,
    eligible_symbols: eligible.length,
    minimum_observations: 50,
    ready_for_recommendations: eligible.length > 0,
    latest_run: latestRun ? { id: latestRun.id, as_of: latestRun.as_of, selected_count: latestRun.selected_count, model: latestRun.model } : null,
    coverage
  };
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.ready_for_recommendations ? 0 : 2;
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; }).finally(async () => { await models.sequelize.close(); });
