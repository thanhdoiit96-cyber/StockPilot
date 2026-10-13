'use strict';
const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');

function runForeignFlowIngestion() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.resolve(__dirname, '../../scripts/ingest-vnstock-foreign-flow.cjs')], { cwd: path.resolve(__dirname, '../..'), env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; }); child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(stdout.trim()) : reject(new Error(`foreign-flow ingestion exited ${code}: ${stderr.trim()}`)));
  });
}

function startForeignFlowJob({ logger = console, run = runForeignFlowIngestion, schedule = process.env.VNSTOCK_FOREIGN_FLOW_CRON || '0 17 * * 1-5' } = {}) {
  if (process.env.NODE_ENV !== 'development' || process.env.VNSTOCK_FOREIGN_FLOW_ENABLED !== 'true') return null;
  return cron.schedule(schedule, async () => {
    try { logger.info(`[Foreign flow] ${await run()}`); }
    catch (error) { logger.error(`[Foreign flow] ${error.stack || error.message}`); }
  }, { timezone: process.env.VNSTOCK_FOREIGN_FLOW_TIMEZONE || 'Asia/Ho_Chi_Minh' });
}
module.exports = { startForeignFlowJob, runForeignFlowIngestion };
