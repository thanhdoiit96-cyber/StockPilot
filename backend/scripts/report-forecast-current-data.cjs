'use strict';
const path = require('path');
const VnstockEodAdapter = require('../src/market-data/adapters/VnstockEodAdapter');
const { createVnstockBridgeFetcher } = require('../src/market-data/adapters/vnstockBridgeFetcher');
const { fetchCurrentForecastData } = require('../src/services/forecastCurrentData');

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
  const fetcher = createVnstockBridgeFetcher({
    python: process.env.VNSTOCK_PYTHON || 'python',
    bridge: process.env.VNSTOCK_EOD_BRIDGE || path.resolve(__dirname, '../../scripts/vnstock_eod_bridge.py'),
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

  const result = await fetchCurrentForecastData({
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

  console.log(JSON.stringify({
    version: 'forecast_current_data_v1',
    status: 'current_data_preview',
    mode: 'live',
    source: 'live_provider',
    provider: result.provider,
    as_of: result.as_of,
    fetched_at: result.fetched_at,
    staleness_days: result.staleness_days,
    maximum_staleness_days: result.maximum_staleness_days,
    live: true,
    synthetic: false,
    research_only: false,
    market_accuracy_verified: false,
    symbols,
    rows: result.rows,
    notice: 'Current-data preview only; provider and evidence validation remain required before any live forecast claim.'
  }, null, 2));
}

main().catch(error => {
  console.error('Current-data forecast preview failed:', error.code || error.message);
  process.exitCode = 2;
});
