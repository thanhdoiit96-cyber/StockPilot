import { useEffect, useState } from 'react'
import { fetchForecastCurrentPreview, fetchForecastResearchPreview } from '../services/forecastPreview.mjs'
import ForecastHistoryPanel from './ForecastHistoryPanel.jsx'
import { fetchForecastLiveCohort } from '../services/forecastHistory.mjs'
import { summarizeForecastBreadth } from '../services/forecastBreadth.mjs'
import { forecastOutcomeTone, formatForecastPercent } from '../services/forecastDisplay.mjs'
import { fetchOfficialVn30Readiness } from '../services/officialVn30Readiness.mjs'
import OfficialVn30Readiness from './OfficialVn30Readiness.jsx'

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
  const [officialVn30, setOfficialVn30] = useState({ status: 'loading' })
  // Retained only while the legacy Liquid30 markup is hidden during the UI transition.
  const liquid30 = { status: 'unavailable' }
  const researchPreviewEnabled = String(globalThis.__VITE_ENABLE_FORECAST_RESEARCH__ || (typeof import.meta !== 'undefined' && import.meta?.env ? import.meta.env.VITE_ENABLE_FORECAST_RESEARCH || '' : '')).toLowerCase() === 'true'
  const currentPreviewEnabled = String(globalThis.__VITE_ENABLE_FORECAST_LIVE__ || (typeof import.meta !== 'undefined' && import.meta?.env ? import.meta.env.VITE_ENABLE_FORECAST_LIVE || '' : '')).toLowerCase() === 'true'
  useEffect(() => { if (!currentPreviewEnabled) setEvidenceTab('research') }, [currentPreviewEnabled])
  useEffect(() => {
    const controller = new AbortController()
    fetchOfficialVn30Readiness({ signal: controller.signal }).then(setOfficialVn30).catch(error => {
      if (error?.name !== 'AbortError') setOfficialVn30({ status: 'unavailable' })
    })
    return () => controller.abort()
  }, [])
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
      fetchForecastCurrentPreview(['FPT', 'HPG', 'VHM'], { signal: controller.signal, horizon, forceReload: previewRetry > 0 }).then(setCurrentPreview).catch(error => {
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
  const forecastPayload = currentData ? currentPreview : research ? preview : null
  const probabilities = forecastPayload?.probabilities || []
  const labels = [copy('Tăng lan tỏa', 'Broad advance'), copy('Cân bằng', 'Balanced'), copy('Giảm lan tỏa', 'Broad decline')]
  const forecastClasses = ['advancing', 'balanced', 'declining']
  const outcomeLegend = copy('Màu kịch bản: xanh = tăng lan tỏa; vàng = cân bằng; đỏ = giảm lan tỏa.', 'Scenario colour: green = broad advance; amber = balanced; red = broad decline.')
  const breadthForecast = summarizeForecastBreadth(forecastPayload?.probabilities, forecastPayload?.breadth_target)
  const breadthLabel = breadthForecast ? labels[forecastClasses.indexOf(breadthForecast.scenario)] : null
  const breadthTone = breadthForecast ? forecastOutcomeTone(breadthForecast.scenario) : null
  const validation = currentPreview.validation
  const validationItems = validation ? [
    ['current_data_ready', copy('Dữ liệu hiện tại', 'Current data')],
    ['evidence_integrity', copy('Toàn vẹn bằng chứng', 'Evidence integrity')],
    ['coverage_ok', copy('Độ phủ đầu vào', 'Input coverage')],
    ['minimum_samples_ok', copy('Số phiên đầu vào', 'Input sessions')],
    ['staleness_ok', copy('Độ mới dữ liệu', 'Data freshness')],
    ['calibration_validated', copy('Hiệu chỉnh xác suất', 'Probability calibration')],
    ['independent_audit_validated', copy('Rà soát độc lập', 'Independent audit')],
    ['provider_validation_completed', copy('Xác thực provider', 'Provider validation')]
  ] : []
  const formatPercent = value => formatForecastPercent(value, en ? 'en-US' : 'vi-VN') || '—'
  const breadthThreshold = breadthForecast ? (breadthForecast.band.minimum === 0 ? `< ${formatPercent(breadthForecast.band.maximum)} %` : breadthForecast.band.maximum === 1 ? `> ${formatPercent(breadthForecast.band.minimum)} %` : `${formatPercent(breadthForecast.band.minimum)}–${formatPercent(breadthForecast.band.maximum)} %`) : null
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
            <p>{currentData ? copy(`Đang dùng dữ liệu hiện tại từ ${currentPreview.provider} với as_of ${currentPreview.as_of}. Đây là preview live, chưa qua gate xác minh hiệu quả thị trường.`, `Using current data from ${currentPreview.provider} with as_of ${currentPreview.as_of}. This is a live preview, not yet validated through the market-accuracy gate.`) : research ? copy(`Xác suất lấy từ replay synthetic tại ${preview.as_of}; không phải dự báo thị trường hiện tại, chưa hiệu chỉnh và chưa có hiệu quả được xác minh.`, `Probabilities come from a synthetic replay at ${preview.as_of}; this is not a current market forecast, is not calibrated and has no verified performance.`) : copy('Chưa có payload dự báo hợp lệ để hiển thị.', 'No valid forecast payload is available to display.')}</p>
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
            <span className="outlook-compact-badge">{currentData ? copy('Live', 'Live') : research ? copy('Replay', 'Replay') : copy('Không có dữ liệu', 'Unavailable')}</span>
            <strong>{copy('Trạng thái rút gọn', 'Compact status')}</strong>
          </div>
          <div className="outlook-compact-grid">
            {labels.map((label, index) => (
              <div className={`outlook-compact-cell outcome-${forecastOutcomeTone(forecastClasses[index])}`} key={label} title={outcomeLegend}>
                <span>{label}</span>
                <strong>{formatPercent(probabilities[index]?.value)}{forecastPayload ? '%' : ''}</strong>
              </div>
            ))}
          </div>
          <p className="outlook-outcome-legend">{outcomeLegend}</p>
          <p className="outlook-note">
            {currentData ? copy(`Horizon ${horizon} phiên · Dữ liệu hiện tại`, `Horizon ${horizon} sessions · current data`) : research ? copy(`Horizon ${horizon} phiên · Replay synthetic`, `Horizon ${horizon} sessions · synthetic replay`) : copy('Chưa có forecast hợp lệ', 'No valid forecast')}
          </p>
        </div>
      ) : (
        <>
          <div className="outlook-body" aria-live="polite">
            <div>
              <h3 className={currentData ? 'outlook-prototype-title' : undefined}>{currentData ? copy('Xác suất prototype trên dữ liệu hiện tại', 'Prototype probabilities on current data') : research ? copy('Xác suất replay synthetic', 'Synthetic replay probabilities') : copy('Chưa có xác suất dự báo', 'Forecast probabilities unavailable')}</h3>
              <div className={`outlook-probabilities${preview.status === 'loading' || currentPreview.status === 'loading' ? ' is-loading' : ''}`} aria-busy={preview.status === 'loading' || currentPreview.status === 'loading'}>
                {labels.map((label, i) => (
                  <div className={`outlook-probability outcome-${forecastOutcomeTone(forecastClasses[i])}`} key={label} title={outcomeLegend}>
                    <span>{label}</span>
                    <strong>{formatPercent(probabilities[i]?.value)}{forecastPayload && <small>%</small>}</strong>
                    <div className="outlook-meter" aria-hidden="true"><i style={{ width: `${forecastPayload ? Math.max(0, Math.min(100, Number(probabilities[i]?.value) * 100 || 0)) : 0}%` }} /></div>
                  </div>
                ))}
              </div>
              <p className="outlook-outcome-legend">{outcomeLegend}</p>
              <div className="outlook-preview-status">
                <p className={`outlook-note${stale ? ' is-stale' : ''}`}>
                  {currentPreview.status === 'loading' ? copy('Đang kiểm tra dữ liệu hiện tại…', 'Checking live current data…') : currentData ? copy(`Prototype ${horizon} phiên · ${currentPreview.as_of} · provider ${currentPreview.provider}${currentPreview.cache_status === 'memory' ? ' · hiển thị lại từ bộ nhớ (≤1 phút)' : ''} · chưa hiệu chỉnh/xác minh`, `${horizon}-session prototype · ${currentPreview.as_of} · provider ${currentPreview.provider}${currentPreview.cache_status === 'memory' ? ' · restored from memory (≤1 min)' : ''} · uncalibrated and unverified`) : preview.status === 'loading' ? copy('Đang kiểm tra bản research preview…', 'Checking the research preview…') : research ? copy(`Replay ${preview.as_of} · Artifact tạo ${new Date(preview.artifact_generated_at).toLocaleDateString('vi-VN')}${stale ? ' · Đã cũ' : ''} · Không phải dự báo live`, `Replay ${preview.as_of} · Artifact generated ${new Date(preview.artifact_generated_at).toLocaleDateString('en-US')}${stale ? ' · Stale' : ''} · Not a live forecast`) : copy('Chưa có forecast hợp lệ để hiển thị', 'No valid forecast is available')}
                </p>
                {(preview.status === 'unavailable' || currentPreview.status === 'unavailable') && (
                  <button type="button" className="ghost-btn small-btn" onClick={() => setPreviewRetry(value => value + 1)}>{copy('Thử lại', 'Retry')}</button>
                )}
              </div>
            </div>

            <div className="outlook-range">
              <h3>{copy('Tỷ lệ mã tăng trong rổ', 'Share of advancing stocks')}</h3>
              {breadthForecast ? (
                <>
                  <div className="outlook-range-value">
                    <strong className={`outcome-${breadthTone}`}>{breadthThreshold}</strong>
                    <span>{copy(`ngưỡng của kịch bản ${breadthLabel}`, `${breadthLabel} scenario threshold`)}</span>
                  </div>
                  <svg className={`outcome-${breadthTone}`} viewBox="0 0 360 66" role="img" aria-label={`${copy('Band tỷ lệ mã tăng', 'Advancing-share band')}: ${breadthThreshold}; ${breadthLabel} ${formatPercent(breadthForecast.probability)}%`}>
                    <line x1="16" x2="344" y1="22" y2="22" className="outlook-axis" />
                    <line x1="180" x2="180" y1="9" y2="35" className="outlook-reference" />
                    <line x1={16 + breadthForecast.band.minimum * 328} x2={16 + breadthForecast.band.maximum * 328} y1="22" y2="22" className="outlook-band" />
                    <text x="16" y="56">0%</text><text x="180" y="56" textAnchor="middle">50%</text><text x="344" y="56" textAnchor="end">100%</text>
                  </svg>
                  <p className="outlook-breadth-scenario">{copy(`Kịch bản có xác suất cao nhất: ${breadthLabel} (${formatPercent(breadthForecast.probability)}%).`, `Most likely scenario: ${breadthLabel} (${formatPercent(breadthForecast.probability)}%).`)}</p>
                  <p className="outlook-note">{copy('Mô hình chỉ dự đoán lớp độ rộng rổ; chưa có ước lượng điểm hoặc khoảng tin cậy cho tỷ lệ mã tăng. Màu thể hiện hướng của kịch bản, không phải lợi nhuận.', 'The model predicts a breadth class only; it has no point estimate or confidence interval for the advancing share. Colour expresses scenario direction, not return.')}</p>
                </>
              ) : (
                <>
                  <div className="outlook-range-value"><strong>—</strong><span>{copy('Chưa có đầu ra dự báo hợp lệ', 'No valid forecast output')}</span></div>
                  <p className="outlook-note">{copy('Không hiển thị khoảng minh họa khi chưa có forecast chứa định nghĩa độ rộng rổ có thể kiểm chứng.', 'No illustrative range is shown until a forecast includes a verifiable breadth-target definition.')}</p>
                </>
              )}
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
                <>
                <div className="forecast-current-evidence">
                  <span className="chip neutral">{copy('Đang theo dõi', 'Monitoring')}</span>
                  <div>
                    <strong>{liveCohort.status === 'live_cohort' ? copy(`${liveCohort.measured}/${liveCohort.minimum_samples} outcome current-data đủ điều kiện`, `${liveCohort.measured}/${liveCohort.minimum_samples} eligible current-data outcomes`) : copy(`Snapshot ${horizon} phiên đang chờ kết quả thực tế`, `${horizon}-session snapshot is awaiting an observed outcome`)}</strong>
                    <p>{liveCohort.status === 'loading' ? copy('Đang đọc cohort current-data…', 'Loading the current-data cohort…') : liveCohort.status === 'live_cohort' ? copy(`${liveCohort.predictions} dự báo · ${liveCohort.pending} pending. Score bị khóa cho đến đủ ${liveCohort.minimum_samples} outcome; baseline chỉ mở khi được seal đồng thời với dự báo.`, `${liveCohort.predictions} predictions · ${liveCohort.pending} pending. Scores stay locked until ${liveCohort.minimum_samples} outcomes; the baseline also requires contemporaneous sealing.`) : copy(`Phát hành từ EOD ${currentPreview.as_of || 'hiện tại'}. Chỉ được chấm điểm sau đủ ${horizon} phiên provider distinct; dữ liệu tháng 3 không tham gia phép đo này.`, `Issued from ${currentPreview.as_of || 'current'} EOD. It is scored only after ${horizon} distinct provider sessions; March data is excluded from this measurement.`)}</p>
                  </div>
                </div>
                {currentData && validation && <div className="forecast-validation-gate" role="status">
                  <div>
                    <strong>{copy('Cổng xác minh forecast', 'Forecast validation gate')}</strong>
                    <p>{copy('Các điều kiện dữ liệu bên dưới chỉ cho phép theo dõi shadow. Ba điều kiện cuối chưa đạt, nên xác suất này không phải forecast đã xác minh hoặc khuyến nghị đầu tư.', 'The data conditions below only permit shadow monitoring. The final three conditions are still pending, so these probabilities are not a verified forecast or investment recommendation.')}</p>
                  </div>
                  <ul aria-label={copy('Trạng thái cổng xác minh', 'Forecast validation status')}>
                    {validationItems.map(([key, label]) => <li key={key} className={validation[key] ? 'is-ready' : 'is-pending'}><span aria-hidden="true">{validation[key] ? '✓' : '○'}</span>{label}<small>{validation[key] ? copy('Đạt', 'Ready') : copy('Chờ', 'Pending')}</small></li>)}
                  </ul>
                </div>}
                <div className="forecast-validation-gate liquid30-readiness" role="status"><div><strong>{copy('Rổ Liquid30', 'Liquid30 basket')}</strong><p>{liquid30.status === 'ready' ? copy(`Sẵn sàng chọn Top 30 theo giá trị giao dịch EOD phiên ${liquid30.session_date}.`, `Ready to select the top 30 by EOD traded value for ${liquid30.session_date}.`) : liquid30.status === 'partial_observed_universe' ? copy(`Nghiên cứu trên tập EOD quan sát được: ${liquid30.covered}/${liquid30.listed} mã (${liquid30.coverage_pct.toFixed(1)}%). Không phải toàn thị trường và chưa phát hành xác suất Liquid30.`, `Research on the observed EOD subset: ${liquid30.covered}/${liquid30.listed} symbols (${liquid30.coverage_pct.toFixed(1)}%). This is not the whole market and no Liquid30 probability is issued.`) : copy('Chưa đủ dữ liệu EOD để lập rổ Liquid30.', 'EOD data is not sufficient to form a Liquid30 basket.')}</p></div>{liquid30.exchange_coverage?.length ? <ul aria-label={copy('Coverage EOD theo sàn', 'EOD coverage by exchange')}>{liquid30.exchange_coverage.map(item => <li key={item.exchange}><span aria-hidden="true">○</span>{item.exchange}<small>{Number(item.coverage_pct).toFixed(1)}%</small></li>)}</ul> : null}</div>
                <OfficialVn30Readiness state={officialVn30} language={language} />
                </>
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
