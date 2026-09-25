'use strict';
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const base = process.env.BACKEND_URL || 'http://127.0.0.1:5000';
  const checkedAt = new Date().toISOString();
  const report = { checked_at: checkedAt, probes: [] };
  async function probe(route) {
    const start = Date.now();
    const response = await fetch(base + route, { signal: AbortSignal.timeout(15000) });
    const payload = await response.json();
    report.probes.push({ route, status: response.status, elapsed_ms: Date.now() - start, data: payload.data, returned: payload.returned });
    return payload;
  }
  await probe('/api/stocks/quotes/status');
  await probe('/api/stocks/quotes?symbols=FPT,SSI,VCB');
  const stocks = await probe('/api/stocks?q=FPT&pageSize=40');
  const stock = stocks.data?.find(item => item.code === 'FPT');
  if (!stock) throw new Error('FPT control symbol missing from stock list');
  await probe(`/api/stocks/${stock.id}/quote`);
  await probe('/api/stocks/quotes?symbols=FPT,SSI,VCB');
  await probe('/api/stocks/quotes/status');
  const target = path.resolve(__dirname, '../evidence', `intraday-pages-${checkedAt.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(target, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ evidence: path.basename(target), probes: report.probes.map(({ route, status, elapsed_ms, returned }) => ({ route, status, elapsed_ms, returned })) }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
