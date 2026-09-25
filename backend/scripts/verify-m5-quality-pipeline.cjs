'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const date = new Date().toISOString().slice(0, 10);
const evidenceDir = process.env.QUALITY_EVIDENCE_DIR || path.resolve(__dirname, '..', 'evidence');
const backtestOutput = path.join(evidenceDir, `risk-backtest-${date}.json`);
const gateOutput = path.join(evidenceDir, `ai-gate-${date}.json`);
fs.mkdirSync(evidenceDir, { recursive: true });

function run(script, env) {
  const result = spawnSync(process.execPath, [path.join(__dirname, script)], {
    env: { ...process.env, ...env },
    stdio: 'inherit'
  });
  return result.error ? 1 : (result.status ?? 1);
}

const backtestExit = run('backtest-risk-plan.cjs', { BACKTEST_OUTPUT: backtestOutput });
if (backtestExit !== 0) process.exit(backtestExit);

const gateExit = run('check-ai-gate.cjs', { BACKTEST_OUTPUT: backtestOutput, AI_GATE_OUTPUT: gateOutput });
if (gateExit !== 0 && gateExit !== 2) process.exit(gateExit);

const validationExit = run('validate-ai-gate-artifact.cjs', { BACKTEST_OUTPUT: backtestOutput, AI_GATE_ARTIFACT: gateOutput });
if (validationExit !== 0) process.exit(validationExit);

console.log(JSON.stringify({ pipeline: 'm5_quality_v1', date, backtest: backtestOutput, ai_gate: gateOutput, gate_exit: gateExit, valid: true }, null, 2));
