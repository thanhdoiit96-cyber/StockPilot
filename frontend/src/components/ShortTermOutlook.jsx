import { useEffect, useState } from 'react'
import { fetchForecastCurrentPreview, fetchForecastResearchPreview } from '../services/forecastPreview.mjs'
import ForecastHistoryPanel from './ForecastHistoryPanel.jsx'
import { fetchForecastLiveCohort } from '../services/forecastHistory.mjs'

// Design fixtures only. These values are not outputs of the research baseline.
const scenarios = {
  1: { probabilities: [38, 36, 26], range: [40, 62], median: 51 },
  5: { probabilities: [54, 28, 18], range: [35, 72], median: 57 },
}

export default function ShortTermOutlook({ language = 'vi', recommendations = [], onOpenDetail, onOpenIdeas, onAddToWatchlist, watchlistSymbols = [] }) {
  const [horizon, setHorizon] = useState(() => {
    try { return sessionStorage.getItem('stockpilot.outlook.horizon') === '1' ? 1 : 5 } catch { return 5 }
  })
  function selectHorizon(value) {
    try { sessionStorage.setItem('stockpilot.outlook.horizon', String(value)) } catch { /* Storage may be disabled. */ }
    setHorizon(value)
  }
  const en = language === 'en'
  const copy = (vi, english) => en ? english : vi
  const [preview, setPreview] = useState({ status: 'loading' })
  const [currentPreview, setCurrentPreview] = useState({ status: 'loading' })
  const [evidenceTab, setEvidenceTab] = useState('current')
  const [liveCohort, setLiveCohort] = useState({ status: 'loading' })
  const [previewRetry, setPreviewRetry] = useState(0)
  const researchPreviewEnabled = String(globalThis.__VITE_ENABLE_FORECAST_RESEARCH__ || (typeof import.meta !== 'undefined' && import.meta?.env ? import.meta.env.VITE_ENABLE_FORECAST_RESEARCH || '' : '')).toLowerCase() === 'true'
  const currentPreviewEnabled = String(globalThis.__VITE_ENABLE_FORECAST_LIVE__ || (typeof import.meta !== 'undefined' && import.meta?.env ? import.meta.env.VITE_ENABLE_FORECAST_LIVE || '' : '')).toLowerCase() === 'true'
  useEffect(() => { if (!currentPreviewEnabled) setEvidenceTab('research') }, [currentPreviewEnabled])
  useEffect(() => {
    if (!currentPreviewEnabled) { setLiveCohort({ status:'unavailable', reason:'preview_disabled' }); return undefined }
    const controller = new AbortController(); setLiveCohort({ status:'loading' })
    fetchForecastLiveCohort(horizon, { signal:controller.signal }).then(setLiveCohort).catch(error => { if (error?.name !== 'AbortError') setLiveCohort({ status:'unavailable', reason:'request_failed' }) })
    return () => controller.abort()
  }, [horizon, currentPreviewEnabled, previewRetry])
  useEffect(() => {
    const controller = new AbortController()
    if (currentPreviewEnabled) {
      setCurrentPreview({ status: 'loading' })
      fetchForecastCurrentPreview(['FPT', 'HPG', 'VHM'], { signal: controller.signal, horizon }).then(setCurrentPreview).catch(error => {
        if (error?.name !== 'AbortError') setCurrentPreview({ status: 'unavailable', reason: 'request_failed' })
      })
      setPreview({ status: 'unavailable', reason: 'preview_disabled' })
      return () => controller.abort()
    }
    setCurrentPreview({ status: 'unavailable', reason: 'preview_disabled' })
    if (!researchPreviewEnabled) {
      setPreview({ status: 'unavailable', reason: 'preview_disabled' })
      return () => controller.abort()
    }
    setPreview({ status: 'loading' })
    fetchForecastResearchPreview(horizon, { signal: controller.signal }).then(setPreview).catch(error => {
      if (error?.name !== 'AbortError') setPreview({ status: 'unavailable', reason: 'request_failed' })
    })
    return () => controller.abort()
  }, [horizon, previewRetry, researchPreviewEnabled, currentPreviewEnabled])
  const research = preview.status === 'research_preview'
  const currentData = currentPreview.status === 'live_preview'
  const stale = research && preview.artifact_freshness === 'stale'
  const scenario = { ...scenarios[horizon], probabilities: currentData ? currentPreview.probabilities.map(item => item.value * 100) : research ? preview.probabilities.map(item => item.value * 100) : scenarios[horizon].probabilities }
  const labels = [copy('Tăng lan tỏa', 'Broad advance'), copy('Cân bằng', 'Balanced'), copy('Giảm lan tỏa', 'Broad decline')]
  const watched = new Set(watchlistSymbols.map(value => String(value).toUpperCase()))
  const candidates = recommendations.filter(item => (item.stock?.code || item.symbol) && Number.isFinite(Number(item.score))).sort((a, b) => Number(a.rank || 999) - Number(b.rank || 999) || Number(b.score) - Number(a.score)).slice(0, 3)
  const [isCompact, setIsCompact] = useState(true)
  return (
    <section className="panel short-term-outlook" aria-labelledby="short-term-outlook-title">
      <header className="outlook-header">
        <div>
          <span className="eyebrow">{copy('GÓC NHÌN PHÍA TRƯỚC', 'LOOKING AHEAD')}</span>
          <h2 id="short-term-outlook-title">{copy('Triển vọng ngắn hạn', 'Short-term outlook')}</h2>
          <p className="muted-text">{copy('Độ rộng rổ cổ phiếu · Bản xem trước giao diện', 'Stock basket breadth · Interface preview')}</p>
        </div>
        <div className="outlook-controls">
          <details className="outlook-info">
            <summary>{currentData ? copy('Dữ liệu hiện tại', 'Current data') : research ? copy('Mô phỏng nghiên cứu', 'Research simulation') : copy('Mô phỏng', 'Simulated')} <span aria-hidden="true">ⓘ</span></summary>
            <p>{currentData ? copy(`Đang dùng dữ liệu hiện tại từ ${currentPreview.provider} với as_of ${currentPreview.as_of}. Đây là preview live, chưa qua gate xác minh hiệu quả thị trường.`, `Using current data from ${currentPreview.provider} with as_of ${currentPreview.as_of}. This is a live preview, not yet validated through the market-accuracy gate.`) : research ? copy(`Xác suất lấy từ replay synthetic tại ${preview.as_of}; không phải dự báo thị trường hiện tại, chưa hiệu chỉnh và chưa có hiệu quả được xác minh. Khoảng tỷ lệ mã tăng vẫn là fixture giao diện.`, `Probabilities come from a synthetic replay at ${preview.as_of}; this is not a current market forecast, is not calibrated and has no verified performance. The advancing-share range remains a UI fixture.`) : copy('API research preview không khả dụng nên toàn bộ số liệu bên dưới là fixture cố định để kiểm tra giao diện. Không đại diện VNINDEX hay dự báo thị trường.', 'The research preview API is unavailable, so all values below are fixed UI fixtures. They do not represent VNINDEX or a market forecast.')}</p>
          </details>
          <div className="outlook-horizons" role="group" aria-label={copy('Kỳ dự báo', 'Forecast horizon')}>
            {[1, 5].map(value => (
              <button key={value} type="button" className="ghost-btn small-btn" aria-pressed={horizon === value} onClick={() => selectHorizon(value)}>{value} {copy('phiên', value === 1 ? 'session' : 'sessions')}</button>
            ))}
            <button type="button" className="ghost-btn small-btn outlook-collapse-toggle" aria-pressed={!isCompact} onClick={() => setIsCompact(value => !value)}>{isCompact ? copy('Mở rộng', 'Expand') : copy('Thu gọn', 'Compact')}</button>
          </div>
        </div>
      </header>

      {isCompact ? (
        <div className="outlook-compact-summary" aria-live="polite">
          <div className="outlook-compact-header">
            <span className="outlook-compact-badge">{currentData ? copy('Live', 'Live') : research ? copy('Replay', 'Replay') : copy('Fixture', 'Fixture')}</span>
            <strong>{copy('Trạng thái rút gọn', 'Compact status')}</strong>
          </div>
          <div className="outlook-compact-grid">
            {labels.map((label, index) => (
              <div className={`outlook-compact-cell tone-${index}`} key={label}>
                <span>{label}</span>
                <strong>{Number(scenario.probabilities[index].toFixed(1))}%</strong>
              </div>
            ))}
          </div>
          <p className="outlook-note">
            {currentData ? copy(`Horizon ${horizon} phiên · Dữ liệu hiện tại`, `Horizon ${horizon} sessions · current data`) : research ? copy(`Horizon ${horizon} phiên · Replay synthetic`, `Horizon ${horizon} sessions · synthetic replay`) : copy(`Horizon ${horizon} phiên · Fixture UI`, `Horizon ${horizon} sessions · UI fixture`)}
          </p>
        </div>
      ) : (
        <>
          <div className="outlook-body" aria-live="polite">
            <div>
              <h3>{currentData ? copy('Xác suất prototype trên dữ liệu hiện tại', 'Prototype probabilities on current data') : research ? copy('Xác suất replay synthetic', 'Synthetic replay probabilities') : copy('Xác suất minh họa', 'Illustrative probabilities')}</h3>
              <div className={`outlook-probabilities${preview.status === 'loading' || currentPreview.status === 'loading' ? ' is-loading' : ''}`} aria-busy={preview.status === 'loading' || currentPreview.status === 'loading'}>
                {labels.map((label, i) => (
                  <div className={`outlook-probability tone-${i}`} key={label}>
                    <span>{label}</span>
                    <strong>{Number(scenario.probabilities[i].toFixed(1))}<small>%</small></strong>
                    <div className="outlook-meter" aria-hidden="true"><i style={{ width: `${scenario.probabilities[i]}%` }} /></div>
                  </div>
                ))}
              </div>
              <div className="outlook-preview-status">
                <p className={`outlook-note${stale ? ' is-stale' : ''}`}>
                  {currentPreview.status === 'loading' ? copy('Đang kiểm tra dữ liệu hiện tại…', 'Checking live current data…') : currentData ? copy(`Prototype ${horizon} phiên · ${currentPreview.as_of} · provider ${currentPreview.provider} · chưa hiệu chỉnh/xác minh`, `${horizon}-session prototype · ${currentPreview.as_of} · provider ${currentPreview.provider} · uncalibrated and unverified`) : preview.status === 'loading' ? copy('Đang kiểm tra bản research preview…', 'Checking the research preview…') : research ? copy(`Replay ${preview.as_of} · Artifact tạo ${new Date(preview.artifact_generated_at).toLocaleDateString('vi-VN')}${stale ? ' · Đã cũ' : ''} · Không phải dự báo live`, `Replay ${preview.as_of} · Artifact generated ${new Date(preview.artifact_generated_at).toLocaleDateString('en-US')}${stale ? ' · Stale' : ''} · Not a live forecast`) : copy('Research preview không khả dụng · Đang hiển thị fixture giao diện', 'Research preview unavailable · Showing UI fixtures')}
                </p>
                {(preview.status === 'unavailable' || currentPreview.status === 'unavailable') && (
                  <button type="button" className="ghost-btn small-btn" onClick={() => setPreviewRetry(value => value + 1)}>{copy('Thử lại', 'Retry')}</button>
                )}
              </div>
            </div>

            <div className="outlook-range">
              <h3>{copy('Tỷ lệ mã tăng trong rổ', 'Share of advancing stocks')}</h3>
              <div className="outlook-range-value">
                <strong>{scenario.range[0]}–{scenario.range[1]}%</strong>
                <span>{copy('Khoảng minh họa', 'Illustrative range')}</span>
              </div>
              <svg viewBox="0 0 360 66" role="img" aria-label={`${copy('Khoảng minh họa', 'Illustrative range')}: ${scenario.range[0]}–${scenario.range[1]}%; ${copy('điểm giữa', 'midpoint')} ${scenario.median}%`}>
                <line x1="16" x2="344" y1="22" y2="22" className="outlook-axis" />
                <line x1="180" x2="180" y1="9" y2="35" className="outlook-reference" />
                <line x1={16 + scenario.range[0] * 3.28} x2={16 + scenario.range[1] * 3.28} y1="22" y2="22" className="outlook-band" />
                <circle cx={16 + scenario.median * 3.28} cy="22" r="5" className="outlook-point" />
                <text x="16" y="56">0%</text><text x="180" y="56" textAnchor="middle">50%</text><text x="344" y="56" textAnchor="end">100%</text>
              </svg>
              <p className="outlook-note">{copy('Đo tỷ lệ cổ phiếu tăng, không phải mức tăng giá hay lợi nhuận.', 'A share of advancing stocks, not price appreciation or investment return.')}</p>
            </div>
          </div>

          <div className="outlook-basis" role="note">
            <strong>{copy('Cơ sở nhận định', 'Basis for the outlook')}</strong>
            {currentData ? (
              <ul>
                <li>{copy('Đầu vào: dữ liệu hiện tại từ provider live với các mã FPT, HPG, VHM.', 'Inputs: current live provider data for FPT, HPG, and VHM.')}</li>
                <li>{copy('Trạng thái: dữ liệu đã được nạp nhưng chưa vượt qua gate market-accuracy và provider validation.', 'Status: data loaded but not yet through the market-accuracy and provider-validation gate.')}</li>
                <li>{copy(`As_of: ${currentPreview.as_of}; provider: ${currentPreview.provider}; chưa được ký hiệu là forecast live chính thức.`, `As_of: ${currentPreview.as_of}; provider: ${currentPreview.provider}; not yet labeled as an official live forecast.`)}</li>
              </ul>
            ) : research ? (
              <ul>
                <li>{copy('Đầu vào: lợi suất trung bình 1, 5 và 20 phiên của rổ synthetic.', 'Inputs: mean 1, 5 and 20-session returns of the synthetic basket.')}</li>
                <li>{copy('Phương pháp: softmax ba trạng thái, chuẩn hóa trên train và đánh giá theo time split.', 'Method: three-state softmax, normalized on training data and evaluated with a time split.')}</li>
                <li>{copy(`Bằng chứng: replay ${preview.as_of}, artifact ${preview.artifact_sha256.slice(0, 12)}…, chưa hiệu chỉnh xác suất.`, `Evidence: ${preview.as_of} replay, artifact ${preview.artifact_sha256.slice(0, 12)}…, probabilities are uncalibrated.`)}</li>
              </ul>
            ) : (
              <p>{copy('Đang hiển thị fixture cố định vì chưa có artifact research hợp lệ; không có cơ sở để diễn giải như dự báo.', 'Fixed fixtures are shown because no valid research artifact is available; they must not be interpreted as a forecast.')}</p>
            )}
          </div>

          <section className="forecast-evidence" aria-labelledby="forecast-evidence-title">
            <div className="forecast-evidence-heading">
              <div>
                <strong id="forecast-evidence-title">{copy('Bằng chứng và kiểm chứng', 'Evidence and evaluation')}</strong>
                <small>{copy('Dữ liệu hiện tại được tách khỏi replay mô phỏng', 'Current data is isolated from simulated replay')}</small>
              </div>
              <div className="forecast-evidence-tabs" role="tablist" aria-label={copy('Nguồn bằng chứng dự báo', 'Forecast evidence source')}>
                <button type="button" role="tab" aria-selected={evidenceTab === 'current'} className={evidenceTab === 'current' ? 'is-active' : ''} onClick={() => setEvidenceTab('current')}>{copy('Dữ liệu hiện tại', 'Current data')}</button>
                <button type="button" role="tab" aria-selected={evidenceTab === 'research'} className={evidenceTab === 'research' ? 'is-active' : ''} onClick={() => setEvidenceTab('research')}>{copy('Nghiên cứu mô phỏng', 'Simulated research')}</button>
              </div>
            </div>
            <div role="tabpanel" className="forecast-evidence-panel">
              {evidenceTab === 'current' ? (
                <div className="forecast-current-evidence">
                  <span className="chip neutral">{copy('Đang theo dõi', 'Monitoring')}</span>
                  <div>
                    <strong>{liveCohort.status === 'live_cohort' ? copy(`${liveCohort.measured}/${liveCohort.minimum_samples} outcome current-data đủ điều kiện`, `${liveCohort.measured}/${liveCohort.minimum_samples} eligible current-data outcomes`) : copy(`Snapshot ${horizon} phiên đang chờ kết quả thực tế`, `${horizon}-session snapshot is awaiting an observed outcome`)}</strong>
                    <p>{liveCohort.status === 'loading' ? copy('Đang đọc cohort current-data…', 'Loading the current-data cohort…') : liveCohort.status === 'live_cohort' ? copy(`${liveCohort.predictions} dự báo · ${liveCohort.pending} pending. Score bị khóa cho đến đủ ${liveCohort.minimum_samples} outcome; baseline chỉ mở khi được seal đồng thời với dự báo.`, `${liveCohort.predictions} predictions · ${liveCohort.pending} pending. Scores stay locked until ${liveCohort.minimum_samples} outcomes; the baseline also requires contemporaneous sealing.`) : copy(`Phát hành từ EOD ${currentPreview.as_of || 'hiện tại'}. Chỉ được chấm điểm sau đủ ${horizon} phiên provider distinct; dữ liệu tháng 3 không tham gia phép đo này.`, `Issued from ${currentPreview.as_of || 'current'} EOD. It is scored only after ${horizon} distinct provider sessions; March data is excluded from this measurement.`)}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="forecast-research-notice" role="note">
                    <strong>{copy('Kiểm thử pipeline bằng dữ liệu mô phỏng', 'Pipeline test using simulated data')}</strong>
                    <p>{copy('Baseline v2 và timeline bên dưới thuộc fixture/replay tháng 3. Chúng kiểm tra lifecycle, scoring và giao diện; không huấn luyện hoặc thay đổi xác suất current-data đang hiển thị.', 'The v2 baseline and timeline below belong to the March fixture/replay. They test lifecycle, scoring, and UI; they do not train or alter the displayed current-data probabilities.')}</p>
                  </div>
                  <ForecastHistoryPanel horizon={horizon} language={language} />
                </>
              )}
            </div>
          </section>

          <section className="outlook-candidates" aria-labelledby="outlook-candidates-title">
            <div className="outlook-candidates-heading">
              <div>
                <h3 id="outlook-candidates-title">{copy('Mã cần quan sát cùng kịch bản', 'Symbols to monitor with this scenario')}</h3>
                <p>{copy('Xếp hạng độc lập từ snapshot Đề xuất; mô hình breadth synthetic không trực tiếp chọn cổ phiếu.', 'Ranked independently by the Ideas snapshot; the synthetic breadth model does not directly select stocks.')}</p>
              </div>
              <button type="button" className="ghost-btn small-btn" onClick={onOpenIdeas}>{copy('Mở Đề xuất', 'Open Ideas')}</button>
            </div>
            {candidates.length ? (
              <ol className="outlook-candidate-list">
                {candidates.map(item => {
                  const symbol = String(item.stock?.code || item.symbol).toUpperCase()
                  const rationale = item.rationale || {}
                  const observations = rationale.observations || rationale.evidence?.objective?.observations
                  const rsi = rationale.indicators?.rsi14
                  const factors = Array.isArray(rationale.factors) ? rationale.factors.slice(0, 2) : []
                  return (
                    <li key={item.id || item.stock_id || symbol}>
                      <div className="outlook-candidate-main">
                        <button type="button" className="symbol" onClick={() => onOpenDetail?.(item.stock || { id: item.stock_id, code: symbol, symbol })}>{symbol}</button>
                        <span className="outlook-candidate-score">{Number(item.score).toFixed(1)}<small>/100</small></span>
                        <span className="rank-label">#{item.rank || '—'}</span>
                      </div>
                      <p>{factors.length ? factors.join(' · ') : copy('Chưa có diễn giải định lượng đầy đủ.', 'No complete quantitative rationale yet.')}</p>
                      <div className="outlook-candidate-evidence">
                        <span>{copy('Xu hướng', 'Trend')}: <b>{rationale.trend || '—'}</b></span>
                        <span>RSI: <b>{Number.isFinite(Number(rsi)) ? Number(rsi).toFixed(1) : '—'}</b></span>
                        <span>{copy('Quan sát', 'Observations')}: <b>{observations || '—'}</b></span>
                      </div>
                      <button type="button" className="ghost-btn small-btn outlook-candidate-watch" disabled={watched.has(symbol)} onClick={() => onAddToWatchlist?.(symbol)}>{watched.has(symbol) ? copy('Đang theo dõi', 'Watching') : copy('Theo dõi', 'Watch')}</button>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <p className="outlook-candidates-empty">{copy('Chưa có snapshot đủ điều kiện để liệt kê mã. Xem trang Đề xuất để kiểm tra coverage và nguyên nhân loại.', 'No eligible snapshot is available for a stock list. Open Ideas to review coverage and exclusion reasons.')}</p>
            )}
          </section>

          <footer className="outlook-footer">{currentData ? copy('Trạng thái: current-data preview · live preview đang hoạt động ở chế độ giám sát', 'Status: current-data preview · live preview active in monitor mode') : research ? copy('Trạng thái: research-only · Dữ liệu synthetic · Chưa có dự báo thật', 'Status: research-only · Synthetic data · Live forecasts unavailable') : copy('Trạng thái: giao diện dự phòng · Chưa có dự báo thật', 'Status: interface fallback · Live forecasts unavailable')}</footer>
        </>
      )}
    </section>
  )
}
