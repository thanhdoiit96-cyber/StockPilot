'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const models = require('../src/models');
const CacheService = require('../src/services/cacheService');
const { ingestVnstockEod } = require('../src/market-data/vnstockEodIngestion');

async function main() {
  const symbols = process.env.VNSTOCK_SYMBOLS?.split(',');
  const marketBySymbol = JSON.parse(process.env.VNSTOCK_MARKETS || '{}');
  const report = await ingestVnstockEod({
    ...models,
    cacheService: new CacheService(models.sequelize),
    symbols,
    from: process.env.VNSTOCK_FROM,
    to: process.env.VNSTOCK_TO,
    source: process.env.VNSTOCK_SOURCE || 'vci',
    marketBySymbol,
    python: process.env.VNSTOCK_PYTHON,
    bridge: process.env.VNSTOCK_BRIDGE,
    cwd: process.env.VNSTOCK_CWD,
    env: { VNSTOCK_PROJECT_DIR: process.env.VNSTOCK_PROJECT_DIR || '.vnstock' }
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.rejected ? 2 : 0;
}

main().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
}).finally(async () => {
  await models.sequelize.close();
});
