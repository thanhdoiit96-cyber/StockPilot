'use strict';
const express = require('express');
const { forecastResearchFixture } = require('../services/forecastResearchFixture');
const { replayForecastDataset } = require('../services/forecastReplay');
const { buildForecastPresentation } = require('../services/forecastPresentation');

function createForecastController({ env = process.env, buildReport = () => replayForecastDataset(forecastResearchFixture()) } = {}) {
  const router = express.Router();
  let report;
  router.get('/research-preview', (req, res) => {
    if (env.NODE_ENV !== 'development' || env.FORECAST_RESEARCH_PREVIEW === 'false') {
      return res.status(404).json({ success: false, code: 'FORECAST_PREVIEW_DISABLED', message: 'Forecast research preview is not available.' });
    }
    const horizon = Number(req.query.horizon);
    if (![1, 5].includes(horizon)) return res.status(400).json({ success: false, code: 'INVALID_HORIZON', message: 'horizon must be 1 or 5.' });
    try {
      report ||= buildReport();
      const model = report.models?.find(item => item.horizon_sessions === horizon);
      const available = model?.folds.flatMap(fold => fold.predictions || []).map(item => item.session).sort() || [];
      const asOf = typeof req.query.as_of === 'string' && req.query.as_of ? req.query.as_of : available.at(-1);
      const data = buildForecastPresentation({ report, horizon, asOf });
      res.set('Cache-Control', 'no-store');
      return res.json({ success: true, data });
    } catch (_) {
      return res.status(503).json({ success: false, code: 'FORECAST_PREVIEW_UNAVAILABLE', message: 'Forecast research preview could not be generated.' });
    }
  });
  return router;
}
module.exports = createForecastController;
