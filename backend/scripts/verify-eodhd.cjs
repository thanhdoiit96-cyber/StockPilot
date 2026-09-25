'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const key = process.env.EODHD_API_KEY;
const suffix = process.env.EODHD_SYMBOL_SUFFIX || '.VN';
const symbol = (process.env.EODHD_PROBE_SYMBOL || 'FPT').trim().toUpperCase();
const from = process.env.EODHD_FROM || '2026-09-11';
const to = process.env.EODHD_TO || '2026-09-17';

if (!key) {
  console.error('EODHD_API_KEY is missing. Set it in backend/.env.');
  process.exit(1);
}

async function run() {
  const base = process.env.EODHD_BASE_URL || 'https://eodhd.com/api';
  const exchangeResponse = await fetch(`${base}/exchanges-list/?api_token=${encodeURIComponent(key)}`);
  const exchanges = await exchangeResponse.json();
  const vietnam = Array.isArray(exchanges)
    ? exchanges.filter(item => String(item.Code || '').toUpperCase() === 'VN' || /vietnam/i.test(String(item.Name || '')))
    : [];
  const providerSymbol = `${symbol}${suffix}`;
  const quoteResponse = await fetch(`${base}/eod/${encodeURIComponent(providerSymbol)}?api_token=${encodeURIComponent(key)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&period=d&fmt=json`);
  const rows = quoteResponse.ok ? await quoteResponse.json() : [];
  console.log(JSON.stringify({ key_status: exchangeResponse.ok ? 'accepted' : `http_${exchangeResponse.status}`, vietnam_exchange: vietnam.map(item => ({ code: item.Code, name: item.Name })), probe: { symbol, provider_symbol: providerSymbol, from, to, http_status: quoteResponse.status, rows: Array.isArray(rows) ? rows.length : 0, first_date: Array.isArray(rows) && rows[0] ? rows[0].date : null } }, null, 2));
  if (!exchangeResponse.ok || !quoteResponse.ok || !Array.isArray(rows) || rows.length === 0) process.exitCode = 2;
}

run().catch(error => {
  const cause = error.cause;
  console.error(`EODHD verification failed: ${error.message}${cause?.code ? ` (${cause.code})` : ''}${cause?.message ? `: ${String(cause.message).replace(/([?&](?:api_token|api_key|token|key)=)[^&\s]+/gi, '$1[redacted]').slice(0, 240)}` : ''}`);
  process.exitCode = 1;
});
