'use strict';
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const { ExternalFactor, sequelize } = require('../src/models');
const { createWorldBankMacroAdapter, createGdeltNewsAdapter } = require('../src/services/externalFactorProviders');
const { persistExternalFactors } = require('../src/services/externalFactorPersistence');

async function main() {
  const provider = (process.env.EXTERNAL_FACTOR_PROVIDER || 'world-bank').toLowerCase();
  const adapter = provider === 'gdelt-2.1' ? createGdeltNewsAdapter() : createWorldBankMacroAdapter();
  const records = provider === 'gdelt-2.1'
    ? await adapter.fetch({ query: process.env.EXTERNAL_FACTOR_QUERY || 'Vietnam stock market', maxrecords: Number(process.env.EXTERNAL_FACTOR_MAX_RECORDS || 20) })
    : (await Promise.all((process.env.EXTERNAL_FACTOR_INDICATORS || process.env.EXTERNAL_FACTOR_INDICATOR || 'FP.CPI.TOTL.ZG').split(',').map(indicator => adapter.fetch({ country: process.env.EXTERNAL_FACTOR_COUNTRY || 'VNM', indicator: indicator.trim(), date: process.env.EXTERNAL_FACTOR_DATE || '' })))).flat();
  const result = await persistExternalFactors({ ExternalFactor }, records);
  console.log(JSON.stringify({ provider: adapter.provider, license: adapter.license, received: records.length, ...result }, null, 2));
  await sequelize.close();
}

main().catch(async error => { console.error(JSON.stringify({ success: false, message: error.message })); try { await sequelize.close(); } catch (_) {} process.exitCode = 1; });
