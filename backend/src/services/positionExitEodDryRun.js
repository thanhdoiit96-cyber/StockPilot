'use strict';
const crypto = require('node:crypto');
const { summarizePortfolioHoldings } = require('./portfolioAccounting');
const { preparePositionExitSnapshot } = require('./positionExitPersistence');
const { sessionDate: toSessionDate } = require('./positionExitGuidance');

const MAX_HOLDINGS_PER_PORTFOLIO = 100;
const MAX_PRICE_ROWS_PER_PORTFOLIO = 6500;
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const plain = row => row?.toJSON ? row.toJSON() : row;

function runKey({ provider, sessionDate, triggerId }) { return hash({ version: 'position_exit_eod_dry_run_v1', provider, session_date: sessionDate, model: 'position_exit_rule_v1', trigger_id: triggerId }); }

async function runPositionExitEodDryRun({ Portfolio, PortfolioTransaction, PortfolioEvent, StockPrice, PositionExitGeneratorRun, sequelize, provider = 'vnstock', sessionDate, triggerId, ownerId, now = new Date() } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(sessionDate || ''))) throw new Error('sessionDate must be YYYY-MM-DD');
  if (!String(triggerId || '').trim() || !String(ownerId || '').trim()) throw new Error('triggerId and ownerId are required');
  const key = runKey({ provider, sessionDate, triggerId });
  const execute = async transaction => {
  const existing = await PositionExitGeneratorRun.findOne({ where: { run_key: key }, transaction });
  if (existing) return { status: 'run_exists', run_id: existing.id, session_date: sessionDate };
  const portfolios = await Portfolio.findAll({ attributes: ['id'], transaction });
  const summary = { portfolios_seen: portfolios.length, portfolios_attempted: 0, portfolios_scope_limited: 0, holdings_candidate: 0, price_rows_read: 0, holdings_with_session_eod: 0, guidance_statuses: {} };
  for (const portfolioRow of portfolios) {
    const portfolioId = plain(portfolioRow).id;
    const [transactions, events] = await Promise.all([
      PortfolioTransaction.findAll({ where: { portfolio_id: portfolioId }, order: [['traded_at', 'ASC'], ['created_at', 'ASC'], ['id', 'ASC']], transaction }),
      PortfolioEvent.findAll({ where: { portfolio_id: portfolioId }, transaction })
    ]);
    const holdings = summarizePortfolioHoldings(transactions.map(plain), new Map()).filter(item => item.status === 'open');
    if (!holdings.length) continue;
    summary.portfolios_attempted += 1;
    summary.holdings_candidate += holdings.length;
    if (holdings.length > MAX_HOLDINGS_PER_PORTFOLIO) { summary.portfolios_scope_limited += 1; continue; }
    const stockIds = holdings.map(item => item.stock_id);
    const [prices] = await StockPrice.sequelize.query(`
      SELECT stock_id, provider, interval, observed_at, close, price, high, low, currency, price_unit, is_adjusted, id
      FROM (
        SELECT p.*, ROW_NUMBER() OVER (PARTITION BY p.stock_id ORDER BY p.observed_at DESC NULLS LAST, p.id DESC) AS row_number
        FROM stock_prices p
        WHERE p.stock_id = ANY($1::uuid[]) AND p.provider = $2 AND p.interval = '1d'
          AND (p.observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= $3::date
      ) bounded WHERE row_number <= 65 ORDER BY stock_id ASC, observed_at ASC, id ASC
    `, { bind: [stockIds, provider, sessionDate], transaction });
    const rows = prices.map(plain);
    summary.price_rows_read += rows.length;
    const prepared = preparePositionExitSnapshot({ portfolioId, transactions, events, priceRows: rows, provider });
    const sessionRows = new Set(rows.filter(row => toSessionDate(row.observed_at) === sessionDate).map(row => String(row.stock_id)));
    summary.holdings_with_session_eod += stockIds.filter(id => sessionRows.has(String(id))).length;
    for (const guidance of prepared.guidance) {
      const status = sessionRows.has(String(guidance.stock_id)) ? guidance.status : 'unavailable_eod_session_missing';
      summary.guidance_statuses[status] = (summary.guidance_statuses[status] || 0) + 1;
    }
  }
  const inputEvidence = { version: 'position_exit_eod_dry_run_v1', provider, session_date: sessionDate, trigger_id: triggerId, owner_id: ownerId, limits: { holdings_per_portfolio: MAX_HOLDINGS_PER_PORTFOLIO, price_rows_per_portfolio: MAX_PRICE_ROWS_PER_PORTFOLIO }, provider_requests: 0 };
  const payload = { run_key: key, trigger_id: triggerId, provider, session_date: sessionDate, model: 'position_exit_rule_v1', owner_id: ownerId, mode: 'dry_run', status: 'completed', input_evidence: inputEvidence, result_summary: summary, created_at: now };
  const run = transaction
    ? await PositionExitGeneratorRun.create(payload, { transaction })
    : await PositionExitGeneratorRun.create(payload);
  return { status: 'completed', run_id: run.id, session_date: sessionDate, input_evidence: inputEvidence, result_summary: summary };
  };
  if (!sequelize?.transaction) return execute(undefined);
  return sequelize.transaction({ isolationLevel: 'REPEATABLE READ' }, async transaction => {
    const [rows] = await sequelize.query("SELECT pg_try_advisory_xact_lock(hashtext($1)) AS locked", { bind: [`position-exit-eod:${provider}:${sessionDate}:position_exit_rule_v1`], transaction });
    const locked = rows?.[0]?.locked;
    if (!(locked === true || locked === 't' || locked === 1)) return { status: 'lock_unavailable', session_date: sessionDate };
    return execute(transaction);
  });
}

module.exports = { MAX_HOLDINGS_PER_PORTFOLIO, MAX_PRICE_ROWS_PER_PORTFOLIO, runKey, runPositionExitEodDryRun };
