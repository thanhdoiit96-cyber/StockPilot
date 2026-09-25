'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const models = require('../src/models');
const VnstockEodAdapter = require('../src/market-data/adapters/VnstockEodAdapter');
const { createVnstockBridgeFetcher } = require('../src/market-data/adapters/vnstockBridgeFetcher');
const { EodhdEodAdapter, createEodhdFetcher, createEodhdCorporateActionFetcher } = require('../src/market-data/adapters/EodhdEodAdapter');
const { reconcileMarketData } = require('../src/market-data/marketDataReconciliation');

const symbols = (process.env.VNSTOCK_SYMBOLS || 'FPT,PVS,BSR').split(',');
const marketBySymbol = { FPT: 'HOSE', PVS: 'HNX', BSR: 'UPCOM' };
if (!process.env.EODHD_API_KEY) { console.error('EODHD_API_KEY is missing. Set it in backend/.env or the process environment.'); process.exitCode = 1; } else {
  const vnst = new VnstockEodAdapter({ source: 'vci', priceScale: Number(process.env.VNSTOCK_PRICE_SCALE || 1000), marketBySymbol, fetcher: createVnstockBridgeFetcher({ env: { VNSTOCK_PROJECT_DIR: process.env.VNSTOCK_PROJECT_DIR || '.vnstock' } }) });
  const eodhd = new EodhdEodAdapter({ marketBySymbol, fetcher: createEodhdFetcher(), corporateActionFetcher: createEodhdCorporateActionFetcher() });
  reconcileMarketData({ adapterA: vnst, adapterB: eodhd, symbols, from: process.env.VNSTOCK_FROM || '2026-09-11', to: process.env.VNSTOCK_TO || '2026-09-17', closeTolerance: Number(process.env.RECONCILIATION_CLOSE_TOLERANCE || 0.001), volumeTolerance: Number(process.env.RECONCILIATION_VOLUME_TOLERANCE || 0.02), volumePolicy: process.env.RECONCILIATION_VOLUME_POLICY || 'normalized', ReconciliationRun: models.MarketDataReconciliationRun })
    .then(report => { process.stdout.write(`${JSON.stringify(report, null, 2)}\n`); process.exitCode = report.status === 'pass' ? 0 : 2; })
    .catch(error => { console.error(error.stack || error); process.exitCode = 1; })
    .finally(async () => { await models.sequelize.close(); });
}
