'use strict';
const { Portfolio, PortfolioTransaction, PortfolioEvent, StockPrice, PositionExitGeneratorRun, sequelize } = require('../src/models');
const { runPositionExitEodDryRun } = require('../src/services/positionExitEodDryRun');

const args = Object.fromEntries(process.argv.slice(2).map(value => { const [key, ...rest] = value.replace(/^--/, '').split('='); return [key, rest.join('=')]; }));
const sessionDate = args.session;
const ownerId = process.env.EXIT_GUIDANCE_EOD_OWNER_ID;
const triggerId = args.trigger || `manual-dry-run-${sessionDate || 'missing'}`;

if (!sessionDate || !ownerId) {
  console.error('Usage: EXIT_GUIDANCE_EOD_OWNER_ID=<owner> npm run dry-run:exit-guidance-eod -- --session=YYYY-MM-DD [--trigger=id]');
  process.exitCode = 2;
} else {
  runPositionExitEodDryRun({ Portfolio, PortfolioTransaction, PortfolioEvent, StockPrice, PositionExitGeneratorRun, sequelize, sessionDate, triggerId, ownerId })
    .then(result => { console.log(JSON.stringify(result)); })
    .catch(error => { console.error(`Exit-guidance dry-run failed: ${error.message}`); process.exitCode = 1; })
    .finally(async () => { await sequelize.close(); });
}
