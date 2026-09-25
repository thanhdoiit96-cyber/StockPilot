'use strict';

const fs = require('fs');

const defaultArtifact = fs.readdirSync('evidence').filter(file => /^ai-gate-\d{4}-\d{2}-\d{2}\.json$/.test(file)).sort().reverse()[0];
const artifactPath = process.env.AI_GATE_ARTIFACT || (defaultArtifact ? `evidence/${defaultArtifact}` : 'evidence/ai-gate-latest.json');
const backtestPath = process.env.BACKTEST_OUTPUT || 'evidence/risk-backtest-2026-09-20.json';

function fail(message) {
  console.error(`[AI gate artifact] ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(artifactPath)) {
  fail(`artifact not found: ${artifactPath}`);
} else {
  let report;
  try {
    report = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  } catch (error) {
    fail(`invalid JSON: ${error.message}`);
  }

  if (report) {
    const errors = [];
    if (report.policy !== 'generative_ai_gate_v1') errors.push('unexpected policy');
    if (!report.evaluated_at || Number.isNaN(Date.parse(report.evaluated_at))) errors.push('invalid evaluated_at');
    if (!Array.isArray(report.quality_reports) || report.quality_reports.length === 0) errors.push('quality_reports is empty');
    if (!fs.existsSync(backtestPath)) errors.push(`backtest evidence not found: ${backtestPath}`);
    if (!report.enabled && !Array.isArray(report.reasons)) errors.push('disabled report has no reasons');
    if (report.enabled && report.reasons?.length) errors.push('enabled report still has blocking reasons');
    if (errors.length) errors.forEach(fail);
    else {
      console.log(JSON.stringify({ valid: true, artifact: artifactPath, enabled: report.enabled, reasons: report.reasons || [] }, null, 2));
    }
  }
}
