'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { buildShortTermRecommendations, evaluateRecommendations } = require('./recommendationEngine');
const { createVnstockIntradayFetcher } = require('../market-data/adapters/vnstockBridgeFetcher');
const { createQuoteLoader } = require('./quoteLoader');
const loadSnapshotQuotes = createQuoteLoader(createVnstockIntradayFetcher({ retries: 1, timeoutMs: 12000 }), { upstream: 'VCI', ttlMs: 10000 });

function recommendationSnapshotHash(run) {
  const snapshot = (run.recommendations || []).map(item => ({ rank: item.rank, stock_id: item.stock_id, code: item.stock?.code, entry_price: item.entry_price == null ? null : Number(item.entry_price), horizon_days: item.horizon_days, rationale: item.rationale })).sort((a, b) => a.rank - b.rank);
  return crypto.createHash('sha256').update(JSON.stringify({ run_id: run.id, as_of: run.as_of, model: run.model, provider: run.provider, snapshot })).digest('hex');
}

function verifyRecommendationSnapshot(run, evidencePath = process.env.RECOMMENDATION_MONITOR_EVIDENCE || path.resolve(__dirname, '../../evidence/recommendation-monitor-latest.json')) {
  if (process.env.RECOMMENDATION_SNAPSHOT_VERIFY === 'false') return { valid: true, skipped: true };
  if (!fs.existsSync(evidencePath)) return { valid: false, reason: 'snapshot_monitor_evidence_missing', evidencePath };
  try {
    const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
    const expected = evidence.run?.id === run.id ? evidence.run.snapshot_sha256 : null;
    const actual = recommendationSnapshotHash(run);
    return { valid: Boolean(expected && expected === actual), expected, actual, evidencePath };
  } catch (error) {
    return { valid: false, reason: 'snapshot_monitor_evidence_invalid', error: error.message, evidencePath };
  }
}

async function loadPriceRows({ StockPrice, stocks }) {
  const rows = await StockPrice.findAll({ order: [['observed_at', 'ASC'], ['id', 'ASC']], limit: 200000 });
  const byStock = new Map();
  for (const row of rows) { if (!byStock.has(row.stock_id)) byStock.set(row.stock_id, []); byStock.get(row.stock_id).push(row.toJSON ? row.toJSON() : row); }
  return byStock;
}

async function loadVerifiedExternalFactors({ ExternalFactor } = {}) {
  if (!ExternalFactor?.findAll) return [];
  const rows = await ExternalFactor.findAll({ where: { status: 'verified' }, order: [['published_at', 'DESC'], ['id', 'DESC']] });
  return rows.map(row => row.toJSON ? row.toJSON() : row).filter(item => item.source && item.published_at);
}

function groupExternalFactorsByStock(stocks, factors) {
  const byStock = new Map();
  for (const stock of stocks) {
    byStock.set(stock.code, factors.filter(item => !item.symbol || item.symbol === stock.code));
  }
  return byStock;
}

async function generateRecommendationSnapshot({ Stock, StockPrice, ExternalFactor, RecommendationRun, Recommendation, provider = 'vnstock', limit = 5, horizonDays = 20, useIntradayReference = false } = {}) {
  const stocks = await Stock.findAll({ order: [['code', 'ASC']] });
  const priceRowsByStock = await loadPriceRows({ StockPrice, stocks });
  const stockData = stocks.map(item => item.toJSON());
  const externalFactors = await loadVerifiedExternalFactors({ ExternalFactor });
  const factorsByStock = groupExternalFactorsByStock(stockData, externalFactors);
  const baseline = buildShortTermRecommendations({ stocks: stockData, priceRowsByStock, externalFactorsByStock: factorsByStock, limit, horizonDays });
  let currentQuotes = {};
  if (useIntradayReference) { try { currentQuotes = await loadSnapshotQuotes(baseline.map(item => item.symbol)); } catch (error) { console.warn(`[Recommendation Persistence] intraday reference fallback: ${error.message}`); } }
  const recommendations = buildShortTermRecommendations({ stocks: stockData, priceRowsByStock, externalFactorsByStock: factorsByStock, currentQuotes, limit, horizonDays });
  const asOf = recommendations[0]?.as_of || new Date();
  const run = await RecommendationRun.create({ as_of: new Date(asOf).toISOString().slice(0, 10), horizon_days: horizonDays, provider, model: 'short_term_rule_v2', universe_size: stocks.length, selected_count: recommendations.length, status: 'completed' });
  if (recommendations.length) await Recommendation.bulkCreate(recommendations.map(item => ({ run_id: run.id, stock_id: item.stock_id, rank: item.rank, score: item.score, horizon_days: item.horizon_days, entry_price: item.entry_price, rationale: item.rationale, outcome: 'pending' })));
  return { run_id: run.id, universe_size: stocks.length, selected_count: recommendations.length, symbols: recommendations.map(item => item.symbol), model: 'short_term_rule_v2' };
}

async function evaluateLatestRecommendations({ StockPrice, RecommendationRun, Recommendation } = {}) {
  const run = await RecommendationRun.findOne({ order: [['created_at', 'DESC']], include: [{ association: 'recommendations', include: [{ association: 'stock', attributes: ['code'] }] }] });
  if (!run || !run.recommendations?.length) return { status: 'no_recommendations', evaluated: 0 };
  const integrity = verifyRecommendationSnapshot(run);
  if (!integrity.valid) return { status: 'snapshot_integrity_failed', run_id: run.id, evaluated: 0, integrity };
  const priceRowsByStock = await loadPriceRows({ StockPrice });
  const evaluated = evaluateRecommendations({ recommendations: run.recommendations.map(item => item.toJSON()), priceRowsByStock, asOf: run.as_of });
  for (const item of evaluated) await Recommendation.update({ evaluated_at: item.evaluated_at, forward_return_pct: item.forward_return_pct, outcome: item.outcome }, { where: { id: item.id } });
  const measured = evaluated.filter(item => item.outcome !== 'pending');
  const positive = measured.filter(item => item.outcome === 'positive').length;
  return { run_id: run.id, evaluated: evaluated.length, measured: measured.length, positive, hit_rate_pct: measured.length ? Number((positive / measured.length * 100).toFixed(2)) : null };
}

module.exports = { generateRecommendationSnapshot, evaluateLatestRecommendations, recommendationSnapshotHash, verifyRecommendationSnapshot };




