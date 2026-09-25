'use strict';

const fs = require('fs');
const path = require('path');

const input = process.env.VNSTOCK_GAP_MANIFEST || path.resolve(__dirname, '../evidence/vnstock-universe-scale-500-vci-only-2026-09-23.json');
const output = process.env.VNSTOCK_GAP_OUTPUT || path.resolve(__dirname, '../evidence/vnstock-universe-gap-audit-latest.json');

function classify(message = '') {
  const text = String(message).toLowerCase();
  if (/không tìm thấy dữ liệu|no eod rows|no data|zero rows|empty/.test(text)) return 'no_data';
  if (/certificate_verify_failed|ssl certificate/.test(text)) return 'provider_certificate';
  if (/timeout|timed out|connection reset|connection aborted|fetch failed|502|503|500/.test(text)) return 'transient';
  return 'unknown';
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(input, 'utf8'));
  const gaps = [];
  for (const report of manifest.reports || []) {
    const reportErrors = report.report?.errors || [];
    if (report.status === 'failed' && !reportErrors.length) {
      gaps.push(...(report.symbols || []).map(symbol => ({ symbol, batch: report.batch, category: classify(report.error), message: report.error || 'batch failed' })));
      continue;
    }
    for (const error of reportErrors) {
      for (const symbol of error.symbols || [error.symbol].filter(Boolean)) gaps.push({ symbol, batch: report.batch, category: classify(error.message || error.error), message: error.message || error.error || 'provider error' });
    }
  }
  const unique = [...new Map(gaps.map(item => [item.symbol, item])).values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
  const summary = unique.reduce((acc, item) => { acc[item.category] = (acc[item.category] || 0) + 1; return acc; }, {});
  const result = { generated_at: new Date().toISOString(), input: path.basename(input), total_gaps: unique.length, summary, retryable_symbols: unique.filter(item => item.category === 'transient').map(item => item.symbol), no_data_symbols: unique.filter(item => item.category === 'no_data').map(item => item.symbol), gaps: unique };
  fs.writeFileSync(output, JSON.stringify(result, null, 2), 'utf8');
  console.log(JSON.stringify(result, null, 2));
}

try { main(); } catch (error) { console.error(error.stack || error); process.exitCode = 1; }
