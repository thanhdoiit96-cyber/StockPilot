const text = value => String(value || '').trim()

export function watchlistIndustries(entries = [], language = 'vi') {
  return [...new Set(entries.map(entry => text(entry?.Stock?.industry)).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, language === 'en' ? 'en' : 'vi', { sensitivity: 'base' }))
}

export function sortWatchlist(entries = [], sort = 'recent', language = 'vi') {
  const locale = language === 'en' ? 'en' : 'vi'
  return [...entries].sort((a, b) => {
    if (sort === 'symbol') return text(a?.Stock?.code).localeCompare(text(b?.Stock?.code), locale, { sensitivity: 'base' })
    if (sort === 'company') return text(a?.Stock?.name).localeCompare(text(b?.Stock?.name), locale, { sensitivity: 'base' }) || text(a?.Stock?.code).localeCompare(text(b?.Stock?.code), locale)
    if (sort === 'updated') return (Date.parse(b?.metadata_updated_at || b?.created_at || '') || 0) - (Date.parse(a?.metadata_updated_at || a?.created_at || '') || 0) || text(a?.Stock?.code).localeCompare(text(b?.Stock?.code), locale)
    return (Date.parse(b?.created_at || '') || 0) - (Date.parse(a?.created_at || '') || 0) || text(a?.Stock?.code).localeCompare(text(b?.Stock?.code), locale)
  })
}

export function filterWatchlist(entries = [], industry = '', status = '') {
  return entries.filter(entry => (!industry || text(entry?.Stock?.industry) === industry) && (!status || text(entry?.status || 'WATCHING') === status))
}
