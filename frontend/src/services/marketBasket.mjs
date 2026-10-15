export function buildMarketBasket(rows = [], { limit = 8 } = {}) {
  const normalized = (Array.isArray(rows) ? rows : [])
    .filter(row => Number.isFinite(Number(row?.change ?? row?.change_pct)))
    .map(row => {
      const symbol = String(row.symbol || row.code || '').trim().toUpperCase()
      const change = Number(row.change ?? row.change_pct ?? 0)
      const volume = Number(row.volume ?? row.turnover ?? 0)
      const signal = change > 0 ? 'leader' : change < 0 ? 'laggard' : 'neutral'
      return {
        symbol,
        name: String(row.name || row.company || symbol || '—').trim() || symbol || '—',
        price: Number(row.price ?? row.close ?? row.last_price ?? 0),
        change_pct: Number(change.toFixed(2)),
        volume,
        signal,
        trend: signal === 'leader' ? 'up' : signal === 'laggard' ? 'down' : 'flat',
        source: row.quote ? 'live' : 'eod'
      }
    })

  const sorted = normalized.slice().sort((left, right) => {
    if (right.change_pct !== left.change_pct) return right.change_pct - left.change_pct
    if (right.volume !== left.volume) return right.volume - left.volume
    return left.symbol.localeCompare(right.symbol)
  })

  const items = sorted.slice(0, Math.max(1, Number(limit) || 8)).map((item, index) => ({
    ...item,
    rank: index + 1,
    displayChange: `${item.change_pct > 0 ? '+' : ''}${item.change_pct.toFixed(2)}%`
  }))

  const leaders = Math.min(3, items.filter(item => item.change_pct > 0).length)
  const laggards = Math.min(2, items.filter(item => item.change_pct < 0).length)
  const neutral = Math.max(0, items.length - leaders - laggards)
  const avgReturn = items.length ? Number((items.reduce((sum, item) => sum + item.change_pct, 0) / items.length).toFixed(2)) : 0

  return {
    summary: {
      leaders,
      laggards,
      neutral,
      avg_return: avgReturn,
      total: items.length
    },
    items
  }
}
