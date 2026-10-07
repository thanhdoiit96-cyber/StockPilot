import { useEffect, useMemo, useState } from 'react'
import { requestJson } from '../services/api.mjs'

const RANGES = [1, 5, 20]
const WIDTH = 640
const HEIGHT = 180
const VOLUME_HEIGHT = 84
const PADDING = 24
const VOLUME_SIGNALS = {
  confirmation: { label: 'Đồng thuận', tone: 'neutral', note: 'Số mã và khối lượng cùng nghiêng về một phía.' },
  negative_divergence: { label: 'Phân kỳ giảm', tone: 'negative', note: 'Số mã tăng chiếm ưu thế nhưng khối lượng nghiêng về nhóm giảm.' },
  positive_divergence: { label: 'Phân kỳ tăng', tone: 'positive', note: 'Số mã giảm chiếm ưu thế nhưng khối lượng nghiêng về nhóm tăng.' },
  neutral: { label: 'Trung tính', tone: 'neutral', note: 'Chênh lệch số mã hoặc khối lượng đang cân bằng.' },
  unavailable: { label: 'Chưa đủ volume', tone: 'neutral', note: 'Không đủ quan sát volume EOD để đánh giá.' }
}

const formatDate = value => value
  ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(`${value}T00:00:00+07:00`))
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

export default function MarketBreadthHistory({ exchange = '', sector = '', sectorLabel = null, language = 'vi' }) {
  const en = language === 'en'
  const text = (vi, english) => en ? english : vi
  const [range, setRange] = useState(5)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ status: 'loading', data: null, error: null })

  useEffect(() => {
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
        if (!controller.signal.aborted) setState({ status: 'error', data: null, error: error.message })
      })
    return () => controller.abort()
  }, [range, exchange, sector, attempt])

  const plotted = useMemo(() => plot(state.data?.points || []), [state.data])
  const volumeBars = useMemo(() => plotVolume(plotted), [plotted])
  const latest = plotted.at(-1)
  const continuous = state.data?.continuity?.status === 'continuous'
  const volumeObserved = volumeBars.filter(point => point.volumeNetPct != null).length
  const volumeSignal = VOLUME_SIGNALS[latest?.volume?.signal] || VOLUME_SIGNALS.unavailable
  const signalLabel = signal => ({ confirmation: text('Đồng thuận', 'Confirmed'), negative_divergence: text('Phân kỳ giảm', 'Negative divergence'), positive_divergence: text('Phân kỳ tăng', 'Positive divergence'), neutral: text('Trung tính', 'Neutral'), unavailable: text('Chưa đủ volume', 'Insufficient volume') }[signal] || text('Chưa đủ volume', 'Insufficient volume'))

  return <section className="breadth-history" aria-labelledby="breadth-history-heading" lang={language}>
    <div className="breadth-history-header">
      <div><strong id="breadth-history-heading">{text('Lịch sử A/D', 'A/D history')}</strong><small>{exchange || text('Tất cả sàn', 'All exchanges')} · {sectorLabel || text('Tất cả ngành', 'All sectors')} · {text('EOD theo phiên', 'Session EOD')}</small></div>
      <div className="breadth-history-ranges" aria-label={text('Khoảng lịch sử độ rộng', 'Breadth history range')}>
        {RANGES.map(value => <button type="button" key={value} aria-pressed={range === value} className={range === value ? 'active' : ''} onClick={() => setRange(value)}>{value}D</button>)}
      </div>
    </div>
    {state.status === 'loading' && <p className="muted-text" role="status">{text('Đang tải lịch sử độ rộng…', 'Loading breadth history…')}</p>}
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
      <svg className="breadth-history-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Đường A/D tích lũy ${range} phiên, từ ${formatDate(plotted[0].session_date)} đến ${formatDate(latest.session_date)}`}>
        <line x1={PADDING} y1={HEIGHT / 2} x2={WIDTH - PADDING} y2={HEIGHT / 2} className="breadth-history-zero" />
        {plotted.length > 1 && <polyline points={plotted.map(point => `${point.x},${point.y}`).join(' ')} className="breadth-history-line" />}
        {plotted.map(point => <circle key={point.session_date} cx={point.x} cy={point.y} r="4" className="breadth-history-point"><title>{`${point.session_date}: A−D ${point.spread >= 0 ? '+' : ''}${point.spread}, coverage ${point.coverage_pct ?? '—'}%`}</title></circle>)}
      </svg>
      <p className="breadth-history-caption">{formatDate(plotted[0].session_date)} → {formatDate(latest.session_date)} · {plotted.length} phiên liên tục · không nội suy dữ liệu thiếu</p>
      {volumeObserved > 0 && <>
        <div className="breadth-volume-history-heading"><strong>{text('Độ rộng khối lượng EOD', 'EOD volume breadth')}</strong><span>{text('Net volume nhóm tăng − nhóm giảm', 'Net volume: gainers − decliners')}</span></div>
        <svg className="breadth-volume-history-chart" viewBox={`0 0 ${WIDTH} ${VOLUME_HEIGHT}`} role="img" aria-label={`Độ rộng khối lượng ${volumeObserved}/${plotted.length} phiên có quan sát`}>
          <line x1={PADDING} y1={VOLUME_HEIGHT / 2} x2={WIDTH - PADDING} y2={VOLUME_HEIGHT / 2} className="breadth-history-zero" />
          {volumeBars.filter(point => point.volumeNetPct != null).map(point => <rect key={point.session_date} x={point.x} y={point.y} width={point.width} height={point.height} className={`breadth-volume-history-bar ${point.volumeNetPct > 0 ? 'positive' : point.volumeNetPct < 0 ? 'negative' : 'neutral'}`}><title>{`${point.session_date}: net volume ${point.volumeNetPct > 0 ? '+' : ''}${point.volumeNetPct}%, ${signalLabel(point.volume?.signal)}`}</title></rect>)}
        </svg>
        <p className={`breadth-volume-history-caption ${volumeSignal.tone}`}><strong>{signalLabel(latest?.volume?.signal)}:</strong> {text(volumeSignal.note, volumeSignal.note === VOLUME_SIGNALS.confirmation.note ? 'Symbols and volume lean in the same direction.' : volumeSignal.note === VOLUME_SIGNALS.negative_divergence.note ? 'Gainers lead by count, but volume leans toward decliners.' : volumeSignal.note === VOLUME_SIGNALS.positive_divergence.note ? 'Decliners lead by count, but volume leans toward gainers.' : 'Not enough EOD volume observations to assess.')} {volumeObserved}/{plotted.length} {text('phiên có volume; đây là volume theo hướng biến động giá, không phải khối lượng mua/bán chủ động.', 'sessions have volume; this follows price direction and is not active buy/sell volume.')}</p>
      </>}
    </>}
  </section>
}
