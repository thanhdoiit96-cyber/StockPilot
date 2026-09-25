'use strict';
const crypto = require('node:crypto');
const { User, sequelize } = require('../src/models');

async function main() {
  const base = process.env.BACKEND_URL || 'http://127.0.0.1:5000';
  const email = `saved-smoke-${Date.now()}@example.com`;
  let user;
  try {
    const register = await fetch(`${base}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: `Smoke-${crypto.randomBytes(8).toString('hex')}` }) });
    if (!register.ok) throw new Error(`register HTTP ${register.status}`);
    const auth = await register.json();
    user = auth.user;
    const headers = { authorization: `Bearer ${auth.token}`, 'content-type': 'application/json' };
    const create = await fetch(`${base}/api/recommendations/saved`, { method: 'POST', headers, body: JSON.stringify({ criteria: { momentum: 50 }, result: { recommendations: [{ symbol: 'FPT' }] } }) });
    if (create.status !== 201) throw new Error(`create HTTP ${create.status}`);
    const snapshot = await create.json();
    const list = await fetch(`${base}/api/recommendations/saved`, { headers });
    const listed = await list.json();
    if (!listed.data?.some(item => item.id === snapshot.data.id)) throw new Error('created snapshot missing from list');
    const remove = await fetch(`${base}/api/recommendations/saved/${snapshot.data.id}`, { method: 'DELETE', headers });
    if (remove.status !== 204) throw new Error(`delete HTTP ${remove.status}`);
    console.log(JSON.stringify({ ok: true, created: snapshot.data.id, listed: listed.data.length, deleted: remove.status }));
  } finally {
    if (user?.id) await User.destroy({ where: { id: user.id } });
    await sequelize.close();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
