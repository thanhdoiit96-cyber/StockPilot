'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const models = require('../src/models');
const VnstockEodAdapter = require('../src/market-data/adapters/VnstockEodAdapter');
const { createVnstockBridgeFetcher } = require('../src/market-data/adapters/vnstockBridgeFetcher');
const { reconcileMarketData } = require('../src/market-data/marketDataReconciliation');

const symbols = (process.env.VNSTOCK_SYMBOLS || 'FPT,VCB,HPG,PVS,SHS,CEO,BSR,OIL,VGI').split(',');
const sourceA = process.env.VNSTOCK_SOURCE_A || 'vci';
const sourceB = process.env.VNSTOCK_SOURCE_B || 'kbs';
const marketBySymbol = { FPT: 'HOSE', VCB: 'HOSE', HPG: 'HOSE', PVS: 'HNX', SHS: 'HNX', CEO: 'HNX', BSR: 'UPCOM', OIL: 'UPCOM', VGI: 'UPCOM' };
const adapter = source => new VnstockEodAdapter({ source, priceScale: Number(process.env.VNSTOCK_PRICE_SCALE || 1000), marketBySymbol, fetcher: createVnstockBridgeFetcher({ env: { VNSTOCK_PROJECT_DIR: process.env.VNSTOCK_PROJECT_DIR || '.vnstock' } }) });

reconcileMarketData({
  adapterA: adapter(sourceA), adapterB: adapter(sourceB), symbols,
  from: process.env.VNSTOCK_FROM || '2026-09-11', to: process.env.VNSTOCK_TO || '2026-09-17',
  closeTolerance: Number(process.env.RECONCILIATION_CLOSE_TOLERANCE || 0.001),
  volumeTolerance: Number(process.env.RECONCILIATION_VOLUME_TOLERANCE || 0.02),
  ReconciliationRun: models.MarketDataReconciliationRun
}).then(report => {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.status === 'pass' ? 0 : 2;
}).catch(error => { console.error(error.stack || error); process.exitCode = 1; }).finally(async () => { await models.sequelize.close(); });
