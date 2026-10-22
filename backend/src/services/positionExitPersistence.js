'use strict';
const crypto = require('crypto');
const { summarizePortfolioHoldings } = require('./portfolioAccounting');
const { buildPositionExitGuidance, sessionDate } = require('./positionExitGuidance');
const { sealHoldingReconciliationSnapshot } = require('./holdingReconciliationPersistence');

const canonicalJson = value => Array.isArray(value) ? `[${value.map(canonicalJson).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}` : JSON.stringify(value);
const hash = value => crypto.createHash('sha256').update(canonicalJson(value)).digest('hex');
const rowValue = row => row?.toJSON ? row.toJSON() : row;

function preparePositionExitSnapshot({ portfolioId, transactions = [], events = [], priceRows = [], provider = 'vnstock', reconciliations = [], reconciliationRun = null } = {}) {
  const rows = priceRows.map(rowValue).filter(row => row.provider === provider && row.interval === '1d');
  const byStock = new Map();
  for (const row of rows) { const key = String(row.stock_id); if (!byStock.has(key)) byStock.set(key, []); byStock.get(key).push(row); }
  const open = summarizePortfolioHoldings(transactions.map(rowValue), new Map()).filter(item => item.status === 'open');
  const reconciliationByStock = new Map(reconciliations.map(item => [String(item.stock_id), item]));
  const guidance = open.map(position => {
    const stockEvents = events.map(rowValue).filter(event => String(event.stock_id) === String(position.stock_id) && ['PENDING', 'CONFIRMED'].includes(event.status));
    const holdingReconciliation = reconciliationByStock.get(String(position.stock_id)) || null;
    return { stock_id: position.stock_id, ...buildPositionExitGuidance({ position, priceRows: byStock.get(String(position.stock_id)) || [], hasUnappliedCorporateAction: !holdingReconciliation && stockEvents.length > 0, holdingReconciliation }) };
  });
  const asOf = rows.map(row => sessionDate(row.observed_at)).filter(Boolean).sort().at(-1) || null;
  const inputProvenance = {
    version: 'position_exit_input_v1', portfolio_id: portfolioId, provider, interval: '1d', as_of: asOf,
    transaction_count: transactions.length, open_positions: open.length, price_rows: rows.length,
    price_contracts: [...new Set(rows.map(row => [row.provider, row.interval, row.currency || null, row.price_unit || null, row.is_adjusted].join('|')))].sort(),
    corporate_event_count: events.length, reconciliation_run_id: reconciliationRun?.run_id || null, reconciliation_snapshot_sha256: reconciliationRun?.snapshot_sha256 || null
  };
  return { as_of: asOf, guidance, input_provenance: inputProvenance, input_provenance_sha256: hash(inputProvenance) };
}

function positionExitGenerationKey({ portfolioId, asOf, provider, inputHash }) { return hash({ portfolio_id: portfolioId, as_of: asOf, provider, model: 'position_exit_rule_v1', input_provenance_sha256: inputHash }); }
function positionExitSnapshotHash({ portfolioId, asOf, provider, inputHash, guidance }) { return hash({ version: 'position_exit_snapshot_v1', portfolio_id: portfolioId, as_of: asOf, provider, input_provenance_sha256: inputHash, guidance: guidance.map(item => ({ stock_id: item.stock_id, status: item.status, payload: item })).sort((a, b) => String(a.stock_id).localeCompare(String(b.stock_id))) }); }

async function createPositionExitSnapshot({ PortfolioTransaction, PortfolioEvent, StockPrice, PositionExitRun, PositionExitGuidance, HoldingReconciliationRun, HoldingReconciliationApplication, sequelize, portfolioId, provider = 'vnstock', now = new Date() } = {}) {
  const write = async transaction => {
    const [transactions, events, priceRows] = await Promise.all([
      PortfolioTransaction.findAll({ where: { portfolio_id: portfolioId }, order: [['traded_at', 'ASC'], ['created_at', 'ASC'], ['id', 'ASC']], transaction }),
      PortfolioEvent.findAll({ where: { portfolio_id: portfolioId }, transaction }),
      StockPrice.findAll({ where: { provider, interval: '1d' }, order: [['observed_at', 'ASC'], ['id', 'ASC']], limit: 200000, transaction })
    ]);
    const preliminary = preparePositionExitSnapshot({ portfolioId, transactions, events, priceRows, provider });
    if (!preliminary.as_of) return { status: 'eod_unavailable', guidance: preliminary.guidance.length };
    if (!HoldingReconciliationRun || !HoldingReconciliationApplication) return { status: 'reconciliation_unavailable', guidance: preliminary.guidance.length };
    const reconciliation = await sealHoldingReconciliationSnapshot({ HoldingReconciliationRun, HoldingReconciliationApplication, portfolioId, asOf: preliminary.as_of, transactions, events, now, transaction });
    const prepared = preparePositionExitSnapshot({ portfolioId, transactions, events, priceRows, provider, reconciliations: reconciliation.applications, reconciliationRun: reconciliation });
    const generation_key = positionExitGenerationKey({ portfolioId, asOf: prepared.as_of, provider, inputHash: prepared.input_provenance_sha256 });
    const existing = await PositionExitRun.findOne({ where: { generation_key }, transaction });
    if (existing) return { status: 'snapshot_exists', run_id: existing.id, as_of: existing.as_of };
    const snapshot_sha256 = positionExitSnapshotHash({ portfolioId, asOf: prepared.as_of, provider, inputHash: prepared.input_provenance_sha256, guidance: prepared.guidance });
    const run = await PositionExitRun.create({ portfolio_id: portfolioId, as_of: prepared.as_of, provider, model: 'position_exit_rule_v1', generation_key, input_provenance: prepared.input_provenance, input_provenance_sha256: prepared.input_provenance_sha256, snapshot_sha256, status: 'shadow', created_at: now }, { transaction });
    if (prepared.guidance.length) await PositionExitGuidance.bulkCreate(prepared.guidance.map(item => ({ run_id: run.id, stock_id: item.stock_id, status: item.status, payload: item, payload_sha256: hash(item), created_at: now })), { transaction });
    return { status: 'created', run_id: run.id, as_of: prepared.as_of, guidance: prepared.guidance.length, snapshot_sha256 };
  };
  return sequelize?.transaction ? sequelize.transaction({ isolationLevel: 'REPEATABLE READ' }, write) : write();
}

module.exports = { preparePositionExitSnapshot, positionExitGenerationKey, positionExitSnapshotHash, createPositionExitSnapshot };
