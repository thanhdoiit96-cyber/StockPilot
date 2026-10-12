import { useEffect, useState } from 'react'
import { fetchForecastResearchPreview } from '../services/forecastPreview.mjs'

// Design fixtures only. These values are not outputs of the research baseline.
const scenarios = {
  1: { probabilities: [38, 36, 26], range: [40, 62], median: 51 },
  5: { probabilities: [54, 28, 18], range: [35, 72], median: 57 },
}

export default function ShortTermOutlook({ language = 'vi' }) {
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
  useEffect(() => {
    const controller = new AbortController()
    setPreview({ status: 'loading' })
    fetchForecastResearchPreview(horizon, { signal: controller.signal }).then(setPreview).catch(error => {
      if (error?.name !== 'AbortError') setPreview({ status: 'unavailable', reason: 'request_failed' })
    })
    return () => controller.abort()
  }, [horizon])
  const research = preview.status === 'research_preview'
  const stale = research && preview.artifact_freshness === 'stale'
  const scenario = { ...scenarios[horizon], probabilities: research ? preview.probabilities.map(item => item.value * 100) : scenarios[horizon].probabilities }
  const labels = [copy('Tăng lan tỏa', 'Broad advance'), copy('Cân bằng', 'Balanced'), copy('Giảm lan tỏa', 'Broad decline')]
  return <section className="panel short-term-outlook" aria-labelledby="short-term-outlook-title">
    <header className="outlook-header">
      <div><span className="eyebrow">{copy('GÓC NHÌN PHÍA TRƯỚC', 'LOOKING AHEAD')}</span><h2 id="short-term-outlook-title">{copy('Triển vọng ngắn hạn', 'Short-term outlook')}</h2><p className="muted-text">{copy('Độ rộng rổ cổ phiếu · Bản xem trước giao diện', 'Stock basket breadth · Interface preview')}</p></div>
      <div className="outlook-controls"><details className="outlook-info"><summary>{research ? copy('Mô phỏng nghiên cứu', 'Research simulation') : copy('Mô phỏng', 'Simulated')} <span aria-hidden="true">ⓘ</span></summary><p>{research ? copy(`Xác suất lấy từ replay synthetic tại ${preview.as_of}; không phải dự báo thị trường hiện tại, chưa hiệu chỉnh và chưa có hiệu quả được xác minh. Khoảng tỷ lệ mã tăng vẫn là fixture giao diện.`, `Probabilities come from a synthetic replay at ${preview.as_of}; this is not a current market forecast, is not calibrated and has no verified performance. The advancing-share range remains a UI fixture.`) : copy('API research preview không khả dụng nên toàn bộ số liệu bên dưới là fixture cố định để kiểm tra giao diện. Không đại diện VNINDEX hay dự báo thị trường.', 'The research preview API is unavailable, so all values below are fixed UI fixtures. They do not represent VNINDEX or a market forecast.')}</p></details>
      <div className="outlook-horizons" role="group" aria-label={copy('Kỳ dự báo', 'Forecast horizon')}>{[1, 5].map(value => <button key={value} type="button" className="ghost-btn small-btn" aria-pressed={horizon === value} onClick={() => selectHorizon(value)}>{value} {copy('phiên', value === 1 ? 'session' : 'sessions')}</button>)}</div></div>
    </header>
    <div className="outlook-body" aria-live="polite">
      <div><h3>{research ? copy('Xác suất replay synthetic', 'Synthetic replay probabilities') : copy('Xác suất minh họa', 'Illustrative probabilities')}</h3><div className={`outlook-probabilities${preview.status === 'loading' ? ' is-loading' : ''}`} aria-busy={preview.status === 'loading'}>{labels.map((label, i) => <div className={`outlook-probability tone-${i}`} key={label}><span>{label}</span><strong>{Number(scenario.probabilities[i].toFixed(1))}<small>%</small></strong><div className="outlook-meter" aria-hidden="true"><i style={{ width: `${scenario.probabilities[i]}%` }} /></div></div>)}</div><p className={`outlook-note${stale ? ' is-stale' : ''}`}>{preview.status === 'loading' ? copy('Đang kiểm tra bản research preview…', 'Checking the research preview…') : research ? copy(`Replay ${preview.as_of} · Artifact tạo ${new Date(preview.artifact_generated_at).toLocaleDateString('vi-VN')}${stale ? ' · Đã cũ' : ''} · Không phải dự báo live`, `Replay ${preview.as_of} · Artifact generated ${new Date(preview.artifact_generated_at).toLocaleDateString('en-US')}${stale ? ' · Stale' : ''} · Not a live forecast`) : copy('Research preview không khả dụng · Đang hiển thị fixture giao diện', 'Research preview unavailable · Showing UI fixtures')}</p></div>
      <div className="outlook-range"><h3>{copy('Tỷ lệ mã tăng trong rổ', 'Share of advancing stocks')}</h3><div className="outlook-range-value"><strong>{scenario.range[0]}–{scenario.range[1]}%</strong><span>{copy('Khoảng minh họa', 'Illustrative range')}</span></div>
      <svg viewBox="0 0 360 66" role="img" aria-label={`${copy('Khoảng minh họa', 'Illustrative range')}: ${scenario.range[0]}–${scenario.range[1]}%; ${copy('điểm giữa', 'midpoint')} ${scenario.median}%`}>
        <line x1="16" x2="344" y1="22" y2="22" className="outlook-axis" />
        <line x1="180" x2="180" y1="9" y2="35" className="outlook-reference" />
        <line x1={16 + scenario.range[0] * 3.28} x2={16 + scenario.range[1] * 3.28} y1="22" y2="22" className="outlook-band" />
        <circle cx={16 + scenario.median * 3.28} cy="22" r="5" className="outlook-point" />
        <text x="16" y="56">0%</text><text x="180" y="56" textAnchor="middle">50%</text><text x="344" y="56" textAnchor="end">100%</text>
      </svg><p className="outlook-note">{copy('Đo tỷ lệ cổ phiếu tăng, không phải mức tăng giá hay lợi nhuận.', 'A share of advancing stocks, not price appreciation or investment return.')}</p></div>
    </div>
    <footer className="outlook-footer">{research ? copy('Trạng thái: research-only · Dữ liệu synthetic · Chưa có dự báo thật', 'Status: research-only · Synthetic data · Live forecasts unavailable') : copy('Trạng thái: giao diện dự phòng · Chưa có dự báo thật', 'Status: interface fallback · Live forecasts unavailable')}</footer>
  </section>
}
