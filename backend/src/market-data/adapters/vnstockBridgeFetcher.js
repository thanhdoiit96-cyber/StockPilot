'use strict';

const { spawn } = require('child_process');
const path = require('path');

function delay(milliseconds) { return new Promise(resolve => setTimeout(resolve, milliseconds)); }

async function workerErrorDetail(response) {
  let detail = '';
  try {
    const body = await response.text();
    try {
      const payload = JSON.parse(body);
      detail = Array.isArray(payload.errors)
        ? payload.errors.map(item => typeof item === 'string' ? item : item.error || JSON.stringify(item)).join('; ')
        : body;
    } catch { detail = body; }
  } catch { /* Keep the HTTP status useful if the response body cannot be read. */ }
  return detail.replace(/<[^>]*>/g, ' ').replace(/[\r\n\t]+/g, ' ').replace(/([?&](?:api_key|token|key)=)[^&\s"'<>]+/gi, '$1[redacted]').trim().slice(0, 400);
}

function createVnstockBridgeFetcher({ python = 'python', bridge = path.resolve(__dirname, '../../../scripts/vnstock_eod_bridge.py'), cwd = path.resolve(__dirname, '../../../..'), env = {}, retries = Number(process.env.VNSTOCK_RETRIES || 2), timeoutMs = Number(process.env.VNSTOCK_TIMEOUT_MS || 45000), backoffMs = Number(process.env.VNSTOCK_BACKOFF_MS || 500), workerBatchSize = Number(process.env.VNSTOCK_WORKER_EOD_BATCH_SIZE || 2), fetchImpl = fetch, disableWorker = false } = {}) {
  const runOnce = async ({ symbols, from, to, source }) => {
    const workerUrl = process.env.VNSTOCK_WORKER_URL;
    if (workerUrl && !disableWorker) {
      const requestBatch = async batch => {
        const response = await fetchImpl(`${workerUrl.replace(/\/$/, '')}/eod`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ symbols: batch, from, to, source }), signal: AbortSignal.timeout(timeoutMs) });
        if (!response.ok) {
          const detail = await workerErrorDetail(response);
          throw new Error(`vnstock worker HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
        }
        const payload = await response.json();
        if (payload.errors?.length) process.stderr.write(`[vnstock worker] ${JSON.stringify(payload.errors)}\n`);
        return payload.rows || [];
      };
      const size = Math.max(1, Number(workerBatchSize) || 2);
      const rows = [];
      const failures = [];
      for (let offset = 0; offset < symbols.length; offset += size) {
        try { rows.push(...await requestBatch(symbols.slice(offset, offset + size))); }
        catch (error) { failures.push({ symbols: symbols.slice(offset, offset + size), error }); }
      }
      if (!rows.length && failures.length) throw failures[0].error;
      if (failures.length) process.stderr.write(`[vnstock worker] partial EOD response: ${JSON.stringify(failures.map(item => ({ symbols: item.symbols, error: item.error.message })))}\n`);
      return rows;
    }
    return new Promise((resolve, reject) => {
    const child = spawn(python, [bridge], { cwd, env: { ...process.env, ...env, VNSTOCK_TELEMETRY: 'off' } });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => { child.kill(); reject(new Error(`vnstock bridge timed out after ${timeoutMs}ms`)); }, timeoutMs);
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => {
      clearTimeout(timeout);
      if (code !== 0) return reject(new Error(`vnstock bridge exited ${code}: ${stderr.trim()}`));
      try {
        const payload = JSON.parse(stdout);
        if (payload.errors?.length) process.stderr.write(`[vnstock bridge] ${JSON.stringify(payload.errors)}\n`);
        resolve(payload.rows || []);
      } catch (error) {
        reject(new Error(`invalid vnstock bridge response: ${error.message}; stderr=${stderr.trim()}`));
      }
    });
    child.stdin.end(JSON.stringify({ symbols, from, to, source }));
    });
  };
  return async request => {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try { return await runOnce(request); } catch (error) {
        lastError = error;
        if (attempt < retries) await delay(backoffMs * (2 ** attempt));
      }
    }
    throw lastError;
  };
}

module.exports = { createVnstockBridgeFetcher };

function createVnstockIntradayFetcher(options = {}) {
  const { python = 'python', bridge = path.resolve(__dirname, '../../../scripts/vnstock_intraday_bridge.py'), cwd = path.resolve(__dirname, '../../../..'), env = {}, retries = Number(process.env.VNSTOCK_RETRIES || 1), timeoutMs = Number(process.env.VNSTOCK_TIMEOUT_MS || 20000), backoffMs = Number(process.env.VNSTOCK_BACKOFF_MS || 500), fetchImpl = fetch, disableWorker = false } = options;
  const run = async request => {
    const workerUrl = process.env.VNSTOCK_WORKER_URL;
    if (workerUrl && !disableWorker) {
      const response = await fetchImpl(`${workerUrl.replace(/\/$/, '')}/${request.mode === 'price-board' ? 'price-board' : 'intraday'}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request), signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) {
        const detail = await workerErrorDetail(response);
        throw new Error(`vnstock worker HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
      }
      const payload = await response.json();
      if (payload.errors?.length) process.stderr.write(`[vnstock worker] ${JSON.stringify(payload.errors)}\n`);
      return payload.rows || [];
    }
    return new Promise((resolve, reject) => {
      const child = spawn(python, [bridge], { cwd, env: { ...process.env, ...env, VNSTOCK_TELEMETRY: 'off' } });
      let stdout = ''; let stderr = '';
      const timeout = setTimeout(() => { child.kill(); reject(new Error(`vnstock intraday bridge timed out after ${timeoutMs}ms`)); }, timeoutMs);
      child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; }); child.on('error', reject);
      child.on('close', code => { clearTimeout(timeout); if (code !== 0) return reject(new Error(`vnstock intraday bridge exited ${code}: ${stderr.trim()}`)); try { const payload = JSON.parse(stdout); if (payload.errors?.length) process.stderr.write(`[vnstock bridge] ${JSON.stringify(payload.errors)}\n`); resolve(payload.rows || []); } catch (error) { reject(new Error(`invalid vnstock intraday response: ${error.message}; stderr=${stderr.trim()}`)); } });
      child.stdin.end(JSON.stringify(request));
    });
  };
  return async request => { let lastError; for (let attempt = 0; attempt <= retries; attempt += 1) { try { return await run(request); } catch (error) { lastError = error; if (attempt < retries) await delay(backoffMs * (2 ** attempt)); } } throw lastError; };
}

module.exports.createVnstockIntradayFetcher = createVnstockIntradayFetcher;
