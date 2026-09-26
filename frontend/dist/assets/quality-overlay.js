(() => {
  const id = 'market-data-quality-overlay'
  const stateKey = 'stockpilot-quality-state'
  const style = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 14px;padding:10px 13px;border:1px solid rgba(245,158,11,.35);border-radius:10px;background:rgba(245,158,11,.08);color:#e5e7eb;font:12px system-ui,sans-serif'
  const render = data => {
    const anchor = document.querySelector('.main-panel .topbar')
    if (!anchor || !data) return
    let banner = document.getElementById(id)
    if (!banner) { banner = document.createElement('div'); banner.id = id; anchor.parentElement.insertBefore(banner, anchor.nextSibling) }
    banner.style.cssText = style + (data.ready ? ';border-color:rgba(34,197,94,.35);background:rgba(34,197,94,.08)' : '')
    const retry = data.eod_retry || {}
    const runtime = retry.runtime || {}
    const breakdown = data.missing_breakdown || {}
    const breakdownText = data.ready ? '' : ` ${breakdown.previous_session || 0} mã có phiên trước, ${breakdown.stale_history || 0} mã có lịch sử cũ, ${breakdown.never_seen || 0} mã chưa từng có dữ liệu.`
    const retryText = data.ready ? '' : `<small style="width:100%;color:#9ca3af">${runtime.running ? 'Đang retry provider' : `${data.missing} mã còn thiếu; gap-retry theo lịch ${retry.gap_schedule || retry.schedule || 'định kỳ'}`} (${retry.configured_passes ?? 2} lần/lượt).${breakdownText}</small>`
    banner.innerHTML = `<strong style="color:${data.ready ? '#4ade80' : '#fbbf24'}">${data.ready ? 'Dữ liệu EOD đã đủ' : 'Dữ liệu EOD chưa đủ'}</strong><span style="color:#9ca3af">Phiên ${data.session_date}: ${data.covered}/${data.listed} mã có dữ liệu.</span>${retryText}`
  }
  const load = async () => {
    try {
      const response = await fetch('/api/stocks/data-quality', { cache: 'no-store' })
      if (!response.ok) return
      const payload = await response.json()
      const data = payload.data
      const next = JSON.stringify({ session: data?.session_date, covered: data?.covered, missing: data?.missing })
      const previous = sessionStorage.getItem(stateKey)
      sessionStorage.setItem(stateKey, next)
      render(data)
      window.dispatchEvent(new CustomEvent('stockpilot:market-data-quality', { detail: data }))
      if (previous && previous !== next && !sessionStorage.getItem(`${stateKey}:reloaded`)) {
        sessionStorage.setItem(`${stateKey}:reloaded`, '1')
        window.setTimeout(() => window.location.reload(), 50)
      } else if (previous === next) sessionStorage.removeItem(`${stateKey}:reloaded`)
    } catch (_) {}
  }
  load()
  setInterval(load, 60000)
  new MutationObserver(() => { if (!document.getElementById(id)) load() }).observe(document.body, { childList: true, subtree: true })
})()
