'use strict';
const { validateExternalFactor } = require('./externalFactorContract');
function normalizeExternalFactor(input, now = new Date().toISOString()) {
  if (!input || typeof input !== 'object') throw new TypeError('External factor must be an object');
  return { type: input.type || 'unknown', symbol: input.symbol || null, title: input.title || null, summary: input.summary || null, source: input.source || null, published_at: input.published_at || null, fetched_at: input.fetched_at || now, status: input.status || 'unverified', impact: input.impact || 'unknown' };
}
function createFixtureExternalFactorAdapter(factors = []) {
  return { provider: 'fixture-external-factors', license: 'internal_research_only', async fetch() { return factors.map(item => { const normalized = normalizeExternalFactor(item); const errors = validateExternalFactor(normalized); if (errors.length) throw new Error(`Invalid external factor: ${errors.join('; ')}`); return normalized; }); } };
}
module.exports = { normalizeExternalFactor, createFixtureExternalFactorAdapter };
