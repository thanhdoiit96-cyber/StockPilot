'use strict';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const models = require('../src/models');
const { buildForeignFlowSnapshot } = require('../src/services/foreignFlowSnapshot');

async function main() {
  const requested = String(process.env.FOREIGN_FLOW_AUDIT_DATE || '').trim();
  if (requested && !/^\d{4}-\d{2}-\d{2}$/.test(requested)) throw new Error('FOREIGN_FLOW_AUDIT_DATE must use YYYY-MM-DD');
  const sessionDate = requested || await models.ForeignFlowDaily.max('session_date');
  const universe = await models.Stock.findAll({ where: { listing_status: 'listed' }, attributes: ['id', 'code', 'name', 'industry'], order: [['code', 'ASC']] });
  const rows = sessionDate ? await models.ForeignFlowDaily.findAll({ where: { session_date: sessionDate }, include: [{ model: models.Stock, as: 'stock', attributes: ['id', 'code', 'name', 'industry'] }] }) : [];
  const snapshot = buildForeignFlowSnapshot({ rows, universe, sessionDate, minimumCoverage: Number(process.env.FOREIGN_FLOW_MINIMUM_COVERAGE || 0.8), limit: Math.min(200, Math.max(1, Number(process.env.FOREIGN_FLOW_AUDIT_LIMIT || 50))) });
  process.stdout.write(`${JSON.stringify({ audited_at: new Date().toISOString(), ...snapshot }, null, 2)}\n`);
  process.exitCode = snapshot.status === 'available' ? 0 : 2;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => models.sequelize.close());
