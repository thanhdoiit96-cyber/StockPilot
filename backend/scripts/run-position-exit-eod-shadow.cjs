'use strict';
const { Portfolio, PortfolioTransaction, PortfolioEvent, StockPrice, PositionExitRun, PositionExitGuidance, HoldingReconciliationRun, HoldingReconciliationApplication, sequelize } = require('../src/models');
const { summarizePortfolioHoldings } = require('../src/services/portfolioAccounting');
const { createPositionExitSnapshot } = require('../src/services/positionExitPersistence');
const { acquirePositionExitWorkerLease, releasePositionExitWorkerLease } = require('../src/services/positionExitWorkerLease');
const args = Object.fromEntries(process.argv.slice(2).map(value => { const [key, ...rest] = value.replace(/^--/, '').split('='); return [key, rest.join('=')]; }));
const plain = row => row?.toJSON ? row.toJSON() : row;
async function main() {
  const session = args.session; const trigger = args.trigger; const ownerId = process.env.EXIT_GUIDANCE_EOD_OWNER_ID;
  if (process.env.EXIT_GUIDANCE_EOD_ENABLED !== 'true') throw new Error('EXIT_GUIDANCE_EOD_ENABLED=true is required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(session || '') || !trigger || !ownerId) throw new Error('--session, --trigger and EXIT_GUIDANCE_EOD_OWNER_ID are required');
  const leaseKey = process.env.EXIT_GUIDANCE_EOD_LEASE_KEY || 'position-exit-eod:vnstock:position_exit_rule_v1';
  const lease = await acquirePositionExitWorkerLease({ sequelize, leaseKey, ownerId }); if (lease.status !== 'acquired') return { status: lease.status };
  try { const result = { trigger, session, portfolios: 0, created: 0, skipped: 0, provider_requests: 0 };
    for (const source of await Portfolio.findAll({ attributes: ['id'] })) { const portfolioId = plain(source).id; const transactions = await PortfolioTransaction.findAll({ where: { portfolio_id: portfolioId }, order: [['traded_at', 'ASC'], ['created_at', 'ASC'], ['id', 'ASC']] }); const events = await PortfolioEvent.findAll({ where: { portfolio_id: portfolioId } }); const holdings = summarizePortfolioHoldings(transactions.map(plain), new Map()).filter(item => item.status === 'open'); if (!holdings.length || holdings.length > 100) continue;
      const ids = holdings.map(item => item.stock_id); const [prices] = await StockPrice.sequelize.query(`SELECT * FROM (SELECT p.*, ROW_NUMBER() OVER (PARTITION BY stock_id ORDER BY observed_at DESC, id DESC) n FROM stock_prices p WHERE stock_id = ANY($1::uuid[]) AND provider='vnstock' AND interval='1d' AND (observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= $2::date) q WHERE n <= 65 ORDER BY stock_id, observed_at`, { bind: [ids, session] }); if (new Set(prices.filter(row => String(row.observed_at).startsWith(session)).map(row => String(row.stock_id))).size !== ids.length) { result.skipped += 1; continue; }
      result.portfolios += 1; const snapshot = await createPositionExitSnapshot({ PortfolioTransaction, PortfolioEvent, StockPrice, PositionExitRun, PositionExitGuidance, HoldingReconciliationRun, HoldingReconciliationApplication, sequelize, portfolioId, transactions, events, priceRows: prices }); if (snapshot.status === 'created') result.created += 1;
    } return result;
  } finally { await releasePositionExitWorkerLease({ sequelize, leaseKey, ownerId, fencingToken: Number(lease.fencing_token) }); }
}
main().then(result => console.log(JSON.stringify(result))).catch(error => { console.error(`Exit shadow worker failed: ${error.message}`); process.exitCode = 1; }).finally(async () => sequelize.close());
