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
  const actual = recommendationSnapshotHash(run);
  if (run.snapshot_sha256) return { valid: run.snapshot_sha256 === actual, expected: run.snapshot_sha256, actual, source: 'recommendation_runs.snapshot_sha256' };
  if (!fs.existsSync(evidencePath)) return { valid: false, reason: 'snapshot_monitor_evidence_missing', evidencePath };
  try {
    const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
    const expected = evidence.run?.id === run.id ? evidence.run.snapshot_sha256 : null;
    return { valid: Boolean(expected && expected === actual), expected, actual, evidencePath, source: 'legacy_monitor_evidence' };
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

function vietnamSessionDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function latestEodSession(rows = []) {
  return rows.reduce((latest, row) => {
    const value = row?.observed_at || row?.date;
    if (!value || Number.isNaN(Date.parse(value))) return latest;
    const date = new Date(value).toISOString().slice(0, 10);
    return !latest || date > latest ? date : latest;
  }, null);
}

async function generateRecommendationSnapshot({ Stock, StockPrice, ExternalFactor, RecommendationRun, Recommendation, provider = 'vnstock', limit = 5, horizonDays = 20, useIntradayReference = false, now = new Date() } = {}) {
  const stocks = await Stock.findAll({ order: [['code', 'ASC']] });
  const priceRowsByStock = await loadPriceRows({ StockPrice, stocks });
  const priceRows = [...priceRowsByStock.values()].flat();
  const expectedSession = vietnamSessionDate(now);
  const latestSession = latestEodSession(priceRows);
  if (latestSession !== expectedSession) return { status: 'eod_not_ready', expected_session: expectedSession, latest_eod_session: latestSession, universe_size: stocks.length };
  const stockData = stocks.map(item => item.toJSON());
  const externalFactors = await loadVerifiedExternalFactors({ ExternalFactor });
  const factorsByStock = groupExternalFactorsByStock(stockData, externalFactors);
  const baseline = buildShortTermRecommendations({ stocks: stockData, priceRowsByStock, externalFactorsByStock: factorsByStock, limit, horizonDays, asOf: new Date(`${latestSession}T00:00:00.000Z`) });
  let currentQuotes = {};
  if (useIntradayReference) { try { currentQuotes = await loadSnapshotQuotes(baseline.map(item => item.symbol)); } catch (error) { console.warn(`[Recommendation Persistence] intraday reference fallback: ${error.message}`); } }
  const recommendations = buildShortTermRecommendations({ stocks: stockData, priceRowsByStock, externalFactorsByStock: factorsByStock, currentQuotes, limit, horizonDays, asOf: new Date(`${latestSession}T00:00:00.000Z`) });
  const asOfDate = latestSession;
  const existing = await RecommendationRun.findOne({ where: { as_of: asOfDate, horizon_days: horizonDays, provider, model: 'short_term_rule_v2' }, order: [['created_at', 'DESC']] });
  if (existing) return { status: 'snapshot_exists', run_id: existing.id, as_of: asOfDate, universe_size: existing.universe_size, selected_count: existing.selected_count, model: existing.model, snapshot_sha256: existing.snapshot_sha256 || null };
  const run = await RecommendationRun.create({ as_of: asOfDate, horizon_days: horizonDays, provider, model: 'short_term_rule_v2', universe_size: stocks.length, selected_count: recommendations.length, status: 'completed' });
  const storedRecommendations = recommendations.map(item => ({ run_id: run.id, stock_id: item.stock_id, rank: item.rank, score: item.score, horizon_days: item.horizon_days, entry_price: item.entry_price, rationale: item.rationale, outcome: 'pending' }));
  if (storedRecommendations.length) await Recommendation.bulkCreate(storedRecommendations);
  // Hash the persisted representation, including joined stock codes and JSONB
  // key ordering. Spreading a Sequelize instance loses its attribute getters.
  const persisted = await RecommendationRun.findOne({
    where: { id: run.id },
    include: [{ association: 'recommendations', include: [{ association: 'stock', attributes: ['code'] }] }],
  });
  if (!persisted || persisted.recommendations?.length !== storedRecommendations.length) {
    throw new Error('Cannot seal incomplete recommendation snapshot');
  }
  const snapshot_sha256 = recommendationSnapshotHash(persisted);
  await RecommendationRun.update({ snapshot_sha256 }, { where: { id: run.id } });
  return { run_id: run.id, universe_size: stocks.length, selected_count: recommendations.length, symbols: recommendations.map(item => item.symbol), model: 'short_term_rule_v2', snapshot_sha256 };
}

async function evaluatePendingRecommendations({ StockPrice, RecommendationRun, Recommendation } = {}) {
  const runs = await RecommendationRun.findAll({ order: [['created_at', 'ASC']], include: [{ association: 'recommendations', include: [{ association: 'stock', attributes: ['code'] }] }] });
  const pendingRuns = runs.filter(run => (run.recommendations || []).some(item => !item.outcome || item.outcome === 'pending'));
  if (!pendingRuns.length) return { status: 'no_pending_recommendations', evaluated: 0, measured: 0, runs_considered: 0, runs_skipped_integrity: 0 };
  const priceRowsByStock = await loadPriceRows({ StockPrice });
  const report = { status: 'completed', evaluated: 0, measured: 0, positive: 0, runs_considered: pendingRuns.length, runs_evaluated: 0, runs_skipped_integrity: 0, skipped: [] };
  for (const run of pendingRuns) {
    const integrity = verifyRecommendationSnapshot(run);
    if (!integrity.valid) { report.runs_skipped_integrity += 1; report.skipped.push({ run_id: run.id, reason: integrity.reason || 'snapshot_integrity_failed' }); continue; }
    const pending = run.recommendations.filter(item => !item.outcome || item.outcome === 'pending').map(item => item.toJSON ? item.toJSON() : item);
    const evaluated = evaluateRecommendations({ recommendations: pending, priceRowsByStock, asOf: run.as_of, provider: run.provider });
    report.runs_evaluated += 1;
    report.evaluated += evaluated.length;
    for (const item of evaluated) {
      if (item.outcome === 'pending') continue;
      await Recommendation.update({ evaluated_at: item.evaluated_at, forward_return_pct: item.forward_return_pct, outcome: item.outcome }, { where: { id: item.id, outcome: 'pending' } });
      report.measured += 1;
      if (item.outcome === 'positive') report.positive += 1;
    }
  }
  report.hit_rate_pct = report.measured ? Number((report.positive / report.measured * 100).toFixed(2)) : null;
  return report;
}

async function evaluateLatestRecommendations(dependencies = {}) { return evaluatePendingRecommendations(dependencies); }

module.exports = { generateRecommendationSnapshot, evaluateLatestRecommendations, evaluatePendingRecommendations, recommendationSnapshotHash, verifyRecommendationSnapshot, vietnamSessionDate, latestEodSession };




