'use strict';

const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { createEodhdFetcher } = require('../src/market-data/adapters/EodhdEodAdapter');

async function main() {
  const from = process.env.EODHD_FROM || '2026-09-21';
  const to = process.env.EODHD_TO || from;
  const symbols = [...new Set((process.env.EODHD_PROBE_SYMBOLS || 'FPT').split(',').map(value => value.trim().toUpperCase()).filter(value => /^[A-Z0-9]{1,10}$/.test(value)))];
  if (!process.env.EODHD_API_KEY) throw new Error('EODHD_API_KEY is not configured');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) throw new Error('EODHD_FROM/EODHD_TO must be valid YYYY-MM-DD dates');
  if (!symbols.length || symbols.length > 30) throw new Error('EODHD_PROBE_SYMBOLS must contain between 1 and 30 valid symbols');

  const fetcher = createEodhdFetcher();
  const delayMs = Math.max(500, Number(process.env.EODHD_PROBE_DELAY_MS || 1100));
  const report = { checked_at: new Date().toISOString(), from, to, source: 'eodhd', symbols_requested: symbols, symbols: [], errors: [] };
  for (let index = 0; index < symbols.length; index += 1) {
    const symbol = symbols[index];
    let rows;
    let lastError;
    let attempts = 0;
    for (attempts = 1; attempts <= 3; attempts += 1) {
      try {
        rows = await fetcher({ symbols: [symbol], from, to });
        break;
      } catch (error) {
        lastError = error;
        if (attempts < 3) await new Promise(resolve => setTimeout(resolve, attempts * 1000));
      }
    }
    if (lastError && !rows) {
      report.symbols.push({ symbol, status: 'error', rows: 0, attempts: attempts - 1 });
      report.errors.push({ symbol, message: lastError.message, code: lastError.cause?.code || null });
    } else {
      report.symbols.push({ symbol, status: rows.length ? 'available' : 'no_rows', rows: rows.length, attempts, sessions: [...new Set(rows.map(row => String(row.date || '').slice(0, 10)).filter(Boolean))] });
    }
    if (index + 1 < symbols.length) await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  report.available = report.symbols.filter(item => item.status === 'available').map(item => item.symbol);
  report.missing = report.symbols.filter(item => item.status === 'no_rows').map(item => item.symbol);
  report.evidence_file = `eodhd-session-${from}-${to}-${report.checked_at.replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(path.resolve(__dirname, '../evidence', report.evidence_file), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length) process.exitCode = 1;
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
