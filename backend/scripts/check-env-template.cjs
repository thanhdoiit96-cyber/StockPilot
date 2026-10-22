'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const { parseAllowedOrigins } = require('../src/config/authRuntime');

const templatePath = path.resolve(__dirname, '../.env.example');
const expectedKeys = [
  'NODE_ENV', 'PORT', 'LOG_LEVEL',
  'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
  'JWT_SECRET', 'AUTH_ACCESS_EXPIRES_IN', 'CORS_ORIGIN', 'ADMIN_API_KEY',
  'RATE_LIMIT_WINDOW_MS', 'RATE_LIMIT_MAX_REQUESTS',
  'VNSTOCK_WORKER_URL', 'READINESS_REQUIRE_WORKER', 'READINESS_TIMEOUT_MS',
  'FORECAST_RESEARCH_PREVIEW', 'FORECAST_LIVE_PREVIEW',
  'VNSTOCK_EOD_ENABLED', 'VNSTOCK_EOD_CRON', 'VNSTOCK_EOD_GAP_RETRY_CRON', 'VNSTOCK_EOD_LATE_GAP_RETRY_CRON', 'VNSTOCK_LISTING_SYNC_ENABLED', 'QUOTE_FRESHNESS_ENABLED',
  'RECOMMENDATION_EVALUATION_ENABLED', 'RECOMMENDATION_LIFECYCLE_CHECK_ENABLED', 'RECOMMENDATIONS_AFTER_INGEST',
  'FORECAST_LIVE_CYCLE_ENABLED', 'VNSTOCK_FOREIGN_FLOW_ENABLED', 'COMPANY_DATA_SYNC_ENABLED'
].sort();
const safeDefaults = [
  'FORECAST_RESEARCH_PREVIEW', 'FORECAST_LIVE_PREVIEW',
  'VNSTOCK_EOD_ENABLED', 'VNSTOCK_LISTING_SYNC_ENABLED', 'QUOTE_FRESHNESS_ENABLED',
  'RECOMMENDATION_EVALUATION_ENABLED', 'RECOMMENDATION_LIFECYCLE_CHECK_ENABLED', 'RECOMMENDATIONS_AFTER_INGEST',
  'FORECAST_LIVE_CYCLE_ENABLED', 'VNSTOCK_FOREIGN_FLOW_ENABLED', 'COMPANY_DATA_SYNC_ENABLED'
];

function assignedKeys(source) {
  const seen = new Set();
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=/);
    if (!match) continue;
    assert(!seen.has(match[1]), `Duplicate ${match[1]} at line ${index + 1}`);
    seen.add(match[1]);
  }
  return [...seen].sort();
}

function main() {
  const source = fs.readFileSync(templatePath, 'utf8');
  const env = dotenv.parse(source);
  assert.deepEqual(assignedKeys(source), expectedKeys, 'Template keys must match the supported backend bootstrap contract');
  assert.equal(env.NODE_ENV, 'development');
  assert.match(env.PORT, /^\d+$/);
  assert.match(env.DB_PASSWORD, /^<.+>$/);
  assert.equal(env.JWT_SECRET, 'development-only-change-me');
  assert.doesNotThrow(() => parseAllowedOrigins(env.CORS_ORIGIN));
  for (const key of safeDefaults) assert.equal(env[key], 'false', `${key} must default to false`);
  assert.equal(env.VNSTOCK_EOD_CRON, '5 15 * * 1-5');
  assert.equal(env.VNSTOCK_EOD_GAP_RETRY_CRON, '15,30,45 15 * * 1-5');
  assert.equal(env.VNSTOCK_EOD_LATE_GAP_RETRY_CRON, '*/15 16-19 * * 1-5');
  console.log(`PASS: backend .env.example contract (${expectedKeys.length} active keys; preview and scheduler defaults are safe)`);
}

try { main(); } catch (error) {
  console.error(`Environment template check failed: ${error.message}`);
  process.exitCode = 1;
}
