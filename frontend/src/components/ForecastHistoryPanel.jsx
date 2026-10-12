import { useEffect, useState } from 'react'
import { fetchForecastResearchHistory, mergeForecastHistory } from '../services/forecastHistory.mjs'

const label = (value, en) => ({ advancing: en ? 'Advance' : 'Tăng', balanced: en ? 'Balanced' : 'Cân bằng', declining: en ? 'Decline' : 'Giảm' }[value] || '—')
const score = value => Number.isFinite(value) ? Number(value).toFixed(3) : '—'

export default function ForecastHistoryPanel({ horizon, language = 'vi' }) {
  const en = language === 'en', copy = (vi, english) => en ? english : vi
  const [open, setOpen] = useState(false), [state, setState] = useState({ status: 'idle' }), [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!open) return undefined
    const controller = new AbortController(); setState({ status: 'loading' })
    fetchForecastResearchHistory(horizon, { signal: controller.signal }).then(setState).catch(error => {
      if (error?.name !== 'AbortError') setState({ status: 'unavailable', reason: 'request_failed' })
    })
    return () => controller.abort()
  }, [open, horizon, retry])
  const ready = state.status === 'research_history', comparison = state.summary?.baseline_comparison?.frequency
  const observedBins = state.reliability?.bins?.filter(bin => bin.status === 'observed') || []
  const baselineAvailable = comparison?.status !== 'unavailable' && Number.isFinite(comparison?.brier_delta) && Number.isFinite(comparison?.log_loss_delta)
  const weaker = ready && baselineAvailable && (comparison.brier_delta >= 0 || comparison.log_loss_delta >= 0)
  async function loadMore() {
    if (!state.pagination?.has_more || state.loading_more) return
    setState(value => ({ ...value, loading_more: true, load_more_error: false }))
    try { const next = await fetchForecastResearchHistory(horizon, { cursor: state.pagination.next_cursor }); setState(value => next.status === 'research_history' ? mergeForecastHistory(value, next) : { ...value, loading_more: false, load_more_error: true }) }
    catch { setState(value => ({ ...value, loading_more: false, load_more_error: true })) }
  }
  return <details className="forecast-history" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><span><strong>{copy('Lịch sử kiểm chứng dự báo', 'Forecast evaluation history')}</strong><small>{copy('Đối chiếu dự báo với kết quả đã quan sát', 'Compare predictions with observed outcomes')}</small></span><span className="forecast-history-summary-status">{ready ? `${state.summary.measured}/${state.summary.predictions}` : copy('Xem chi tiết', 'View details')}</span></summary>
    <div className="forecast-history-content" aria-live="polite" aria-busy={state.status === 'loading'}>
      {state.status === 'loading' && <div className="forecast-history-state"><strong>{copy('Đang tải lịch sử…', 'Loading history…')}</strong><span>{copy('Đang kiểm tra artifact và điểm số.', 'Checking artifact integrity and scores.')}</span></div>}
      {state.status === 'unavailable' && <div className="forecast-history-state" role="alert"><strong>{copy('Chưa thể tải lịch sử nghiên cứu', 'Research history unavailable')}</strong><span>{copy('Không dùng dữ liệu dự phòng để tính hiệu quả.', 'Fallback data is not used for performance scoring.')}</span><button type="button" className="ghost-btn small-btn" onClick={() => setRetry(value => value + 1)}>{copy('Thử lại', 'Retry')}</button></div>}
      {ready && !state.entries.length && <div className="forecast-history-state"><strong>{copy('Chưa có dự báo để đối chiếu', 'No predictions to evaluate yet')}</strong></div>}
      {ready && state.entries.length > 0 && <>
        <div className={`forecast-history-verdict${weaker || !baselineAvailable ? ' is-warning' : ''}`}><div><strong>{!baselineAvailable ? copy('Đang tích lũy bằng chứng', 'Building evidence') : weaker ? copy('Chưa vượt baseline', 'Has not beaten baseline') : copy('Kết quả thử nghiệm', 'Experimental result')}</strong><p>{copy('Dữ liệu synthetic, chưa hiệu chỉnh và không phải hiệu quả thị trường.', 'Synthetic, uncalibrated data—not verified market performance.')}</p></div><span>{state.summary.measured}/{state.summary.predictions} {copy('đã đo', 'measured')}</span></div>
        <div className="forecast-score-grid">
          <article><span>Brier</span><strong>{score(state.summary.brier_multiclass_sum)}</strong><small>{baselineAvailable ? `Baseline ${score(comparison.brier_multiclass_sum)} · Δ ${score(comparison.brier_delta)}` : copy('Baseline chưa được lưu cùng snapshot', 'Baseline was not stored with this snapshot')}</small></article>
          <article><span>Log loss</span><strong>{score(state.summary.log_loss)}</strong><small>{baselineAvailable ? `Baseline ${score(comparison.log_loss)} · Δ ${score(comparison.log_loss_delta)}` : copy('Chỉ tổng hợp outcome đã xác minh', 'Only verified outcomes are aggregated')}</small></article>
          <article><span>{copy('Độ tin cậy', 'Reliability')}</span><strong>{observedBins.length}/{state.reliability.bins.length}</strong><small>{copy('bin đủ tối thiểu 5 mẫu', 'bins with at least 5 samples')}</small></article>
        </div>
        <div className="forecast-history-timeline" role="list" aria-label={copy('Dòng thời gian dự báo và kết quả', 'Prediction and outcome timeline')}>{state.entries.map(entry => <article key={entry.as_of} role="listitem" className={`forecast-history-entry ${entry.outcome_status === 'pending' ? 'is-pending' : entry.correct ? 'is-match' : 'is-miss'}`}><time dateTime={entry.as_of}>{new Date(`${entry.as_of}T00:00:00`).toLocaleDateString(en ? 'en-US' : 'vi-VN', { day: '2-digit', month: '2-digit' })}</time><span className="forecast-history-marker" aria-hidden="true" /><strong>{label(entry.predicted_class, en)} · {(entry.confidence * 100).toFixed(0)}%</strong><small>{entry.outcome_status === 'pending' ? copy('Chờ kết quả', 'Pending') : `${copy('Thực tế', 'Actual')}: ${label(entry.actual_class, en)}`}</small></article>)}</div>
        {state.pagination?.has_more && <div className="forecast-history-more"><button type="button" className="ghost-btn small-btn" disabled={state.loading_more} onClick={loadMore}>{state.loading_more ? copy('Đang tải…', 'Loading…') : copy('Tải thêm', 'Load more')}</button>{state.load_more_error && <span role="alert">{copy('Không thể tải trang tiếp theo.', 'Could not load the next page.')}</span>}</div>}
        <p className="outlook-note">{copy('Brier và log loss càng thấp càng tốt. Δ dương nghĩa là kém baseline tần suất. Accuracy không được dùng riêng để khẳng định chất lượng.', 'Lower Brier and log loss are better. A positive Δ is worse than the frequency baseline. Accuracy alone is not evidence of forecast quality.')}</p>
      </>}
    </div>
  </details>
}
