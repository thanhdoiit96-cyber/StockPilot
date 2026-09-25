'use strict';
const { spawnSync } = require('child_process');
const candidates = [process.env.VNSTOCK_PYTHON || 'python', 'py', 'python.exe', 'C:\\Users\\ntdoi\\AppData\\Local\\Programs\\Python\\Python313\\python.exe'];
const results = candidates.map(command => {
  const result = spawnSync(command, ['-c', 'print("node-spawn-ok")'], { encoding: 'utf8' });
  return { command, status: result.status, signal: result.signal || null, stdout: result.stdout || '', stderr: result.stderr || '', error: result.error?.message || null };
});
console.log(JSON.stringify({ node: process.execPath, cwd: process.cwd(), results }, null, 2));
