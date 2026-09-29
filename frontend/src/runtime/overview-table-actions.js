(() => {
  const installQuoteRequestGuard = () => {
    if (window.__stockpilotQuoteRequestGuard) return
    window.__stockpilotQuoteRequestGuard = true
    const nativeFetch = window.fetch.bind(window)
    const cache = new Map()
    const pending = new Map()
    const gatedAnalysis = new Map()
    let analysisRequested = false
    window.__stockpilotRequestAnalysis = () => {
      analysisRequested = true
      for (const [key, request] of gatedAnalysis) {
        gatedAnalysis.delete(key)
        nativeFetch(request.input, request.init).then(request.resolve, request.reject)
      }
    }
    const ttl = 15000
    window.fetch = (input, init = {}) => {
      const request = new Request(input, init)
      const requestUrl = new URL(request.url, window.location.href)
      const isAnalysisRequest = /^\/api\/stocks\/[^/]+\/analysis$/.test(requestUrl.pathname)
      if (isAnalysisRequest && !analysisRequested) {
        const key = request.url
        return new Promise((resolve, reject) => gatedAnalysis.set(key, { input, init, resolve, reject }))
      }
      const isStockList = requestUrl.pathname === '/api/stocks'
      const isQuoteRequest = /\/api\/stocks\/quotes(?:\/status)?$/.test(requestUrl.pathname)
      if (request.method !== 'GET' || (!isStockList && !isQuoteRequest)) return nativeFetch(input, init)
      const key = request.url
      const now = Date.now()
      const cached = cache.get(key)
      const fallbackStockCache = isStockList ? [...cache.entries()]
        .filter(([entryKey, entry]) => entry.status === 200 && entry.body && entryKey !== key)
        .sort((a, b) => b[1].at - a[1].at)[0]?.[1] : null
      const cacheTtl = cached?.status === 429 ? 8000 : isStockList ? 8000 : ttl
      if (cached && now - cached.at < cacheTtl) return Promise.resolve(new Response(cached.body, { status: cached.status, headers: cached.headers }))
      if (pending.has(key)) return pending.get(key).then(response => response.clone())
      const task = nativeFetch(input, init).then(async response => {
        if (response.status === 429 && isStockList && (cached?.body || fallbackStockCache?.body)) {
          const stale = cached || fallbackStockCache
          return new Response(stale.body, { status: 200, headers: [...stale.headers, ['x-stockpilot-stale', 'rate-limited']] })
        }
        if (response.ok) {
          const body = await response.text()
          let cacheable = true
          if (isStockList) {
            try { cacheable = JSON.parse(body)?.success === true && Array.isArray(JSON.parse(body)?.data) } catch (_) { cacheable = false }
          }
          if (cacheable) cache.set(key, { at: Date.now(), body, status: response.status, headers: [...response.headers.entries()] })
          return new Response(body, { status: response.status, headers: response.headers })
        }
        return response
      }).finally(() => pending.delete(key))
      pending.set(key, task)
      return task.then(response => response.clone())
    }
  }
  installQuoteRequestGuard()
  const styleId = 'overview-analysis-action-styles'
  const enhancedClass = 'overview-analysis-action'

  const installStyles = () => {
    if (document.getElementById(styleId)) return
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      .table-panel th:nth-child(2), .table-panel td:nth-child(2) { width: 23%; }
      .table-panel th:nth-child(5), .table-panel td:nth-child(5) { width: 13%; }
      .table-panel th:nth-child(7), .table-panel td:nth-child(7) { width: 18%; text-align: center; }
      .table-panel th:nth-child(8), .table-panel td:nth-child(8) { width: 10%; }
      .overview-analysis-action { display: flex; align-items: center; justify-content: center; min-width: 0; }
      .overview-analysis-action .rating-badge,
      .overview-analysis-action > small { display: none !important; }
      .overview-analysis-action .overview-analysis-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        width: min(100%, 148px);
        min-height: 34px;
        margin: 0;
        padding: 7px 10px;
        border: 1px solid rgba(94, 234, 212, .38);
        border-radius: 9px;
        background: linear-gradient(135deg, rgba(20, 184, 166, .18), rgba(59, 130, 246, .12));
        color: #ccfbf1;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, .04);
        font-size: .72rem;
        font-weight: 700;
        line-height: 1.2;
        text-align: center;
        white-space: nowrap;
        cursor: pointer;
        transition: transform .16s ease, border-color .16s ease, background .16s ease, box-shadow .16s ease;
      }
      .overview-analysis-action .overview-analysis-btn::before {
        content: '';
        flex: 0 0 14px;
        width: 14px;
        height: 14px;
        background: no-repeat center / contain url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235eead4' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 19V5'/%3E%3Cpath d='M4 19h16'/%3E%3Cpath d='m7 15 4-4 3 3 5-7'/%3E%3C/svg%3E");
      }
      .overview-analysis-action .overview-analysis-btn:hover,
      .overview-analysis-action .overview-analysis-btn:focus-visible {
        transform: translateY(-1px);
        border-color: #5eead4;
        background: linear-gradient(135deg, rgba(20, 184, 166, .3), rgba(59, 130, 246, .2));
        box-shadow: 0 8px 18px rgba(20, 184, 166, .14);
        outline: none;
      }
      .overview-analysis-action .overview-analysis-btn:focus-visible {
        box-shadow: 0 0 0 2px #0f172a, 0 0 0 4px rgba(94, 234, 212, .72);
      }
      .overview-next { display: none !important; }
      .breadth-snapshot { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 12px 0 2px; }
      .breadth-snapshot > div { display: grid; gap: 3px; padding: 10px 12px; border: 1px solid rgba(148, 163, 184, .16); border-radius: 10px; background: rgba(148, 163, 184, .025); }
      .breadth-snapshot span, .breadth-snapshot small { color: var(--muted); font-size: 10px; }
      .breadth-snapshot strong { font-size: 17px; line-height: 1.1; font-variant-numeric: tabular-nums; }
      .breadth-leaders { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 14px; }
      .breadth-leaders-header { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 2px; }.breadth-leaders-header strong, .breadth-leaders-header small { display: block; }.breadth-leaders-header strong { font-size: 12px; }.breadth-leaders-header small { margin-top: 3px; color: var(--muted); font-size: 10px; }
      .breadth-leader { min-width: 0; padding: 11px 12px; border: 1px solid rgba(148, 163, 184, .16); border-radius: 10px; background: rgba(148, 163, 184, .025); }
      .breadth-leader > strong, .breadth-leader > small { display: block; }.breadth-leader > strong { font-size: 12px; }.breadth-leader > small { margin-top: 3px; color: var(--muted); font-size: 10px; }
      .breadth-leader ol { display: grid; gap: 5px; margin: 10px 0 0; padding-left: 17px; color: var(--muted); font-size: 11px; }.breadth-leader li { display: flex; justify-content: space-between; gap: 8px; padding-left: 2px; }.breadth-leader li span { color: var(--text); font-weight: 700; }.breadth-leader li b { font-variant-numeric: tabular-nums; }.breadth-leader > p { margin: 10px 0 0; color: var(--muted); font-size: 10px; }
      .breadth-leader li span[data-breadth-symbol] { cursor: pointer; border-radius: 4px; }.breadth-leader li span[data-breadth-symbol]:hover, .breadth-leader li span[data-breadth-symbol]:focus-visible { color: var(--primary); outline: 2px solid rgba(94, 234, 212, .5); outline-offset: 2px; }
      .breadth-exchange-select { min-width: 96px; border: 1px solid var(--border); border-radius: 8px; padding: 7px 28px 7px 10px; color: var(--text); background: var(--panel); font: inherit; font-size: .8rem; }
      .dashboard-shell:not(.market-board-active) .table-panel { display: none !important; }
      .dashboard-shell.market-board-active .main-panel > :not(.topbar):not(.table-panel) { display: none !important; }
      .market-board-nav-item { position: relative; }
      .market-board-nav-item .nav-icon { width: 16px; height: 16px; flex: 0 0 16px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
      .market-session-timeline { margin: 0 0 14px; padding: 13px 14px 12px; border: 1px solid rgba(148, 163, 184, .16); border-radius: 12px; background: rgba(15, 23, 42, .28); }
      .market-session-timeline-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
      .market-session-timeline-title { display: flex; align-items: center; gap: 8px; }.market-session-timeline-title svg { width: 16px; height: 16px; fill: none; stroke: var(--primary); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
      .market-session-timeline strong { font-size: 12px; }.market-session-timeline small { color: var(--muted); font-size: 10px; }
      .market-session-updated { display: block; margin-top: 3px; color: var(--muted); font-size: 10px; }
      .market-session-timeline-legend { display: flex; gap: 10px; color: var(--muted); font-size: 10px; white-space: nowrap; }.market-session-timeline-legend i { display: inline-block; width: 7px; height: 7px; margin-right: 4px; border-radius: 50%; }.market-session-timeline-legend .price-dot { background: #60a5fa; }.market-session-timeline-legend .volume-dot { background: #5eead4; }
      .market-session-timeline-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; margin-top: 12px; padding: 10px 8px 0; border: 1px solid rgba(148, 163, 184, .14); border-radius: 9px; background: repeating-linear-gradient(to bottom, transparent 0, transparent 31px, rgba(148, 163, 184, .08) 32px); }
      .market-session-slot { min-width: 0; min-height: 104px; padding: 8px 7px 7px; border: 0; border-inline: 1px solid rgba(148, 163, 184, .07); background: transparent; }.market-session-slot.is-current { border-inline-color: rgba(94, 234, 212, .6); background: rgba(20, 184, 166, .08); }
      .market-session-slot > strong { display: block; font-size: 10px; text-align: center; }.market-session-bars { display: grid; grid-template-columns: 1fr 1fr; align-items: end; gap: 7px; height: 48px; margin: 7px 0 5px; }.market-session-bars > div { display: grid; grid-template-rows: 1fr auto; align-items: end; height: 100%; gap: 3px; text-align: center; }.market-session-bars span { color: var(--muted); font-size: 8px; }.market-session-bars i { display: block; width: 100%; min-height: 3px; border-radius: 3px 3px 1px 1px; }.market-session-bars .price-bar { background: #60a5fa; }.market-session-bars .volume-bar { background: #5eead4; opacity: .85; }
      .market-session-slot > small { display: block; overflow: hidden; text-overflow: ellipsis; text-align: center; white-space: nowrap; }.market-session-slot .market-session-empty { color: var(--muted); }
      .stock-detail-link { color: inherit; text-decoration: none; text-decoration-thickness: 2px; text-underline-offset: 3px; transition: color .15s ease, text-decoration-color .15s ease; }
      .stock-detail-link:hover, .stock-detail-link:focus-visible { color: var(--primary); text-decoration: underline; text-decoration-color: currentColor; }
      .stock-detail-link:focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; border-radius: 3px; }
      .stock-detail-row-link { cursor: pointer; }
      .stock-detail-row-link:hover > td, .stock-detail-row-link:focus-visible > td { color: var(--primary); background: rgba(94, 234, 212, .08); }
      .stock-detail-row-link:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
      @media (max-width: 700px) { .market-session-timeline-header { flex-direction: column; }.market-session-timeline-grid { gap: 4px; }.market-session-slot { padding-inline: 3px; } }
      @media (max-width: 700px) { .breadth-snapshot { grid-template-columns: 1fr; } }
      @media (max-width: 700px) { .breadth-leaders { grid-template-columns: 1fr; }.breadth-leaders-header { align-items: stretch; flex-direction: column; } }
      .table-panel .page-size-control:not(.overview-page-size-control) { display: none !important; }
      .table-panel .overview-original-result-count { display: none !important; }
      .table-panel > .panel-header {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        align-items: stretch;
        gap: 12px;
      }
      .table-panel .table-tools.overview-filter-row {
        display: grid;
        grid-template-columns: minmax(230px, .85fr) minmax(280px, 1.15fr);
        align-items: stretch;
        gap: 10px;
        width: 100%;
      }
      .table-panel .overview-filter-row .table-tabs {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: stretch;
        gap: 8px;
        width: 100%;
        padding: 0;
        border: 0;
        background: transparent;
      }
      .table-panel .overview-filter-row .tab-btn {
        min-height: 38px;
        border: 1px solid var(--border);
      }
      .table-panel .overview-filter-row .sector-select,
      .table-panel .overview-filter-row .table-search {
        width: 100%;
        min-width: 0;
        min-height: 38px;
      }
      .table-panel .table-pagination { flex-wrap: wrap; }
      .overview-pagination-summary {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-right: auto;
      }
      .overview-pagination-count {
        padding: 7px 10px;
        border: 1px solid rgba(148, 163, 184, .16);
        border-radius: 8px;
        background: rgba(148, 163, 184, .06);
        color: var(--muted);
        white-space: nowrap;
      }
      .overview-page-size-control {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--muted);
        white-space: nowrap;
      }
      .overview-page-size-control select {
        min-width: 68px;
        padding: 7px 28px 7px 10px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--panel);
        color: var(--text);
        font: inherit;
        cursor: pointer;
      }
      .overview-page-size-control select:focus-visible {
        border-color: var(--primary);
        outline: 2px solid rgba(94, 234, 212, .38);
        outline-offset: 2px;
      }
      @media (max-width: 1100px) {
        .table-panel th:nth-child(2), .table-panel td:nth-child(2) { width: 21%; }
        .table-panel th:nth-child(7), .table-panel td:nth-child(7) { width: 20%; }
        .overview-analysis-action .overview-analysis-btn { white-space: normal; }
      }
      @media (max-width: 620px) {
        .table-panel .table-tools.overview-filter-row {
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
          gap: 8px;
        }
        .table-panel .overview-filter-row .table-tabs { gap: 4px; }
        .table-panel .overview-filter-row .tab-btn { padding-inline: 8px; }
        .table-panel .overview-filter-row .sector-select { padding-inline: 7px; }
        .overview-pagination-summary {
          flex-basis: 100%;
          width: 100%;
          flex-wrap: wrap;
          justify-content: space-between;
          margin: 0 0 4px;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .overview-analysis-action .overview-analysis-btn { transition: none; }
        .overview-analysis-action .overview-analysis-btn:hover { transform: none; }
      }
    `
    document.head.appendChild(style)
  }

  let leadersLoading = false
  const loadBreadthLeaders = async (breadth, sector = '', exchange = '') => {
    if (leadersLoading || breadth.querySelector('.breadth-leaders')) return
    leadersLoading = true
    try {
      const response = await fetch(`/api/stocks?page=1&pageSize=40&q=&sector=${encodeURIComponent(sector)}&exchange=${encodeURIComponent(exchange)}&sort=volume&direction=desc&pinned=`, { cache: 'no-store' })
      const payload = await response.json()
      const rows = Array.isArray(payload?.data) ? payload.data : []
      let quotes = {}
      const symbols = rows.map(row => row.symbol || row.code).filter(Boolean).join(',')
      if (symbols) {
        try {
          const quoteResponse = await fetch(`/api/stocks/quotes?symbols=${encodeURIComponent(symbols)}`, { cache: 'no-store' })
          const quotePayload = await quoteResponse.json()
          quotes = quotePayload?.data && typeof quotePayload.data === 'object' ? quotePayload.data : {}
        } catch (_) { /* Keep database values when intraday is unavailable. */ }
      }
      const currentRows = rows.map(row => {
        const symbol = String(row.symbol || row.code || '').toUpperCase()
        const quote = quotes[symbol] || {}
        return { ...row, change: Number.isFinite(Number(quote.change)) ? Number(quote.change) : row.change, volume: Number.isFinite(Number(quote.volume)) ? Number(quote.volume) : row.volume }
      })
      const byChange = currentRows.filter(row => Number.isFinite(Number(row.change)) && Number(row.change) !== 0)
      const byVolume = currentRows.filter(row => Number.isFinite(Number(row.volume)) && Number(row.volume) > 0)
      const positiveChanges = byChange.filter(row => Number(row.change) > 0)
      const negativeChanges = byChange.filter(row => Number(row.change) < 0)
      const lists = [['Top tăng', byChange.sort((a, b) => Number(b.change) - Number(a.change)).slice(0, 5), 'change'], ['Top giảm', byChange.sort((a, b) => Number(a.change) - Number(b.change)).slice(0, 5), 'change'], ['Top khối lượng', byVolume.sort((a, b) => Number(b.volume) - Number(a.volume)).slice(0, 5), 'volume']]
      const wrapper = document.createElement('div')
      lists[0][1] = positiveChanges.sort((a, b) => Number(b.change) - Number(a.change)).slice(0, 5)
      lists[1][1] = negativeChanges.sort((a, b) => Number(a.change) - Number(b.change)).slice(0, 5)
      wrapper.className = 'breadth-leaders'
      wrapper.dataset.sector = sector
      wrapper.dataset.exchange = exchange
      wrapper.setAttribute('aria-label', 'Các mã dẫn dắt thị trường')
      wrapper.innerHTML = `<div class="breadth-leaders-header"><div><strong>Nhóm dẫn dắt</strong><small>${exchange ? `Sàn: ${exchange}` : sector ? `Nhóm ngành: ${sector}` : 'Toàn bộ danh sách hiện tại'}</small></div><select class="breadth-exchange-select" aria-label="Sàn cho Top list"><option value="">Tất cả sàn</option><option value="HSX">HSX</option><option value="HNX">HNX</option><option value="UPCOM">UPCOM</option></select></div>${lists.map(([label, items, field]) => `<section class="breadth-leader"><strong>${label}</strong><small>${field === 'change' ? 'Xếp theo % biến động' : 'Xếp theo khối lượng'}</small>${items.length ? `<ol>${items.map(row => `<li><span>${row.symbol || row.code || '—'}</span><b>${field === 'change' ? `${Number(row.change) >= 0 ? '+' : ''}${Number(row.change).toFixed(2)}%` : formatCompact(row.volume)}</b></li>`).join('')}</ol>` : '<p>Chưa có dữ liệu</p>'}</section>`).join('')}`
      const createdExchange = wrapper.querySelector('.breadth-exchange-select')
      if (createdExchange) {
        createdExchange.value = exchange
        createdExchange.setAttribute('aria-label', 'Sàn cho Top list, chỉ áp dụng cho nhóm dẫn dắt')
      }
      const scopeNote = wrapper.querySelector('.breadth-leaders-header small')
      if (scopeNote && !scopeNote.textContent.includes('chỉ áp dụng cho Top list')) scopeNote.textContent += ' · Sàn chỉ áp dụng cho Top list'
      wrapper.querySelectorAll('.breadth-leader > small').forEach(note => { if (note.textContent.includes('biến động')) note.textContent += ' intraday' })
      breadth.querySelector('.breadth-snapshot')?.after(wrapper)
      wrapper.querySelectorAll('.breadth-leader li span').forEach(symbolNode => {
        const symbol = symbolNode.textContent.trim()
        if (!symbol || symbol === '—') return
        symbolNode.dataset.breadthBound = '1'
        symbolNode.dataset.breadthSymbol = symbol
        symbolNode.tabIndex = 0
        symbolNode.setAttribute('role', 'button')
        symbolNode.setAttribute('aria-label', `Lọc bảng theo mã ${symbol}`)
        const focusTable = () => {
          const input = document.querySelector('.table-search')
          if (!input) return
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
          setter?.call(input, symbol)
          input.dispatchEvent(new Event('input', { bubbles: true }))
          input.scrollIntoView({ behavior: 'smooth', block: 'center' })
          input.focus({ preventScroll: true })
        }
        symbolNode.addEventListener('click', focusTable)
        symbolNode.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); focusTable() } })
      })
    } catch (_) {
      // Keep the breadth snapshot usable when the optional ranking request fails.
    } finally { leadersLoading = false }
  }
  const formatCompact = value => new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0))
  const marketSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '14:45']
  const marketViewKey = 'stockpilot-market-view'
  const boardSectorKey = 'stockpilot-board-sector'
  const marketToday = () => new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())
  const marketTimelineKey = () => `stockpilot-market-session:${new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())}`
  const readMarketTimeline = () => { try { return JSON.parse(sessionStorage.getItem(marketTimelineKey()) || '{}') || {} } catch (_) { return {} } }
  const updateMarketTimeline = () => {
    const panel = document.querySelector('.table-panel')
    const bodyRows = [...(panel?.querySelectorAll('tbody tr') || [])].filter(row => row.querySelector('.symbol'))
    if (!panel || !bodyRows.length) return
    const now = new Date()
    const minutes = now.getHours() * 60 + now.getMinutes()
    const slotIndex = minutes < 10 * 60 ? 0 : minutes < 11 * 60 ? 1 : minutes < 12 * 60 ? 2 : minutes < 14 * 60 ? 3 : minutes < 14 * 60 + 30 ? 4 : 5
    const values = bodyRows.map(row => {
      const changeText = row.cells[3]?.textContent?.replace(',', '.') || ''
      const volumeText = row.cells[4]?.textContent?.replace(/[^0-9-]/g, '') || ''
      const change = Number.parseFloat(changeText)
      const volume = Number(volumeText)
      return { change, volume }
    })
    const validChanges = values.map(item => item.change).filter(Number.isFinite)
    const totalVolume = values.map(item => item.volume).filter(value => Number.isFinite(value)).reduce((sum, value) => sum + value, 0)
    const snapshot = { change: validChanges.length ? validChanges.reduce((sum, value) => sum + value, 0) / validChanges.length : null, volume: totalVolume || null, observedAt: now.toISOString() }
    const timeline = readMarketTimeline(); timeline[marketSlots[slotIndex]] = snapshot
    try { sessionStorage.setItem(marketTimelineKey(), JSON.stringify(timeline)) } catch (_) { }
    const timelineNode = panel.querySelector('.market-session-timeline'); if (!timelineNode) return
    const updatedNode = timelineNode.querySelector('.market-session-updated')
    if (updatedNode) updatedNode.textContent = `Cập nhật lúc ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
    const snapshots = marketSlots.map(slot => timeline[slot]).filter(Boolean)
    const maxVolume = Math.max(1, ...snapshots.map(item => Number(item.volume) || 0))
    const maxChange = Math.max(1, ...snapshots.map(item => Math.abs(Number(item.change) || 0)))
    timelineNode.querySelectorAll('.market-session-slot').forEach((slotNode, index) => {
      const item = timeline[marketSlots[index]]
      slotNode.classList.toggle('is-current', index === slotIndex)
      slotNode.setAttribute('aria-label', item ? `${marketSlots[index]}: ${Number(item.change).toFixed(2)} phần trăm, khối lượng ${formatCompact(item.volume)}` : `${marketSlots[index]}: chưa có dữ liệu`)
      const priceBar = slotNode.querySelector('.price-bar'); const volumeBar = slotNode.querySelector('.volume-bar'); const valueNode = slotNode.querySelector('.market-session-value')
      if (!item) { priceBar.style.height = '3px'; volumeBar.style.height = '3px'; valueNode.textContent = '—'; return }
      priceBar.style.height = `${Math.max(8, Math.abs(Number(item.change) / maxChange) * 100)}%`; priceBar.style.background = Number(item.change) >= 0 ? '#60a5fa' : '#fb7185'; volumeBar.style.height = `${Math.max(8, Number(item.volume) / maxVolume * 100)}%`; valueNode.textContent = `${Number(item.change) >= 0 ? '+' : ''}${Number(item.change).toFixed(2)}% · ${formatCompact(item.volume)}`
    })
  }
  const ensureMarketTimeline = () => {
    const panel = document.querySelector('.table-panel'); if (!panel) return
    let timeline = panel.querySelector('.market-session-timeline')
    if (!timeline) {
      timeline = document.createElement('section'); timeline.className = 'market-session-timeline'; timeline.setAttribute('aria-label', 'Biến động giá và khối lượng trong ngày')
      timeline.innerHTML = `<div class="market-session-timeline-header"><div><div class="market-session-timeline-title"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18V6m0 12h16M7 14l3-3 3 2 5-6"/></svg><strong>Biến động trong ngày · ${marketToday()}</strong></div><small>Một biểu đồ chung theo trục thời gian, phạm vi danh sách đang hiển thị</small><span class="market-session-updated">Chưa có snapshot</span></div><div class="market-session-timeline-legend"><span><i class="price-dot"></i>Giá</span><span><i class="volume-dot"></i>Khối lượng</span></div></div><div class="market-session-timeline-grid">${marketSlots.map(slot => `<article class="market-session-slot"><strong>${slot}</strong><div class="market-session-bars"><div><i class="price-bar"></i><span>Giá</span></div><div><i class="volume-bar"></i><span>KL</span></div></div><small class="market-session-value market-session-empty">Chưa có dữ liệu</small></article>`).join('')}</div>`
      panel.querySelector('.panel-header')?.after(timeline)
    }
    updateMarketTimeline()
  }

  const enhance = () => {
    installStyles()
    const detailParams = new URLSearchParams(window.location.search)
    const detailSymbol = detailParams.get('symbol')?.trim().toUpperCase()
    const detailResolveKey = 'stockpilot-detail-url-resolved'
    let detailAlreadyResolved = false
    try { detailAlreadyResolved = sessionStorage.getItem(detailResolveKey) === detailSymbol } catch (_) { }
    if (detailParams.get('view') === 'detail' && detailSymbol && !detailAlreadyResolved) {
      fetch(`/api/stocks?page=1&pageSize=40&q=${encodeURIComponent(detailSymbol)}`, { cache: 'no-store' }).then(response => response.json()).then(payload => {
        const match = (payload?.data || []).find(stock => String(stock.code || stock.symbol || '').toUpperCase() === detailSymbol)
        if (!match) return
        try {
          sessionStorage.setItem('stockpilot-selected-id', String(match.id))
          sessionStorage.setItem('stockpilot-view', 'detail')
          sessionStorage.setItem(detailResolveKey, detailSymbol)
        } catch (_) { }
        window.location.reload()
      }).catch(() => {})
    }
    document.querySelectorAll('.recommendation-stock-heading > strong').forEach(node => {
      if (node.closest('a.stock-detail-link')) return
      const symbol = node.textContent.trim()
      if (!symbol) return
      const link = document.createElement('a')
      link.className = 'stock-detail-link'
      link.href = `/?view=detail&symbol=${encodeURIComponent(symbol)}`
      link.title = `Mở chi tiết mã ${symbol}`
      link.textContent = symbol
      node.replaceWith(link)
    })
    document.querySelectorAll('.watchlist li > strong').forEach(node => {
      if (node.querySelector('a.stock-detail-link') || node.closest('a.stock-detail-link')) return
      const symbol = node.textContent.trim()
      if (!symbol || symbol.includes('Chưa có')) return
      const link = document.createElement('a')
      link.className = 'stock-detail-link'
      link.href = `/?view=detail&symbol=${encodeURIComponent(symbol)}`
      link.title = `Mở chi tiết mã ${symbol}`
      link.textContent = symbol
      node.replaceChildren(link)
    })
    document.querySelectorAll('.table-panel tbody tr').forEach(row => {
      if (row.dataset.marketDetailBound) return
      const symbolCell = row.querySelector('.symbol')
      const symbol = symbolCell ? ([...symbolCell.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim())?.textContent.trim() || '') : ''
      if (!symbol) return
      row.dataset.marketDetailBound = '1'
      const href = `/?view=detail&symbol=${encodeURIComponent(symbol)}`
      if (symbolCell && !symbolCell.querySelector('a.stock-detail-link')) {
        const textNode = [...symbolCell.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim())
        if (textNode) {
          const link = document.createElement('a')
          link.className = 'stock-detail-link'
          link.href = href
          link.title = `Mở chi tiết mã ${symbol}`
          link.textContent = textNode.textContent.trim()
          textNode.replaceWith(link)
        }
      }
      const leaveBoard = () => {
        try { sessionStorage.removeItem(marketViewKey) } catch (_) { }
        const boardButton = document.querySelector('.market-board-nav-item')
        boardButton?.classList.remove('active')
        boardButton?.removeAttribute('aria-current')
        document.querySelector('.dashboard-shell')?.classList.remove('market-board-active')
      }
      row.querySelector('.symbol a.stock-detail-link')?.addEventListener('click', event => {
        event.preventDefault()
        event.stopPropagation()
        leaveBoard()
        row.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      })
      row.addEventListener('click', event => {
        if (event.target.closest('button, a, input, select, textarea')) return
        leaveBoard()
      })
    })
    document.querySelectorAll('.portfolio-table tbody tr, .recommendation-tracking-table tbody tr').forEach(row => {
      if (row.dataset.stockDetailRowBound) return
      const symbolNode = row.querySelector('td:first-child > strong') || row.querySelector('td:first-child')
      const symbol = symbolNode?.textContent.trim()
      if (!symbol) return
      row.dataset.stockDetailRowBound = '1'
      row.classList.add('stock-detail-row-link')
      row.setAttribute('role', 'link')
      row.setAttribute('tabindex', '0')
      row.title = `Mở chi tiết mã ${symbol}`
      const href = `/?view=detail&symbol=${encodeURIComponent(symbol)}`
      const symbolCell = row.querySelector('td:first-child')
      if (symbolCell && !symbolCell.querySelector('a.stock-detail-link')) {
        const strong = symbolCell.querySelector(':scope > strong')
        const textNode = strong ? null : [...symbolCell.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim())
        const link = document.createElement('a')
        link.className = 'stock-detail-link'
        link.href = href
        link.title = `Mở chi tiết mã ${symbol}`
        if (strong) { strong.replaceWith(link); link.append(strong) } else if (textNode) { link.textContent = textNode.textContent.trim(); textNode.replaceWith(link) }
      }
      row.addEventListener('click', event => { if (!event.target.closest('button, a, input, select, textarea')) window.location.href = href })
      row.addEventListener('keydown', event => { if ((event.key === 'Enter' || event.key === ' ') && !event.target.closest('button, a, input, select, textarea')) { event.preventDefault(); window.location.href = href } })
    })
    if (!document.documentElement.dataset.analysisGateBound) {
      document.documentElement.dataset.analysisGateBound = '1'
      document.addEventListener('click', event => {
        if (event.target.closest('.detail-analysis-btn, [aria-label*="Phân tích chuyên sâu"], [aria-label*="Phân tích lại"]')) {
          window.__stockpilotRequestAnalysis?.()
          window.dispatchEvent(new Event('stockpilot:request-analysis'))
        }
      }, true)
    }
    document.querySelectorAll('.detail-analysis-btn').forEach(button => {
      if (/Đang phân tích/.test(button.textContent) && !document.querySelector('.technical-panel .analysis-status-row .chip.success')) {
        button.textContent = 'Phân tích chuyên sâu'
        button.disabled = false
      }
    })
  const shell = document.querySelector('.dashboard-shell')
  const nav = document.querySelector('.nav')
  if (shell && !shell.dataset.marketNavigationBound) {
    shell.dataset.marketNavigationBound = '1'
    shell.addEventListener('click', event => {
      if (event.target.closest('.market-board-nav-item')) return
      if (event.target.closest('.nav-item, .detail-analysis-btn, .table-panel tbody tr, [aria-label*="Thêm"]')) shell.classList.remove('market-board-active')
    })
  }

    let boardNav = nav?.querySelector('.market-board-nav-item')
    boardNav?.setAttribute('title', 'Mở Bảng giá')
    if (nav && !boardNav) {
      boardNav = document.createElement('button')
      boardNav.type = 'button'
      boardNav.className = 'nav-item market-board-nav-item'
      boardNav.innerHTML = '<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18V6m0 12h16M7 14l3-3 3 2 5-6"/></svg><span class="nav-label">Bảng giá</span>'
      boardNav.setAttribute('aria-label', 'Bảng giá')
      boardNav.title = 'Mở Bảng giá'
      nav.insertBefore(boardNav, nav.children[1] || null)
      boardNav.addEventListener('click', () => {
        nav.querySelector('.nav-item:not(.market-board-nav-item)')?.click()
        window.setTimeout(() => {
          try { sessionStorage.setItem(marketViewKey, 'board') } catch (_) { }
          shell?.classList.add('market-board-active')
          boardNav.classList.add('active')
          boardNav.setAttribute('aria-current', 'page')
        }, 0)
        nav.querySelector('.nav-item:not(.market-board-nav-item).active')?.classList.remove('active')
      })
    }
    if (shell && !shell.classList.contains('market-board-active')) boardNav?.removeAttribute('aria-current')
    nav?.querySelectorAll('.nav-item:not(.market-board-nav-item)').forEach(item => {
      if (item.dataset.marketViewBound) return
      item.dataset.marketViewBound = '1'
      item.addEventListener('click', () => {
        try { sessionStorage.removeItem(marketViewKey) } catch (_) { }
        try { sessionStorage.removeItem(detailResolveKey) } catch (_) { }
        if (!item.textContent.includes('Chi ti')) window.history.replaceState({}, '', window.location.pathname)
        const sectorSelect = document.querySelector('.sector-select')
        if (sectorSelect && sectorSelect.value) {
          sectorSelect.value = ''
          sectorSelect.dispatchEvent(new Event('change', { bubbles: true }))
        }
        shell?.classList.remove('market-board-active')
        boardNav?.classList.remove('active')
        boardNav?.removeAttribute('aria-current')
      })
    })
    const overviewNav = nav?.querySelector('.nav-item:not(.market-board-nav-item)')
    if (shell?.classList.contains('market-board-active')) {
      overviewNav?.classList.remove('active')
      boardNav?.classList.add('active')
    } else if (document.querySelector('.market-breadth-panel')) {
      nav?.querySelectorAll('.nav-item:not(.market-board-nav-item)').forEach(item => item.classList.remove('active'))
      overviewNav?.classList.add('active')
    }
    if (sessionStorage.getItem(marketViewKey) === 'board' && shell && !shell.classList.contains('market-board-active')) {
      window.setTimeout(() => boardNav.click(), 0)
    }
    document.querySelectorAll('.table-panel thead th').forEach(header => {
      if (header.textContent.trim() === 'Nhận định') header.textContent = 'Phân tích'
    })
    document.querySelectorAll('.listing-badge.delisted').forEach(badge => {
      if (badge.textContent.trim() === 'Hủy niêm yết') badge.textContent = 'Đã hủy niêm yết'
    })
    document.getElementById('overview-data-guide')?.remove()
    const sourceHelp = document.querySelector('.overview-source-summary .overview-source-help')
    if (sourceHelp) {
      sourceHelp.title = 'Intraday: quote của phiên hiện tại và có thể trễ theo provider. EOD: giá đóng cửa phiên gần nhất khi chưa có quote hợp lệ. Dữ liệu cũ: mã chưa có EOD cho phiên chuẩn.'
      sourceHelp.setAttribute('aria-label', 'Giải thích Intraday, EOD và dữ liệu cũ')
      sourceHelp.setAttribute('tabindex', '0')
    }
    document.querySelectorAll('.volume-context').forEach(context => {
      context.setAttribute('tabindex', '0')
    })
    document.querySelectorAll('[data-stale-volume]').forEach(badge => {
      const session = badge.parentElement?.title?.replace(/^Dữ liệu phiên\s*/, '') || 'trước'
      badge.title = `Dữ liệu cũ: giá hoặc khối lượng thuộc phiên ${session}, chưa phải phiên chuẩn mới nhất.`
      badge.setAttribute('aria-label', badge.title)
    })
    document.querySelector('.table-panel .table-tools')?.classList.add('overview-filter-row')
    ensureMarketTimeline()
    const breadth = document.querySelector('.market-breadth-panel')
    const breadthCounts = breadth ? {
      up: Number(breadth.querySelector('.breadth-count.up strong')?.textContent || 0),
      down: Number(breadth.querySelector('.breadth-count.down strong')?.textContent || 0),
      flat: Number(breadth.querySelector('.breadth-count.flat strong')?.textContent || 0)
    } : null
    breadth?.querySelector('.breadth-snapshot')?.remove()
    if (breadth && breadthCounts && breadthCounts.up + breadthCounts.down + breadthCounts.flat > 0) {
      const classified = breadthCounts.up + breadthCounts.down + breadthCounts.flat
      const ratio = breadthCounts.down > 0 ? (breadthCounts.up / breadthCounts.down).toFixed(2) : '—'
      const spread = breadthCounts.up - breadthCounts.down
      const percentText = Array.from(breadth.querySelectorAll('.breadth-count small')).map(node => Number.parseFloat(node.textContent)).filter(Number.isFinite)
      const classifiedPercent = percentText.length === 3 ? percentText.reduce((sum, value) => sum + value, 0).toFixed(1) : '—'
      const snapshot = document.createElement('div')
      snapshot.className = 'breadth-snapshot'
      snapshot.setAttribute('aria-label', 'Chỉ số snapshot độ rộng thị trường')
      snapshot.innerHTML = `<div><span>A/D ratio</span><strong>${ratio}</strong><small>Tăng / giảm</small></div><div><span>Chênh lệch A−D</span><strong class="${spread >= 0 ? 'positive' : 'negative'}">${spread > 0 ? '+' : ''}${spread}</strong><small>Mã tăng trừ mã giảm</small></div><div><span>Đã phân loại</span><strong>${classifiedPercent}%</strong><small>${classified ? 'Dựa trên mã có biến động' : 'Chưa có dữ liệu'}</small></div>`
      breadth.querySelector('.breadth-counts')?.after(snapshot)
    }
    const sectorSelect = document.querySelector('.sector-select')
    const boardActive = shell?.classList.contains('market-board-active')
    const selectedSector = boardActive ? '' : sectorSelect?.value || ''
    let exchangeSelect = document.querySelector('.breadth-exchange-select')
    const selectedExchange = exchangeSelect?.value || ''
    const existingLeaders = breadth?.querySelector('.breadth-leaders')
    if (existingLeaders && (existingLeaders.dataset.sector !== selectedSector || existingLeaders.dataset.exchange !== selectedExchange)) existingLeaders.remove()
    if (breadth && !breadth.querySelector('.breadth-leaders')) loadBreadthLeaders(breadth, selectedSector, selectedExchange)
    if (sectorSelect && !sectorSelect.dataset.breadthScopeBound) {
      sectorSelect.dataset.breadthScopeBound = '1'
      sectorSelect.addEventListener('change', () => {
        if (shell?.classList.contains('market-board-active')) {
          try { sessionStorage.setItem(boardSectorKey, sectorSelect.value || '') } catch (_) { }
          return
        }
        breadth?.querySelector('.breadth-leaders')?.remove()
        if (breadth) loadBreadthLeaders(breadth, sectorSelect.value || '', exchangeSelect?.value || '')
      })
    }
    if (exchangeSelect && !exchangeSelect.dataset.breadthScopeBound) {
      exchangeSelect.dataset.breadthScopeBound = '1'
      exchangeSelect.addEventListener('change', () => {
        breadth?.querySelector('.breadth-leaders')?.remove()
        if (breadth) loadBreadthLeaders(breadth, sectorSelect?.value || '', exchangeSelect.value || '')
      })
    }
    document.querySelectorAll('.breadth-leader li span').forEach(symbolNode => {
      if (symbolNode.dataset.breadthBound) return
      const symbol = symbolNode.textContent.trim()
      if (!symbol || symbol === '—') return
      symbolNode.dataset.breadthBound = '1'
      symbolNode.dataset.breadthSymbol = symbol
      symbolNode.tabIndex = 0
      symbolNode.setAttribute('role', 'button')
      symbolNode.setAttribute('aria-label', `Lọc bảng theo mã ${symbol}`)
      const focusTable = () => {
        const input = document.querySelector('.table-search')
        if (!input) return
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
        setter?.call(input, symbol)
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input.scrollIntoView({ behavior: 'smooth', block: 'center' })
        input.focus({ preventScroll: true })
      }
      symbolNode.addEventListener('click', focusTable)
      symbolNode.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); focusTable() } })
    })
    const originalPageSize = document.querySelector('.table-panel .page-size-control:not(.overview-page-size-control) select')
    const originalResultCount = document.querySelector('.table-panel .table-tools > .muted-text')
    const pagination = document.querySelector('.table-panel .table-pagination')
    if (originalPageSize && pagination) {
      const previousValue = originalPageSize.value
      if (!originalPageSize.querySelector('option[value="40"]')) {
        const option40 = new Option('40', '40')
        const option50 = originalPageSize.querySelector('option[value="50"]')
        originalPageSize.insertBefore(option40, option50)
        if (!previousValue) originalPageSize.value = '40'
      }
      let summary = pagination.querySelector('.overview-pagination-summary')
      if (!summary) {
        summary = document.createElement('div')
        summary.className = 'overview-pagination-summary'
        pagination.prepend(summary)
      }
      if (originalResultCount) {
        originalResultCount.classList.add('overview-original-result-count')
        let bottomCount = summary.querySelector('.overview-pagination-count')
        if (!bottomCount) {
          bottomCount = document.createElement('span')
          bottomCount.className = 'overview-pagination-count'
          summary.append(bottomCount)
        }
        const countText = originalResultCount.textContent.trim()
        if (bottomCount.textContent !== countText) bottomCount.textContent = countText
      }
      let bottomControl = summary.querySelector('.overview-page-size-control')
      if (!bottomControl) {
        bottomControl = document.createElement('label')
        bottomControl.className = 'overview-page-size-control'
        bottomControl.innerHTML = `<span>Số mã / trang</span><select aria-label="Số mã mỗi trang"></select>`
        summary.append(bottomControl)
        const bottomSelect = bottomControl.querySelector('select')
        bottomSelect.addEventListener('change', event => {
          const sourceSelect = bottomControl.sourceSelect
          if (!sourceSelect) return
          sourceSelect.value = event.target.value
          sourceSelect.dispatchEvent(new Event('change', { bubbles: true }))
        })
      }
      bottomControl.sourceSelect = originalPageSize
      const bottomSelect = bottomControl.querySelector('select')
      const optionSignature = Array.from(originalPageSize.options).map(option => `${option.value}:${option.textContent}`).join('|')
      if (bottomSelect.dataset.options !== optionSignature) {
        bottomSelect.replaceChildren(...Array.from(originalPageSize.options, option => option.cloneNode(true)))
        bottomSelect.dataset.options = optionSignature
      }
      bottomSelect.value = originalPageSize.value
    }
    document.querySelectorAll('.overview-assessment').forEach(container => {
      if (!container.classList.contains(enhancedClass)) container.classList.add(enhancedClass)
      const button = container.querySelector('.overview-analysis-btn')
      if (!button) return
      button.setAttribute('aria-label', 'Mở phân tích chuyên sâu')
      button.title = 'Mở trang chi tiết và tải phân tích kỹ thuật'
    })
  }

  const refreshTimeline = () => {
    if (document.querySelector('.dashboard-shell.market-board-active')) updateMarketTimeline()
  }
  window.setInterval(refreshTimeline, 30000)

  let scheduled = false
  const scheduleEnhance = () => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      enhance()
    })
  }

  enhance()
  new MutationObserver(scheduleEnhance).observe(document.body, { childList: true, subtree: true })
})()
