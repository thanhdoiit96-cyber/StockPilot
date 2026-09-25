'use strict';
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const fs = require('fs');
const { evaluateGenerativeAiGate } = require('../src/services/aiGate');
const path = process.env.BACKTEST_OUTPUT || 'evidence/risk-backtest-2026-09-20.json';
const backtestReport = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, 'utf8')) : null;
(async () => {
  const symbols = (process.env.AI_GATE_SYMBOLS || 'FPT,MWG,VHM').split(',').map(value => value.trim()).filter(Boolean);
  const baseUrl = process.env.AI_GATE_API_URL || 'http://127.0.0.1:5000';
  const qualityReports = [];
  try {
    for (const symbol of symbols) {
      const stocks = await (await fetch(`${baseUrl}/api/stocks?q=${encodeURIComponent(symbol)}&page=1&pageSize=100`)).json();
      const stock = (stocks.data || []).find(item => item.code === symbol);
      if (!stock) qualityReports.push({ symbol, status: 'fail', score: 0, reason: 'stock_not_found' });
      else { const payload = await (await fetch(`${baseUrl}/api/stocks/${stock.id}/analysis`)).json(); qualityReports.push({ symbol, ...(payload.data?.quality || { status: 'fail', score: 0 }) }); }
    }
  } catch (error) { qualityReports.push({ status: 'fail', score: 0, reason: `api_unavailable: ${error.message}` }); }
  const report = evaluateGenerativeAiGate({ qualityReports, backtestReport, rightsVerified: process.env.EXTERNAL_FACTOR_DISPLAY_RIGHTS === 'verified', providerReady: process.env.GENERATIVE_AI_PROVIDER_READY === 'true' });
  const output = { ...report, quality_reports: qualityReports };
  const text = JSON.stringify(output, null, 2);
  console.log(text);
  if (process.env.AI_GATE_OUTPUT) require('fs').writeFileSync(process.env.AI_GATE_OUTPUT, text, 'utf8');
  process.exitCode = report.enabled ? 0 : 2;
})().catch(error => { console.error(error); process.exitCode = 1; });
