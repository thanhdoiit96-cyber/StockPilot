(() => {
  const id = 'market-data-quality-overlay'
  const style = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 14px;padding:10px 13px;border:1px solid rgba(245,158,11,.35);border-radius:10px;background:rgba(245,158,11,.08);color:#e5e7eb;font:12px system-ui,sans-serif'
  const time = value => {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat('vi-VN', {
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
    const lastRunType = retry.last_run_mode === 'gap_retry' ? 'bù thiếu' : 'EOD chính'
    const lastRunStatus = retry.last_run_failed ? 'gặp lỗi' : retry.last_run_complete ? 'đã hoàn tất' : 'chưa hoàn tất'
    const operationalText = runtime.running
      ? `Đang chạy ${runtime.phase === 'gap_retry' ? 'bù thiếu' : 'EOD chính'} cho phiên ${runtime.session_date || data.session_date}.`
      : lastRunAt
        ? `Lượt ${lastRunType} gần nhất ${lastRunAt} · ${lastRunStatus}.${data.ready ? '' : ` Hiện còn ${data.missing} mã.`}`
        : data.ready ? '' : `${data.missing} mã còn thiếu; chưa có evidence job cho phiên này.`
    const retryText = operationalText ? `<small style="width:100%;color:#9ca3af">${operationalText}</small>` : ''
    banner.innerHTML = `<strong style="color:${data.ready ? '#4ade80' : '#fbbf24'}">${data.ready ? 'Dữ liệu EOD đã đủ' : 'Dữ liệu EOD chưa đủ'}</strong><span style="color:#9ca3af">Phiên ${data.session_date}: ${data.covered}/${data.listed} mã có dữ liệu.</span>${retryText}`
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
