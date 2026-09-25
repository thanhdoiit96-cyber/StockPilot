'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const python = process.env.VNSTOCK_PYTHON || 'python';
if (process.env.VNSTOCK_WORKER_URL) {
  fetch(`${process.env.VNSTOCK_WORKER_URL.replace(/\/$/, '')}/health`, { signal: AbortSignal.timeout(5000) }).then(async response => {
    const result = { worker_url: process.env.VNSTOCK_WORKER_URL, status: response.status, ready: response.ok, body: await response.text() };
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ready ? 0 : 1;
  }).catch(error => { console.log(JSON.stringify({ worker_url: process.env.VNSTOCK_WORKER_URL, ready: false, error: error.message }, null, 2)); process.exitCode = 1; });
} else {
const probe = spawnSync(python, ['-c', 'print("vnstock-runtime-ok")'], {
  cwd: path.resolve(__dirname, '..'),
  env: { ...process.env, VNSTOCK_TELEMETRY: 'off' },
  encoding: 'utf8'
});
const result = {
  python,
  status: probe.status,
  signal: probe.signal || null,
  stdout: (probe.stdout || '').trim(),
  stderr: (probe.stderr || '').trim(),
  spawn_error: probe.error?.message || null,
  ready: !probe.error && probe.status === 0 && probe.stdout.includes('vnstock-runtime-ok')
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.ready ? 0 : 1;
}
