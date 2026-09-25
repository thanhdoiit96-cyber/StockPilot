const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const { Sequelize } = require('sequelize');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const cwd = path.resolve(__dirname, '..');
const schema = `verify_install_${randomUUID().replaceAll('-', '')}`;
assert.match(schema, /^verify_install_[a-f0-9]{32}$/);
const admin = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST, port: process.env.DB_PORT, dialect: 'postgres', logging: false
});
const env = { ...process.env, NODE_ENV: 'development', ADMIN_API_KEY: '',
  PGOPTIONS: `-c search_path=${schema}`, VERIFY_INSTALL_SCHEMA: schema };
const children = new Set();
let created = false;

function launch(args, overrides = {}) {
  const child = spawn(process.execPath, args, { cwd, env: { ...env, ...overrides }, windowsHide: true });
  children.add(child);
  let output = '';
  child.stdout.on('data', data => { output += data; });
  child.stderr.on('data', data => { output += data; });
  const done = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { child.kill(); reject(new Error('Child process timed out')); }, 20000);
    child.once('error', error => { clearTimeout(timeout); children.delete(child); reject(error); });
    child.once('close', code => { clearTimeout(timeout); children.delete(child); resolve({ code, output }); });
  });
  // Server completion may happen before it is explicitly awaited.
  done.catch(() => {});
  return { child, done };
}

async function cli(command) {
  const result = await launch(['node_modules/sequelize-cli/lib/sequelize', command,
    '--config', 'scripts/install-test-config.cjs']).done;
  assert.equal(result.code, 0, `${command} must succeed`);
  return result;
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function waitForHealth(url, child) {
  for (let attempt = 0; attempt < 100; attempt++) {
    assert.equal(child.exitCode, null, 'Server exited before becoming ready');
    try {
      const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(500) });
      if (response.ok && (await response.json()).success) return;
    } catch { /* Retry while the listener starts. */ }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Server did not become ready');
}

async function main() {
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    await cli('db:migrate');
    const repeated = await cli('db:migrate');
    assert.match(repeated.output, /No migrations were executed/);
    await cli('db:seed:all');
    const [migrations] = await admin.query(`SELECT COUNT(*)::int AS count FROM "${schema}"."SequelizeMeta"`, {
      type: Sequelize.QueryTypes.SELECT
    });
    assert.equal(migrations.count, 3);
    console.log('PASS: CLI migrations, isolated migration metadata, repeat no-op and first seed');

    const port = await freePort();
    const base = `http://127.0.0.1:${port}`;
    const server = launch(['src/app.js'], { PORT: String(port) });
    await waitForHealth(base, server.child);
    const list = await (await fetch(`${base}/api/stocks`)).json();
    assert.equal(list.success, true);
    assert.equal(list.data.length, 3);
    assert.equal(list.source, 'database');
    assert.equal((await (await fetch(`${base}/api/stocks`)).json()).source, 'cache');
    const detail = await (await fetch(`${base}/api/stocks/${list.data[0].id}`)).json();
    assert.equal(detail.success, true);
    assert.equal(detail.data.price_history.length, 1);
    console.log('PASS: full app startup, health, seeded list/detail and database-to-cache reads');

    const conflict = await launch(['src/app.js'], { PORT: String(port) }).done;
    assert.equal(conflict.code, 1);
    assert.match(conflict.output, /\[Startup Error\].*already in use/);
    assert.doesNotMatch(conflict.output, /Unhandled 'error' event|Cache Cleanup Job.*Initialized/);
    console.log('PASS: occupied port exits 1 with actionable error and no cleanup job');

    server.child.kill();
    await server.done;
    const restarted = launch(['src/app.js'], { PORT: String(port) });
    await waitForHealth(base, restarted.child);
    const persisted = await (await fetch(`${base}/api/stocks`)).json();
    assert.equal(persisted.data.length, 3);
    restarted.child.kill();
    await restarted.done;
    console.log('PASS: restart preserves seeded data');

    const unavailable = await launch(['src/app.js'], { PORT: String(port), DB_NAME: `${schema}_missing` }).done;
    assert.equal(unavailable.code, 1);
    assert.match(unavailable.output, /\[Startup Error\]/);
    assert.doesNotMatch(unavailable.output, /\[Server\] Running|Cache Cleanup Job.*Initialized/);
    console.log('PASS: missing database exits 1 without starting server/jobs');
  } finally {
    for (const child of children) child.kill();
    // Close events guarantee the spawned processes have released DB connections.
    await Promise.all([...children].map(child => new Promise(resolve => child.once('close', resolve))));
    try {
      if (created) {
        await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
        const remaining = await admin.query('SELECT 1 FROM pg_namespace WHERE nspname = $1', {
          bind: [schema], type: Sequelize.QueryTypes.SELECT
        });
        assert.equal(remaining.length, 0);
        console.log('PASS: only the temporary schema created by this run was removed');
      }
    } finally { await admin.close(); }
  }
}

main().catch(error => {
  console.error('Install verification failed:', error.message);
  process.exitCode = 1;
});
