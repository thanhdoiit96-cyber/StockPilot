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
      @media (max-width: 1100px) {
        .table-panel th:nth-child(2), .table-panel td:nth-child(2) { width: 21%; }
        .table-panel th:nth-child(7), .table-panel td:nth-child(7) { width: 20%; }
        .overview-analysis-action .overview-analysis-btn { white-space: normal; }
      }
      @media (prefers-reduced-motion: reduce) {
        .overview-analysis-action .overview-analysis-btn { transition: none; }
        .overview-analysis-action .overview-analysis-btn:hover { transform: none; }
      }
    `
    document.head.appendChild(style)
  }

  const enhance = () => {
    installStyles()
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
