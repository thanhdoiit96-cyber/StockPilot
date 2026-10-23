'use strict';
const path = require('path');
const models = require('../src/models');
const VnstockEodAdapter = require('../src/market-data/adapters/VnstockEodAdapter');
const { createVnstockBridgeFetcher } = require('../src/market-data/adapters/vnstockBridgeFetcher');
const { fetchCurrentForecastData } = require('../src/services/forecastCurrentData');
const { buildLiveForecastPreview } = require('../src/services/forecastLivePreview');
const { createLiveShadowSnapshot } = require('../src/services/forecastLiveShadow');
const { buildContemporaneousLiveBaseline } = require('../src/services/forecastLiveBaseline');

(async () => {
  const symbols = String(process.env.FORECAST_CURRENT_SYMBOLS || 'FPT,HPG,VHM').split(',').map(value => value.trim().toUpperCase()).filter(Boolean);
  const license = process.env.VNSTOCK_LICENSE || 'personal_research_only';
  const fetcher = createVnstockBridgeFetcher({ python: process.env.VNSTOCK_PYTHON || 'python', bridge: process.env.VNSTOCK_EOD_BRIDGE || path.resolve(__dirname, 'vnstock_eod_bridge.py'),
    cwd: path.resolve(__dirname, '..'), env: { VNSTOCK_SOURCE: process.env.VNSTOCK_SOURCE || 'vci' }, disableWorker: true });
  const adapter = new VnstockEodAdapter({ fetcher, market: process.env.VNSTOCK_MARKET || 'HOSE', source: process.env.VNSTOCK_SOURCE || 'vci', license,
    licenseUrl: process.env.VNSTOCK_LICENSE_URL || 'https://vnstocks.com/onboard/giay-phep-su-dung', now: () => new Date() });
  const currentData = await fetchCurrentForecastData({ adapter, symbols, now: new Date(), maximumStalenessDays: Number(process.env.FORECAST_MAX_STALENESS_DAYS || 7),
    localOnly: true, license: process.env.VNSTOCK_LICENSE || '', minimumSamples: 21, coverage: 1, evidenceIntegrity: true });
  const results = [];
  for (const horizon of [1, 5]) {
    const preview = buildLiveForecastPreview({ currentData, horizon, modelVersion: 'forecast_current_softmax_prototype_v2' });
    const baseline = buildContemporaneousLiveBaseline(currentData, horizon, { inputScope: preview.current_data.input_scope });
    const result = await createLiveShadowSnapshot({ models, preview, currentData, baseline, license, env: { ...process.env, NODE_ENV: 'development', FORECAST_LIVE_PREVIEW: 'true' } });
    results.push({ horizon_sessions: horizon, status: result.status, id: result.snapshot.id, as_of: result.snapshot.as_of, evidence_sha256: result.snapshot.payload.provenance.evidence_sha256 });
  }
  console.log(JSON.stringify({ status: 'live_shadow_materialized', provider: currentData.provider, as_of: currentData.as_of, synthetic: false, market_accuracy_verified: false, results }, null, 2));
})().catch(error => { console.error('Live shadow materialization failed:', error.code || error.message); process.exitCode = 2; }).finally(() => models.sequelize.close());
