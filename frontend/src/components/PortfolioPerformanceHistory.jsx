import { useEffect, useId, useMemo, useState } from 'react'
import { requestJson } from '../services/api.mjs'
import { formatDateOnly, formatMoney, formatNumber } from '../services/userLocale.mjs'
import { translate } from '../services/i18n.mjs'
import { localizeApiError } from '../services/apiErrorCatalog.mjs'


function describeMwr(mwr, percent, t) {
  if (mwr?.status === 'available' && Number.isFinite(Number(mwr.annualized_mwr_pct))) return {
    value: percent(mwr.annualized_mwr_pct),
    tone: Number(mwr.annualized_mwr_pct) >= 0 ? 'positive' : 'negative',
    detail: t('portfolio.history.annualized')
  }
  if (mwr?.status === 'multiple_roots') return { value: t('portfolio.history.multiple'), tone: 'neutral', detail: t('portfolio.history.multipleText') }
  if (mwr?.status === 'no_root') return { value: t('portfolio.history.noRoot'), tone: 'neutral', detail: t('portfolio.history.noRootText') }
  const unavailable = {
    partial_valuation: t('portfolio.history.partialValuation'),
    insufficient_sign_change: t('portfolio.history.signChange'),
    external_cash_flow_after_terminal: t('portfolio.history.afterTerminal'),
    invalid_external_cash_flow: t('portfolio.history.invalidFlow'),
    invalid_terminal_value: t('portfolio.history.invalidTerminal')
  }
  return { value: t('portfolio.history.unavailable'), tone: 'neutral', detail: unavailable[mwr?.reason] || t('portfolio.history.unavailableText') }
}

function chartGeometry(points) {
  const valid = points.map((point, index) => ({ ...point, index, value: Number(point.portfolio_value) })).filter(point => point.status === 'complete' && Number.isFinite(point.value))
  if (!valid.length) return { valid, segments: [], min: 0, max: 0 }
  const values = valid.map(point => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = max === min ? Math.max(Math.abs(max) * 0.05, 1) : 0
  const lower = min - padding
  const upper = max + padding
  const range = upper - lower
  const x = index => points.length === 1 ? 50 : index / (points.length - 1) * 100
  const y = value => 88 - (value - lower) / range * 70
  const segments = []
  let segment = []
  points.forEach((point, index) => {
    const value = Number(point.portfolio_value)
    if (point.status !== 'complete' || !Number.isFinite(value)) {
      if (segment.length) segments.push(segment)
      segment = []
      return
    }
    segment.push({ ...point, index, x: x(index), y: y(value), value })
  })
  if (segment.length) segments.push(segment)
  return { valid, segments, min: lower, max: upper }
}

export default function PortfolioPerformanceHistory({ token, active, refreshKey, language = 'vi' }) {
  const t = (key, values) => translate(language, key, values)
  const money = value => value == null ? t('portfolio.common.noData') : formatMoney(value, language)
  const percent = value => value == null ? t('portfolio.common.noData') : `${Number(value) >= 0 ? '+' : ''}${formatNumber(value, language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
  const shortDate = value => formatDateOnly(value, language, { day: '2-digit', month: '2-digit' })
  const longDate = value => formatDateOnly(value, language, { day: '2-digit', month: '2-digit', year: 'numeric' })
  const compactMoney = value => `${formatNumber(value, language, { notation: 'compact', maximumFractionDigits: 1 })} ₫`
  const titleId = useId()
  const gradientId = `${titleId.replaceAll(':', '')}-area`
  const [sessions, setSessions] = useState(30)
  const [retry, setRetry] = useState(0)
  const [state, setState] = useState({ status: 'idle', data: null, error: '' })

  useEffect(() => {
    if (!active || !token || !refreshKey) return
    let mounted = true
    const controller = new AbortController()
    setState(previous => ({ status: 'loading', data: previous.data, error: '' }))
    requestJson(`/api/portfolio/performance/history?sessions=${sessions}`, { token, signal: controller.signal })
      .then(response => { if (mounted) setState({ status: 'success', data: response.data, error: '' }) })
      .catch(error => { if (mounted && !controller.signal.aborted && error.status !== 401) setState(previous => ({ status: 'error', data: previous.data, error: localizeApiError(error, language) })) })
    return () => { mounted = false; controller.abort() }
  }, [active, token, refreshKey, sessions, retry])

  useEffect(() => {
    if (!active) return undefined
    const refresh = () => { if (document.visibilityState === 'visible') setRetry(value => value + 1) }
    const timer = window.setInterval(refresh, 5 * 60 * 1000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [active])

  const data = state.data
  const points = Array.isArray(data?.points) ? data.points : []
  const geometry = useMemo(() => chartGeometry(points), [points])
  const coverage = data?.coverage || { sessions: 0, complete_sessions: 0, incomplete_sessions: 0 }
  const eventCoverage = data?.event_coverage || { applied_events: 0, pending_events: 0, unsupported_events: 0 }
  const unresolvedEvents = Number(eventCoverage.pending_events || 0) + Number(eventCoverage.unsupported_events || 0)
  const cashDeficitSessions = points.filter(point => point.incomplete_reasons?.includes('negative_cash_balance') || Number(point.cash_balance) < -0.01).length
  const missingPriceSessions = points.filter(point => point.incomplete_reasons?.includes('missing_prices') || point.missing_stock_ids?.length).length
  const unresolvedEventSessions = points.filter(point => point.incomplete_reasons?.includes('unresolved_event') || point.unresolved_event_ids?.length).length
  const latest = [...points].reverse().find(point => point.status === 'complete')
  const mwr = describeMwr(data?.mwr, percent, t)

  return <section className="panel performance-history-panel" aria-labelledby={titleId} aria-busy={state.status === 'loading'} lang={language}>
    <div className="performance-history-heading">
      <div>
        <span className="eyebrow accent">{t('portfolio.history.eyebrow')}</span>
        <h3 id={titleId}>{t('portfolio.history.title')}</h3>
        <p className="muted-text">{t('portfolio.history.subtitle')}</p>
        {latest && <p className="performance-history-cutoff"><span className="chip neutral">EOD · {longDate(latest.date)}</span><span>{t('portfolio.history.cutoff')}</span></p>}
      </div>
      <div className="performance-history-actions">
        <button type="button" className="ghost-btn performance-history-refresh" onClick={() => setRetry(value => value + 1)} disabled={state.status === 'loading'}>{state.status === 'loading' ? t('portfolio.history.refreshing') : t('portfolio.history.refresh')}</button>
        <div className="performance-history-ranges" role="group" aria-label={t('portfolio.history.range')}>
          {[20, 30, 60, 120].map(value => <button key={value} type="button" className={sessions === value ? 'active' : ''} aria-pressed={sessions === value} onClick={() => setSessions(value)}>{value} {t('portfolio.history.sessions')}</button>)}
        </div>
      </div>
    </div>

    {state.status === 'error' && <div className="performance-history-error" role="alert"><span>{state.error}</span><button type="button" className="ghost-btn" onClick={() => setRetry(value => value + 1)}>{t('portfolio.history.retry')}</button></div>}
    {!data && state.status === 'loading' && <div className="performance-history-empty"><strong>{t('portfolio.history.loading')}</strong><p>{t('portfolio.history.loadingText')}</p></div>}
    {data?.status === 'empty' && <div className="performance-history-empty"><strong>{t('portfolio.history.empty')}</strong><p>{t('portfolio.history.emptyText')}</p></div>}

    {points.length > 0 && <>
      <div className="performance-history-summary">
        <div><small>{t('portfolio.history.latest')}</small><strong>{money(latest?.portfolio_value)}</strong><span>{latest ? longDate(latest.date) : t('portfolio.history.noComplete')}</span></div>
        <div><small>{t('portfolio.history.twr')}</small><strong className={data.twr_available ? Number(data.cumulative_twr_pct) >= 0 ? 'positive' : 'negative' : 'neutral'}>{data.twr_available ? percent(data.cumulative_twr_pct) : t('portfolio.common.noData')}</strong><span>{data.twr_available ? `${coverage.sessions} ${t('portfolio.history.continuous')}` : t('portfolio.history.gap')}</span></div>
        <div className="performance-mwr-card"><small><span>{t('portfolio.history.mwr')}</span><span className="metric-info" title={t('portfolio.history.mwrInfo')} aria-label={t('portfolio.history.mwrInfoAria')}>i</span></small><strong className={mwr.tone}>{mwr.value}</strong><span>{mwr.detail}</span></div>
        <div><small>{t('portfolio.history.coverage')}</small><strong>{coverage.complete_sessions}/{coverage.sessions} {t('portfolio.history.sessions')}</strong><span>{unresolvedEvents ? `${unresolvedEvents} ${t('portfolio.history.eventsPending')}` : coverage.incomplete_sessions ? `${coverage.incomplete_sessions} ${t('portfolio.history.sessionsPending')}` : t('portfolio.history.complete')}</span></div>
      </div>

      <div className="performance-history-chart-shell">
        {geometry.valid.length ? <div className="performance-history-plot">
          <div className="performance-history-y-axis" aria-hidden="true"><span>{compactMoney(geometry.max)}</span><span>{compactMoney((geometry.max + geometry.min) / 2)}</span><span>{compactMoney(geometry.min)}</span></div>
          <div className="performance-history-chart-stage">
            <svg className="performance-history-chart" viewBox="0 0 100 100" role="img" aria-label={t('portfolio.history.chartAria', { complete: coverage.complete_sessions, total: coverage.sessions, min: compactMoney(geometry.min), max: compactMoney(geometry.max) })} preserveAspectRatio="none">
              <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2dd4bf" stopOpacity=".22" /><stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" /></linearGradient></defs>
              <line x1="0" y1="18" x2="100" y2="18" className="chart-grid-line" /><line x1="0" y1="53" x2="100" y2="53" className="chart-grid-line" /><line x1="0" y1="88" x2="100" y2="88" className="chart-grid-line" />
              {geometry.segments.filter(segment => segment.length > 1).map((segment, index) => <polygon key={`area-${index}`} points={`${segment[0].x},88 ${segment.map(point => `${point.x},${point.y}`).join(' ')} ${segment.at(-1).x},88`} fill={`url(#${gradientId})`} className="performance-history-area" />)}
              {geometry.segments.map((segment, index) => <polyline key={index} points={segment.map(point => `${point.x},${point.y}`).join(' ')} className="performance-history-line" vectorEffect="non-scaling-stroke" />)}
            </svg>
            <div className="performance-history-point-layer">{geometry.segments.flat().map(point => <button key={point.date} type="button" className="performance-history-point" style={{ left: `${point.x}%`, top: `${point.y}%` }} aria-label={`${longDate(point.date)}: ${money(point.value)}`} title={`${longDate(point.date)}: ${money(point.value)}`} />)}</div>
          </div>
        </div> : <div className="performance-history-chart-empty"><strong>{t('portfolio.history.noChart')}</strong><p>{cashDeficitSessions ? t('portfolio.history.cashDeficit', { count: cashDeficitSessions }) : missingPriceSessions ? t('portfolio.history.missingPrice', { count: missingPriceSessions }) : unresolvedEventSessions ? t('portfolio.history.unresolvedEvent', { count: unresolvedEventSessions }) : t('portfolio.history.noPoint')}</p></div>}
        <div className="performance-history-axis"><span>{points[0] ? shortDate(points[0].date) : ''}</span><span>{points.at(-1) ? shortDate(points.at(-1).date) : ''}</span></div>
      </div>

      {coverage.incomplete_sessions > 0 && <p className="performance-history-warning" role="status">{[
        cashDeficitSessions ? `${cashDeficitSessions} ${t('portfolio.history.invalidCash')}` : '',
        missingPriceSessions ? `${missingPriceSessions} ${t('portfolio.history.missingClose')}` : '',
        unresolvedEventSessions ? `${unresolvedEventSessions} ${t('portfolio.history.pendingEvent')}` : ''
      ].filter(Boolean).join(' · ') || `${coverage.incomplete_sessions} ${t('portfolio.history.incomplete')}`}. {t('portfolio.history.warning')}</p>}
      <p className="performance-note">{t('portfolio.history.note')}</p>
    </>}
  </section>
}
