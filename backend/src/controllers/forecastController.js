'use strict';
const express = require('express');
const path = require('path');
const { readForecastPreviewArtifact } = require('../services/forecastPreviewArtifact');
const models = require('../models');
const { listForecastSnapshots, buildStoredForecastHistory, readForecastCursor, listForecastCohortRows, buildForecastCohortSummary } = require('../services/forecastSnapshotStore');
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

function createForecastController({ env = process.env, loadArtifact, listHistory = options => listForecastSnapshots(models, options), listCohorts = options => listForecastCohortRows(models, options) } = {}) {
  const router = express.Router();
  const load = loadArtifact || (() => readForecastPreviewArtifact(path.resolve(env.FORECAST_PREVIEW_ARTIFACT || path.resolve(__dirname, '../../evidence/forecast-research-preview.json'))));
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
