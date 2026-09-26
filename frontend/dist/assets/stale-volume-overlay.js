(() => {
  const cache = new Map()
  const load = async () => {
    try {
      const response = await fetch('/api/stocks?page=1&pageSize=500', { cache: 'no-store' })
      if (!response.ok) return
      const payload = await response.json()
      for (const item of payload.data || []) cache.set(String(item.code || '').toUpperCase(), item)
      annotate()
    } catch (_) {}
  }
  const annotate = () => {
    document.querySelectorAll('.table-panel tbody tr').forEach(row => {
      const symbol = row.querySelector('td.symbol')?.textContent?.trim().toUpperCase()
      const item = cache.get(symbol)
      if (!symbol || !item) return
      const volumeCell = row.cells?.[4]
      if (!volumeCell) return
      volumeCell.title = item.data_is_stale
        ? `Dữ liệu phiên ${item.data_session_date || 'cũ'}`
        : `Dữ liệu phiên ${item.data_session_date || 'mới nhất'}`
      let badge = volumeCell.querySelector('[data-stale-volume]')
      if (item.data_is_stale && !badge) {
        badge = document.createElement('small')
        badge.dataset.staleVolume = '1'
        badge.setAttribute('data-stale-volume', '1')
        badge.textContent = ' · cũ'
        badge.style.cssText = 'color:#fbbf24;font-size:10px;font-weight:700'
        volumeCell.appendChild(badge)
      } else if (!item.data_is_stale && badge) badge.remove()
    })
  }
  load()
  setInterval(load, 60000)
  new MutationObserver(annotate).observe(document.body, { childList: true, subtree: true })
})()
