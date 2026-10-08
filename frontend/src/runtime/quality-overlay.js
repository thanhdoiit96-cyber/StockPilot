(() => {
  const id = 'market-data-quality-overlay'
  const isEnglish = () => { try { return localStorage.getItem('stockpilot-language') === 'en' } catch (_) { return false } }
  const t = (vi, en) => isEnglish() ? en : vi
  const formatTime = value => {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(isEnglish() ? 'en-US' : 'vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
  }
  const ensure = () => {
    const main = document.querySelector('.main-panel')
    if (!main) return null
    let panel = document.getElementById(id)
    if (panel) return panel
    panel = document.createElement('details')
    panel.id = id
    panel.className = 'market-data-quality-footer'
    const topbar = main.querySelector('.topbar')
    if (topbar) topbar.after(panel)
    else main.prepend(panel)
    return panel
  }
  const render = data => {
    const panel = ensure()
    if (!panel || !data) return
    const retry = data.eod_retry || {}
    const runtime = retry.runtime || {}
    const runAt = formatTime(retry.last_run_at)
    const status = data.ready ? t('Dữ liệu thị trường đã sẵn sàng', 'Market data ready') : t('Dữ liệu thị trường đang thiếu', 'Market data incomplete')
    const detail = runtime.running
      ? t(`Đang đồng bộ phiên ${runtime.session_date || data.session_date}.`, `Synchronizing session ${runtime.session_date || data.session_date}.`)
      : runAt ? t(`Cập nhật gần nhất ${runAt}.`, `Last updated ${runAt}.`) : t('Chưa có lượt đồng bộ được ghi nhận.', 'No synchronization run is recorded yet.')
    const coverage = `${data.covered || 0}/${data.listed || 0}`
    panel.classList.toggle('is-ready', Boolean(data.ready))
    panel.innerHTML = ''
    const summary = document.createElement('summary')
    summary.title = t('Thông tin chất lượng dữ liệu thị trường', 'Market data quality information')
    const dot = document.createElement('i')
    dot.setAttribute('aria-hidden', 'true')
    const label = document.createElement('strong')
    label.textContent = status
    const count = document.createElement('span')
    count.textContent = `${t('Phiên', 'Session')} ${data.session_date || '—'} · ${coverage}`
    summary.append(dot, label, count)
    const body = document.createElement('p')
    body.textContent = data.ready ? `${detail} ${t('Nguồn', 'Source')}: ${Object.keys(data.provider || {}).join(', ') || '—'}.` : `${detail} ${data.missing || 0} ${t('mã còn thiếu.', 'symbols remain.')}`
    panel.append(summary, body)
  }
  let loading = false
  let attempted = false
  let lastData = null
  const load = async force => {
    if (loading || (!force && attempted) || !document.querySelector('.main-panel')) return
    loading = true
    attempted = true
    try {
      const response = await fetch('/api/stocks/data-quality', { cache: 'no-store' })
      if (!response.ok) return
      const payload = await response.json()
      lastData = payload.data
      render(lastData)
    } catch (_) {} finally { loading = false }
  }
  load(false)
  setInterval(() => load(true), 60000)
  window.addEventListener('stockpilot:react-commit', () => { if (lastData) render(lastData); else load(false) })
})()
