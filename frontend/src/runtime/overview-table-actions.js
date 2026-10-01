(() => {
  const clearAnalysisRequestFlags = () => {
    try {
      Object.keys(sessionStorage)
        .filter(key => key.startsWith('analysis-requested:'))
        .forEach(key => sessionStorage.removeItem(key))
    } catch (_) {}
  }
  clearAnalysisRequestFlags()

  const installQuoteRequestGuard = () => {
    if (window.__stockpilotQuoteRequestGuard) return
    window.__stockpilotQuoteRequestGuard = true
    const nativeFetch = window.fetch.bind(window)
    const cache = new Map()
    const pending = new Map()
    const gatedAnalysis = new Map()
    let analysisRequested = false
    const formatPrice = value => Number.isFinite(Number(value)) ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 2 }).format(Number(value)) : '—'
    const syncQuoteRows = payload => {
      const quotes = payload?.data && typeof payload.data === 'object' ? payload.data : {}
      if (!Object.keys(quotes).length) return
      document.querySelectorAll('.table-panel tbody tr').forEach(row => {
        const symbol = row.querySelector('.symbol')?.textContent.trim().split(/\s+/)[0].toUpperCase()
        const quote = symbol ? quotes[symbol] : null
        if (!quote) return
        const cells = row.children
        if (cells[2] && Number.isFinite(Number(quote.price))) cells[2].textContent = formatPrice(quote.price)
        if (cells[3] && Number.isFinite(Number(quote.change))) {
          cells[3].textContent = `${Number(quote.change) >= 0 ? '+' : ''}${Number(quote.change).toFixed(2)}%`
          cells[3].classList.toggle('positive', Number(quote.change) >= 0)
          cells[3].classList.toggle('negative', Number(quote.change) < 0)
        }
        if (cells[4] && Number.isFinite(Number(quote.volume))) cells[4].textContent = new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(quote.volume))
        if (cells[5] && (quote.upstream || quote.provider)) cells[5].innerHTML = `<span class="chip neutral">${quote.upstream || quote.provider}</span>`
      })
    }
    window.__stockpilotSyncQuoteRows = syncQuoteRows
    window.__stockpilotRequestAnalysis = () => {
      analysisRequested = true
      for (const [key, request] of gatedAnalysis) {
        gatedAnalysis.delete(key)
        nativeFetch(request.input, request.init).then(request.resolve, request.reject)
      }
    }
    window.__stockpilotResetAnalysis = () => {
      analysisRequested = false
    }
    const ttl = 15000
    window.fetch = (input, init = {}) => {
      const request = new Request(input, init)
      const requestUrl = new URL(request.url, window.location.href)
      const isSavedProposalWrite = request.method === 'POST' && requestUrl.pathname === '/api/recommendations/saved'
      if (isSavedProposalWrite) {
        return nativeFetch(input, init).then(async response => {
          if (!response.ok) return response
          const body = await response.text()
          try {
            const payload = JSON.parse(body)
            if (payload?.success === true && !payload.data) {
              const requestBody = JSON.parse(await request.clone().text())
              const saved = {
                id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                createdAt: new Date().toISOString(),
                criteria: requestBody.criteria || {},
                result: requestBody.result || null
              }
              return new Response(JSON.stringify({ ...payload, data: saved }), { status: response.status, headers: response.headers })
            }
          } catch (_) {}
          return new Response(body, { status: response.status, headers: response.headers })
        })
      }
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
          if (isQuoteRequest) {
            try { const payload = JSON.parse(body); window.setTimeout(() => syncQuoteRows(payload), 0) } catch (_) { /* React keeps the previous valid quote. */ }
          }
          const responseBody = body
          let cacheable = true
          if (isStockList) {
            try { cacheable = JSON.parse(responseBody)?.success === true && Array.isArray(JSON.parse(responseBody)?.data) } catch (_) { cacheable = false }
          }
          if (cacheable) cache.set(key, { at: Date.now(), body: responseBody, status: response.status, headers: [...response.headers.entries()] })
          return new Response(responseBody, { status: response.status, headers: response.headers })
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
      .table-panel th:nth-child(6), .table-panel td:nth-child(6) { display: none !important; }
      .table-panel th:nth-child(7), .table-panel td:nth-child(7) { width: 18%; text-align: center; }
      .table-panel th:nth-child(8), .table-panel td:nth-child(8) { width: 10%; }
      @media (max-width: 700px) { .table-wrap { overflow-x: auto; } }
      .overview-analysis-action { display: table-cell; min-width: 0; text-align: center; vertical-align: middle !important; }
      .overview-analysis-action .rating-badge,
      .overview-analysis-action > small { display: none !important; }
      .overview-analysis-action .overview-analysis-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        width: min(100%, 178px);
        min-width: 166px;
        min-height: 40px;
        margin: 0;
        padding: 7px 10px;
        border: 1px solid rgba(94, 234, 212, .38);
        border-radius: 9px;
        background: linear-gradient(135deg, rgba(20, 184, 166, .18), rgba(59, 130, 246, .12));
        color: #ccfbf1;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, .04);
        font-size: .78rem;
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
      .add-portfolio-btn { display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-width: 86px; min-height: 32px; padding: 6px 10px; border: 1px solid rgba(94, 234, 212, .32); border-radius: 8px; color: var(--text); background: rgba(20, 184, 166, .1); font: inherit; font-size: 11px; font-weight: 700; white-space: nowrap; overflow: visible; cursor: pointer; }
      .add-portfolio-btn:hover, .add-portfolio-btn:focus-visible { border-color: var(--primary); background: rgba(94, 234, 212, .22); transform: translateY(-1px); outline: none; }
      @media (max-width: 700px) { .table-panel th:last-child, .table-panel td:last-child { min-width: 96px; } .table-panel .add-portfolio-btn { min-width: 86px; writing-mode: horizontal-tb; } }
      .overview-next { display: none !important; }
      .recommendation-criteria-panel > .saved-proposals { display: none !important; }
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
      .compact-system-meta { display: inline-flex; align-items: center; gap: 4px; color: var(--muted); font-size: .66rem; line-height: 1.2; opacity: .82; }
      /* Metadata remains available through hover/focus, without adding an info glyph to every line. */
      .compact-system-meta::before { display: none; }
      .detail-page .detail-hero > p { margin-top: 5px; font-size: .68rem; color: var(--muted); }
      .overview-source-summary { display: inline-flex; align-items: center; gap: 5px; font-size: .68rem; color: var(--muted); }
      .overview-source-summary .overview-source-help { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border: 0; border-radius: 50%; color: var(--muted); background: rgba(148, 163, 184, .12); font-size: 0; cursor: help; }
      .overview-source-summary .overview-source-help::before { content: 'i'; font-size: .68rem; font-weight: 800; }
      .overview-source-summary .overview-source-help:hover, .overview-source-summary .overview-source-help:focus-visible { color: var(--primary); background: rgba(94, 234, 212, .15); outline: 2px solid rgba(94, 234, 212, .35); outline-offset: 1px; }
      .allocation-day-change[data-rag="green"] { color: var(--success, #34d399); }
      .allocation-day-change[data-rag="red"] { color: var(--danger, #f87171); }
      .allocation-day-change[data-rag="amber"] { color: var(--warning, #fbbf24); }
      .allocation-day-change > span[data-rag="green"] { color: var(--success, #34d399) !important; }
      .allocation-day-change > span[data-rag="red"] { color: var(--danger, #f87171) !important; }
      .allocation-day-change > span[data-rag="amber"] { color: var(--warning, #fbbf24) !important; }
      .portfolio-data-audit { display: grid; gap: 7px; margin-top: 14px; padding: 11px 12px; border: 1px solid rgba(148, 163, 184, .16); border-radius: 10px; background: rgba(15, 23, 42, .28); font-size: 10px; }
      .portfolio-data-audit strong { color: var(--text); font-size: 11px; }
      .portfolio-data-audit p { margin: 0; color: var(--muted); line-height: 1.45; }
      .portfolio-data-audit-legend { display: flex; flex-wrap: wrap; gap: 6px 10px; }
      .portfolio-data-audit-legend span { color: var(--muted); }
      .portfolio-data-audit-legend i { display: inline-block; width: 7px; height: 7px; margin-right: 4px; border-radius: 50%; }
      .portfolio-data-audit-legend .rag-green { background: var(--success); }
      .portfolio-data-audit-legend .rag-red { background: var(--danger); }
      .portfolio-data-audit-legend .rag-amber { background: var(--warning); }
      .stock-detail-row-link { cursor: pointer; }
      .stock-detail-row-link:hover > td, .stock-detail-row-link:focus-visible > td { color: var(--primary); background: rgba(94, 234, 212, .08); }
      .stock-detail-row-link:hover > td.positive, .stock-detail-row-link:focus-visible > td.positive { color: var(--success); }
      .stock-detail-row-link:hover > td.negative, .stock-detail-row-link:focus-visible > td.negative { color: var(--danger); }
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
      .market-board-tools {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        margin-left: auto;
      }
      .market-board-tools .ghost-btn { min-height: 36px; white-space: nowrap; }
      .market-board-column-picker { position: relative; }
      .market-board-column-picker > summary { list-style: none; cursor: pointer; }
      .market-board-column-picker > summary::-webkit-details-marker { display: none; }
      .market-board-column-picker[open] > summary { border-color: var(--primary); color: var(--primary); }
      .market-board-column-menu {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        z-index: 30;
        display: grid;
        gap: 9px;
        min-width: 230px;
        margin: 0;
        padding: 14px;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: #101a2d;
        box-shadow: 0 18px 42px rgba(2, 8, 23, .42);
      }
      .market-board-column-menu legend { padding: 0 0 3px; color: var(--text); font-size: .78rem; font-weight: 700; }
      .market-board-column-menu label { display: flex; align-items: center; gap: 9px; color: var(--muted); font-size: .76rem; cursor: pointer; }
      .market-board-column-menu input { width: 16px; height: 16px; accent-color: var(--primary); }
      .market-board-column-menu .ghost-btn { width: 100%; margin-top: 3px; }
      .market-board-toolbar-status { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
      .table-panel.market-board-hide-name th:nth-child(2), .table-panel.market-board-hide-name td:nth-child(2),
      .table-panel.market-board-hide-volume th:nth-child(5), .table-panel.market-board-hide-volume td:nth-child(5),
      .table-panel.market-board-hide-analysis th:nth-child(7), .table-panel.market-board-hide-analysis td:nth-child(7),
      .table-panel.market-board-hide-actions th:nth-child(8), .table-panel.market-board-hide-actions td:nth-child(8) { display: none !important; }
      .table-panel .table-wrap th:first-child,
      .table-panel .table-wrap td:first-child {
        position: sticky;
        left: 0;
        z-index: 2;
        background: #101a2d;
      }
      .table-panel .table-wrap th:first-child { z-index: 4; background: #111d31; }
      .table-panel .table-wrap.is-horizontally-scrolled th:first-child,
      .table-panel .table-wrap.is-horizontally-scrolled td:first-child { box-shadow: 10px 0 18px -15px rgba(94, 234, 212, .9); }
      .table-panel tbody tr:hover td:first-child { background: #13233a; }
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
        .table-panel > .panel-header { align-items: stretch; flex-direction: column; }
        .market-board-tools { width: 100%; margin-left: 0; }
        .market-board-tools > * { flex: 1 1 0; }
        .market-board-tools .ghost-btn, .market-board-column-picker > summary { width: 100%; justify-content: center; }
        .market-board-column-menu { right: auto; left: 0; min-width: min(280px, calc(100vw - 52px)); }
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
  const parseNumericText = value => Number(String(value || '').replace(/[^0-9+\-.]/g, ''))
  const ensureOverviewSnapshot = () => {
    const main = document.querySelector('.main-panel')
    const stats = main?.querySelector('.stats-grid')
    const tablePanel = main?.querySelector('.table-panel')
    if (!main || !stats || !tablePanel) return null
    const rows = [...tablePanel.querySelectorAll('tbody tr')].flatMap(row => {
      const cells = row.querySelectorAll('td')
      const symbol = row.querySelector('.symbol')?.textContent.trim().split(/\s+/)[0]
      if (!symbol || cells.length < 6) return []
      return [{
        symbol,
        change: parseNumericText(cells[3]?.textContent),
        volume: parseNumericText(cells[4]?.textContent),
        source: cells[5]?.textContent.trim()
      }]
    })
    let metrics = main.querySelector('.overview-metrics')
    if (!metrics) {
      metrics = document.createElement('section')
      metrics.className = 'overview-metrics'
      stats.after(metrics)
    }
    const quoted = rows.filter(row => row.source && !/Chưa có dữ liệu/i.test(row.source)).length
    const signature = JSON.stringify(rows)
    if (metrics.dataset.signature !== signature) {
      metrics.innerHTML = `<article class="overview-metric"><small>Quote intraday</small><strong>${quoted}/${rows.length}</strong></article><article class="overview-metric"><small>Mã cá nhân</small><strong>${document.querySelectorAll('.table-panel .pinned-stock').length}</strong></article><article class="overview-metric"><small>Mã theo dõi</small><strong>${rows.length}</strong></article><article class="overview-metric"><small>Trạng thái</small><strong>${quoted ? 'Trong phiên' : 'EOD'}</strong></article><p class="overview-data-status">${quoted ? 'Có dữ liệu intraday' : 'Đang dùng dữ liệu EOD'}</p>`
      metrics.dataset.signature = signature
    }
    let breadth = main.querySelector('.market-breadth-panel')
    if (!breadth) {
      breadth = document.createElement('section')
      breadth.className = 'panel market-breadth-panel'
      metrics.after(breadth)
      breadth.innerHTML = `<div class="market-breadth-header"><div><p class="eyebrow accent">Độ rộng thị trường</p><h3>Nhịp thị trường hiện tại</h3><p></p></div><span class="chip neutral"><span></span></span></div><div class="breadth-counts"><article class="breadth-count up"><span>Tăng</span><strong>0</strong><small></small></article><article class="breadth-count down"><span>Giảm</span><strong>0</strong><small></small></article><article class="breadth-count flat"><span>Đi ngang</span><strong>0</strong><small></small></article></div><div class="breadth-distribution"><span class="breadth-segment up"></span><span class="breadth-segment down"></span><span class="breadth-segment flat"></span></div><p class="breadth-disclaimer"></p>`
    }
    if (breadth.querySelector('.breadth-exchange-select')?.value) return breadth
    const groups = { up: [], down: [], flat: [] }
    rows.forEach(row => groups[row.change > 0 ? 'up' : row.change < 0 ? 'down' : 'flat'].push(row))
    const classified = rows.length || 1
    ;['up', 'down', 'flat'].forEach(key => {
      const card = breadth.querySelector(`.breadth-count.${key}`)
      if (card) { card.querySelector('strong').textContent = String(groups[key].length); card.querySelector('small').textContent = `${(groups[key].length / classified * 100).toFixed(1)}% số mã` }
    })
    const changes = rows.map(row => row.change).filter(Number.isFinite)
    const average = changes.length ? changes.reduce((sum, value) => sum + value, 0) / changes.length : null
    breadth.querySelector('.market-breadth-header > div > p:last-child').textContent = `${rows.length} mã · ${quoted}/${rows.length} mã có quote intraday`
    breadth.querySelector('.market-breadth-header .chip span').textContent = average == null ? 'Chưa đủ dữ liệu' : `Bình quân ${average >= 0 ? '+' : ''}${average.toFixed(2)}%`
    breadth.querySelector('.breadth-disclaimer').textContent = 'Phân loại dùng biến động giá mới nhất; nguồn hiện tại không tách khối lượng chủ động bên mua và bên bán.'
    return breadth
  }
  const parseCurrencyText = value => Number(String(value || '').replace(/[^0-9-]/g, '')) || 0
  const ensurePortfolioPresentation = () => {
    const page = document.querySelector('.personal-page')
    if (!page) return
    let error = page.querySelector('.portfolio-load-error')
    if (window.__stockpilotPortfolioError) {
      if (!error) {
        error = document.createElement('div')
        error.className = 'error-banner portfolio-load-error'
        error.setAttribute('role', 'alert')
        error.innerHTML = '<p></p><button type="button" class="ghost-btn">Thử lại danh mục</button>'
        error.querySelector('button').addEventListener('click', () => window.dispatchEvent(new CustomEvent('stockpilot:retry-portfolio')))
        page.querySelector('.personal-grid')?.before(error)
      }
      error.querySelector('p').textContent = window.__stockpilotPortfolioError
      const emptyCell = page.querySelector('.portfolio-table tbody tr td[colspan]')
      if (emptyCell) emptyCell.textContent = 'Đang chờ thử lại danh mục'
    } else error?.remove()

    const table = page.querySelector('.portfolio-table table')
    const header = table?.querySelector('thead tr')
    if (header && header.children.length < 6) {
      if (header.children[4]) header.children[4].textContent = 'Lãi/lỗ chưa chốt'
      const realized = document.createElement('th')
      realized.textContent = 'Lãi/lỗ đã chốt'
      header.append(realized)
    }
    const positionRows = [...(table?.querySelectorAll('tbody tr') || [])].filter(row => row.querySelector('.symbol, td:first-child') && !row.querySelector('td[colspan]'))
    positionRows.forEach(row => {
      if (row.children.length < 6) {
        const realized = document.createElement('td')
        realized.textContent = '0 ₫'
        row.append(realized)
      }
      const marketCell = row.children[3]
      if (marketCell && !marketCell.querySelector('.portfolio-price-source')) {
        const source = document.createElement('small')
        source.className = 'portfolio-price-source'
        source.textContent = 'Intraday'
        marketCell.append(source)
      }
    })
    if (!positionRows.length) return
    const intradayCount = positionRows.filter(row => /Intraday/i.test(row.children[3]?.textContent || '')).length
    const allocationFootnote = page.querySelector('.allocation-footnote')
    if (allocationFootnote) {
      allocationFootnote.textContent = intradayCount < positionRows.length
        ? `${intradayCount}/${positionRows.length} mã có quote intraday · Mã còn lại dùng giá EOD gần nhất; tỷ trọng kết hợp dữ liệu hiện có.`
        : `${intradayCount}/${positionRows.length} mã có quote intraday · Tỷ trọng dựa trên quote intraday mới nhất.`
    }
    const positions = positionRows.map(row => ({
      symbol: row.children[0]?.textContent.trim(),
      quantity: parseCurrencyText(row.children[1]?.textContent),
      marketPrice: parseCurrencyText(row.children[3]?.childNodes[0]?.textContent || row.children[3]?.textContent)
    }))
    const signature = JSON.stringify(positions)
    let allocation = page.querySelector('.allocation-panel')
    if (!allocation) {
      allocation = document.createElement('section')
      allocation.className = 'panel allocation-panel'
      allocation.dataset.runtimeFallback = 'true'
      page.querySelector('.personal-grid')?.after(allocation)
    }
    if (allocation.dataset.runtimeFallback === 'true' && allocation.dataset.signature !== signature) {
      const total = positions.reduce((sum, position) => sum + position.quantity * position.marketPrice, 0)
      const colors = ['#5eead4', '#60a5fa', '#fbbf24', '#f472b6', '#a78bfa', '#34d399']
      let cursor = 0
      const slices = positions.map((position, index) => { const value = position.quantity * position.marketPrice; const weight = total ? value / total * 100 : 0; const start = cursor; cursor += weight; return { position, index, weight, start, end: cursor } })
      const gradient = slices.map(slice => `${colors[slice.index % colors.length]} ${slice.start.toFixed(2)}% ${slice.end.toFixed(2)}%`).join(', ')
      allocation.innerHTML = `<div class="allocation-panel-heading"><div><h3>Phân bổ danh mục</h3><p class="muted-text">Tỷ trọng theo giá trị thị trường hiện tại.</p></div><span class="chip neutral">${positions.length} mã</span></div><div class="allocation-visual"><div class="allocation-donut" style="background: conic-gradient(${gradient})"><div><small class="allocation-total-label">Tổng tài sản</small><strong class="allocation-total-value">${new Intl.NumberFormat('vi-VN').format(total)} ₫</strong><small class="allocation-day-change">So với hôm qua: <span>Chưa đủ dữ liệu</span></small></div></div><ol class="allocation-list">${slices.map(slice => `<li><div class="allocation-item-heading"><i style="background:${colors[slice.index % colors.length]}"></i><div><strong>${slice.position.symbol}</strong><small>${new Intl.NumberFormat('vi-VN').format(slice.position.quantity * slice.position.marketPrice)} ₫</small></div><b>${slice.weight.toFixed(1)}%</b></div><div class="allocation-track"><span style="width:${slice.weight.toFixed(2)}%;background:${colors[slice.index % colors.length]}"></span></div></li>`).join('')}</ol></div><p class="allocation-footnote">${positions.length}/${positions.length} mã dùng quote intraday.</p>`
      allocation.dataset.signature = signature
    }
  }
  const ensureAllocationDonutTooltips = () => {
    const donut = document.querySelector('.allocation-panel .allocation-donut')
    const rows = [...document.querySelectorAll('.allocation-panel .allocation-list > li')]
    if (!donut || !rows.length) return

    const slices = rows.map(row => {
      const symbol = row.querySelector('.allocation-item-heading strong')?.textContent.trim() || ''
      const value = row.querySelector('.allocation-item-heading small')?.textContent.trim() || ''
      const weightText = row.querySelector('.allocation-item-heading b')?.textContent.trim() || ''
      const weight = Number.parseFloat(weightText.replace(',', '.'))
      return { symbol, value, weight, weightText }
    }).filter(slice => slice.symbol && Number.isFinite(slice.weight) && slice.weight > 0)
    if (!slices.length) return

    const signature = slices.map(slice => `${slice.symbol}:${slice.weight}:${slice.value}`).join('|')
    const currentLayer = donut.querySelector(':scope > .allocation-donut-interaction-svg')
    if (currentLayer?.dataset.signature === signature) return
    currentLayer?.remove()
    donut.querySelector(':scope > .allocation-donut-tooltip')?.remove()

    // The React SVG is nested in the pointer-events:none centre. Keep it only
    // as inert legacy markup; this direct child owns hit testing for both the
    // React chart and the CSS conic-gradient fallback.
    donut.querySelectorAll('.allocation-donut-svg').forEach(svg => {
      svg.setAttribute('aria-hidden', 'true')
      svg.style.pointerEvents = 'none'
    })

    const svgNamespace = 'http://www.w3.org/2000/svg'
    const layer = document.createElementNS(svgNamespace, 'svg')
    layer.classList.add('allocation-donut-interaction-svg')
    layer.setAttribute('viewBox', '0 0 100 100')
    layer.setAttribute('aria-label', 'Tỷ trọng từng cổ phiếu trong danh mục')
    layer.dataset.signature = signature

    const tooltip = document.createElement('output')
    tooltip.className = 'allocation-donut-tooltip'
    tooltip.id = `allocation-donut-tooltip-${Math.random().toString(36).slice(2, 9)}`
    tooltip.setAttribute('role', 'tooltip')
    tooltip.hidden = true
    const tooltipSymbol = document.createElement('strong')
    const tooltipWeight = document.createElement('span')
    const tooltipValue = document.createElement('small')
    tooltip.append(tooltipSymbol, tooltipWeight, tooltipValue)

    const point = (radius, degrees) => {
      const radians = degrees * Math.PI / 180
      return { x: 50 + radius * Math.cos(radians), y: 50 + radius * Math.sin(radians) }
    }
    const annularPath = (startPercent, endPercent) => {
      const startDegrees = startPercent * 3.6 - 90
      const span = Math.min((endPercent - startPercent) * 3.6, 359.999)
      const endDegrees = startDegrees + span
      const outerStart = point(49, startDegrees)
      const outerEnd = point(49, endDegrees)
      const innerEnd = point(35, endDegrees)
      const innerStart = point(35, startDegrees)
      const largeArc = span > 180 ? 1 : 0
      return [
        `M ${outerStart.x} ${outerStart.y}`,
        `A 49 49 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
        `L ${innerEnd.x} ${innerEnd.y}`,
        `A 35 35 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
        'Z'
      ].join(' ')
    }
    const showTooltip = slice => {
      tooltipSymbol.textContent = slice.symbol
      tooltipWeight.textContent = slice.weightText || `${slice.weight.toFixed(1)}%`
      tooltipValue.textContent = slice.value
      tooltip.hidden = false
    }
    const hideTooltip = () => { tooltip.hidden = true }

    let cursor = 0
    slices.forEach(slice => {
      const start = cursor
      const end = cursor + slice.weight
      cursor = end
      const label = `${slice.symbol}: ${slice.weightText || `${slice.weight.toFixed(1)}%`}${slice.value ? `, ${slice.value}` : ''}`
      const path = document.createElementNS(svgNamespace, 'path')
      path.setAttribute('d', annularPath(start, end))
      path.setAttribute('tabindex', '0')
      path.setAttribute('role', 'img')
      path.setAttribute('aria-label', label)
      path.setAttribute('aria-describedby', tooltip.id)
      path.dataset.symbol = slice.symbol
      const title = document.createElementNS(svgNamespace, 'title')
      title.textContent = label
      path.append(title)
      path.addEventListener('pointerenter', () => showTooltip(slice))
      path.addEventListener('pointerleave', hideTooltip)
      path.addEventListener('focus', () => showTooltip(slice))
      path.addEventListener('blur', hideTooltip)
      layer.append(path)
    })

    donut.append(layer, tooltip)
  }
  const ensureOverviewResourceErrors = () => {
    const main = document.querySelector('.main-panel')
    if (!main) return
    const errors = window.__stockpilotOverviewErrors || {}
    let container = main.querySelector('.overview-resource-errors')
    const entries = [['health', errors.health, 'Thử lại health'], ['cache', errors.cache, 'Thử lại cache']].filter(([, message]) => message)
    if (!entries.length) { container?.remove(); return }
    if (!container) {
      container = document.createElement('section')
      container.className = 'overview-resource-errors'
      main.querySelector('.topbar')?.after(container)
    }
    const signature = JSON.stringify(entries)
    if (container.dataset.signature === signature) return
    container.innerHTML = entries.map(([key, message, label]) => `<div class="error-banner" role="alert" data-resource="${key}"><p>${message}</p><button type="button" class="ghost-btn">${label}</button></div>`).join('')
    container.querySelector('[data-resource="health"] button')?.addEventListener('click', () => window.__stockpilotRetryHealth?.())
    container.querySelector('[data-resource="cache"] button')?.addEventListener('click', () => window.__stockpilotRetryCache?.())
    container.dataset.signature = signature
  }
  const ensureBreadthExchangeSelect = breadth => {
    if (!breadth) return null
    const existing = breadth.querySelector('.breadth-exchange-select')
    if (existing) return existing
    const header = breadth.querySelector('.market-breadth-header')
    if (!header) return null
    const select = document.createElement('select')
    select.className = 'breadth-exchange-select'
    select.setAttribute('aria-label', 'Sàn cho độ rộng và nhóm dẫn dắt')
    select.innerHTML = '<option value="">Tất cả sàn</option><option value="HSX">HSX</option><option value="HNX">HNX</option><option value="UPCOM">UPCOM</option>'
    header.append(select)
    return select
  }
  let breadthScopeRequest = 0
  const refreshBreadthScope = async (breadth, sector = '', exchange = '') => {
    const requestId = ++breadthScopeRequest
    if (!breadth) return
    try {
      const first = await fetch(`/api/stocks?page=1&pageSize=500&q=&sector=${encodeURIComponent(sector)}&exchange=${encodeURIComponent(exchange)}&sort=code&direction=asc&pinned=`, { cache: 'no-store' })
      const firstPayload = await first.json()
      let rows = Array.isArray(firstPayload?.data) ? firstPayload.data : []
      const pages = Math.min(4, Number(firstPayload?.pagination?.totalPages || 1))
      for (let page = 2; page <= pages; page += 1) {
        const response = await fetch(`/api/stocks?page=${page}&pageSize=500&q=&sector=${encodeURIComponent(sector)}&exchange=${encodeURIComponent(exchange)}&sort=code&direction=asc&pinned=`, { cache: 'no-store' })
        const payload = await response.json()
        if (Array.isArray(payload?.data)) rows = rows.concat(payload.data)
      }
      if (requestId !== breadthScopeRequest) return
      const symbols = rows.map(row => row.symbol || row.code).filter(Boolean).join(',')
      let quotes = {}
      if (symbols) {
        try {
          const quoteResponse = await fetch(`/api/stocks/quotes?symbols=${encodeURIComponent(symbols)}`, { cache: 'no-store' })
          const quotePayload = await quoteResponse.json()
          quotes = quotePayload?.data && typeof quotePayload.data === 'object' ? quotePayload.data : {}
        } catch (_) { /* Keep EOD values when intraday is unavailable. */ }
      }
      const stats = { up: { count: 0, volume: 0 }, down: { count: 0, volume: 0 }, flat: { count: 0, volume: 0 } }
      const changes = []
      let quoted = 0
      let unknown = 0
      rows.forEach(row => {
        const symbol = String(row.symbol || row.code || '').toUpperCase()
        const quote = quotes[symbol] || quotes[row.symbol || row.code] || {}
        if (Object.keys(quote).length) quoted += 1
        const rawChange = quote.change ?? row.change
        const change = Number(rawChange)
        if (!Number.isFinite(change)) { unknown += 1; return }
        changes.push(change)
        const key = change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
        stats[key].count += 1
        const volume = Number(quote.volume_type === 'session' ? quote.volume : (quote.volume ?? row.volume))
        if (Number.isFinite(volume) && volume > 0) stats[key].volume += volume
      })
      const classified = stats.up.count + stats.down.count + stats.flat.count
      const average = changes.length ? changes.reduce((sum, value) => sum + value, 0) / changes.length : null
      const totalVolume = stats.up.volume + stats.down.volume + stats.flat.volume
      const maxVolume = Math.max(1, stats.up.volume, stats.down.volume, stats.flat.volume)
      breadth.querySelectorAll('.breadth-count').forEach(card => {
        const key = [...card.classList].find(value => ['up', 'down', 'flat'].includes(value))
        if (!key) return
        const strong = card.querySelector('strong')
        const small = card.querySelector('small')
        if (strong) strong.textContent = String(stats[key].count)
        if (small) small.textContent = classified ? `${(stats[key].count / classified * 100).toFixed(1)}% số mã` : 'Chưa có dữ liệu'
      })
      const header = breadth.querySelector('.market-breadth-header p')
      if (header) header.textContent = `${rows.length} mã thuộc ${exchange || 'toàn bộ thị trường'} · ${quoted}/${rows.length} mã có quote intraday · Bình quân chỉ trên mã có biến động hợp lệ`
      const chip = breadth.querySelector('.market-breadth-header .chip span')
      if (chip) {
        chip.className = average != null && average < 0 ? 'negative' : 'positive'
        chip.textContent = average == null ? 'Chưa đủ dữ liệu' : `Bình quân ${average >= 0 ? '+' : ''}${average.toFixed(2)}% · ${changes.length}/${rows.length} mã`
        chip.title = 'Bình quân thay đổi của các mã có dữ liệu trong phạm vi sàn đang chọn.'
      }
      const snapshot = breadth.querySelector('.breadth-snapshot')
      if (snapshot) {
        const values = snapshot.querySelectorAll('strong')
        if (values[0]) values[0].textContent = stats.down.count ? (stats.up.count / stats.down.count).toFixed(2) : '—'
        if (values[1]) { values[1].textContent = `${stats.up.count - stats.down.count > 0 ? '+' : ''}${stats.up.count - stats.down.count}`; values[1].className = stats.up.count >= stats.down.count ? 'positive' : 'negative' }
        if (values[2]) values[2].textContent = `${rows.length ? (classified / rows.length * 100).toFixed(1) : '0.0'}%`
      }
      const segments = breadth.querySelectorAll('.breadth-distribution .breadth-segment')
      ;['up', 'down', 'flat'].forEach((key, index) => { if (segments[index]) segments[index].style.width = `${classified ? stats[key].count / classified * 100 : 0}%` })
      breadth.querySelectorAll('.breadth-volume-column').forEach((column, index) => {
        const resolved = ['up', 'down', 'flat'][index] || 'flat'
        const bar = column.querySelector('.breadth-volume-track > span')
        const value = column.querySelector('strong')
        if (bar) bar.style.height = `${stats[resolved].volume / maxVolume * 100}%`
        if (value) value.textContent = formatCompact(stats[resolved].volume)
      })
      const total = breadth.querySelector('.breadth-volume-heading span')
      if (total) total.textContent = `${formatCompact(totalVolume)} cổ phiếu`
      const note = breadth.querySelector('.breadth-disclaimer')
      if (note) note.textContent = `Phạm vi đang chọn: ${exchange || 'toàn bộ thị trường'}. Phân loại dựa trên biến động giá mới nhất; khối lượng dùng quote intraday theo phiên. ${unknown ? `${unknown} mã chưa có biến động để phân loại.` : ''}`
    } catch (_) { /* Keep the previous breadth snapshot when the scoped request fails. */ }
  }
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
        createdExchange.remove()
        createdExchange.setAttribute('aria-label', 'Sàn cho độ rộng và nhóm dẫn dắt')
        createdExchange.setAttribute('aria-label', 'Sàn cho Top list, chỉ áp dụng cho nhóm dẫn dắt')
      }
      const scopeNote = wrapper.querySelector('.breadth-leaders-header small')
      if (scopeNote) scopeNote.textContent = `${exchange ? `Sàn: ${exchange}` : sector ? `Nhóm ngành: ${sector}` : 'Toàn bộ thị trường'} · Sàn áp dụng cho độ rộng và Top list`
      if (scopeNote && !scopeNote.textContent.includes('chỉ áp dụng cho Top list')) scopeNote.textContent += ' · Sàn chỉ áp dụng cho Top list'
      wrapper.querySelectorAll('.breadth-leader > small').forEach(note => { if (note.textContent.includes('biến động')) note.textContent += ' intraday' })
      breadth.querySelectorAll('.breadth-leaders').forEach(existing => existing.remove())
      breadth.querySelector('.breadth-snapshot')?.after(wrapper)
      wrapper.querySelectorAll('.breadth-leader li span').forEach(symbolNode => {
        const symbol = symbolNode.textContent.trim()
        if (!symbol || symbol === '—') return
        symbolNode.dataset.breadthBound = '1'
        symbolNode.dataset.breadthSymbol = symbol
        symbolNode.tabIndex = 0
        symbolNode.setAttribute('aria-label', `Mở Chi tiết mã ${symbol}`)
        symbolNode.setAttribute('role', 'button')
        symbolNode.setAttribute('aria-label', `Mở Chi tiết mã ${symbol}`)
        symbolNode.setAttribute('aria-label', `Lọc bảng theo mã ${symbol}`)
        const openDetail = () => {
          const row = [...document.querySelectorAll('.table-panel tbody tr')].find(item => item.querySelector('.symbol')?.textContent.trim().split(/\s+/)[0].toUpperCase() === symbol.toUpperCase())
          if (row) {
            row.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
            return
          }
          window.location.href = `/?view=detail&symbol=${encodeURIComponent(symbol)}`
          return
          /*
          const input = document.querySelector('.table-search')
          if (!input) return
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
          setter?.call(input, symbol)
          input.dispatchEvent(new Event('input', { bubbles: true }))
          input.scrollIntoView({ behavior: 'smooth', block: 'center' })
          input.focus({ preventScroll: true })
          */
        }
        symbolNode.title = `Mở Chi tiết mã ${symbol}`
        symbolNode.addEventListener('click', openDetail)
        symbolNode.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDetail() } })
      })
    } catch (_) {
      // Keep the breadth snapshot usable when the optional ranking request fails.
    } finally { leadersLoading = false }
  }
  const formatCompact = value => new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0))
  const marketSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '14:45']
  const marketViewKey = 'stockpilot-market-view'
  const boardSectorKey = 'stockpilot-board-sector'
  const marketColumnsKey = 'stockpilot-market-columns-v1'
  const boardLoadingId = 'market-board-loading-overlay'
  let boardRefreshSequence = 0
  let boardRefreshController = null
  const setBoardLoading = loading => {
    let overlay = document.getElementById(boardLoadingId)
    if (!loading) {
      overlay?.remove()
      return
    }
    if (overlay) return
    overlay = document.createElement('div')
    overlay.id = boardLoadingId
    overlay.className = 'loading-overlay market-board-loading-overlay'
    overlay.setAttribute('role', 'status')
    overlay.setAttribute('aria-live', 'polite')
    overlay.innerHTML = '<div class="loading-card"><div class="loading-logo">S</div><span class="loading-spinner"></span><span>Đang lấy giá mới nhất cho Bảng giá...</span></div>'
    document.body.append(overlay)
  }
  const cancelMarketBoardRefresh = () => {
    boardRefreshSequence += 1
    boardRefreshController?.abort()
    boardRefreshController = null
    setBoardLoading(false)
  }
  const marketBoardSymbols = () => [...new Set([...document.querySelectorAll('.table-panel tbody tr .symbol')]
    .map(node => node.textContent.trim().split(/\s+/)[0].toUpperCase())
    .filter(Boolean))]
  const waitForMarketBoardSymbols = async () => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const symbols = marketBoardSymbols()
      if (symbols.length) return symbols
      await new Promise(resolve => window.setTimeout(resolve, 50))
    }
    return []
  }
  const refreshMarketBoardQuotes = async () => {
    const sequence = ++boardRefreshSequence
    boardRefreshController?.abort()
    const controller = new AbortController()
    boardRefreshController = controller
    setBoardLoading(true)
    const timeout = window.setTimeout(() => controller.abort(), 15000)
    try {
      const symbols = await waitForMarketBoardSymbols()
      if (!symbols.length || sequence !== boardRefreshSequence) return
      const response = await fetch(`/api/stocks/quotes?symbols=${encodeURIComponent(symbols.join(','))}&board_refresh=${Date.now()}`, {
        cache: 'no-store',
        signal: controller.signal
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const payload = await response.json()
      if (sequence !== boardRefreshSequence) return
      window.__stockpilotSyncQuoteRows?.(payload)
      await new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)))
    } catch (_) {
      // EOD rows remain usable; the existing status line reports quote failures.
    } finally {
      window.clearTimeout(timeout)
      if (sequence === boardRefreshSequence) {
        boardRefreshController = null
        setBoardLoading(false)
      }
    }
  }
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

  const reconcileDetailChartGap = () => {
    const panel = document.querySelector('.detail-chart-panel')
    const gap = panel?.querySelector('.chart-data-gap')
    if (!panel || !gap) return
    const representedSessions = new Set([...panel.querySelectorAll('.price-point[data-session-date]')]
      .map(point => point.getAttribute('data-session-date'))
      .filter(Boolean))
    const reported = [...gap.textContent.matchAll(/\b(\d{2})-(\d{2})\b/g)].map(match => ({ month: match[1], day: match[2] }))
    if (!reported.length) return
    const missing = reported.filter(({ month, day }) => ![...representedSessions].some(date => date.endsWith(`-${month}-${day}`)))
    if (!missing.length) {
      gap.remove()
      return
    }
    gap.textContent = `Phiên gần đây có dữ liệu trong hệ thống nhưng chưa có điểm giá cho mã này: ${missing.map(({ month, day }) => `${day}-${month}`).join(', ')}. Biểu đồ chỉ hiển thị dữ liệu giá ghi nhận được.`
  }

  const pageContexts = {
    'Tổng quan': ['THỊ TRƯỜNG', 'Tổng quan'],
    'Bảng giá': ['THỊ TRƯỜNG', 'Bảng giá'],
    'Danh mục cá nhân': ['TÀI SẢN CÁ NHÂN', 'Danh mục'],
    'Chi tiết mã': ['NGHIÊN CỨU', 'Chi tiết mã'],
    'Đề xuất': ['HỖ TRỢ QUYẾT ĐỊNH', 'Đề xuất'],
    'AI Advisor': ['TRỢ LÝ PHÂN TÍCH', 'AI Advisor']
  }

  const syncPageContext = () => {
    const shell = document.querySelector('.dashboard-shell')
    const active = shell?.classList.contains('market-board-active')
      ? 'Bảng giá'
      : document.querySelector('.nav-item.active:not(.market-board-nav-item) .nav-label')?.textContent.trim()
    const context = pageContexts[active] || pageContexts['Tổng quan']
    const topbar = document.querySelector('.topbar')
    const eyebrow = topbar?.querySelector('.eyebrow')
    const heading = topbar?.querySelector('h1')
    if (eyebrow && eyebrow.textContent !== context[0]) eyebrow.textContent = context[0]
    if (heading && heading.textContent !== context[1]) heading.textContent = context[1]
    if (shell) shell.dataset.activePage = active || 'Tổng quan'
  }

  const ensureTableScrollHint = () => {
    const wrap = document.querySelector('.table-panel .table-wrap')
    if (!wrap || wrap.previousElementSibling?.classList.contains('table-scroll-hint')) return
    const hint = document.createElement('p')
    hint.className = 'table-scroll-hint'
    hint.setAttribute('role', 'note')
    hint.textContent = 'Vuốt ngang trong bảng để xem đầy đủ giá, phân tích và thao tác.'
    wrap.before(hint)
  }

  const marketColumnDefinitions = [
    { key: 'name', label: 'Doanh nghiệp', index: 1 },
    { key: 'volume', label: 'Khối lượng', index: 4 },
    { key: 'analysis', label: 'Phân tích', index: 6 },
    { key: 'actions', label: 'Thao tác', index: 7 }
  ]
  const readMarketColumns = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(marketColumnsKey) || '{}')
      return Object.fromEntries(marketColumnDefinitions.map(column => [column.key, saved[column.key] !== false]))
    } catch (_) {
      return Object.fromEntries(marketColumnDefinitions.map(column => [column.key, true]))
    }
  }
  const writeMarketColumns = columns => {
    try { localStorage.setItem(marketColumnsKey, JSON.stringify(columns)) } catch (_) { }
  }
  const applyMarketColumns = (panel, columns) => {
    marketColumnDefinitions.forEach(column => panel.classList.toggle(`market-board-hide-${column.key}`, columns[column.key] === false))
    panel.querySelectorAll('[data-market-column]').forEach(input => { input.checked = columns[input.dataset.marketColumn] !== false })
  }
  const csvCell = value => {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim()
    const safe = /^[=+\-@]/.test(normalized) ? `'${normalized}` : normalized
    return `"${safe.replaceAll('"', '""')}"`
  }
  const exportMarketBoard = panel => {
    const columns = readMarketColumns()
    const exportIndexes = [0, 1, 2, 3, 4].filter(index => {
      const definition = marketColumnDefinitions.find(column => column.index === index)
      return !definition || columns[definition.key] !== false
    })
    const headers = [...panel.querySelectorAll('thead th')]
    const rows = [...panel.querySelectorAll('tbody tr')].filter(row => row.querySelector('.symbol'))
    const records = [
      exportIndexes.map(index => csvCell(headers[index]?.textContent || '')).join(','),
      ...rows.map(row => exportIndexes.map(index => csvCell(row.cells[index]?.textContent || '')).join(','))
    ]
    const blob = new Blob([`\uFEFF${records.join('\r\n')}\r\n`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
    link.href = url
    link.download = `stockpilot-bang-gia-${date}.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }
  const ensureMarketBoardTools = () => {
    const panel = document.querySelector('.table-panel')
    const header = panel?.querySelector(':scope > .panel-header')
    if (!panel || !header) return
    let tools = header.querySelector('.market-board-tools')
    if (!tools) {
      tools = document.createElement('div')
      tools.className = 'market-board-tools'
      tools.innerHTML = '<button type="button" class="ghost-btn market-board-export">Xuất CSV</button><details class="market-board-column-picker"><summary class="ghost-btn">Cột hiển thị</summary><fieldset class="market-board-column-menu"><legend>Tùy chỉnh Bảng giá</legend>' + marketColumnDefinitions.map(column => `<label><input type="checkbox" data-market-column="${column.key}"> ${column.label}</label>`).join('') + '<button type="button" class="ghost-btn market-board-columns-reset">Khôi phục mặc định</button></fieldset></details><span class="market-board-toolbar-status" role="status" aria-live="polite"></span>'
      header.append(tools)
      tools.querySelector('.market-board-export').addEventListener('click', () => exportMarketBoard(panel))
      tools.querySelectorAll('[data-market-column]').forEach(input => input.addEventListener('change', () => {
        const columns = readMarketColumns()
        columns[input.dataset.marketColumn] = input.checked
        writeMarketColumns(columns)
        applyMarketColumns(panel, columns)
        tools.querySelector('.market-board-toolbar-status').textContent = `Đã ${input.checked ? 'hiện' : 'ẩn'} cột ${input.parentElement.textContent.trim()}`
      }))
      tools.querySelector('.market-board-columns-reset').addEventListener('click', () => {
        const defaults = Object.fromEntries(marketColumnDefinitions.map(column => [column.key, true]))
        writeMarketColumns(defaults)
        applyMarketColumns(panel, defaults)
        tools.querySelector('.market-board-toolbar-status').textContent = 'Đã khôi phục các cột mặc định'
      })
    }
    const rowCount = panel.querySelectorAll('tbody tr .symbol').length
    const exportButton = tools.querySelector('.market-board-export')
    const exportLabel = `Xuất CSV (${rowCount})`
    if (exportButton.textContent !== exportLabel) exportButton.textContent = exportLabel
    exportButton.disabled = rowCount === 0
    exportButton.title = rowCount ? `Xuất ${rowCount} mã trong trang và bộ lọc hiện tại` : 'Chưa có dữ liệu để xuất'
    applyMarketColumns(panel, readMarketColumns())
    const wrap = panel.querySelector('.table-wrap')
    if (wrap && !wrap.dataset.marketStickyBound) {
      wrap.dataset.marketStickyBound = '1'
      const syncScrolled = () => wrap.classList.toggle('is-horizontally-scrolled', wrap.scrollLeft > 2)
      wrap.addEventListener('scroll', syncScrolled, { passive: true })
      syncScrolled()
    }
  }

  const enhanceAdvisor = () => {
    const chat = document.querySelector('.advisor-page .chat-shell')
    const input = document.querySelector('.advisor-page .input-row input')
    const send = document.querySelector('.advisor-page .input-row button')
    if (chat) {
      chat.setAttribute('role', 'log')
      chat.setAttribute('aria-live', 'polite')
      chat.setAttribute('aria-relevant', 'additions text')
      chat.setAttribute('aria-label', 'Lịch sử trao đổi với AI Advisor')
    }
    const gate = document.querySelector('.advisor-page .panel-header .chip')
    if (gate) {
      const enabled = gate.classList.contains('success')
      gate.textContent = enabled ? 'AI tạo sinh: bật' : 'AI tạo sinh: khóa'
      gate.title = enabled ? 'Generative AI đang bật' : 'Generative AI đang khóa; trợ lý dùng phân tích rule-based.'
    }
    if (!input || !send) return
    input.setAttribute('aria-label', 'Câu hỏi cho AI Advisor')
    const updateSendState = () => {
      const empty = !input.value.trim()
      send.disabled = empty
      send.title = empty ? 'Nhập câu hỏi trước khi gửi' : 'Gửi câu hỏi'
    }
    if (!input.dataset.advisorInputBound) {
      input.dataset.advisorInputBound = '1'
      input.addEventListener('input', updateSendState)
    }
    updateSendState()
  }

  const enhance = () => {
    installStyles()
    reconcileDetailChartGap()
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
        cancelMarketBoardRefresh()
        clearAnalysisRequestFlags()
        try { sessionStorage.removeItem(marketViewKey) } catch (_) { }
        window.__stockpilotResetAnalysis?.()
        const boardButton = document.querySelector('.market-board-nav-item')
        boardButton?.classList.remove('active')
        boardButton?.removeAttribute('aria-current')
        document.querySelector('.dashboard-shell')?.classList.remove('market-board-active')
      }
      row.querySelector('.symbol a.stock-detail-link')?.addEventListener('click', event => {
        event.preventDefault()
        event.stopPropagation()
        leaveBoard()
        window.dispatchEvent(new CustomEvent('stockpilot:open-detail', { detail: { symbol } }))
        row.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
        window.setTimeout(() => {
          const detailNav = [...document.querySelectorAll('.nav-item')].find(item => item.textContent.includes('Chi tiết'))
          document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'))
          detailNav?.classList.add('active')
        }, 0)
      })
      row.addEventListener('click', event => {
        if (event.target.closest('button, a, input, select, textarea')) return
        leaveBoard()
        window.dispatchEvent(new CustomEvent('stockpilot:open-detail', { detail: { symbol } }))
        window.setTimeout(() => {
          const detailNav = [...document.querySelectorAll('.nav-item')].find(item => item.textContent.includes('Chi tiết'))
          document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'))
          detailNav?.classList.add('active')
        }, 0)
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
      symbolCell?.querySelector('a.stock-detail-link')?.addEventListener('click', clearAnalysisRequestFlags, true)
      row.addEventListener('click', event => { if (!event.target.closest('button, a, input, select, textarea')) { clearAnalysisRequestFlags(); window.location.href = href } })
      row.addEventListener('keydown', event => { if ((event.key === 'Enter' || event.key === ' ') && !event.target.closest('button, a, input, select, textarea')) { event.preventDefault(); clearAnalysisRequestFlags(); window.location.href = href } })
    })
    if (!document.documentElement.dataset.analysisGateBound) {
      document.documentElement.dataset.analysisGateBound = '1'
      document.addEventListener('click', event => {
        if (!event.target.closest('.detail-analysis-btn')) return
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
    document.querySelectorAll('.overview-analysis-btn').forEach(button => {
      if (button.dataset.detailNavigationBound) return
      const row = button.closest('tr')
      const symbol = row?.querySelector('.symbol')?.textContent.trim().split(/\s+/)[0]
      if (!row || !symbol) return
      button.dataset.detailNavigationBound = '1'
      button.addEventListener('click', () => {
        cancelMarketBoardRefresh()
        try { sessionStorage.removeItem(marketViewKey) } catch (_) { }
        document.querySelector('.market-board-nav-item')?.classList.remove('active')
        document.querySelector('.market-board-nav-item')?.removeAttribute('aria-current')
        document.querySelector('.dashboard-shell')?.classList.remove('market-board-active')
        window.__stockpilotRequestAnalysis?.()
      }, true)
    })
  const shell = document.querySelector('.dashboard-shell')
  const nav = document.querySelector('.nav')
  if (shell && !shell.dataset.marketNavigationBound) {
    shell.dataset.marketNavigationBound = '1'
    shell.addEventListener('click', event => {
      if (event.target.closest('.nav-item:not(.market-board-nav-item), .detail-analysis-btn, .table-panel tbody tr')) cancelMarketBoardRefresh()
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
        window.__stockpilotResetAnalysis?.()
        nav.querySelector('.nav-item:not(.market-board-nav-item)')?.click()
        try { sessionStorage.setItem(marketViewKey, 'board') } catch (_) { }
        shell?.classList.add('market-board-active')
        boardNav.classList.add('active')
        boardNav.setAttribute('aria-current', 'page')
        nav.querySelector('.nav-item:not(.market-board-nav-item).active')?.classList.remove('active')
        refreshMarketBoardQuotes()
      })
    }
    if (!document.documentElement.dataset.portfolioAddBound) {
      document.documentElement.dataset.portfolioAddBound = '1'
      document.addEventListener('click', event => {
        const button = event.target.closest('.add-portfolio-btn, .overview-add-portfolio-btn, [aria-label*="danh mục"]')
        if (!button) return
        const row = button.closest('tr')
        const ariaSymbol = button.getAttribute('aria-label')?.match(/Thêm\s+(.+?)\s+vào danh mục/i)?.[1]
        const symbol = ariaSymbol || row?.querySelector('.symbol')?.textContent.trim().split(/\s+/)[0]
        if (!symbol) return
        const priceText = row.querySelectorAll('td')?.[2]?.textContent || ''
        const price = Number(priceText.replace(/[^0-9-]/g, '')) || null
        event.preventDefault()
        event.stopPropagation()
        try { sessionStorage.removeItem(marketViewKey) } catch (_) { }
        document.querySelector('.dashboard-shell')?.classList.remove('market-board-active')
        document.querySelector('.market-board-nav-item')?.classList.remove('active')
        document.querySelector('.market-board-nav-item')?.removeAttribute('aria-current')
        if (window.__stockpilotAddToPortfolio) {
          window.__stockpilotAddToPortfolio({ symbol, price })
          window.dispatchEvent(new CustomEvent('stockpilot:add-to-portfolio', { detail: { symbol, price } }))
        } else {
          const portfolioNav = [...document.querySelectorAll('.nav-item')].find(item => item.textContent.includes('Danh mục'))
          portfolioNav?.click()
          window.setTimeout(() => {
            const symbolInput = document.querySelector('.transaction-form input[aria-label], .transaction-form input')
            const priceInput = document.querySelectorAll('.transaction-form input')[2]
            const setValue = (node, value) => {
              if (!node || value == null) return
              const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
              setter?.call(node, String(value)); node.dispatchEvent(new Event('input', { bubbles: true }))
            }
            setValue(symbolInput, symbol); setValue(priceInput, price)
          }, 50)
        }
      }, true)
    }
    if (shell && !shell.classList.contains('market-board-active')) boardNav?.removeAttribute('aria-current')
    nav?.querySelectorAll('.nav-item:not(.market-board-nav-item)').forEach(item => {
      if (item.dataset.marketViewBound) return
      item.dataset.marketViewBound = '1'
      item.addEventListener('click', () => {
        cancelMarketBoardRefresh()
        clearAnalysisRequestFlags()
        window.__stockpilotResetAnalysis?.()
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
    const pageNavItems = [...(nav?.querySelectorAll('.nav-item:not(.market-board-nav-item)') || [])]
    nav?.querySelectorAll('.nav-item').forEach(item => item.removeAttribute('aria-current'))
    if (shell?.classList.contains('market-board-active')) {
      pageNavItems.forEach(item => item.classList.remove('active'))
      boardNav?.classList.add('active')
      boardNav?.setAttribute('aria-current', 'page')
    } else {
      boardNav?.classList.remove('active')
      const activeItems = pageNavItems.filter(item => item.classList.contains('active'))
      const storedView = sessionStorage.getItem('stockpilot-view') || 'overview'
      const viewLabels = { overview: 'Tổng quan', portfolio: 'Danh mục cá nhân', detail: 'Chi tiết mã', recommendations: 'Đề xuất', advisor: 'AI Advisor' }
      const storedItem = pageNavItems.find(item => item.getAttribute('aria-label') === viewLabels[storedView] || item.textContent.trim() === viewLabels[storedView])
      const currentItem = activeItems.length === 1 ? activeItems[0] : storedItem || overviewNav
      pageNavItems.forEach(item => item.classList.toggle('active', item === currentItem))
      currentItem?.setAttribute('aria-current', 'page')
    }
    if (sessionStorage.getItem(marketViewKey) === 'board' && shell && !shell.classList.contains('market-board-active')) {
      window.setTimeout(() => boardNav.click(), 0)
    }
    document.querySelectorAll('.table-panel thead th').forEach(header => {
      if (['Nhận định', 'Đánh giá'].includes(header.textContent.trim())) header.textContent = 'Phân tích'
    })
    document.querySelectorAll('.table-panel tbody tr').forEach(row => {
      const cell = row.children[6]
      const symbol = row.querySelector('.symbol')?.textContent.trim().split(/\s+/)[0]
      if (!cell || !symbol) return
      cell.classList.add('overview-assessment')
      if (!cell.querySelector('.overview-analysis-btn')) cell.innerHTML = `<button type="button" class="overview-analysis-btn" aria-label="Mở phân tích chuyên sâu">Phân tích chuyên sâu</button>`
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
    document.querySelectorAll('.data-provenance, .detail-hero > p').forEach(meta => {
      if (meta.classList.contains('compact-system-meta')) return
      const description = meta.textContent.trim()
      if (!description) return
      meta.classList.add('compact-system-meta')
      if (!meta.title) meta.title = description
      meta.setAttribute('aria-label', `Thông tin dữ liệu: ${description}`)
    })
    document.querySelectorAll('.data-time').forEach(meta => {
      if (!meta.title && meta.textContent.trim()) meta.title = meta.textContent.trim()
    })
    ensurePortfolioPresentation()
    ensureAllocationDonutTooltips()
    document.querySelectorAll('.allocation-day-change').forEach(change => {
      const rawText = change.textContent.trim()
      if (!rawText) return
      // This is a portfolio day change, not a five-minute return:
      // current total minus quantity-weighted previous-session close.
      const signedChange = rawText.replace(/^So\s+[^:]+:\s*/i, '')
      // Preserve the React-owned value node. Replacing it makes React keep a
      // detached text node and the day change stops updating when a newer
      // intraday quote revalues the portfolio.
      let value = change.querySelector(':scope > span')
      if (!value) {
        value = document.createElement('span')
        change.replaceChildren(document.createTextNode('So với hôm qua: '), value)
      }
      const allocationPanel = change.closest('.allocation-panel')
      const footnote = allocationPanel?.querySelector('.allocation-footnote')?.textContent || ''
      const coverage = footnote.match(/(\d+)\s*\/\s*(\d+)/)
      const partialCoverage = coverage && Number(coverage[1]) < Number(coverage[2])
      const percentMatch = signedChange.match(/([+-])\s*(\d+(?:[.,]\d+)?)\s*%/)
      const percentChange = percentMatch ? Number(percentMatch[2].replace(',', '.')) * (percentMatch[1] === '-' ? -1 : 1) : /\+/.test(signedChange) ? 1 : /-/.test(signedChange) ? -1 : null
      const amountMatch = signedChange.match(/([+-]?\s*\d[\d.,]*)\s*(?:₫|đ|VND)/i)
      const amountText = amountMatch?.[1]?.replace(/\s/g, '') || ''
      const amountChange = amountText ? Number(amountText.replace(/\./g, '').replace(',', '.')) : null
      const direction = Number.isFinite(amountChange) && amountChange !== 0 ? Math.sign(amountChange) : percentChange
      // Keep direction and data quality separate: a positive change stays green
      // even when the portfolio is only partially covered by intraday quotes.
      const rag = direction == null || direction === 0 ? 'amber' : direction > 0 ? 'green' : 'red'
      const ragColor = rag === 'green' ? 'var(--success, #34d399)' : rag === 'red' ? 'var(--danger, #f87171)' : 'var(--warning, #fbbf24)'
      const amountDisplay = Number.isFinite(amountChange)
        ? `${amountChange >= 0 ? '+' : '-'}${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Math.abs(amountChange))} ₫`
        : ''
      const percentDisplay = Number.isFinite(percentChange)
        ? `${percentChange >= 0 ? '+' : '-'}${new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(percentChange))}%`
        : ''
      const displayValue = amountDisplay && percentDisplay ? `${amountDisplay} ${percentDisplay}` : 'Chưa đủ dữ liệu'
      if (value.textContent !== displayValue) value.textContent = displayValue
      change.dataset.rag = rag
      change.dataset.dataQuality = partialCoverage ? 'partial' : 'complete'
      change.style.setProperty('color', '#f8fafc', 'important')
      value.classList.add(rag === 'green' ? 'positive' : rag === 'red' ? 'negative' : 'neutral')
      value.dataset.rag = rag
      value.style.setProperty('color', ragColor, 'important')
      change.title = `${partialCoverage ? 'Một phần danh mục đang dùng giá fallback hoặc chưa có quote intraday. ' : ''}Tổng giá trị hiện tại trừ tổng (số lượng × giá đóng cửa phiên trước). Không phải thay đổi 5 phút.`
      change.setAttribute('aria-label', `${change.textContent}. ${change.title}`)
    })
    const allocationPanel = document.querySelector('.allocation-panel')
    if (allocationPanel) {
      let audit = allocationPanel.querySelector('.portfolio-data-audit')
      if (!audit) {
        audit = document.createElement('aside')
        audit.className = 'portfolio-data-audit'
        audit.setAttribute('aria-label', 'Kiểm tra dữ liệu danh mục')
        audit.innerHTML = '<strong>Kiểm tra dữ liệu danh mục</strong><p data-audit-coverage></p><p>Chênh lệch = tổng giá trị hiện tại − tổng (số lượng × giá đóng cửa phiên trước).</p><div class="portfolio-data-audit-legend" aria-label="Chú giải RAG"><span><i class="rag-green"></i>Tăng</span><span><i class="rag-red"></i>Giảm</span><span><i class="rag-amber"></i>Chưa đủ dữ liệu</span></div>'
        allocationPanel.append(audit)
      }
      const coverageText = allocationPanel.querySelector('.allocation-footnote')?.textContent.trim() || 'Chưa có thông tin độ phủ quote.'
      const coverageNode = audit.querySelector('[data-audit-coverage]')
      if (coverageNode) coverageNode.textContent = coverageText
    }
    document.querySelectorAll('.volume-context').forEach(context => {
      context.setAttribute('tabindex', '0')
    })
    document.querySelectorAll('[data-stale-volume]').forEach(badge => {
      const session = badge.parentElement?.title?.replace(/^Dữ liệu phiên\s*/, '') || 'trước'
      badge.title = `Dữ liệu cũ: giá hoặc khối lượng thuộc phiên ${session}, chưa phải phiên chuẩn mới nhất.`
      badge.setAttribute('aria-label', badge.title)
    })
    ensureOverviewResourceErrors()
    document.querySelector('.table-panel .table-tools')?.classList.add('overview-filter-row')
    ensureOverviewSnapshot()
    ensureMarketTimeline()
    const breadth = document.querySelector('.market-breadth-panel')
    const breadthHeaderText = breadth?.querySelector('.market-breadth-header p')
    const activeBreadthExchange = breadth?.querySelector('.breadth-exchange-select')?.value || ''
    if (breadthHeaderText && !activeBreadthExchange) {
      const tableCount = document.querySelectorAll('.table-panel tbody tr .symbol').length
      const sourceCoverage = document.querySelector('.overview-source-summary')?.textContent.match(/(\d+)\s*\/\s*(\d+)\s*mã có Intraday/i)
      const reportedQuoted = sourceCoverage ? Number(sourceCoverage[1]) : tableCount
      const reportedUniverse = sourceCoverage ? Number(sourceCoverage[2]) : tableCount
      // A full quote response can settle before the React pagination summary.
      // Never expose impossible coverage such as 300/40 during that transition.
      const universe = Math.max(tableCount, reportedQuoted, reportedUniverse)
      const quoted = Math.min(reportedQuoted, universe)
      breadthHeaderText.textContent = `${universe} mã trong vũ trụ · ${quoted}/${universe} mã có quote intraday · Bình quân chỉ trên mã có biến động hợp lệ`
    }
    const breadthAverageChip = breadth?.querySelector('.market-breadth-header .chip span')
    if (breadthAverageChip) breadthAverageChip.title = 'Bình quân thay đổi của các mã có dữ liệu biến động hợp lệ trong phạm vi đang chọn.'
    const breadthCounts = breadth ? {
      up: Number(breadth.querySelector('.breadth-count.up strong')?.textContent || 0),
      down: Number(breadth.querySelector('.breadth-count.down strong')?.textContent || 0),
      flat: Number(breadth.querySelector('.breadth-count.flat strong')?.textContent || 0)
    } : null
    let snapshot = breadth?.querySelector('.breadth-snapshot')
    if (breadth && breadthCounts && breadthCounts.up + breadthCounts.down + breadthCounts.flat > 0) {
      const classified = breadthCounts.up + breadthCounts.down + breadthCounts.flat
      const ratio = breadthCounts.down > 0 ? (breadthCounts.up / breadthCounts.down).toFixed(2) : '—'
      const spread = breadthCounts.up - breadthCounts.down
      const percentText = Array.from(breadth.querySelectorAll('.breadth-count small')).map(node => Number.parseFloat(node.textContent)).filter(Number.isFinite)
      const classifiedPercent = percentText.length === 3 ? percentText.reduce((sum, value) => sum + value, 0).toFixed(1) : '—'
      const signature = `${ratio}|${spread}|${classifiedPercent}|${classified}`
      if (!snapshot) {
        snapshot = document.createElement('div')
        snapshot.className = 'breadth-snapshot'
        snapshot.setAttribute('aria-label', 'Chỉ số snapshot độ rộng thị trường')
        breadth.querySelector('.breadth-counts')?.after(snapshot)
      }
      if (snapshot.dataset.signature !== signature) {
        snapshot.innerHTML = `<div><span>A/D ratio</span><strong>${ratio}</strong><small>Tăng / giảm</small></div><div><span>Chênh lệch A−D</span><strong class="${spread >= 0 ? 'positive' : 'negative'}">${spread > 0 ? '+' : ''}${spread}</strong><small>Mã tăng trừ mã giảm</small></div><div><span>Đã phân loại</span><strong>${classifiedPercent}%</strong><small>${classified ? 'Dựa trên mã có biến động' : 'Chưa có dữ liệu'}</small></div>`
        snapshot.dataset.signature = signature
      }
    } else snapshot?.remove()
    const sectorSelect = document.querySelector('.sector-select')
    const boardActive = shell?.classList.contains('market-board-active')
    const selectedSector = boardActive ? '' : sectorSelect?.value || ''
    const leaderPanels = [...document.querySelectorAll('.breadth-leaders')]
    leaderPanels.slice(1).forEach(panel => panel.remove())
    let exchangeSelect = ensureBreadthExchangeSelect(breadth)
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
        if (breadth) refreshBreadthScope(breadth, sectorSelect?.value || '', exchangeSelect.value || '')
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
      symbolNode.setAttribute('aria-label', `Mở Chi tiết mã ${symbol}`)
      symbolNode.setAttribute('role', 'button')
      symbolNode.setAttribute('aria-label', `Lọc bảng theo mã ${symbol}`)
      const openDetail = () => {
        const row = [...document.querySelectorAll('.table-panel tbody tr')].find(item => item.querySelector('.symbol')?.textContent.trim().split(/\s+/)[0].toUpperCase() === symbol.toUpperCase())
        if (row) {
          window.dispatchEvent(new CustomEvent('stockpilot:open-detail', { detail: { symbol } }))
          row.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
          window.setTimeout(() => {
            const detailNav = [...document.querySelectorAll('.nav-item')].find(item => item.textContent.includes('Chi tiết'))
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'))
            detailNav?.classList.add('active')
          }, 0)
          return
        }
        window.location.href = `/?view=detail&symbol=${encodeURIComponent(symbol)}`
      }
      symbolNode.title = `Mở Chi tiết mã ${symbol}`
      symbolNode.addEventListener('click', openDetail)
      symbolNode.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDetail() } })
    })
    const tablePanel = document.querySelector('.table-panel')
    if (tablePanel && !tablePanel.querySelector('.page-size-control:not(.overview-page-size-control)')) {
      const controls = document.createElement('div')
      controls.className = 'table-pagination'
      controls.innerHTML = '<button type="button" class="ghost-btn" aria-label="Trước">Trước</button><label class="page-size-control"><span>Số mã / trang</span><select aria-label="Số mã mỗi trang"><option value="25">25</option><option value="40" selected>40</option><option value="50">50</option><option value="100">100</option></select></label><button type="button" class="ghost-btn" aria-label="Sau">Sau</button>'
      controls.querySelector('select').addEventListener('change', event => {
        window.dispatchEvent(new CustomEvent('stockpilot:page-size', { detail: { value: event.target.value } }))
      })
      tablePanel.append(controls)
    }
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
        const visibleRowCount = document.querySelectorAll('.table-panel tbody tr .symbol').length
        const countText = `Hiển thị ${visibleRowCount}/${visibleRowCount} mã`
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
    document.querySelectorAll('.saved-proposal .danger-btn').forEach(button => {
      if (button.textContent.trim().startsWith('X')) button.textContent = '\u0058\u00f3\u0061'
    })
    document.querySelectorAll('.recommendation-workbench > .saved-proposals, .recommendation-criteria-panel > .saved-proposals').forEach(section => section.remove())
    ensureTableScrollHint()
    ensureMarketBoardTools()
    enhanceAdvisor()
    syncPageContext()
  }

  let scheduled = false
  let observer
  const observe = () => observer?.observe(document.body, { childList: true, subtree: true })
  const scheduleEnhance = () => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      observer?.disconnect()
      enhance()
      observe()
    })
  }

  window.addEventListener('stockpilot:portfolio-state', scheduleEnhance)
  window.addEventListener('stockpilot:overview-resource-state', scheduleEnhance)
  enhance()
  observer = new MutationObserver(scheduleEnhance)
  observe()
})()
