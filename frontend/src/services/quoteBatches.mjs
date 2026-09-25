/**
 * Keep realtime quote requests bounded as the market universe grows.
 * The backend currently accepts up to 200 symbols per request; 100 leaves
 * headroom for future provider limits and keeps each request responsive.
 */
export function splitQuoteSymbols(symbols = [], batchSize = 100) {
  const size = Math.max(1, Number(batchSize) || 100)
  const normalized = [...new Set(symbols.map(symbol => String(symbol || '').trim().toUpperCase()).filter(Boolean))]
  const batches = []
  for (let index = 0; index < normalized.length; index += size) batches.push(normalized.slice(index, index + size))
  return batches
}

/** Merge successful settled responses while tolerating an individual batch failure. */
export function mergeSettledQuotes(results = [], parseQuotes = value => value || {}) {
  return results
    .filter(result => result?.status === 'fulfilled')
    .reduce((merged, result) => ({ ...merged, ...parseQuotes(result.value) }), {})
}
