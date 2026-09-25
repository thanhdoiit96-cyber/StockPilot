'use strict';

const VnstockEodAdapter = require('../src/market-data/adapters/VnstockEodAdapter');
const { createVnstockBridgeFetcher } = require('../src/market-data/adapters/vnstockBridgeFetcher');
const { runCoverageProbe } = require('../src/market-data/coverageProbe');

const symbols = (process.env.VNSTOCK_SYMBOLS || 'FPT,VCB,HPG,PVS,SHS,CEO,BSR,OIL,VGI').split(',');
const source = process.env.VNSTOCK_SOURCE || 'vci';
const marketBySymbol = { FPT: 'HOSE', VCB: 'HOSE', HPG: 'HOSE', PVS: 'HNX', SHS: 'HNX', CEO: 'HNX', BSR: 'UPCOM', OIL: 'UPCOM', VGI: 'UPCOM' };
const adapter = new VnstockEodAdapter({ source, marketBySymbol, fetcher: createVnstockBridgeFetcher({ env: { VNSTOCK_PROJECT_DIR: process.env.VNSTOCK_PROJECT_DIR || '.vnstock' } }) });

runCoverageProbe({
  adapter,
  symbols,
  from: process.env.VNSTOCK_FROM || '2026-09-11',
  to: process.env.VNSTOCK_TO || '2026-09-17',
  minCoverage: Number(process.env.VNSTOCK_MIN_COVERAGE || 0.95),
  minSessions: Number(process.env.VNSTOCK_MIN_SESSIONS || 5)
}).then(report => {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.status === 'pass' ? 0 : 2;
}).catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
