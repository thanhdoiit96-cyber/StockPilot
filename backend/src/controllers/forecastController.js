'use strict';
const express = require('express');
const path = require('path');
const { readForecastPreviewArtifact } = require('../services/forecastPreviewArtifact');
const { fetchCurrentForecastData } = require('../services/forecastCurrentData');
const { buildLiveForecastPreview } = require('../services/forecastLivePreview');
const { evaluateLiveForecast } = require('../services/forecastLiveEvaluation');
const { createVnstockBridgeFetcher } = require('../market-data/adapters/vnstockBridgeFetcher');
const VnstockEodAdapter = require('../market-data/adapters/VnstockEodAdapter');
const models = require('../models');
const { listForecastSnapshots, buildStoredForecastHistory, readForecastCursor, listForecastCohortRows, buildForecastCohortSummary } = require('../services/forecastSnapshotStore');
const { listLiveCohortRows, buildLiveCohortSummary } = require('../services/forecastLiveCohort');
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

function createForecastController({ env = process.env, loadArtifact, listHistory = options => listForecastSnapshots(models, options), listCohorts = options => listForecastCohortRows(models, options), listLiveCohorts = options => listLiveCohortRows(models, options), currentDataFetcher } = {}) {
  const router = express.Router();
  const load = loadArtifact || (() => readForecastPreviewArtifact(path.resolve(env.FORECAST_PREVIEW_ARTIFACT || path.resolve(__dirname, '../../evidence/forecast-research-preview.json'))));
  const livePreviewEnabled = env.NODE_ENV === 'development' && env.FORECAST_LIVE_PREVIEW === 'true';
  const buildCurrentDataFetcher = () => {
    if (typeof currentDataFetcher === 'function') return currentDataFetcher;
    const bridgeFetcher = createVnstockBridgeFetcher({
      python: env.VNSTOCK_PYTHON || 'python',
      bridge: env.VNSTOCK_EOD_BRIDGE || path.resolve(__dirname, '../../scripts/vnstock_eod_bridge.py'),
      cwd: path.resolve(__dirname, '../..'),
      env: { VNSTOCK_SOURCE: env.VNSTOCK_SOURCE || 'vci' },
      // Current-data preview is a bounded development probe. Keep it independent
      // from an optional long-running worker so a stale worker cannot hide fresh EOD.
      disableWorker: true
    });
    const adapter = new VnstockEodAdapter({
      fetcher: bridgeFetcher,
      market: env.VNSTOCK_MARKET || 'HOSE',
      source: env.VNSTOCK_SOURCE || 'vci',
      license: env.VNSTOCK_LICENSE || 'personal_research_only',
      licenseUrl: env.VNSTOCK_LICENSE_URL || 'https://vnstocks.com/onboard/giay-phep-su-dung',
      now: () => new Date()
    });
    return async ({ symbols = [], minimumSamples = 1, maximumStalenessDays = Number(env.FORECAST_MAX_STALENESS_DAYS || 7), localOnly = true, license = env.VNSTOCK_LICENSE || '' } = {}) => fetchCurrentForecastData({
      adapter,
      symbols,
      now: new Date(),
      maximumStalenessDays,
      localOnly,
      license,
      minimumSamples,
      coverage: Number(env.FORECAST_CURRENT_DATA_COVERAGE || 1),
      evidenceIntegrity: true
    });
  };
  router.get('/research-preview', (req, res) => {
    if (env.NODE_ENV !== 'development' || env.FORECAST_RESEARCH_PREVIEW === 'false') {
      return res.status(404).json({ success: false, code: 'FORECAST_PREVIEW_DISABLED', message: 'Forecast research preview is not available.' });
    }
    const horizon = Number(req.query.horizon);
    if (![1, 5].includes(horizon)) return res.status(400).json({ success: false, code: 'INVALID_HORIZON', message: 'horizon must be 1 or 5.' });
    try {
      const artifact = load();
      const preview = artifact.payload.previews.find(item => item.horizon_sessions === horizon);
      const requestedAsOf = typeof req.query.as_of === 'string' && req.query.as_of ? req.query.as_of : preview?.as_of;
      const data = !preview || requestedAsOf !== preview.as_of
        ? { version: 'forecast_presentation_v1', status: 'unavailable', reason: 'prediction_not_in_artifact', horizon_sessions: horizon, as_of: requestedAsOf || null }
        : { ...preview, artifact_sha256: artifact.sha256, artifact_generated_at: artifact.payload.generated_at,
          artifact_freshness: artifact.freshness, artifact_age_seconds: artifact.age_seconds, artifact_stale_after_seconds: artifact.payload.stale_after_seconds };
      res.set('Cache-Control', 'no-store');
      return res.json({ success: true, data });
    } catch (_) {
      return res.status(503).json({ success: false, code: 'FORECAST_PREVIEW_UNAVAILABLE', message: 'Forecast research preview artifact is unavailable.' });
    }
  });
  router.get('/current-preview', async (req, res) => {
    if (!livePreviewEnabled) return res.status(404).json({ success: false, code: 'FORECAST_PREVIEW_DISABLED', message: 'Forecast live preview is not available.' });
    const symbolList = typeof req.query.symbols === 'string' && req.query.symbols ? req.query.symbols : (env.FORECAST_CURRENT_SYMBOLS || 'FPT,HPG,VHM');
    const symbols = symbolList.split(',').map(item => item.trim()).filter(Boolean);
    if (!symbols.length) return res.status(400).json({ success: false, code: 'INVALID_SYMBOLS', message: 'symbols must include at least one symbol.' });
    try {
      const fetcher = buildCurrentDataFetcher();
      const data = await fetcher({
        symbols,
        minimumSamples: Number(req.query.minimum_samples || 1),
        maximumStalenessDays: Number(req.query.maximum_staleness_days || env.FORECAST_MAX_STALENESS_DAYS || 7),
        localOnly: true,
        license: req.query.license || env.VNSTOCK_LICENSE || ''
      });
      res.set('Cache-Control', 'no-store');
      return res.json({
        success: true,
        data: {
          version: 'forecast_current_data_v1',
          status: 'current_data_preview',
          mode: 'live',
          source: 'live_provider',
          provider: data.provider,
          as_of: data.as_of,
          fetched_at: data.fetched_at,
          staleness_days: data.staleness_days,
          maximum_staleness_days: data.maximum_staleness_days,
          live: true,
          synthetic: false,
          research_only: false,
          market_accuracy_verified: false,
          rows: data.rows,
          notice: 'Current-data preview only; market accuracy remains unverified until the live gate passes and provider evidence is validated.'
        }
      });
    } catch (error) {
      return res.status(503).json({
        success: false,
        code: error.code || 'CURRENT_FORECAST_UNAVAILABLE',
        message: error.message || 'Current data forecast is unavailable.'
      });
    }
  });
  router.get('/live-preview', async (req, res) => {
    if (!livePreviewEnabled) return res.status(404).json({ success: false, code: 'FORECAST_PREVIEW_DISABLED', message: 'Forecast live preview is not available.' });
    const symbolList = typeof req.query.symbols === 'string' && req.query.symbols ? req.query.symbols : (env.FORECAST_CURRENT_SYMBOLS || 'FPT,HPG,VHM');
    const symbols = symbolList.split(',').map(item => item.trim()).filter(Boolean);
    const horizon = Number(req.query.horizon || 5);
    if (![1, 5].includes(horizon)) return res.status(400).json({ success: false, code: 'INVALID_HORIZON', message: 'horizon must be 1 or 5.' });
    try {
      const fetcher = buildCurrentDataFetcher();
      const currentData = await fetcher({
        symbols,
        minimumSamples: Number(req.query.minimum_samples || 1),
        maximumStalenessDays: Number(req.query.maximum_staleness_days || env.FORECAST_MAX_STALENESS_DAYS || 7),
        localOnly: true,
        license: req.query.license || env.VNSTOCK_LICENSE || ''
      });
      const preview = buildLiveForecastPreview({ currentData, horizon, modelVersion: req.query.model_version || 'softmax-v1' });
      res.set('Cache-Control', 'no-store');
      return res.json({
        success: true,
        data: {
          version: preview.version,
          status: preview.status,
          mode: preview.mode,
          source: preview.source,
          provider: preview.provider,
          as_of: preview.as_of,
          fetched_at: preview.fetched_at,
          staleness_days: preview.staleness_days,
          maximum_staleness_days: preview.maximum_staleness_days,
          live: preview.live,
          synthetic: preview.synthetic,
          research_only: preview.research_only,
          market_accuracy_verified: preview.market_accuracy_verified,
          horizon_sessions: preview.horizon_sessions,
          model_version: preview.model_version,
          probabilities: preview.probabilities,
          breadth_target: preview.breadth_target,
          model: preview.model,
          gate: preview.gate,
          notice: preview.notice,
          current_data: preview.current_data
        }
      });
    } catch (error) {
      return res.status(503).json({
        success: false,
        code: error.code || 'LIVE_FORECAST_PREVIEW_UNAVAILABLE',
        message: error.message || 'Live forecast preview is unavailable.'
      });
    }
  });
  router.get('/live-evaluation', async (req, res) => {
    if (!livePreviewEnabled) return res.status(404).json({ success: false, code: 'FORECAST_PREVIEW_DISABLED', message: 'Forecast live preview is not available.' });
    const symbolList = typeof req.query.symbols === 'string' && req.query.symbols ? req.query.symbols : (env.FORECAST_CURRENT_SYMBOLS || 'FPT,HPG,VHM');
    const symbols = symbolList.split(',').map(item => item.trim()).filter(Boolean);
    const horizon = Number(req.query.horizon || 5);
    if (![1, 5].includes(horizon)) return res.status(400).json({ success: false, code: 'INVALID_HORIZON', message: 'horizon must be 1 or 5.' });
    try {
      const fetcher = buildCurrentDataFetcher();
      const currentData = await fetcher({
        symbols,
        minimumSamples: Number(req.query.minimum_samples || 1),
        maximumStalenessDays: Number(req.query.maximum_staleness_days || env.FORECAST_MAX_STALENESS_DAYS || 7),
        localOnly: true,
        license: req.query.license || env.VNSTOCK_LICENSE || ''
      });
      const evaluation = evaluateLiveForecast({ currentData, horizon, modelVersion: req.query.model_version || 'softmax-v1' });
      res.set('Cache-Control', 'no-store');
      return res.json({
        success: true,
        data: {
          version: evaluation.version,
          status: evaluation.status,
          mode: evaluation.mode,
          source: evaluation.source,
          provider: evaluation.provider,
          as_of: evaluation.as_of,
          fetched_at: evaluation.fetched_at,
          staleness_days: evaluation.staleness_days,
          maximum_staleness_days: evaluation.maximum_staleness_days,
          live: evaluation.live,
          synthetic: evaluation.synthetic,
          research_only: evaluation.research_only,
          market_accuracy_verified: evaluation.market_accuracy_verified,
          horizon_sessions: evaluation.horizon_sessions,
          model_version: evaluation.model_version,
          decision: evaluation.decision,
          summary: evaluation.summary,
          shadow_evaluation: evaluation.shadow_evaluation,
          live_activation: evaluation.live_activation,
          gate: evaluation.gate,
          notice: evaluation.notice
        }
      });
    } catch (error) {
      return res.status(503).json({
        success: false,
        code: error.code || 'LIVE_EVALUATION_UNAVAILABLE',
        message: error.message || 'Live evaluation is unavailable.'
      });
    }
  });
  router.get('/live-cohort', async (req, res) => {
    if (!livePreviewEnabled) return res.status(404).json({ success: false, code: 'FORECAST_PREVIEW_DISABLED', message: 'Forecast live preview is not available.' });
    const horizon = Number(req.query.horizon), minimumSamples = req.query.minimum_samples === undefined ? 20 : Number(req.query.minimum_samples);
    if (![1, 5].includes(horizon) || !Number.isInteger(minimumSamples) || minimumSamples < 2 || minimumSamples > 1000) return res.status(400).json({ success:false, code:'INVALID_FORECAST_COHORT_QUERY', message:'Invalid live forecast cohort query.' });
    try { const data = buildLiveCohortSummary(await listLiveCohorts({ horizon }), { horizon, minimumSamples }); res.set('Cache-Control','no-store'); return res.json({ success:true, data }); }
    catch (_) { return res.status(503).json({ success:false, code:'FORECAST_COHORTS_UNAVAILABLE', message:'Current-data forecast cohort is unavailable.' }); }
  });
  router.get('/research-history', async (req, res) => {
    if (env.NODE_ENV !== 'development' || env.FORECAST_RESEARCH_PREVIEW === 'false') return res.status(404).json({ success: false, code: 'FORECAST_PREVIEW_DISABLED', message: 'Forecast research preview is not available.' });
    const horizon = Number(req.query.horizon);
    if (![1, 5].includes(horizon)) return res.status(400).json({ success: false, code: 'INVALID_HORIZON', message: 'horizon must be 1 or 5.' });
    const limit = req.query.limit === undefined ? 7 : Number(req.query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) return res.status(400).json({ success: false, code: 'INVALID_FORECAST_HISTORY_QUERY', message: 'limit must be an integer from 1 to 50.' });
    const cursor = typeof req.query.cursor === 'string' && req.query.cursor ? req.query.cursor : null;
    if (cursor) try { readForecastCursor(cursor); } catch (_) { return res.status(400).json({ success: false, code: 'INVALID_FORECAST_HISTORY_CURSOR', message: 'cursor is invalid.' }); }
    try {
      const history = buildStoredForecastHistory(await listHistory({ horizon, limit, cursor }), horizon);
      res.set('Cache-Control', 'no-store');
      return res.json({ success: true, data: history });
    } catch (_) {
      return res.status(503).json({ success: false, code: 'FORECAST_HISTORY_UNAVAILABLE', message: 'Forecast research history artifact is unavailable.' });
    }
  });
  router.get('/research-cohorts', async (req, res) => {
    if (env.NODE_ENV !== 'development' || env.FORECAST_RESEARCH_PREVIEW === 'false') return res.status(404).json({ success: false, code: 'FORECAST_PREVIEW_DISABLED', message: 'Forecast research preview is not available.' });
    const horizon = req.query.horizon === undefined ? undefined : Number(req.query.horizon);
    const modelVersion = typeof req.query.model_version === 'string' && req.query.model_version ? req.query.model_version : undefined;
    const dateFrom = typeof req.query.date_from === 'string' && req.query.date_from ? req.query.date_from : undefined;
    const dateTo = typeof req.query.date_to === 'string' && req.query.date_to ? req.query.date_to : undefined;
    const minimumSamples = req.query.minimum_samples === undefined ? 20 : Number(req.query.minimum_samples);
    if ((horizon !== undefined && ![1, 5].includes(horizon)) || (modelVersion && modelVersion.length > 120) || !Number.isInteger(minimumSamples) || minimumSamples < 2 || minimumSamples > 1000
      || (dateFrom && !validDate(dateFrom)) || (dateTo && !validDate(dateTo)) || (dateFrom && dateTo && dateFrom > dateTo))
      return res.status(400).json({ success: false, code: 'INVALID_FORECAST_COHORT_QUERY', message: 'Invalid forecast cohort query.' });
    try {
      const data = buildForecastCohortSummary(await listCohorts({ horizon, modelVersion, dateFrom, dateTo }), { minimumSamples });
      res.set('Cache-Control', 'no-store');
      return res.json({ success: true, data });
    } catch (_) {
      return res.status(503).json({ success: false, code: 'FORECAST_COHORTS_UNAVAILABLE', message: 'Forecast research cohorts are unavailable.' });
    }
  });
  return router;
}
module.exports = createForecastController;
