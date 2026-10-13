'use strict';
const path = require('path');
const VnstockEodAdapter = require('../src/market-data/adapters/VnstockEodAdapter');
const { createVnstockBridgeFetcher } = require('../src/market-data/adapters/vnstockBridgeFetcher');
const { fetchCurrentForecastData } = require('../src/services/forecastCurrentData');
const { evaluateLiveForecast } = require('../src/services/forecastLiveEvaluation');

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
    minimumSamples: Number(process.env.FORECAST_MINIMUM_SAMPLES || 20),
    coverage: Number(process.env.FORECAST_CURRENT_DATA_COVERAGE || 1),
    evidenceIntegrity: true
  });

  const evaluation = evaluateLiveForecast({ currentData, horizon, modelVersion: argMap.model_version || process.env.FORECAST_MODEL_VERSION || 'softmax-v1' });

  console.log(JSON.stringify({
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
  }, null, 2));
}

main().catch(error => {
  console.error('Live forecast evaluation failed:', error.code || error.message);
  process.exitCode = 2;
});
