'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { RecommendationRun, Stock, StockPrice } = require('../models');
const { SavedRecommendation } = require('../models');
const requireAuth = require('../middleware/requireAuth');
const { buildPersonalizedRecommendations, DEFAULT_CRITERIA } = require('../services/recommendationEngine');
const { createVnstockIntradayFetcher } = require('../market-data/adapters/vnstockBridgeFetcher');
const { createQuoteLoader } = require('../services/quoteLoader');
const loadRecommendationQuotes = createQuoteLoader(createVnstockIntradayFetcher({ retries: 1, timeoutMs: 12000 }), { upstream: 'VCI', ttlMs: 10000 });
const { httpError } = require('../utils/httpError');

router.get('/saved', requireAuth, async (req, res) => {
  try {
    const rows = await SavedRecommendation.findAll({ where: { user_id: req.user.sub }, order: [['created_at', 'DESC']], limit: 20 });
    return res.json({ success: true, data: rows.map(row => ({ id: row.id, criteria: row.criteria, result: row.result, createdAt: row.created_at })) });
  } catch (error) { console.error('[Recommendation Controller] Error fetching saved proposals:', error); return httpError(res, 500, 'recommendation_saved_list_failed', 'Error fetching saved recommendations'); }
});

router.post('/saved', requireAuth, async (req, res) => {
  try {
    const criteria = req.body?.criteria && typeof req.body.criteria === 'object' ? req.body.criteria : {};
    const result = req.body?.result && typeof req.body.result === 'object' ? req.body.result : {};
    const row = await SavedRecommendation.create({ user_id: req.user.sub, criteria, result });
    return res.status(201).json({ success: true, data: { id: row.id, criteria: row.criteria, result: row.result, createdAt: row.created_at } });
  } catch (error) { console.error('[Recommendation Controller] Error saving proposal:', error); return httpError(res, 500, 'recommendation_saved_create_failed', 'Error saving recommendation'); }
});

router.delete('/saved/:id', requireAuth, async (req, res) => {
  try {
    const deleted = await SavedRecommendation.destroy({ where: { id: req.params.id, user_id: req.user.sub } });
    if (!deleted) return httpError(res, 404, 'recommendation_saved_not_found', 'Saved recommendation not found');
    return res.status(204).end();
  } catch (error) { console.error('[Recommendation Controller] Error deleting saved proposal:', error); return httpError(res, 500, 'recommendation_saved_delete_failed', 'Error deleting recommendation'); }
});

function deriveCalibration(runs) {
  const keys = Object.keys(DEFAULT_CRITERIA);
  const observations = [];
  for (const run of runs) for (const item of run.recommendations || []) {
    const value = Number(item.forward_return_pct);
    const parts = item.rationale?.score_parts;
    if (item.outcome !== 'pending' && Number.isFinite(value) && parts) observations.push({ value, parts });
  }
  const calibration = Object.fromEntries(keys.map(key => [key, 1]));
  const evidence = Object.fromEntries(keys.map(key => [key, { samples: 0, adjustment: 1 }]));
  for (const key of keys) {
    const rows = observations.filter(item => Number.isFinite(Number(item.parts[key])));
    evidence[key].samples = rows.length;
    if (rows.length < 15) continue;
    const meanScore = rows.reduce((sum, item) => sum + Number(item.parts[key]), 0) / rows.length;
    const meanReturn = rows.reduce((sum, item) => sum + item.value, 0) / rows.length;
    const covariance = rows.reduce((sum, item) => sum + (Number(item.parts[key]) - meanScore) * (item.value - meanReturn), 0) / rows.length;
    const variance = rows.reduce((sum, item) => sum + (Number(item.parts[key]) - meanScore) ** 2, 0) / rows.length;
    const association = variance ? covariance / Math.sqrt(variance) : 0;
    calibration[key] = Math.max(0.75, Math.min(1.25, Number((1 + association * 0.04).toFixed(3))));
    evidence[key].adjustment = calibration[key];
  }
  return { calibration, evidence, sample_count: observations.length, minimum_samples: 15, status: observations.length >= 15 ? 'calibrated' : 'insufficient_history' };
}

function hasForwardReturn(value) {
  return value !== null && value !== '' && Number.isFinite(Number(value));
}

function buildHistorySummary(items = []) {
  const measured = items.filter(item => item.outcome && item.outcome !== 'pending' && hasForwardReturn(item.forward_return_pct));
  const returns = measured.map(item => Number(item.forward_return_pct));
  const positive = measured.filter(item => item.outcome === 'positive').length;
  const negative = measured.filter(item => item.outcome === 'negative').length;
  const flat = measured.filter(item => item.outcome === 'flat').length;
  return {
    measured_count: measured.length,
    pending_count: items.filter(item => !item.outcome || item.outcome === 'pending' || !hasForwardReturn(item.forward_return_pct)).length,
    positive_count: positive,
    negative_count: negative,
    flat_count: flat,
    hit_rate_pct: measured.length ? Number((positive / measured.length * 100).toFixed(2)) : null,
    average_forward_return_pct: returns.length ? Number((returns.reduce((sum, value) => sum + value, 0) / returns.length).toFixed(4)) : null,
  };
}

function percentile(sortedValues, probability) {
  if (!sortedValues.length) return null;
  const index = (sortedValues.length - 1) * probability;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const value = lower === upper ? sortedValues[lower] : sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (index - lower);
  return Number(value.toFixed(4));
}

function buildEvaluationCohorts(runs = [], minimumSamples = 15) {
  const buckets = new Map();
  for (const run of runs) {
    const model = run.model || 'unknown';
    const horizonDays = Number(run.horizon_days) || null;
    const key = `${model}::${horizonDays || 'unknown'}`;
    if (!buckets.has(key)) buckets.set(key, { model, horizon_days: horizonDays, runs_count: 0, selected_count: 0, items: [] });
    const bucket = buckets.get(key);
    bucket.runs_count += 1;
    bucket.selected_count += Number(run.selected_count || (run.recommendations || []).length || 0);
    bucket.items.push(...(run.recommendations || []));
  }
  return [...buckets.values()].map(bucket => {
    const summary = buildHistorySummary(bucket.items);
    const returns = bucket.items.filter(item => item.outcome && item.outcome !== 'pending' && hasForwardReturn(item.forward_return_pct)).map(item => Number(item.forward_return_pct)).sort((a, b) => a - b);
    return {
      model: bucket.model,
      horizon_days: bucket.horizon_days,
      runs_count: bucket.runs_count,
      selected_count: bucket.selected_count,
      ...summary,
      return_distribution: returns.length ? {
        minimum_pct: returns[0], p25_pct: percentile(returns, 0.25), median_pct: percentile(returns, 0.5), p75_pct: percentile(returns, 0.75), maximum_pct: returns[returns.length - 1],
      } : null,
      minimum_samples: minimumSamples,
      status: summary.measured_count >= minimumSamples ? 'ready_for_comparison' : 'insufficient_samples',
    };
  }).sort((left, right) => right.measured_count - left.measured_count || String(left.model).localeCompare(String(right.model)));
}

function buildSectorEvaluationCohorts(runs = [], minimumSamples = 15) {
  const buckets = new Map();
  let excludedWithoutSnapshotTaxonomy = 0;
  runs.forEach((run, runIndex) => (run.recommendations || []).forEach(item => {
    const industry = typeof item.rationale?.snapshot_taxonomy?.industry === 'string' ? item.rationale.snapshot_taxonomy.industry.trim() : '';
    if (!industry) { excludedWithoutSnapshotTaxonomy += 1; return; }
    const model = run.model || 'unknown';
    const horizonDays = Number(run.horizon_days) || null;
    const key = `${model}::${horizonDays || 'unknown'}::${industry}`;
    if (!buckets.has(key)) buckets.set(key, { model, horizon_days: horizonDays, industry, run_keys: new Set(), items: [] });
    const bucket = buckets.get(key);
    bucket.run_keys.add(run.id || `run-${runIndex}`);
    bucket.items.push(item);
  }));
  const cohorts = [...buckets.values()].map(bucket => {
    const summary = buildHistorySummary(bucket.items);
    return {
      model: bucket.model, horizon_days: bucket.horizon_days, industry: bucket.industry, runs_count: bucket.run_keys.size,
      selected_count: bucket.items.length, ...summary, minimum_samples: minimumSamples,
      status: summary.measured_count >= minimumSamples ? 'ready_for_comparison' : 'insufficient_samples',
    };
  }).sort((left, right) => right.measured_count - left.measured_count || left.industry.localeCompare(right.industry));
  return { cohorts, excluded_without_snapshot_taxonomy: excludedWithoutSnapshotTaxonomy };
}

function readSnapshotRisk(runId) {
  const evidencePath = path.resolve(__dirname, '../../evidence/recommendation-monitor-latest.json');
  try {
    if (!fs.existsSync(evidencePath)) return null;
    const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
    if (evidence.run?.id !== runId) return null;
    return { concentration_warning: evidence.status?.concentration_warning || null, max_sector_share_pct: evidence.status?.max_sector_share_pct ?? null, measured: evidence.status?.measured ?? 0, pending: evidence.status?.pending ?? 0 };
  } catch (_) { return null; }
}

router.get('/readiness', async (req, res) => {
  try {
    const stocks = await Stock.findAll({ attributes: ['id', 'code'], order: [['code', 'ASC']] });
    const prices = await StockPrice.findAll({ attributes: ['stock_id', 'observed_at'] });
    const counts = new Map();
    const sessions = new Set();
    for (const row of prices) {
      const id = String(row.stock_id);
      counts.set(id, (counts.get(id) || 0) + 1);
      if (row.observed_at) sessions.add(new Date(row.observed_at).toISOString().slice(0, 10));
    }
    const coverage = stocks.map(stock => ({ code: stock.code, observations: counts.get(String(stock.id)) || 0, eligible: (counts.get(String(stock.id)) || 0) >= 50 }));
    const eligible = coverage.filter(item => item.eligible);
    return res.json({ success: true, data: { universe_size: stocks.length, price_rows: prices.length, distinct_sessions: sessions.size, minimum_observations: 50, eligible_symbols: eligible.length, ready_for_recommendations: eligible.length > 0, coverage } });
  } catch (error) { console.error('[Recommendation Controller] Error fetching readiness:', error); return httpError(res, 500, 'recommendation_readiness_failed', 'Error fetching recommendation readiness'); }
});

router.post('/personalized', async (req, res) => {
  try {
    const stocks = await Stock.findAll({ order: [['code', 'ASC']] });
    const prices = await StockPrice.findAll({ order: [['observed_at', 'ASC'], ['id', 'ASC']], limit: 200000 });
    const byStock = new Map();
    for (const row of prices) { const item = row.toJSON ? row.toJSON() : row; const id = String(item.stock_id); if (!byStock.has(id)) byStock.set(id, []); byStock.get(id).push(item); }
    const runs = await RecommendationRun.findAll({ limit: 40, order: [['created_at', 'DESC']], include: [{ association: 'recommendations', attributes: ['outcome', 'forward_return_pct', 'rationale'] }] });
    const learning = deriveCalibration(runs);
    const stockData = stocks.map(item => item.toJSON());
    const baseline = buildPersonalizedRecommendations({ stocks: stockData, priceRowsByStock: byStock, criteria: req.body?.criteria || {}, calibration: learning.calibration, limit: req.body?.limit || 10, horizonDays: req.body?.horizon_days || 20 });
    let currentQuotes = {};
    try { currentQuotes = await loadRecommendationQuotes(baseline.map(item => item.symbol)); } catch (quoteError) { console.warn(`[Recommendation Controller] intraday reference fallback: ${quoteError.message}`); }
    const recommendations = buildPersonalizedRecommendations({ stocks: stockData, priceRowsByStock: byStock, currentQuotes, criteria: req.body?.criteria || {}, calibration: learning.calibration, limit: req.body?.limit || 10, horizonDays: req.body?.horizon_days || 20 });
    return res.json({ success: true, data: { recommendations, criteria: req.body?.criteria || DEFAULT_CRITERIA, learning, eligible_count: stocks.filter(item => (byStock.get(String(item.id)) || []).length >= 50).length, model: 'personalized_rule_v1', generated_at: new Date().toISOString() } });
  } catch (error) { console.error('[Recommendation Controller] Error generating personalized recommendations:', error); return httpError(res, 500, 'recommendation_personalized_failed', 'Không thể tạo đề xuất theo tiêu chí hiện tại'); }
});

router.get('/latest', async (req, res) => {
  try {
    const run = await RecommendationRun.findOne({ order: [['created_at', 'DESC']], include: [{ association: 'recommendations', include: [{ association: 'stock', attributes: ['id', 'code', 'name', 'industry'] }] }] });
    if (!run) return res.json({ success: true, data: { status: 'unavailable', recommendations: [] } });
    const calibrationRuns = await RecommendationRun.findAll({ limit: 40, order: [['created_at', 'DESC']], include: [{ association: 'recommendations', attributes: ['outcome', 'forward_return_pct', 'rationale'] }] });
    const learning = deriveCalibration(calibrationRuns);
    return res.json({ success: true, data: { status: run.status, run: { id: run.id, as_of: run.as_of, horizon_days: run.horizon_days, provider: run.provider, model: run.model, universe_size: run.universe_size, selected_count: run.selected_count, created_at: run.created_at }, risk: readSnapshotRisk(run.id), learning, recommendations: (run.recommendations || []).map(item => ({ id: item.id, rank: item.rank, score: Number(item.score), horizon_days: item.horizon_days, entry_price: item.entry_price == null ? null : Number(item.entry_price), rationale: item.rationale, evaluated_at: item.evaluated_at, forward_return_pct: item.forward_return_pct == null ? null : Number(item.forward_return_pct), outcome: item.outcome, stock: item.stock })) } });
  } catch (error) { console.error('[Recommendation Controller] Error fetching latest run:', error); return httpError(res, 500, 'recommendation_latest_failed', 'Error fetching recommendations'); }
});

router.get('/history', async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)));
    const runs = await RecommendationRun.findAll({ limit, order: [['created_at', 'DESC']], include: [{ association: 'recommendations', attributes: ['outcome', 'forward_return_pct'] }] });
    return res.json({ success: true, data: runs.map(run => ({
      id: run.id, as_of: run.as_of, created_at: run.created_at, horizon_days: run.horizon_days,
      provider: run.provider, model: run.model, universe_size: run.universe_size, selected_count: run.selected_count,
      ...buildHistorySummary(run.recommendations || []),
    })) });
  } catch (error) { console.error('[Recommendation Controller] Error fetching history:', error); return httpError(res, 500, 'recommendation_history_failed', 'Error fetching recommendation history'); }
});

router.get('/history/summary', async (req, res) => {
  try {
    const runs = await RecommendationRun.findAll({
      limit: 250,
      order: [['created_at', 'DESC']],
      include: [{ association: 'recommendations', attributes: ['outcome', 'forward_return_pct', 'rationale'] }],
    });
    const minimumSamples = 15;
    const sector = buildSectorEvaluationCohorts(runs, minimumSamples);
    return res.json({ success: true, data: { minimum_samples: minimumSamples, cohorts: buildEvaluationCohorts(runs, minimumSamples), sector_cohorts: sector.cohorts, sector_taxonomy: { source: 'snapshot_taxonomy', excluded_without_snapshot_taxonomy: sector.excluded_without_snapshot_taxonomy } } });
  } catch (error) { console.error('[Recommendation Controller] Error fetching history summary:', error); return httpError(res, 500, 'recommendation_history_failed', 'Error fetching recommendation history'); }
});

router.get('/history/:id', async (req, res) => {
  try {
    const run = await RecommendationRun.findOne({
      where: { id: req.params.id },
      include: [{ association: 'recommendations', include: [{ association: 'stock', attributes: ['id', 'code', 'name', 'industry'] }] }],
    });
    if (!run) return httpError(res, 404, 'recommendation_history_not_found', 'Recommendation snapshot not found');
    const items = (run.recommendations || []).map(item => {
      const hasReturn = hasForwardReturn(item.forward_return_pct);
      return {
      id: item.id, rank: item.rank, score: Number(item.score), horizon_days: item.horizon_days,
      entry_price: item.entry_price == null ? null : Number(item.entry_price), rationale: item.rationale,
      evaluated_at: item.evaluated_at,
      forward_return_pct: hasReturn ? Number(item.forward_return_pct) : null,
      outcome: hasReturn && item.outcome && item.outcome !== 'pending' ? item.outcome : 'pending', stock: item.stock,
    };
    });
    return res.json({ success: true, data: {
      id: run.id, as_of: run.as_of, created_at: run.created_at, horizon_days: run.horizon_days,
      provider: run.provider, model: run.model, universe_size: run.universe_size, selected_count: run.selected_count, status: run.status,
      summary: buildHistorySummary(items), recommendations: items,
    } });
  } catch (error) { console.error('[Recommendation Controller] Error fetching history report:', error); return httpError(res, 500, 'recommendation_history_failed', 'Error fetching recommendation history'); }
});

module.exports = router;
module.exports.deriveCalibration = deriveCalibration;
module.exports.buildHistorySummary = buildHistorySummary;
module.exports.buildEvaluationCohorts = buildEvaluationCohorts;
module.exports.buildSectorEvaluationCohorts = buildSectorEvaluationCohorts;
