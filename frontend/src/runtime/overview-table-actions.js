(() => {
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
      const byChange = rows.filter(row => Number.isFinite(Number(row.change)))
      const byVolume = rows.filter(row => Number.isFinite(Number(row.volume)) && Number(row.volume) > 0)
      const lists = [['Top tăng', byChange.sort((a, b) => Number(b.change) - Number(a.change)).slice(0, 5), 'change'], ['Top giảm', byChange.sort((a, b) => Number(a.change) - Number(b.change)).slice(0, 5), 'change'], ['Top khối lượng', byVolume.sort((a, b) => Number(b.volume) - Number(a.volume)).slice(0, 5), 'volume']]
      const wrapper = document.createElement('div')
      wrapper.className = 'breadth-leaders'
      wrapper.dataset.sector = sector
      wrapper.dataset.exchange = exchange
      wrapper.setAttribute('aria-label', 'Các mã dẫn dắt thị trường')
      wrapper.innerHTML = `<div class="breadth-leaders-header"><div><strong>Nhóm dẫn dắt</strong><small>${exchange ? `Sàn: ${exchange}` : sector ? `Nhóm ngành: ${sector}` : 'Toàn bộ danh sách hiện tại'}</small></div><select class="breadth-exchange-select" aria-label="Sàn cho Top list"><option value="">Tất cả sàn</option><option value="HSX">HSX</option><option value="HNX">HNX</option><option value="UPCOM">UPCOM</option></select></div>${lists.map(([label, items, field]) => `<section class="breadth-leader"><strong>${label}</strong><small>${field === 'change' ? 'Xếp theo % biến động' : 'Xếp theo khối lượng'}</small>${items.length ? `<ol>${items.map(row => `<li><span>${row.symbol || row.code || '—'}</span><b>${field === 'change' ? `${Number(row.change) >= 0 ? '+' : ''}${Number(row.change).toFixed(2)}%` : formatCompact(row.volume)}</b></li>`).join('')}</ol>` : '<p>Chưa có dữ liệu</p>'}</section>`).join('')}`
      const createdExchange = wrapper.querySelector('.breadth-exchange-select')
      if (createdExchange) createdExchange.value = exchange
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

  const enhance = () => {
    installStyles()
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
    if (nav && !boardNav) {
      boardNav = document.createElement('button')
      boardNav.type = 'button'
      boardNav.className = 'nav-item market-board-nav-item'
      boardNav.textContent = 'Bảng giá'
      boardNav.setAttribute('aria-label', 'Bảng giá')
      nav.insertBefore(boardNav, nav.children[1] || null)
      boardNav.addEventListener('click', () => {
        nav.querySelector('.nav-item:not(.market-board-nav-item)')?.click()
        window.setTimeout(() => {
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
        shell?.classList.remove('market-board-active')
        boardNav?.classList.remove('active')
        boardNav?.removeAttribute('aria-current')
      })
    })
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
    const selectedSector = sectorSelect?.value || ''
    let exchangeSelect = document.querySelector('.breadth-exchange-select')
    const selectedExchange = exchangeSelect?.value || ''
    const existingLeaders = breadth?.querySelector('.breadth-leaders')
    if (existingLeaders && (existingLeaders.dataset.sector !== selectedSector || existingLeaders.dataset.exchange !== selectedExchange)) existingLeaders.remove()
    if (breadth && !breadth.querySelector('.breadth-leaders')) loadBreadthLeaders(breadth, selectedSector, selectedExchange)
    if (sectorSelect && !sectorSelect.dataset.breadthScopeBound) {
      sectorSelect.dataset.breadthScopeBound = '1'
      sectorSelect.addEventListener('change', () => {
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
