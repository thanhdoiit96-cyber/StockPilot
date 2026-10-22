'use strict';
const crypto = require('crypto');
const { reconcileCurrentHoldings } = require('./currentHoldingReconciliation');

const canonicalJson = value => Array.isArray(value) ? `[${value.map(canonicalJson).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}` : JSON.stringify(value);
const hash = value => crypto.createHash('sha256').update(canonicalJson(value)).digest('hex');

function prepareHoldingReconciliationSnapshot({ portfolioId, asOf, transactions = [], events = [] } = {}) {
  const applications = reconcileCurrentHoldings({ transactions, events, asOf });
  const input_provenance = {
    version: 'current_holding_reconciliation_input_v1', portfolio_id: portfolioId, as_of: asOf, transaction_count: transactions.length, corporate_event_count: events.length,
    application_counts: applications.reduce((counts, item) => ({ ...counts, [item.status]: (counts[item.status] || 0) + 1 }), {})
  };
  return { as_of: asOf, applications, input_provenance, input_provenance_sha256: hash(input_provenance) };
}

function holdingReconciliationGenerationKey({ portfolioId, asOf, inputHash }) { return hash({ portfolio_id: portfolioId, as_of: asOf, model: 'current_holding_reconciliation_v1', input_provenance_sha256: inputHash }); }
function holdingReconciliationSnapshotHash({ portfolioId, asOf, inputHash, applications }) { return hash({ version: 'current_holding_reconciliation_snapshot_v1', portfolio_id: portfolioId, as_of: asOf, input_provenance_sha256: inputHash, applications: applications.map(item => ({ stock_id: item.stock_id, status: item.status, payload: item })).sort((a, b) => String(a.stock_id).localeCompare(String(b.stock_id))) }); }

async function sealHoldingReconciliationSnapshot({ HoldingReconciliationRun, HoldingReconciliationApplication, portfolioId, asOf, transactions = [], events = [], now = new Date(), transaction } = {}) {
  const prepared = prepareHoldingReconciliationSnapshot({ portfolioId, asOf, transactions, events });
  const generation_key = holdingReconciliationGenerationKey({ portfolioId, asOf, inputHash: prepared.input_provenance_sha256 });
  const existing = await HoldingReconciliationRun.findOne({ where: { generation_key }, transaction });
  if (existing) return { status: 'snapshot_exists', run_id: existing.id, snapshot_sha256: existing.snapshot_sha256, ...prepared };
  const snapshot_sha256 = holdingReconciliationSnapshotHash({ portfolioId, asOf, inputHash: prepared.input_provenance_sha256, applications: prepared.applications });
  const run = await HoldingReconciliationRun.create({ portfolio_id: portfolioId, as_of: asOf, model: 'current_holding_reconciliation_v1', generation_key, input_provenance: prepared.input_provenance, input_provenance_sha256: prepared.input_provenance_sha256, snapshot_sha256, status: 'sealed', created_at: now }, { transaction });
  if (prepared.applications.length) await HoldingReconciliationApplication.bulkCreate(prepared.applications.map(item => ({ run_id: run.id, stock_id: item.stock_id, status: item.status, payload: item, payload_sha256: hash(item), created_at: now })), { transaction });
  return { status: 'created', run_id: run.id, snapshot_sha256, ...prepared };
}

module.exports = { prepareHoldingReconciliationSnapshot, holdingReconciliationGenerationKey, holdingReconciliationSnapshotHash, sealHoldingReconciliationSnapshot };
