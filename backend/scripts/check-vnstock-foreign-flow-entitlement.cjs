'use strict';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { classifyVnstockEntitlement } = require('../src/services/vnstockEntitlement');

async function main() {
  const apiKey = String(process.env.VNSTOCK_API_KEY || '').trim();
  if (!apiKey) throw new Error('VNSTOCK_API_KEY is not configured');
  const url = new URL('https://vnstocks.com/api/vnstock/license/verify');
  url.searchParams.set('api_key', apiKey); url.searchParams.set('device_id', 'foreign-flow-preflight');
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Vnstock license verification failed with HTTP ${response.status}`);
  const result = classifyVnstockEntitlement(await response.json());
  process.stdout.write(`${JSON.stringify({ version: 'vnstock_foreign_flow_entitlement_v1', ...result }, null, 2)}\n`);
  process.exitCode = result.status === 'eligible' ? 0 : 2;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
