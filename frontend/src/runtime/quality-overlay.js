(() => {
  const id = 'market-data-quality-overlay'
  const isEnglish = () => { try { return localStorage.getItem('stockpilot-language') === 'en' } catch (_) { return false } }
  const t = (vi, en) => isEnglish() ? en : vi
  const style = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 14px;padding:10px 13px;border:1px solid rgba(245,158,11,.35);border-radius:10px;background:rgba(245,158,11,.08);color:#e5e7eb;font:12px system-ui,sans-serif'
  const time = value => {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat(isEnglish() ? 'en-US' : 'vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(date)
  }
  const render = data => {
    const anchor = document.querySelector('.main-panel .topbar')
    if (!anchor || !data) return
    let banner = document.getElementById(id)
    if (!banner) { banner = document.createElement('div'); banner.id = id; anchor.after(banner) }
    banner.style.cssText = style + (data.ready ? ';border-color:rgba(34,197,94,.35);background:rgba(34,197,94,.08)' : '')
    const retry = data.eod_retry || {}
    const runtime = retry.runtime || {}
    const lastRunAt = time(retry.last_run_at)
    const lastRunType = retry.last_run_mode === 'gap_retry' ? t('bù thiếu', 'gap retry') : t('EOD chính', 'main EOD')
    const lastRunStatus = retry.last_run_failed ? t('gặp lỗi', 'failed') : retry.last_run_complete ? t('đã hoàn tất', 'completed') : t('chưa hoàn tất', 'incomplete')
    const priority = retry.last_run_trade_priority
    const finite = value => Number.isFinite(Number(value)) ? Number(value) : null
    const priorityText = retry.last_run_mode !== 'gap_retry' || !priority ? ''
      : priority.enabled === false
        ? t('Ưu tiên theo giao dịch đang tắt; lượt bù thiếu dùng thứ tự công bằng.', 'Trade priority is off; the retry uses fair ordering.')
        : priority.had_error
          ? finite(priority.batches)
            ? t(`Price board chưa đủ: ${finite(priority.failed_batches) || 0}/${finite(priority.batches)} lô lỗi; scheduler giữ kết quả hợp lệ và dùng fallback công bằng cho phần còn lại.`, `Price board incomplete: ${finite(priority.failed_batches) || 0}/${finite(priority.batches)} batches failed; valid results were kept with fair fallback.`)
            : t('Price board không khả dụng; scheduler đã dùng thứ tự fallback công bằng.', 'Price board unavailable; scheduler used fair fallback ordering.')
          : t(`Price board: ${finite(priority.matched) || 0} gap có giao dịch/${finite(priority.probed) || 0} mã kiểm tra; ${finite(retry.last_run_selected_traded) || 0}/${finite(retry.last_run_selected) || 0} mã được ưu tiên trong lượt.`, `Price board: ${finite(priority.matched) || 0} traded gaps/${finite(priority.probed) || 0} symbols checked; ${finite(retry.last_run_selected_traded) || 0}/${finite(retry.last_run_selected) || 0} symbols prioritized.`)
    const operationalText = runtime.running
      ? t(`Đang chạy ${runtime.phase === 'gap_retry' ? 'bù thiếu' : 'EOD chính'} cho phiên ${runtime.session_date || data.session_date}.`, `Running ${runtime.phase === 'gap_retry' ? 'gap retry' : 'main EOD'} for session ${runtime.session_date || data.session_date}.`)
      : lastRunAt
        ? t(`Lượt ${lastRunType} gần nhất ${lastRunAt} · ${lastRunStatus}.${data.ready ? '' : ` Hiện còn ${data.missing} mã.`}`, `Latest ${lastRunType} ${lastRunAt} · ${lastRunStatus}.${data.ready ? '' : ` ${data.missing} symbols remain.`}`)
        : data.ready ? '' : t(`${data.missing} mã còn thiếu; chưa có evidence job cho phiên này.`, `${data.missing} symbols remain; no evidence job exists for this session.`)
    const retryText = operationalText ? `<small style="width:100%;color:#9ca3af">${operationalText}</small>` : ''
    const priorityDetail = priorityText ? `<small data-eod-trade-priority style="width:100%;color:#9ca3af">${priorityText}</small>` : ''
    banner.innerHTML = `<strong style="color:${data.ready ? '#4ade80' : '#fbbf24'}">${data.ready ? t('Dữ liệu EOD đã đủ', 'EOD data is complete') : t('Dữ liệu EOD chưa đủ', 'EOD data is incomplete')}</strong><span style="color:#9ca3af">${t('Phiên', 'Session')} ${data.session_date}: ${data.covered}/${data.listed} ${t('mã có dữ liệu.', 'symbols covered.')}</span>${retryText}${priorityDetail}`
  }
  let loading = false
  let attempted = false
  let lastData = null
  const load = async (force = false) => {
    if (loading || (!force && attempted) || !document.querySelector('.main-panel .topbar')) return
    loading = true
    attempted = true
    try {
      const response = await fetch('/api/stocks/data-quality', { cache: 'no-store' })
      if (!response.ok) return
      const payload = await response.json()
      lastData = payload.data
      render(lastData)
    } catch (_) {
    } finally {
      loading = false
    }
  }
  load()
  setInterval(() => load(true), 60000)
  window.addEventListener('stockpilot:react-commit', () => {
    if (document.getElementById(id)) return
    if (lastData) render(lastData)
    else load()
  })
})()
