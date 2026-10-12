import { useState } from 'react'

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
  const scenario = scenarios[horizon]
  const labels = [copy('Tăng lan tỏa', 'Broad advance'), copy('Cân bằng', 'Balanced'), copy('Giảm lan tỏa', 'Broad decline')]
  return <section className="panel short-term-outlook" aria-labelledby="short-term-outlook-title">
    <header className="outlook-header">
      <div><span className="eyebrow">{copy('GÓC NHÌN PHÍA TRƯỚC', 'LOOKING AHEAD')}</span><h2 id="short-term-outlook-title">{copy('Triển vọng ngắn hạn', 'Short-term outlook')}</h2><p className="muted-text">{copy('Độ rộng rổ cổ phiếu · Bản xem trước giao diện', 'Stock basket breadth · Interface preview')}</p></div>
      <div className="outlook-controls"><details className="outlook-info"><summary>{copy('Mô phỏng', 'Simulated')} <span aria-hidden="true">ⓘ</span></summary><p>{copy('Các xác suất và khoảng bên dưới là dữ liệu minh họa cố định để xem trước giao diện, chưa được tính từ mô hình hoặc thị trường. Không đại diện VNINDEX. Chưa có ngày phát hành hay kết quả kiểm chứng thực tế.', 'The probabilities and range below are fixed design fixtures, not model or market outputs. They do not represent VNINDEX. No live issue date or validated performance is available.')}</p></details>
      <div className="outlook-horizons" role="group" aria-label={copy('Kỳ dự báo', 'Forecast horizon')}>{[1, 5].map(value => <button key={value} type="button" className="ghost-btn small-btn" aria-pressed={horizon === value} onClick={() => selectHorizon(value)}>{value} {copy('phiên', value === 1 ? 'session' : 'sessions')}</button>)}</div></div>
    </header>
    <div className="outlook-body" aria-live="polite">
      <div><h3>{copy('Xác suất minh họa', 'Illustrative probabilities')}</h3><div className="outlook-probabilities">{labels.map((label, i) => <div className={`outlook-probability tone-${i}`} key={label}><span>{label}</span><strong>{scenario.probabilities[i]}<small>%</small></strong><div className="outlook-meter" aria-hidden="true"><i style={{ width: `${scenario.probabilities[i]}%` }} /></div></div>)}</div><p className="outlook-note">{copy('Ba kịch bản cộng 100%. Chưa phải xác suất đã hiệu chỉnh.', 'The three scenarios sum to 100%. These probabilities are not calibrated.')}</p></div>
      <div className="outlook-range"><h3>{copy('Tỷ lệ mã tăng trong rổ', 'Share of advancing stocks')}</h3><div className="outlook-range-value"><strong>{scenario.range[0]}–{scenario.range[1]}%</strong><span>{copy('Khoảng minh họa', 'Illustrative range')}</span></div>
      <svg viewBox="0 0 360 66" role="img" aria-label={`${copy('Khoảng minh họa', 'Illustrative range')}: ${scenario.range[0]}–${scenario.range[1]}%; ${copy('điểm giữa', 'midpoint')} ${scenario.median}%`}>
        <line x1="16" x2="344" y1="22" y2="22" className="outlook-axis" />
        <line x1="180" x2="180" y1="9" y2="35" className="outlook-reference" />
        <line x1={16 + scenario.range[0] * 3.28} x2={16 + scenario.range[1] * 3.28} y1="22" y2="22" className="outlook-band" />
        <circle cx={16 + scenario.median * 3.28} cy="22" r="5" className="outlook-point" />
        <text x="16" y="56">0%</text><text x="180" y="56" textAnchor="middle">50%</text><text x="344" y="56" textAnchor="end">100%</text>
      </svg><p className="outlook-note">{copy('Đo tỷ lệ cổ phiếu tăng, không phải mức tăng giá hay lợi nhuận.', 'A share of advancing stocks, not price appreciation or investment return.')}</p></div>
    </div>
    <footer className="outlook-footer">{copy('Trạng thái mô hình: đang phát triển · Chưa có dự báo thật', 'Model status: in development · Live forecasts not yet available')}</footer>
  </section>
}
