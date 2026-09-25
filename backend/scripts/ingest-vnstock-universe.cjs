'use strict';

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const models = require('../src/models');
const CacheService = require('../src/services/cacheService');
const { ingestVnstockEod } = require('../src/market-data/vnstockEodIngestion');
const { syncStockListings } = require('../src/services/stockListing');

const listingCachePath = () => process.env.VNSTOCK_LISTING_CACHE || path.resolve(__dirname, '../evidence/vnstock-listing-cache.json');
function saveListingCache(source, rows) { const file = listingCachePath(); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify({ source, fetched_at: new Date().toISOString(), rows }, null, 2), 'utf8'); }
function loadListingCache(source) {
  const file = listingCachePath();
  if (!fs.existsSync(file)) return null;
  try { const cached = JSON.parse(fs.readFileSync(file, 'utf8')); const maxAge = Number(process.env.VNSTOCK_LISTING_CACHE_MAX_AGE_HOURS || 48) * 3600000; return cached.source === source && Array.isArray(cached.rows) && cached.rows.length && Date.now() - new Date(cached.fetched_at).getTime() <= maxAge ? cached.rows : null; } catch (_) { return null; }
}
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function fetchListingWithRetry(options) {
  const retries = Math.max(0, Number(process.env.VNSTOCK_LISTING_RETRIES || 2));
  let error;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try { return await fetchListing(options); } catch (failure) { error = failure; if (attempt < retries) await sleep(Number(process.env.VNSTOCK_LISTING_BACKOFF_MS || 1500) * (attempt + 1)); }
  }
  throw error;
}

function fetchListing({ python = process.env.VNSTOCK_PYTHON || 'python', source = process.env.VNSTOCK_SOURCE || 'vci' } = {}) {
  if (process.env.VNSTOCK_WORKER_URL) {
    return fetch(`${process.env.VNSTOCK_WORKER_URL.replace(/\/$/, '')}/listing`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ source }), signal: AbortSignal.timeout(Number(process.env.VNSTOCK_TIMEOUT_MS || 45000)) }).then(async response => {
      if (!response.ok) throw new Error(`vnstock worker HTTP ${response.status}`);
      const payload = await response.json();
      if (payload.errors?.length) throw new Error(payload.errors.map(item => item.error).join('; '));
      const rows = payload.rows || [];
      if (!rows.length) throw new Error('listing provider returned zero rows');
      saveListingCache(source, rows);
      return rows;
    });
  }
  const bridge = process.env.VNSTOCK_LISTING_BRIDGE || path.resolve(__dirname, 'vnstock_listing_bridge.py');
  return new Promise((resolve, reject) => {
    const child = spawn(python, [bridge], { cwd: path.resolve(__dirname, '..'), env: { ...process.env, VNSTOCK_TELEMETRY: 'off' } });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => {
      if (code !== 0) return reject(new Error(`listing bridge exited ${code}: ${stderr.trim()}`));
      try {
        const payload = JSON.parse(stdout);
        if (payload.errors?.length) return reject(new Error(payload.errors.map(item => item.error).join('; ')));
        const rows = payload.rows || [];
        if (!rows.length) return reject(new Error('listing provider returned zero rows'));
        saveListingCache(source, rows);
        resolve(rows);
      } catch (error) { reject(new Error(`invalid listing bridge response: ${error.message}; stderr=${stderr.trim()}`)); }
    });
    child.stdin.end(JSON.stringify({ source }));
  });
}

function chunks(values, size) { const result = []; for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size)); return result; }
function writeManifest(file, payload) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8'); }

async function main() {
  const primarySource = process.env.VNSTOCK_SOURCE || 'vci';
  const fallbackSource = String(process.env.VNSTOCK_DISABLE_FALLBACK || '').toLowerCase() === 'true'
    ? ''
    : process.env.VNSTOCK_SOURCE_FALLBACK || '';
  const retryManifest = process.env.VNSTOCK_RETRY_MANIFEST && fs.existsSync(process.env.VNSTOCK_RETRY_MANIFEST)
    ? process.env.VNSTOCK_RETRY_MANIFEST
    : '';
  const defaultOutput = retryManifest
    ? path.resolve(__dirname, `../evidence/vnstock-universe-retry-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
    : path.resolve(__dirname, '../evidence/vnstock-universe-ingest.json');
  const outputPath = process.env.VNSTOCK_UNIVERSE_OUTPUT || defaultOutput;
  const priority = [...new Set(String(process.env.VNSTOCK_PRIORITY_SYMBOLS || '').split(',').map(value => value.trim().toUpperCase()).filter(Boolean))];
  let rows;
  let listedBeforeSkip = 0;
  let skippedReady = 0;
  if (retryManifest) {
    const manifest = JSON.parse(fs.readFileSync(retryManifest, 'utf8'));
    const retrySymbols = [...new Set((manifest.reports || []).filter(entry => entry.status === 'failed').flatMap(entry => entry.symbols || []))];
    rows = retrySymbols.map(symbol => ({ symbol, name: symbol, type: 'STOCK' }));
  } else {
    let listing;
    const listingAttempts = [];
    try {
      listing = await fetchListingWithRetry({ source: primarySource });
      listingAttempts.push({ provider: primarySource, status: 'completed' });
    } catch (error) {
      listingAttempts.push({ provider: primarySource, status: 'failed', error: error.message });
      if (!fallbackSource || fallbackSource === primarySource) {
        listing = loadListingCache(primarySource);
        if (listing) listingAttempts.push({ provider: primarySource, status: 'cache' });
        else {
          listing = priority.map(symbol => ({ symbol, name: symbol, type: 'STOCK' }));
          if (listing.length) listingAttempts.push({ provider: 'priority_config', status: 'fallback' });
          else { const failure = { status: 'listing_failed', universe: primarySource, fallback: fallbackSource || null, listed: 0, batches: 0, listing_attempts: listingAttempts }; fs.mkdirSync(path.dirname(outputPath), { recursive: true }); fs.writeFileSync(outputPath, JSON.stringify(failure, null, 2), 'utf8'); console.log(JSON.stringify(failure, null, 2)); process.exitCode = 2; return; }
        }
      }
      if (!listing) try {
        listing = await fetchListingWithRetry({ source: fallbackSource });
        listingAttempts.push({ provider: fallbackSource, status: 'completed' });
      } catch (fallbackError) {
        listingAttempts.push({ provider: fallbackSource, status: 'failed', error: fallbackError.message });
        listing = loadListingCache(primarySource);
        if (listing) listingAttempts.push({ provider: primarySource, status: 'cache' });
        else { listing = priority.map(symbol => ({ symbol, name: symbol, type: 'STOCK' })); if (listing.length) listingAttempts.push({ provider: 'priority_config', status: 'fallback' }); else { const failure = { status: 'listing_failed', universe: primarySource, fallback: fallbackSource, listed: 0, batches: 0, listing_attempts: listingAttempts }; fs.mkdirSync(path.dirname(outputPath), { recursive: true }); fs.writeFileSync(outputPath, JSON.stringify(failure, null, 2), 'utf8'); console.log(JSON.stringify(failure, null, 2)); process.exitCode = 2; return; } }
      }
    }
    const allowedTypes = (process.env.VNSTOCK_TYPES || 'STOCK').split(',').map(value => value.trim().toUpperCase());
    const eligibleRows = listing.filter(item => item.symbol && allowedTypes.includes(String(item.type || 'STOCK').toUpperCase()) && /^[A-Z0-9]{3,6}$/.test(item.symbol));
    const bySymbol = new Map(eligibleRows.map(item => [String(item.symbol).toUpperCase(), item]));
    const prioritized = priority.map(symbol => bySymbol.get(symbol)).filter(Boolean);
    const remaining = eligibleRows.filter(item => !priority.includes(String(item.symbol).toUpperCase()));
    const orderedRows = [...prioritized, ...remaining];
    rows = orderedRows;
    listedBeforeSkip = rows.length;
  }
  if (process.env.VNSTOCK_SKIP_READY === 'true' && rows.length) {
    const existing = await models.Stock.findAll({ attributes: ['id', 'code'], where: { code: rows.map(item => item.symbol) } });
    const idsByCode = new Map(existing.map(stock => [stock.code, stock.id]));
    const prices = await models.StockPrice.findAll({ attributes: ['stock_id'] });
    const counts = prices.reduce((map, row) => map.set(String(row.stock_id), (map.get(String(row.stock_id)) || 0) + 1), new Map());
    const minimum = Math.max(1, Number(process.env.VNSTOCK_MIN_OBSERVATIONS || 50));
    const before = rows.length;
    rows = rows.filter(item => (counts.get(String(idsByCode.get(item.symbol))) || 0) < minimum);
    skippedReady = before - rows.length;
  }
  if (process.env.VNSTOCK_LIMIT) rows = rows.slice(0, Math.max(0, Number(process.env.VNSTOCK_LIMIT)));
  await syncStockListings({ Stock: models.Stock, rows });
  const symbols = rows.map(item => item.symbol);
  const batchSize = Math.max(1, Number(process.env.VNSTOCK_BATCH_SIZE || 25));
  const reports = [];
  const checkpoint = () => writeManifest(outputPath, { status: 'running', universe: primarySource, fallback: fallbackSource || null, listed: symbols.length, listed_before_skip: listedBeforeSkip, skipped_ready: skippedReady, batches: reports.length, batch_size: batchSize, reports });
  for (const [index, batch] of chunks(symbols, batchSize).entries()) {
    const attempts = [];
    for (const source of [primarySource, fallbackSource].filter((value, position, list) => value && list.indexOf(value) === position)) {
      try {
        const report = await ingestVnstockEod({ ...models, cacheService: new CacheService(models.sequelize), symbols: batch, from: process.env.VNSTOCK_FROM, to: process.env.VNSTOCK_TO, source, python: process.env.VNSTOCK_PYTHON, bridge: process.env.VNSTOCK_BRIDGE, cwd: process.env.VNSTOCK_CWD, env: { VNSTOCK_PROJECT_DIR: process.env.VNSTOCK_PROJECT_DIR || '.vnstock' } });
        if (!report.received) throw new Error(`${source} returned no EOD rows for batch`);
        reports.push({ batch: index + 1, symbols: batch, provider: source, status: 'completed', attempts: [...attempts, { provider: source, status: 'completed' }], report });
        checkpoint();
        break;
      } catch (error) {
        attempts.push({ provider: source, status: 'failed', error: error.message });
      }
    }
    if (!reports.some(entry => entry.batch === index + 1)) {
      reports.push({ batch: index + 1, symbols: batch, status: 'failed', attempts, error: attempts.at(-1)?.error || 'no provider configured' });
      checkpoint();
      if (process.env.VNSTOCK_STOP_ON_ERROR === 'true') break;
    }
  }
  const summary = reports.reduce((acc, entry) => { for (const key of ['received', 'inserted', 'updated', 'skipped', 'rejected']) acc[key] += entry.report?.[key] || 0; if (entry.status === 'failed') acc.failed_batches += 1; return acc; }, { received: 0, inserted: 0, updated: 0, skipped: 0, rejected: 0, failed_batches: 0 });
  const output = { universe: primarySource, fallback: fallbackSource || null, listed: symbols.length, listed_before_skip: listedBeforeSkip, skipped_ready: skippedReady, batches: reports.length, batch_size: batchSize, ...summary, reports };
  console.log(JSON.stringify(output, null, 2));
  writeManifest(outputPath, output);
  process.exitCode = summary.rejected || summary.failed_batches ? 2 : 0;
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; }).finally(async () => { await models.sequelize.close(); });
