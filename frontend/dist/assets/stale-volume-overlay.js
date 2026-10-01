(() => {
  const cache = new Map()
  const annotate = () => {
    document.querySelectorAll('.table-panel:not([data-react-market-board]) tbody tr').forEach(row => {
      const symbol = row.querySelector('.symbol')?.textContent?.trim().split(/\s+/)[0].toUpperCase()
      const item = cache.get(symbol)
      const volumeCell = row.cells?.[4]
      if (!symbol || !item || !volumeCell) return
      volumeCell.title = `Dữ liệu phiên ${item.data_session_date || 'cũ'}`
      if (!volumeCell.querySelector('[data-stale-volume]')) {
        const badge = document.createElement('small')
        badge.dataset.staleVolume = '1'
        badge.textContent = ' · cũ'
        badge.style.cssText = 'color:#fbbf24;font-size:10px;font-weight:700'
        volumeCell.append(badge)
      }
    })
  }
  const load = async () => {
    try {
      const response = await fetch('/api/stocks/data-quality', { cache: 'no-store' })
      if (!response.ok) return
      const payload = await response.json()
      const quality = payload.data || {}
      cache.clear()
      for (const symbol of quality.missing_symbols || []) cache.set(String(symbol).toUpperCase(), { data_session_date: quality.session_date })
      annotate()
    } catch (_) {}
  }
  load()
  setInterval(load, 60000)
  window.addEventListener('stockpilot:react-commit', annotate)
})()
