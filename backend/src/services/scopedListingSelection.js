'use strict';

function parseListingSymbols(args = []) {
  if (!args.length) return null;
  if (args.length !== 1 || !args[0].startsWith('--symbols=')) throw new Error('Usage: sync-vnstock-listing.cjs [--symbols=MCH,OTHER]');
  const symbols = args[0].slice('--symbols='.length).split(',').map(value => value.trim().toUpperCase());
  if (!symbols.length || symbols.length > 30 || symbols.some(value => !/^[A-Z0-9]{1,10}$/.test(value)) || new Set(symbols).size !== symbols.length) throw new Error('Specify 1 to 30 unique valid symbols');
  return symbols;
}

function selectRequestedListings(rows, symbols) {
  return symbols.map(symbol => {
    const matches = rows.filter(row => String(row.symbol || row.code || '').trim().toUpperCase() === symbol);
    if (matches.length !== 1) throw new Error(`Expected exactly one provider listing for ${symbol}`);
    const row = matches[0];
    if (String(row.type || '').toUpperCase() !== 'STOCK' || !['HSX', 'HOSE', 'HNX', 'UPCOM'].includes(String(row.exchange || '').toUpperCase()) || !String(row.name || row.organ_name || row.organ_short_name || '').trim()) throw new Error(`Incomplete or unsupported stock listing for ${symbol}`);
    return row;
  });
}
module.exports = { parseListingSymbols, selectRequestedListings };
