(() => {
  const cache = new Map()
  const load = async () => {
    try {
      const response = await fetch('/api/stocks/data-quality', { cache: 'no-store' })
      if (!response.ok) return
      const payload = await response.json()
      const quality = payload.data || {}
      const missing = new Set((quality.missing_symbols || []).map(symbol => String(symbol).toUpperCase()))
      cache.clear()
      for (const symbol of missing) cache.set(symbol, { data_is_stale: true, data_session_date: quality.session_date })
      annotate()
    } catch (_) {}
  }
  const annotate = () => {
    document.querySelectorAll('.table-panel tbody tr').forEach(row => {
      const symbolCell = row.querySelector('td.symbol') || row.cells?.[0]
      const symbolNode = [...(symbolCell?.childNodes || [])].find(node => node.nodeType === 3 && node.textContent.trim())
        || symbolCell?.firstElementChild
      const symbol = symbolNode?.textContent?.trim().toUpperCase()
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
