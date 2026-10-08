const text = value => String(value || '').trim()

export function sortPositions(entries = [], sort = 'symbol', language = 'vi') {
  const locale = language === 'en' ? 'en' : 'vi'
  return [...entries].sort((a, b) => {
    if (sort === 'value') return (Number(b?.market_value) || 0) - (Number(a?.market_value) || 0) || text(a?.symbol).localeCompare(text(b?.symbol), locale, { sensitivity: 'base' })
    if (sort === 'pnl') return (Number(b?.unrealized_pnl) || 0) - (Number(a?.unrealized_pnl) || 0) || text(a?.symbol).localeCompare(text(b?.symbol), locale, { sensitivity: 'base' })
    return text(a?.symbol).localeCompare(text(b?.symbol), locale, { sensitivity: 'base' })
  })
}
