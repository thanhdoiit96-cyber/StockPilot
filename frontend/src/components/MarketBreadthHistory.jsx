import { useEffect, useMemo, useState } from 'react'
import { requestJson } from '../services/api.mjs'

const RANGES = [1, 5, 20]
const WIDTH = 640
const HEIGHT = 180
const PADDING = 24

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

export default function MarketBreadthHistory({ exchange = '' }) {
  const [range, setRange] = useState(5)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ status: 'loading', data: null, error: null })

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading', data: null, error: null })
    const params = new URLSearchParams({ sessions: String(range) })
    if (exchange) params.set('exchange', exchange)
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
  }, [range, exchange, attempt])

  const plotted = useMemo(() => plot(state.data?.points || []), [state.data])
  const latest = plotted.at(-1)
  const continuous = state.data?.continuity?.status === 'continuous'

  return <section className="breadth-history" aria-labelledby="breadth-history-heading">
    <div className="breadth-history-header">
      <div><strong id="breadth-history-heading">Lịch sử A/D</strong><small>{exchange || 'Toàn thị trường'} · EOD theo phiên</small></div>
      <div className="breadth-history-ranges" aria-label="Khoảng lịch sử độ rộng">
        {RANGES.map(value => <button type="button" key={value} aria-pressed={range === value} className={range === value ? 'active' : ''} onClick={() => setRange(value)}>{value}D</button>)}
      </div>
    </div>
    {state.status === 'loading' && <p className="muted-text" role="status">Đang tải lịch sử độ rộng…</p>}
    {state.status === 'error' && <div className="breadth-history-state" role="alert"><span>{state.error}</span><button type="button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button></div>}
    {state.status === 'success' && !continuous && <div className="breadth-history-state" role="status"><strong>Chưa đủ chuỗi phiên liên tục</strong><span>Đã có {state.data.returned_sessions}/{state.data.requested_sessions} phiên · trạng thái {state.data.continuity.status}. Biểu đồ không nối các điểm thiếu.</span></div>}
    {state.status === 'success' && continuous && latest && <>
      <div className="breadth-history-summary">
        <span>A/D <b>{latest.ad_ratio == null ? '—' : Number(latest.ad_ratio).toFixed(2)}</b></span>
        <span>Tích lũy A−D <b className={latest.cumulative >= 0 ? 'positive' : 'negative'}>{latest.cumulative > 0 ? '+' : ''}{latest.cumulative}</b></span>
        <span>Coverage <b>{latest.coverage_pct == null ? '—' : `${latest.coverage_pct}%`}</b></span>
      </div>
      <svg className="breadth-history-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Đường A/D tích lũy ${range} phiên, từ ${formatDate(plotted[0].session_date)} đến ${formatDate(latest.session_date)}`}>
        <line x1={PADDING} y1={HEIGHT / 2} x2={WIDTH - PADDING} y2={HEIGHT / 2} className="breadth-history-zero" />
        {plotted.length > 1 && <polyline points={plotted.map(point => `${point.x},${point.y}`).join(' ')} className="breadth-history-line" />}
        {plotted.map(point => <circle key={point.session_date} cx={point.x} cy={point.y} r="4" className="breadth-history-point"><title>{`${point.session_date}: A−D ${point.spread >= 0 ? '+' : ''}${point.spread}, coverage ${point.coverage_pct ?? '—'}%`}</title></circle>)}
      </svg>
      <p className="breadth-history-caption">{formatDate(plotted[0].session_date)} → {formatDate(latest.session_date)} · {plotted.length} phiên liên tục · không nội suy dữ liệu thiếu</p>
    </>}
  </section>
}
