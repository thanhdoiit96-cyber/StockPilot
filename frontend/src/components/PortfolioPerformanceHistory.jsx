import { useEffect, useId, useMemo, useState } from 'react'
import { requestJson } from '../services/api.mjs'

const money = value => value == null ? 'Chưa đủ dữ liệu' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value))
const percent = value => value == null ? 'Chưa đủ dữ liệu' : `${Number(value) >= 0 ? '+' : ''}${new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))}%`
const shortDate = value => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(`${value}T12:00:00+07:00`))
const longDate = value => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value}T12:00:00+07:00`))

function chartGeometry(points) {
  const valid = points.map((point, index) => ({ ...point, index, value: Number(point.portfolio_value) })).filter(point => point.status === 'complete' && Number.isFinite(point.value))
  if (!valid.length) return { valid, segments: [], min: 0, max: 0 }
  const values = valid.map(point => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || Math.max(Math.abs(max) * 0.05, 1)
  const x = index => points.length === 1 ? 50 : index / (points.length - 1) * 100
  const y = value => 88 - (value - min) / range * 70
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
  return { valid, segments, min, max }
}

export default function PortfolioPerformanceHistory({ token, active, refreshKey }) {
  const titleId = useId()
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
      .catch(error => { if (mounted && !controller.signal.aborted && error.status !== 401) setState(previous => ({ status: 'error', data: previous.data, error: error.message })) })
    return () => { mounted = false; controller.abort() }
  }, [active, token, refreshKey, sessions, retry])

  const data = state.data
  const points = Array.isArray(data?.points) ? data.points : []
  const geometry = useMemo(() => chartGeometry(points), [points])
  const coverage = data?.coverage || { sessions: 0, complete_sessions: 0, incomplete_sessions: 0 }
  const latest = [...points].reverse().find(point => point.status === 'complete')

  return <section className="panel performance-history-panel" aria-labelledby={titleId} aria-busy={state.status === 'loading'}>
    <div className="performance-history-heading">
      <div>
        <span className="eyebrow accent">DIỄN BIẾN DANH MỤC</span>
        <h3 id={titleId}>Giá trị và hiệu suất theo ngày</h3>
        <p className="muted-text">Định giá cuối phiên từ dữ liệu đã lưu, tách riêng ảnh hưởng nạp và rút tiền.</p>
      </div>
      <div className="performance-history-ranges" role="group" aria-label="Khoảng lịch sử">
        {[20, 30, 60, 120].map(value => <button key={value} type="button" className={sessions === value ? 'active' : ''} aria-pressed={sessions === value} onClick={() => setSessions(value)}>{value} phiên</button>)}
      </div>
    </div>

    {state.status === 'error' && <div className="performance-history-error" role="alert"><span>{state.error}</span><button type="button" className="ghost-btn" onClick={() => setRetry(value => value + 1)}>Thử lại</button></div>}
    {!data && state.status === 'loading' && <div className="performance-history-empty"><strong>Đang dựng lịch sử định giá…</strong><p>Ứng dụng chỉ đọc giá cuối ngày đã lưu, không gọi nhà cung cấp dữ liệu.</p></div>}
    {data?.status === 'empty' && <div className="performance-history-empty"><strong>Chưa có phiên định giá</strong><p>Ghi nhận dòng tiền và giao dịch để bắt đầu theo dõi biến động danh mục.</p></div>}

    {points.length > 0 && <>
      <div className="performance-history-summary">
        <div><small>Giá trị phiên gần nhất</small><strong>{money(latest?.portfolio_value)}</strong><span>{latest ? longDate(latest.date) : 'Chưa có phiên đầy đủ'}</span></div>
        <div><small>TWR lũy kế</small><strong className={data.twr_available ? Number(data.cumulative_twr_pct) >= 0 ? 'positive' : 'negative' : 'neutral'}>{data.twr_available ? percent(data.cumulative_twr_pct) : 'Chưa đủ dữ liệu'}</strong><span>{data.twr_available ? `${coverage.sessions} phiên liên tục` : 'Không ước tính khi chuỗi bị thiếu'}</span></div>
        <div><small>Độ phủ định giá</small><strong>{coverage.complete_sessions}/{coverage.sessions} phiên</strong><span>{coverage.incomplete_sessions ? `${coverage.incomplete_sessions} phiên cần bổ sung` : 'Đầy đủ trong khoảng đã chọn'}</span></div>
      </div>

      <div className="performance-history-chart-shell">
        {geometry.valid.length ? <svg className="performance-history-chart" viewBox="0 0 100 100" role="img" aria-label={`Biểu đồ giá trị danh mục gồm ${coverage.complete_sessions} trên ${coverage.sessions} phiên đầy đủ`} preserveAspectRatio="none">
          <line x1="0" y1="18" x2="100" y2="18" className="chart-grid-line" /><line x1="0" y1="53" x2="100" y2="53" className="chart-grid-line" /><line x1="0" y1="88" x2="100" y2="88" className="chart-grid-line" />
          {geometry.segments.map((segment, index) => <polyline key={index} points={segment.map(point => `${point.x},${point.y}`).join(' ')} className="performance-history-line" vectorEffect="non-scaling-stroke" />)}
          {geometry.segments.flat().map(point => <circle key={point.date} cx={point.x} cy={point.y} r="1.25" className="performance-history-point"><title>{`${longDate(point.date)}: ${money(point.value)}`}</title></circle>)}
        </svg> : <div className="performance-history-chart-empty">Chưa có điểm định giá đầy đủ để vẽ biểu đồ.</div>}
        <div className="performance-history-axis"><span>{points[0] ? shortDate(points[0].date) : ''}</span><span>{points.at(-1) ? shortDate(points.at(-1).date) : ''}</span></div>
      </div>

      {coverage.incomplete_sessions > 0 && <p className="performance-history-warning" role="status">Có {coverage.incomplete_sessions} phiên thiếu giá hoặc thiếu số dư tiền hợp lệ. Biểu đồ ngắt tại khoảng thiếu và TWR được giữ ở trạng thái chưa công bố.</p>}
      <p className="performance-note">TWR dùng quy ước dòng tiền đầu phiên, múi giờ Việt Nam. Chưa bao gồm cổ tức và corporate action; số liệu phục vụ theo dõi, không phải báo cáo môi giới.</p>
    </>}
  </section>
}
