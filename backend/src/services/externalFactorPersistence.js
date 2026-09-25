'use strict';

const { validateExternalFactor } = require('./externalFactorContract');

async function persistExternalFactors({ ExternalFactor }, records) {
  const result = { inserted: 0, skipped: 0, rejected: 0, errors: [] };
  for (const record of records || []) {
    const errors = validateExternalFactor(record);
    if (errors.length || !record.source_hash) { result.rejected += 1; result.errors.push({ source_hash: record.source_hash || null, errors: errors.concat(record.source_hash ? [] : ['source_hash is required']) }); continue; }
    const [, created] = await ExternalFactor.findOrCreate({ where: { source_hash: record.source_hash }, defaults: record });
    if (created) result.inserted += 1; else result.skipped += 1;
  }
  return result;
}

module.exports = { persistExternalFactors };
