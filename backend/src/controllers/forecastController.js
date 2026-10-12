'use strict';
const express = require('express');
const path = require('path');
const { readForecastPreviewArtifact } = require('../services/forecastPreviewArtifact');

function createForecastController({ env = process.env, loadArtifact } = {}) {
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
  return router;
}
module.exports = createForecastController;
