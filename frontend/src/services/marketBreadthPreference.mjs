export const MARKET_BREADTH_SCOPE_KEY = 'stockpilot-market-breadth-scope-v1'

const EXCHANGES = new Set(['', 'HSX', 'HNX', 'UPCOM'])
const SECTORS = new Set(['', 'technology', 'banking_finance', 'securities', 'real_estate', 'energy_resources', 'manufacturing', 'consumer_retail', 'construction_infrastructure', 'other'])

export function normalizeMarketBreadthScope(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const exchange = typeof value.exchange === 'string' ? value.exchange.trim().toUpperCase() : ''
  const sector = typeof value.sector === 'string' ? value.sector.trim() : ''
  return EXCHANGES.has(exchange) && SECTORS.has(sector) ? { exchange, sector } : null
}

export function readMarketBreadthScope(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(MARKET_BREADTH_SCOPE_KEY)
    if (raw == null) return { exchange: '', sector: '' }
    return normalizeMarketBreadthScope(JSON.parse(raw)) || { exchange: '', sector: '' }
  } catch { return { exchange: '', sector: '' } }
}

export function parseMarketBreadthStorageValue(raw) {
  if (raw == null) return { exchange: '', sector: '' }
  try { return normalizeMarketBreadthScope(JSON.parse(raw)) } catch { return null }
}
