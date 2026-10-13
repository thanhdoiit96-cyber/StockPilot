'use strict';
const path = require('path');
const models = require('../src/models');
const VnstockEodAdapter = require('../src/market-data/adapters/VnstockEodAdapter');
const { createVnstockBridgeFetcher } = require('../src/market-data/adapters/vnstockBridgeFetcher');
const { fetchCurrentForecastData } = require('../src/services/forecastCurrentData');
const { appendLiveShadowOutcome } = require('../src/services/forecastLiveShadowEvaluator');

(async () => {
  if (process.env.NODE_ENV === 'production' || process.env.FORECAST_LIVE_PREVIEW !== 'true') throw new Error('Live shadow evaluation is development-only');
  const snapshots = await models.ForecastSnapshot.findAll({ where: { synthetic: false, research_only: false }, include: [{ model: models.ForecastOutcomeEvent, as: 'outcome', required: false }], order: [['as_of','ASC']] });
  const pending = snapshots.filter(item => !item.get({ plain: true }).outcome), symbols = [...new Set(pending.flatMap(item => item.payload?.provenance?.symbols || []))];
  if (!pending.length) return console.log(JSON.stringify({ status: 'nothing_pending', measured: 0 }, null, 2));
  const fetcher = createVnstockBridgeFetcher({ python: process.env.VNSTOCK_PYTHON || 'python', bridge: process.env.VNSTOCK_EOD_BRIDGE || path.resolve(__dirname, 'vnstock_eod_bridge.py'), cwd: path.resolve(__dirname, '..'), disableWorker: true });
  const adapter = new VnstockEodAdapter({ fetcher, source: process.env.VNSTOCK_SOURCE || 'vci', now: () => new Date() });
  const currentData = await fetchCurrentForecastData({ adapter, symbols, now: new Date(), maximumStalenessDays: 7, localOnly: true, minimumSamples: 1, coverage: 1, evidenceIntegrity: true });
  const results = [];
  for (const snapshot of pending) { const result = await appendLiveShadowOutcome(models, snapshot, currentData.rows); results.push({ id: snapshot.id, horizon_sessions: snapshot.horizon_sessions, status: result.status, reason: result.reason || null, sessions_observed: result.sessions_observed }); }
  console.log(JSON.stringify({ status: 'live_shadow_evaluated', as_of: currentData.as_of, results }, null, 2));
})().catch(error => { console.error('Live shadow evaluation failed:', error.code || error.message); process.exitCode = 2; }).finally(() => models.sequelize.close());
