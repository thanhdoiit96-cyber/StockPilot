'use strict';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const models = require('../src/models');
const VnstockForeignFlowAdapter = require('../src/market-data/adapters/VnstockForeignFlowAdapter');
const { createVnstockForeignFlowFetcher } = require('../src/market-data/adapters/vnstockBridgeFetcher');
const { ingestForeignFlow } = require('../src/market-data/foreignFlowIngestion');

async function main() {
  if (process.env.VNSTOCK_FOREIGN_FLOW_ENABLED !== 'true') throw new Error('foreign-flow ingestion disabled; set VNSTOCK_FOREIGN_FLOW_ENABLED=true explicitly');
  const symbols = String(process.env.VNSTOCK_FOREIGN_FLOW_SYMBOLS || '').split(',').map(value => value.trim().toUpperCase()).filter(Boolean);
  if (!symbols.length || symbols.length > 50) throw new Error('VNSTOCK_FOREIGN_FLOW_SYMBOLS must contain 1-50 symbols');
  const to = process.env.VNSTOCK_FOREIGN_FLOW_TO || new Date().toISOString().slice(0, 10);
  const from = process.env.VNSTOCK_FOREIGN_FLOW_FROM || to;
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000;
  if (!Number.isFinite(days) || days < 0 || days > 366) throw new Error('foreign-flow window must be valid and no longer than 366 days');
  const adapter = new VnstockForeignFlowAdapter({ source: process.env.VNSTOCK_FOREIGN_FLOW_SOURCE || 'vci', fetcher: createVnstockForeignFlowFetcher({ python: process.env.VNSTOCK_PYTHON, bridge: process.env.VNSTOCK_FOREIGN_FLOW_BRIDGE, cwd: process.env.VNSTOCK_CWD, disableWorker: process.env.VNSTOCK_FOREIGN_FLOW_DIRECT === 'true', env: { VNSTOCK_PROJECT_DIR: process.env.VNSTOCK_PROJECT_DIR || '.vnstock' } }) });
  const records = await adapter.fetch({ symbols, from, to });
  const report = await ingestForeignFlow({ records, ...models });
  process.stdout.write(`${JSON.stringify({ ...report, provider: 'vnstock', source: adapter.source, symbols, window: { from, to } }, null, 2)}\n`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => models.sequelize.close());
