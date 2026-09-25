'use strict';

function normalizeListingRow(row = {}) {
  const code = String(row.symbol || row.code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{1,10}$/.test(code)) return null;
  const exchange = String(row.exchange || '').trim().slice(0, 40) || null;
  const listingStatus = !exchange ? 'unknown' : exchange.toUpperCase() === 'DELISTED' ? 'delisted' : 'listed';
  return {
    code,
    name: String(row.name || row.organ_name || row.organ_short_name || '').trim().slice(0, 255) || null,
    industry: String(row.industry || row.icb_name || '').trim().slice(0, 255) || null,
    exchange,
    listing_status: listingStatus
  };
}

async function syncStockListings({ Stock, rows = [], symbols = null, checkedAt = new Date() } = {}) {
  if (!Stock || typeof Stock.findOrCreate !== 'function') throw new Error('Stock model is required');
  const allowed = symbols == null ? null : new Set([...symbols].map(code => String(code).trim().toUpperCase()));
  const seen = new Set();
  const result = { received: rows.length, created: 0, updated: 0, unchanged: 0, skipped: 0, checked: 0 };
  for (const sourceRow of rows) {
    const row = normalizeListingRow(sourceRow);
    if (!row || seen.has(row.code) || (allowed && !allowed.has(row.code))) { result.skipped += 1; continue; }
    seen.add(row.code);
    const [stock, created] = await Stock.findOrCreate({
      where: { code: row.code },
      defaults: { code: row.code, name: row.name || row.code, industry: row.industry, exchange: row.exchange, listing_status: row.listing_status, listing_checked_at: checkedAt }
    });
    if (created) { result.created += 1; result.checked += 1; continue; }
    const changes = {};
    for (const field of ['name', 'industry', 'exchange', 'listing_status']) {
      if (row[field] != null && stock[field] !== row[field]) changes[field] = row[field];
    }
    const metadataChanged = Object.keys(changes).length > 0;
    await stock.update({ ...changes, listing_checked_at: checkedAt });
    result.checked += 1;
    if (metadataChanged) { result.updated += 1; }
    else result.unchanged += 1;
  }
  return result;
}

module.exports = { normalizeListingRow, syncStockListings };
