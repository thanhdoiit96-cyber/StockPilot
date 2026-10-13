'use strict';
const path = require('path');
const VnstockEodAdapter = require('../src/market-data/adapters/VnstockEodAdapter');
const { createVnstockBridgeFetcher } = require('../src/market-data/adapters/vnstockBridgeFetcher');
const { fetchCurrentForecastData } = require('../src/services/forecastCurrentData');
const { buildLiveForecastPreview } = require('../src/services/forecastLivePreview');

function parseSymbols(value) {
  if (!value) return ['FPT', 'HPG', 'VHM'];
  return String(value)
    .split(',')
    .map(item => item.trim().toUpperCase())
    .filter(Boolean);
}

async function main() {
  const args = process.argv.slice(2);
  const argMap = {};
  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (current.startsWith('--')) {
      const next = index + 1 < args.length && !args[index + 1].startsWith('--') ? args[index + 1] : '';
      argMap[current.replace(/^--/, '')] = next;
      if (next) index += 1;
    }
  }

  const symbols = parseSymbols(argMap.symbols || process.env.FORECAST_CURRENT_SYMBOLS || process.env.VNSTOCK_SYMBOLS);
  const horizon = Number(argMap.horizon || process.env.FORECAST_LIVE_HORIZON || 5);
  const fetcher = createVnstockBridgeFetcher({
    disableWorker: true,
    python: process.env.VNSTOCK_PYTHON || 'python',
    bridge: process.env.VNSTOCK_EOD_BRIDGE || path.resolve(__dirname, 'vnstock_eod_bridge.py'),
    cwd: path.resolve(__dirname, '..'),
    env: { VNSTOCK_SOURCE: process.env.VNSTOCK_SOURCE || 'vci' }
  });
  const adapter = new VnstockEodAdapter({
    fetcher,
    market: process.env.VNSTOCK_MARKET || 'HOSE',
    source: process.env.VNSTOCK_SOURCE || 'vci',
    license: process.env.VNSTOCK_LICENSE || 'personal_research_only',
    licenseUrl: process.env.VNSTOCK_LICENSE_URL || 'https://vnstocks.com/onboard/giay-phep-su-dung',
    now: () => new Date()
  });

  const currentData = await fetchCurrentForecastData({
    adapter,
    symbols,
    now: new Date(),
    maximumStalenessDays: Number(argMap.maximum_staleness_days || process.env.FORECAST_MAX_STALENESS_DAYS || 7),
    localOnly: true,
    license: process.env.VNSTOCK_LICENSE || '',
    minimumSamples: Number(process.env.FORECAST_MINIMUM_SAMPLES || 1),
    coverage: Number(process.env.FORECAST_CURRENT_DATA_COVERAGE || 1),
    evidenceIntegrity: true
  });

  const preview = buildLiveForecastPreview({
    currentData,
    horizon,
    modelVersion: argMap.model_version || process.env.FORECAST_MODEL_VERSION || 'softmax-v1'
  });

  console.log(JSON.stringify({
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
    model: preview.model,
    gate: preview.gate,
    notice: preview.notice,
    current_data: preview.current_data
  }, null, 2));
}

main().catch(error => {
  console.error('Live forecast preview failed:', error.code || error.message);
  process.exitCode = 2;
});
