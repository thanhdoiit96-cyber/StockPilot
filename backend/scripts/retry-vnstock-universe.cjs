'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const manifest = process.env.VNSTOCK_RETRY_MANIFEST || path.resolve(__dirname, '../evidence/vnstock-universe-ingest.json');
if (!fs.existsSync(manifest)) {
  console.error(`Retry manifest not found: ${manifest}`);
  process.exit(1);
}
const env = { ...process.env, VNSTOCK_RETRY_MANIFEST: manifest };
const result = spawnSync(process.execPath, [path.resolve(__dirname, 'ingest-vnstock-universe.cjs')], { env, stdio: 'inherit' });
process.exitCode = result.error ? 1 : (result.status ?? 1);
