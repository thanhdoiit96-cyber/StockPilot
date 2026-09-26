(() => {
  const id = 'market-data-quality-overlay'
  const style = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 14px;padding:10px 13px;border:1px solid rgba(245,158,11,.35);border-radius:10px;background:rgba(245,158,11,.08);color:#e5e7eb;font:12px system-ui,sans-serif'
  const render = data => {
    const anchor = document.querySelector('.main-panel .topbar')
    if (!anchor || !data) return
    let banner = document.getElementById(id)
    if (!banner) { banner = document.createElement('div'); banner.id = id; anchor.parentElement.insertBefore(banner, anchor.nextSibling) }
    banner.style.cssText = style + (data.ready ? ';border-color:rgba(34,197,94,.35);background:rgba(34,197,94,.08)' : '')
    banner.innerHTML = `<strong style="color:${data.ready ? '#4ade80' : '#fbbf24'}">${data.ready ? 'Dữ liệu EOD đã đủ' : 'Dữ liệu EOD chưa đủ'}</strong><span style="color:#9ca3af">Phiên ${data.session_date}: ${data.covered}/${data.listed} mã có dữ liệu.</span>${data.ready ? '' : `<small style="width:100%;color:#9ca3af">${data.missing} mã đang chờ retry provider.</small>`}`
  }
  const load = async () => { try { const response = await fetch('/api/stocks/data-quality', { cache: 'no-store' }); if (response.ok) { const payload = await response.json(); render(payload.data) } } catch (_) {} }
  load()
  setInterval(load, 60000)
  new MutationObserver(() => { if (!document.getElementById(id)) load() }).observe(document.body, { childList: true, subtree: true })
})()
