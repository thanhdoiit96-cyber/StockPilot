import { useEffect, useMemo, useState } from 'react'
import { requestJson } from '../services/api.mjs'
import { localizeApiError } from '../services/apiErrorCatalog.mjs'
import { DEFAULT_MARKET_BREADTH_HISTORY_RANGE, MARKET_BREADTH_HISTORY_RANGES } from '../services/marketBreadthRange.mjs'

const RANGES = MARKET_BREADTH_HISTORY_RANGES
const WIDTH = 640
const HEIGHT = 180
const VOLUME_HEIGHT = 84
const PADDING = 24
const VOLUME_TOP = 196
const COMBINED_HEIGHT = VOLUME_TOP + VOLUME_HEIGHT + 20
const VOLUME_SIGNALS = {
  confirmation: { label: 'Đồng thuận', tone: 'neutral', note: 'Số mã và khối lượng cùng nghiêng về một phía.' },
  negative_divergence: { label: 'Phân kỳ giảm', tone: 'negative', note: 'Số mã tăng chiếm ưu thế nhưng khối lượng nghiêng về nhóm giảm.' },
  positive_divergence: { label: 'Phân kỳ tăng', tone: 'positive', note: 'Số mã giảm chiếm ưu thế nhưng khối lượng nghiêng về nhóm tăng.' },
  neutral: { label: 'Trung tính', tone: 'neutral', note: 'Chênh lệch số mã hoặc khối lượng đang cân bằng.' },
  unavailable: { label: 'Chưa đủ volume', tone: 'neutral', note: 'Không đủ quan sát volume EOD để đánh giá.' }
}

const formatDate = (value, language = 'vi') => value
  ? new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(`${value}T00:00:00+07:00`))
  : '-'

function plot(points) {
  let cumulative = 0
  const values = points.map(point => ({ ...point, cumulative: cumulative += Number(point.spread || 0) }))
  const min = Math.min(0, ...values.map(point => point.cumulative))
  const max = Math.max(0, ...values.map(point => point.cumulative))
  const span = Math.max(1, max - min)
  return values.map((point, index) => ({
    ...point,
    x: values.length === 1 ? WIDTH / 2 : PADDING + index / (values.length - 1) * (WIDTH - PADDING * 2),
    y: PADDING + (max - point.cumulative) / span * (HEIGHT - PADDING * 2)
  }))
}

function plotVolume(points) {
  const innerWidth = WIDTH - PADDING * 2
  const barWidth = Math.min(18, Math.max(6, innerWidth / Math.max(1, points.length) * 0.55))
  const baseline = VOLUME_HEIGHT / 2
  const scale = baseline - 10
  return points.map((point, index) => {
    const value = point.volume?.net_pct == null ? null : Number(point.volume.net_pct)
    const height = Number.isFinite(value) ? Math.max(value === 0 ? 2 : 3, Math.abs(value) / 100 * scale) : 0
    const x = (points.length === 1 ? WIDTH / 2 : PADDING + index / (points.length - 1) * innerWidth) - barWidth / 2
    return { ...point, volumeNetPct: Number.isFinite(value) ? value : null, x, y: value > 0 ? baseline - height : baseline, width: barWidth, height }
  })
}

export default function MarketBreadthHistory({ exchange = '', sector = '', sectorLabel = null, language = 'vi', enabled = true, fallbackMode = false }) {
  const en = language === 'en'
  const text = (vi, english) => en ? english : vi
  const [range, setRange] = useState(DEFAULT_MARKET_BREADTH_HISTORY_RANGE)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [selectedSession, setSelectedSession] = useState('')

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'idle', data: null, error: null })
      return undefined
    }
    const controller = new AbortController()
    setState({ status: 'loading', data: null, error: null })
    const params = new URLSearchParams({ sessions: String(range) })
    if (exchange) params.set('exchange', exchange)
    if (sector) params.set('sector', sector)
    requestJson(`/api/stocks/breadth/history?${params}`, { signal: controller.signal })
      .then(payload => {
        if (controller.signal.aborted) return
        const data = payload?.data
        if (!data || !Array.isArray(data.points) || !data.continuity) throw new Error('Dữ liệu lịch sử độ rộng không đúng định dạng')
        setState({ status: 'success', data, error: null })
      })
      .catch(error => {
        if (!controller.signal.aborted) setState({ status: 'error', data: null, error: localizeApiError(error, language) })
      })
    return () => controller.abort()
  }, [range, exchange, sector, attempt, enabled])

  const plotted = useMemo(() => plot(state.data?.points || []), [state.data])
  const volumeBars = useMemo(() => plotVolume(plotted), [plotted])
  const latest = plotted.at(-1)
  const selected = plotted.find(point => point.session_date === selectedSession) || latest
  const selectedVolume = volumeBars.find(point => point.session_date === selected?.session_date) || null
  const continuous = state.data?.continuity?.status === 'continuous'
  const volumeObserved = volumeBars.filter(point => point.volumeNetPct != null).length
  const chartHeight = volumeObserved > 0 ? COMBINED_HEIGHT : HEIGHT
  const tickEvery = Math.max(1, Math.ceil(plotted.length / 5))
  const volumeSignal = VOLUME_SIGNALS[latest?.volume?.signal] || VOLUME_SIGNALS.unavailable
  const selectedVolumeSignal = VOLUME_SIGNALS[selected?.volume?.signal] || VOLUME_SIGNALS.unavailable
  const signalLabel = signal => ({ confirmation: text('Đồng thuận', 'Confirmed'), negative_divergence: text('Phân kỳ giảm', 'Negative divergence'), positive_divergence: text('Phân kỳ tăng', 'Positive divergence'), neutral: text('Trung tính', 'Neutral'), unavailable: text('Chưa đủ volume', 'Insufficient volume') }[signal] || text('Chưa đủ volume', 'Insufficient volume'))
  const handlePointKey = (event, index) => {
    const targetIndex = event.key === 'ArrowRight' ? Math.min(plotted.length - 1, index + 1)
      : event.key === 'ArrowLeft' ? Math.max(0, index - 1)
        : event.key === 'Home' ? 0
          : event.key === 'End' ? plotted.length - 1
            : null
    if (targetIndex != null) {
      event.preventDefault()
      setSelectedSession(plotted[targetIndex].session_date)
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setSelectedSession(plotted[index].session_date)
    }
  }

  return <section className="breadth-history" aria-labelledby="breadth-history-heading" lang={language}>
    <div className="breadth-history-header">
      <div><strong id="breadth-history-heading">{text('Lịch sử A/D', 'A/D history')}</strong><small>{exchange || text('Tất cả sàn', 'All exchanges')} · {sectorLabel || text('Tất cả ngành', 'All sectors')} · {text('EOD theo phiên', 'Session EOD')}</small></div>
      <div className="breadth-history-ranges" aria-label={text('Khoảng lịch sử độ rộng', 'Breadth history range')}>
        {RANGES.map(value => <button type="button" key={value} aria-pressed={range === value} className={range === value ? 'active' : ''} onClick={() => { setSelectedSession(''); setRange(value) }}>{value}D</button>)}
      </div>
    </div>
    {!enabled && !fallbackMode && <p className="muted-text" role="status">{text('Đang chờ dữ liệu EOD hoàn tất để hiển thị lịch sử A/D.', 'Waiting for the latest EOD session to finish before displaying the A/D history.')}</p>}
    {fallbackMode && <p className="breadth-history-fallback" role="status">{text('Phiên hiện tại đang cập nhật EOD · hiển thị dữ liệu xác minh gần nhất.', 'Current session is refreshing EOD · displaying the latest verified snapshot.')}</p>}
    {state.status === 'loading' && enabled && <p className="muted-text" role="status">{text('Đang tải lịch sử độ rộng…', 'Loading breadth history…')}</p>}
    {state.status === 'error' && <div className="breadth-history-state" role="alert"><span>{state.error}</span><button type="button" onClick={() => setAttempt(value => value + 1)}>{text('Thử lại', 'Retry')}</button></div>}
    {state.status === 'success' && !continuous && <div className="breadth-history-state" role="status"><strong>{text('Chưa đủ chuỗi phiên liên tục', 'Continuous session series unavailable')}</strong><span>{text('Đã có', 'Received')} {state.data.returned_sessions}/{state.data.requested_sessions} {text('phiên · trạng thái', 'sessions · status')} {state.data.continuity.status}. {text('Biểu đồ không nối các điểm thiếu.', 'The chart does not connect missing points.')}</span></div>}
    {state.status === 'success' && continuous && latest && <>
      <div className="breadth-history-summary">
        <span>A/D <b>{latest.ad_ratio == null ? '—' : Number(latest.ad_ratio).toFixed(2)}</b></span>
        <span>Tích lũy A−D <b className={latest.cumulative >= 0 ? 'positive' : 'negative'}>{latest.cumulative > 0 ? '+' : ''}{latest.cumulative}</b></span>
        <span>{text('Coverage', 'Coverage')} <b>{latest.coverage_pct == null ? '—' : `${latest.coverage_pct}%`}</b></span>
        <span>Volume A/D <b>{latest.volume?.ad_ratio == null ? '—' : Number(latest.volume.ad_ratio).toFixed(2)}</b></span>
        <span>Khối lượng tăng <b>{latest.volume?.advancing_pct == null ? '—' : `${latest.volume.advancing_pct}%`}</b></span>
        <span>Volume coverage <b>{latest.volume?.observations == null ? '—' : `${latest.volume.observations}/${latest.classified}`}</b></span>
        <span>{text('Tín hiệu', 'Signal')} <b className={volumeSignal.tone}>{signalLabel(latest?.volume?.signal)}</b></span>
      </div>
      <div className="breadth-history-chart-legend" aria-hidden="true"><span><i className="breadth-history-legend-line" />{text('A/D tích lũy', 'Cumulative A/D')}</span>{volumeObserved > 0 && <span><i className="breadth-history-legend-bar" />{text('Net volume EOD', 'EOD net volume')}</span>}</div>
      <svg className={`breadth-history-chart${volumeObserved > 0 ? ' breadth-history-combined-chart' : ''}`} viewBox={`0 0 ${WIDTH} ${chartHeight}`} role="group" aria-label={text(`Biểu đồ A/D và độ rộng khối lượng chung ${range} phiên, từ ${formatDate(plotted[0].session_date, language)} đến ${formatDate(latest.session_date, language)}. Chọn một điểm để xem chi tiết phiên; dùng mũi tên trái/phải, Home hoặc End để đổi phiên.`, `Combined A/D and volume breadth chart for ${range} sessions, from ${formatDate(plotted[0].session_date, language)} to ${formatDate(latest.session_date, language)}. Select a point for session details; use Left/Right arrows, Home, or End to change session.`)}>
        <line x1={PADDING} y1={HEIGHT / 2} x2={WIDTH - PADDING} y2={HEIGHT / 2} className="breadth-history-zero" />
        {plotted.length > 1 && <polyline points={plotted.map(point => `${point.x},${point.y}`).join(' ')} className="breadth-history-line" />}
        {plotted.map((point, index) => <g key={point.session_date} className={`breadth-history-point-button${selected?.session_date === point.session_date ? ' is-selected' : ''}`} role="button" tabIndex="0" aria-pressed={selected?.session_date === point.session_date} aria-keyshortcuts="ArrowLeft ArrowRight Home End Enter Space" aria-label={text(`${formatDate(point.session_date, language)}: A−D ${point.spread >= 0 ? '+' : ''}${point.spread}, coverage ${point.coverage_pct ?? '—'}%`, `${formatDate(point.session_date, language)}: A−D ${point.spread >= 0 ? '+' : ''}${point.spread}, coverage ${point.coverage_pct ?? '—'}%`)} onClick={() => setSelectedSession(point.session_date)} onKeyDown={event => handlePointKey(event, index)}><circle cx={point.x} cy={point.y} r="4" className="breadth-history-point"><title>{`${point.session_date}: A−D ${point.spread >= 0 ? '+' : ''}${point.spread}, coverage ${point.coverage_pct ?? '—'}%`}</title></circle></g>)}
        {volumeObserved > 0 && <>
          <line x1={PADDING} y1={VOLUME_TOP + VOLUME_HEIGHT / 2} x2={WIDTH - PADDING} y2={VOLUME_TOP + VOLUME_HEIGHT / 2} className="breadth-history-zero" />
          {volumeBars.filter(point => point.volumeNetPct != null).map(point => <rect key={point.session_date} x={point.x} y={point.y + VOLUME_TOP} width={point.width} height={point.height} className={`breadth-volume-history-bar ${point.volumeNetPct > 0 ? 'positive' : point.volumeNetPct < 0 ? 'negative' : 'neutral'}${selected?.session_date === point.session_date ? ' is-selected' : ''}`}><title>{`${point.session_date}: net volume ${point.volumeNetPct > 0 ? '+' : ''}${point.volumeNetPct}%, ${signalLabel(point.volume?.signal)}`}</title></rect>)}
          {plotted.map((point, index) => (index % tickEvery === 0 || index === plotted.length - 1) && <text key={point.session_date} className="breadth-history-axis-label" x={point.x} y={COMBINED_HEIGHT - 4} textAnchor="middle">{formatDate(point.session_date, language)}</text>)}
        </>}
      </svg>
      <p className="breadth-history-caption">{formatDate(plotted[0].session_date, language)} → {formatDate(latest.session_date, language)} · {plotted.length} {text('phiên liên tục', 'continuous sessions')} · {text('không nội suy dữ liệu thiếu', 'missing data is not interpolated')}</p>
      <p className="breadth-history-selection" role="status"><strong>{text('Phiên', 'Session')} {formatDate(selected.session_date, language)}</strong><span>A/D {selected.ad_ratio == null ? '—' : Number(selected.ad_ratio).toFixed(2)}</span><span>A−D {selected.spread >= 0 ? '+' : ''}{selected.spread}</span><span>{text('Coverage', 'Coverage')} {selected.coverage_pct ?? '—'}%</span>{selectedVolume?.volumeNetPct != null && <span>{text('Khối lượng ròng', 'Net volume')} {selectedVolume.volumeNetPct > 0 ? '+' : ''}{selectedVolume.volumeNetPct}%</span>}</p>
      {volumeObserved > 0 && <>
        <p className={`breadth-volume-history-caption ${selectedVolumeSignal.tone}`}><strong>{signalLabel(selected?.volume?.signal)}:</strong> {text(selectedVolumeSignal.note, selectedVolumeSignal.note === VOLUME_SIGNALS.confirmation.note ? 'Symbols and volume lean in the same direction.' : selectedVolumeSignal.note === VOLUME_SIGNALS.negative_divergence.note ? 'Gainers lead by count, but volume leans toward decliners.' : selectedVolumeSignal.note === VOLUME_SIGNALS.positive_divergence.note ? 'Decliners lead by count, but volume leans toward gainers.' : 'Not enough EOD volume observations to assess.')} {volumeObserved}/{plotted.length} {text('phiên có volume; đây là volume theo hướng biến động giá, không phải khối lượng mua/bán chủ động.', 'sessions have volume; this follows price direction and is not active buy/sell volume.')}</p>
      </>}
    </>}
  </section>
}
