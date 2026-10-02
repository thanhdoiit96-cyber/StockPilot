'use strict';

const fs = require('node:fs');
const path = require('node:path');

const workerUrl = String(process.env.VNSTOCK_WORKER_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const source = String(process.env.VNSTOCK_SOURCE || 'VCI').toUpperCase();
const from = process.env.VNSTOCK_PROBE_FROM || '2025-01-01';
const to = process.env.VNSTOCK_PROBE_TO || new Date().toISOString().slice(0, 10);
const delayMs = Math.max(0, Number(process.env.VNSTOCK_PROBE_DELAY_MS || 750));
const symbols = [...new Set(String(process.env.VNSTOCK_PROBE_SYMBOLS || '').split(',')
  .map(symbol => symbol.trim().toUpperCase()).filter(Boolean))];

function validate() {
  if (!symbols.length) throw new Error('Set VNSTOCK_PROBE_SYMBOLS to a comma-separated symbol list');
  if (symbols.length > 100) throw new Error('VNSTOCK_PROBE_SYMBOLS is limited to 100 symbols');
  if (symbols.some(symbol => !/^[A-Z0-9]{1,10}$/.test(symbol))) throw new Error('VNSTOCK_PROBE_SYMBOLS contains an invalid symbol');
  for (const [name, value] of [['VNSTOCK_PROBE_FROM', from], ['VNSTOCK_PROBE_TO', to]]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${name} must use YYYY-MM-DD`);
  }
  if (!Number.isFinite(delayMs) || delayMs > 10000) throw new Error('VNSTOCK_PROBE_DELAY_MS must be between 0 and 10000');
}

async function post(endpoint, body, timeoutMs = 120000) {
  const response = await fetch(`${workerUrl}${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs)
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`Worker ${endpoint} returned HTTP ${response.status}: ${JSON.stringify(payload.errors || [])}`);
  return payload;
}

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  validate();
  const checkedAt = new Date();
  const listingPayload = await post('/listing', { source });
  const listing = new Map((listingPayload.rows || []).map(row => [String(row.symbol || '').toUpperCase(), row]));
  const boardPayload = await post('/price-board', { source, symbols, mode: 'price-board' });
  const board = new Map((boardPayload.rows || []).map(row => [String(row.symbol || '').toUpperCase(), row]));
  const rows = [];

  for (const [index, symbol] of symbols.entries()) {
    let history = [];
    let errors = [];
    try {
      const payload = await post('/eod', { source, symbols: [symbol], from, to });
      history = payload.rows || [];
      errors = payload.errors || [];
    } catch (error) {
      errors = [{ error: error.message }];
    }
    const sessions = history.map(row => String(row.date || '').slice(0, 10)).filter(Boolean).sort();
    const listingRow = listing.get(symbol);
    const boardRow = board.get(symbol);
    rows.push({
      symbol,
      listing_present: Boolean(listingRow),
      exchange: listingRow?.exchange || null,
      type: listingRow?.type || null,
      price: Number(boardRow?.price || 0),
      reference_price: Number(boardRow?.reference_price || 0),
      history_rows: history.length,
      latest_session: sessions.at(-1) || null,
      errors
    });
    if (index + 1 < symbols.length && delayMs) await pause(delayMs);
  }

  const report = {
    checked_at: checkedAt.toISOString(), worker_url: workerUrl, source, from, to, delay_ms: delayMs,
    requested: symbols.length,
    summary: {
      listing_present: rows.filter(row => row.listing_present).length,
      traded_price: rows.filter(row => row.price > 0).length,
      reference_only: rows.filter(row => row.price <= 0 && row.reference_price > 0).length,
      history_available: rows.filter(row => row.history_rows > 0).length,
      history_empty: rows.filter(row => row.history_rows === 0 && row.errors.length === 0).length,
      request_errors: rows.filter(row => row.errors.length > 0).length
    },
    price_board_errors: boardPayload.errors || [], rows
  };
  report.evidence_file = `vnstock-history-gap-probe-${checkedAt.toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(path.resolve(__dirname, '../evidence', report.evidence_file), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (report.summary.request_errors) process.exitCode = 1;
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
