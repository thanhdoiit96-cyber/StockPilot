import { useEffect, useState } from 'react'
import { fetchForecastResearchCohorts, fetchForecastResearchHistory, mergeForecastHistory } from '../services/forecastHistory.mjs'

const label = (value, en) => ({ advancing: en ? 'Advance' : 'Tăng', balanced: en ? 'Balanced' : 'Cân bằng', declining: en ? 'Decline' : 'Giảm' }[value] || '—')
const score = value => Number.isFinite(value) ? Number(value).toFixed(3) : '—'

export default function ForecastHistoryPanel({ horizon, language = 'vi' }) {
  const en = language === 'en', copy = (vi, english) => en ? english : vi
  const [open, setOpen] = useState(false), [state, setState] = useState({ status: 'idle' }), [cohortState, setCohortState] = useState({ status: 'idle' }), [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!open) return undefined
    const controller = new AbortController(); setState({ status: 'loading' }); setCohortState({ status: 'loading' })
    fetchForecastResearchHistory(horizon, { signal: controller.signal }).then(setState).catch(error => {
      if (error?.name !== 'AbortError') setState({ status: 'unavailable', reason: 'request_failed' })
    })
    fetchForecastResearchCohorts(horizon, { signal: controller.signal }).then(setCohortState).catch(error => {
      if (error?.name !== 'AbortError') setCohortState({ status: 'unavailable', reason: 'request_failed' })
    })
    return () => controller.abort()
  }, [open, horizon, retry])
  const ready = state.status === 'research_history'
  const activeModel = state.entries?.[0]?.model_version
  const cohort = cohortState.status === 'research_cohorts' ? (cohortState.cohorts.find(item => item.dimensions.model_version === activeModel) || cohortState.cohorts[0]) : null
  const aggregateComparison = cohort?.baseline_comparison
  const comparison = aggregateComparison?.status === 'available' ? aggregateComparison.frequency : null
  const observedBins = state.reliability?.bins?.filter(bin => bin.status === 'observed') || []
  const baselineAvailable = Number.isFinite(comparison?.brier_delta) && Number.isFinite(comparison?.log_loss_delta)
  const weaker = ready && baselineAvailable && (comparison.brier_delta >= 0 || comparison.log_loss_delta >= 0)
  async function loadMore() {
    if (!state.pagination?.has_more || state.loading_more) return
    setState(value => ({ ...value, loading_more: true, load_more_error: false }))
    try { const next = await fetchForecastResearchHistory(horizon, { cursor: state.pagination.next_cursor }); setState(value => next.status === 'research_history' ? mergeForecastHistory(value, next) : { ...value, loading_more: false, load_more_error: true }) }
    catch { setState(value => ({ ...value, loading_more: false, load_more_error: true })) }
  }
  return <details className="forecast-history" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><span><strong>{copy('Replay mô phỏng tháng 3', 'March simulated replay')}</strong><small>{copy('Kiểm thử pipeline, không phải bằng chứng current-data', 'Pipeline test—not current-data evidence')}</small></span><span className="forecast-history-summary-status">{ready ? `${state.summary.measured}/${state.summary.predictions}` : copy('Xem chi tiết', 'View details')}</span></summary>
    <div className="forecast-history-content" aria-live="polite" aria-busy={state.status === 'loading'}>
      {state.status === 'loading' && <div className="forecast-history-state"><strong>{copy('Đang tải lịch sử…', 'Loading history…')}</strong><span>{copy('Đang kiểm tra artifact và điểm số.', 'Checking artifact integrity and scores.')}</span></div>}
      {state.status === 'unavailable' && <div className="forecast-history-state" role="alert"><strong>{copy('Chưa thể tải lịch sử nghiên cứu', 'Research history unavailable')}</strong><span>{copy('Không dùng dữ liệu dự phòng để tính hiệu quả.', 'Fallback data is not used for performance scoring.')}</span><button type="button" className="ghost-btn small-btn" onClick={() => setRetry(value => value + 1)}>{copy('Thử lại', 'Retry')}</button></div>}
      {ready && !state.entries.length && <div className="forecast-history-state"><strong>{copy('Chưa có dự báo để đối chiếu', 'No predictions to evaluate yet')}</strong></div>}
      {ready && state.entries.length > 0 && <>
        <div className={`forecast-history-verdict${weaker || !baselineAvailable ? ' is-warning' : ''}`}><div><strong>{!baselineAvailable ? copy('Đang tích lũy bằng chứng', 'Building evidence') : weaker ? copy('Chưa vượt baseline', 'Has not beaten baseline') : copy('Kết quả thử nghiệm', 'Experimental result')}</strong><p>{copy('Dữ liệu synthetic, chưa hiệu chỉnh và không phải hiệu quả thị trường.', 'Synthetic, uncalibrated data—not verified market performance.')}</p></div><span>{cohort ? `${cohort.measured}/${cohort.predictions}` : '—'} {copy('toàn cohort', 'full cohort')}</span></div>
        <div className="forecast-cohort-coverage" role="status"><div><span>{copy('Baseline v2 mô phỏng đủ điều kiện', 'Eligible simulated v2 baseline')}</span><strong>{cohort ? `${cohort.coverage.baseline_eligible_measured}/${cohortState.minimum_samples}` : '—'}</strong></div><small>{cohortState.status === 'loading' ? copy('Đang tải thống kê toàn cohort…', 'Loading full-cohort statistics…') : cohortState.status === 'unavailable' ? copy('Chưa thể xác minh thống kê cohort; timeline vẫn được giữ riêng.', 'Cohort statistics are unavailable; the timeline remains separate.') : cohort ? `${cohort.coverage.v1.measured} v1 · ${cohort.coverage.v2.measured} v2 ${copy('đã đo trên fixture', 'measured on fixtures')}` : copy('Chưa có cohort phù hợp.', 'No matching cohort yet.')}</small></div>
        <div className="forecast-score-grid">
          <article><span>Brier · cohort</span><strong>{baselineAvailable ? score(aggregateComparison.model.brier_multiclass_sum) : '—'}</strong><small>{baselineAvailable ? `Baseline ${score(comparison.brier_multiclass_sum)} · Δ ${score(comparison.brier_delta)}` : copy('Mở khi cohort v2 đủ mẫu', 'Available when the v2 cohort reaches the sample gate')}</small></article>
          <article><span>Log loss · cohort</span><strong>{baselineAvailable ? score(aggregateComparison.model.log_loss) : '—'}</strong><small>{baselineAvailable ? `Baseline ${score(comparison.log_loss)} · Δ ${score(comparison.log_loss_delta)}` : copy('Không suy ra từ các trang timeline đã tải', 'Never inferred from loaded timeline pages')}</small></article>
          <article><span>{copy('Chẩn đoán trang đã tải', 'Loaded-page diagnostic')}</span><strong>{observedBins.length}/{state.reliability.bins.length}</strong><small>{copy('bin đủ tối thiểu 5 mẫu', 'bins with at least 5 samples')}</small></article>
        </div>
        <div className="forecast-history-timeline" role="list" aria-label={copy('Dòng thời gian dự báo và kết quả', 'Prediction and outcome timeline')}>{state.entries.map(entry => <article key={entry.as_of} role="listitem" className={`forecast-history-entry ${entry.outcome_status === 'pending' ? 'is-pending' : entry.correct ? 'is-match' : 'is-miss'}`}><time dateTime={entry.as_of}>{new Date(`${entry.as_of}T00:00:00`).toLocaleDateString(en ? 'en-US' : 'vi-VN', { day: '2-digit', month: '2-digit' })}</time><span className="forecast-history-marker" aria-hidden="true" /><strong>{label(entry.predicted_class, en)} · {(entry.confidence * 100).toFixed(0)}%</strong><small>{entry.outcome_status === 'pending' ? copy('Chờ kết quả', 'Pending') : `${copy('Thực tế', 'Actual')}: ${label(entry.actual_class, en)}`}</small></article>)}</div>
        {state.pagination?.has_more && <div className="forecast-history-more"><button type="button" className="ghost-btn small-btn" disabled={state.loading_more} onClick={loadMore}>{state.loading_more ? copy('Đang tải…', 'Loading…') : copy('Tải thêm', 'Load more')}</button>{state.load_more_error && <span role="alert">{copy('Không thể tải trang tiếp theo.', 'Could not load the next page.')}</span>}</div>}
        <p className="outlook-note">{copy('Brier và log loss càng thấp càng tốt. Δ dương nghĩa là kém baseline tần suất. Accuracy không được dùng riêng để khẳng định chất lượng.', 'Lower Brier and log loss are better. A positive Δ is worse than the frequency baseline. Accuracy alone is not evidence of forecast quality.')}</p>
      </>}
    </div>
  </details>
}
