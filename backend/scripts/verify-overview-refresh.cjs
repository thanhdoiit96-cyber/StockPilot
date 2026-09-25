'use strict';
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const base = process.env.BACKEND_URL || 'http://127.0.0.1:5000';
  const checkedAt = new Date().toISOString();
  const stockResponse = await fetch(`${base}/api/stocks?pageSize=40`, { signal: AbortSignal.timeout(15000) });
  const stockPayload = await stockResponse.json();
  const symbols = (stockPayload.data || []).map(item => item.code).filter(Boolean).slice(0, 40);
  if (!symbols.length) throw new Error('No overview symbols returned');
  const rounds = [];
  for (let round = 0; round < 3; round += 1) {
    const started = Date.now();
    const response = await fetch(`${base}/api/stocks/quotes?symbols=${encodeURIComponent(symbols.join(','))}`, { signal: AbortSignal.timeout(15000) });
    const payload = await response.json();
    rounds.push({ round: round + 1, status: response.status, elapsed_ms: Date.now() - started, returned: payload.returned, symbols: Object.keys(payload.data || {}), sample: payload.data?.[symbols[0]] || null });
    if (round < 2) await new Promise(resolve => setTimeout(resolve, 1000));
  }
  const healthResponse = await fetch(`${base}/api/stocks/quotes/status`, { signal: AbortSignal.timeout(5000) });
  const health = await healthResponse.json();
  const report = { checked_at: checkedAt, requested: symbols.length, rounds, health: health.data || null };
  const target = path.resolve(__dirname, '../evidence', `overview-refresh-${checkedAt.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(target, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ evidence: path.basename(target), requested: symbols.length, rounds: rounds.map(({ round, status, elapsed_ms, returned }) => ({ round, status, elapsed_ms, returned })), health: health.data?.status }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
