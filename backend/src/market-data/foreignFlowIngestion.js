'use strict';

async function ingestForeignFlow({ records = [], Stock, ForeignFlowDaily, sequelize } = {}) {
  if (!Stock || !ForeignFlowDaily || !sequelize) throw new TypeError('Stock, ForeignFlowDaily and sequelize are required');
  const report = { received: records.length, inserted: 0, updated: 0, skipped: 0, rejected: 0, errors: [] };
  const transaction = await sequelize.transaction();
  try {
    for (const record of records) {
      const stock = await Stock.findOne({ where: { code: record.symbol }, transaction });
      if (!stock) { report.rejected += 1; report.errors.push({ symbol: record.symbol, reason: 'stock_not_found' }); continue; }
      const where = { stock_id: stock.id, provider: record.provider, source: record.source, session_date: record.session_date };
      const values = { ...where, provider_symbol: record.provider_symbol, buy_volume: record.buy_volume, sell_volume: record.sell_volume, buy_value: record.buy_value, sell_value: record.sell_value, currency: record.currency, license: record.license, license_url: record.license_url, source_hash: record.source_hash, fetched_at: new Date(record.fetched_at), updated_at: new Date() };
      const existing = await ForeignFlowDaily.findOne({ where, transaction });
      if (existing?.source_hash === record.source_hash) { report.skipped += 1; continue; }
      if (existing) { await existing.update(values, { transaction }); report.updated += 1; }
      else { await ForeignFlowDaily.create(values, { transaction }); report.inserted += 1; }
    }
    await transaction.commit();
    return report;
  } catch (error) { await transaction.rollback(); throw error; }
}
module.exports = { ingestForeignFlow };
