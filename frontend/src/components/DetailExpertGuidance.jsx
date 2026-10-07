const cloudLabel = cloud => ({
  above_cloud: 'Trên mây',
  below_cloud: 'Dưới mây',
  inside_cloud: 'Trong mây'
}[cloud] || 'Chưa đủ dữ liệu')

const macdLabel = state => ({
  bullish: 'Tăng',
  bearish: 'Giảm',
  neutral: 'Trung tính'
}[state] || 'Chưa đủ dữ liệu')

const bollingerLabel = position => ({
  above_upper: 'Vượt dải trên',
  below_lower: 'Dưới dải dưới',
  upper_half: 'Nửa trên dải',
  lower_half: 'Nửa dưới dải'
}[position] || 'Chưa đủ dữ liệu')

const fixed = (value, digits = 2) => value == null ? '-' : Number(value).toFixed(digits)

export default function DetailExpertGuidance({
  guidance,
  observations,
  asOf,
  qualityScore,
  indicators = {},
  translate = value => value,
  formatDate = value => value
}) {
  if (!guidance) return null

  const ichimoku = indicators.ichimoku || {}
  const macd = indicators.macd || {}
  const bollinger = indicators.bollinger || {}

  return <div className="expert-guidance-panel">
    <div className="expert-guidance-header">
      <strong>{translate('Nhận định chuyên gia')}</strong>
      <span className="chip neutral">{guidance.stance}{guidance.technical_score != null ? ` · ${guidance.technical_score}/100` : ''}</span>
      <i className="technical-score-meter" style={{ width: `${Math.max(0, Math.min(100, Number(guidance.technical_score || 0)))}%` }} title={translate('Điểm kỹ thuật tổng hợp')} />
    </div>
    <p>{guidance.confirmation}</p>
    <div className="analysis-context-strip">
      <span><strong>{translate('Dữ liệu')} </strong>{observations} {translate('phiên')}</span>
      <span><strong>{translate('Đến')} </strong>{formatDate(asOf)}</span>
      <span><strong>{translate('Chất lượng')} </strong>{qualityScore == null ? '-' : `${qualityScore}/100`}</span>
    </div>
    <div className="ichimoku-summary">
      <strong>{translate('Ichimoku')}</strong>
      <span>Tenkan {ichimoku.conversion ?? '-'} · Kijun {ichimoku.base ?? '-'} · {translate('Mây')} {translate(cloudLabel(ichimoku.cloud))} · MACD {translate(macdLabel(macd.state))} · Bollinger {translate(bollingerLabel(bollinger.position))}</span>
    </div>
    <div className="advanced-indicator-grid">
      <article><strong>SMA20 / SMA50</strong><b>{fixed(indicators.sma20)} / {fixed(indicators.sma50)}</b><small>{translate('Nền xu hướng trung hạn')}</small></article>
      <article><strong>EMA12 / EMA26</strong><b>{fixed(indicators.ema12)} / {fixed(indicators.ema26)}</b><small>{translate('Động lượng ngắn hạn')}</small></article>
      <article><strong>RSI14</strong><b>{fixed(indicators.rsi14, 1)}</b><small>{translate('Trên 70: quá mua · dưới 30: quá bán')}</small></article>
      <article><strong>MACD</strong><b>{fixed(macd.line)} · H {fixed(macd.histogram)}</b><small>{translate('Đường MACD và histogram')}</small></article>
      <article><strong>Bollinger 20/2</strong><b>{fixed(bollinger.lower)} - {fixed(bollinger.upper)}</b><small>{translate('Biên dưới - biên trên')}</small></article>
      <article><strong>Ichimoku</strong><b>T {fixed(ichimoku.conversion)} · K {fixed(ichimoku.base)}</b><small>{translate(cloudLabel(ichimoku.cloud))}</small></article>
    </div>
    <div className="expert-score-grid">
      {(guidance.score_breakdown || []).map(item => <article key={item.key}>
        <div><strong>{item.label}</strong><b>{item.score == null ? '-' : `${item.score} ${translate('điểm')}`}</b></div>
        <small>{item.detail}</small>
      </article>)}
    </div>
    <div className="expert-guidance-columns">
      <div><strong>{translate('Cần theo dõi')}</strong><ul>{(guidance.watch || []).map(item => <li key={item}>{item}</li>)}</ul></div>
      <div><strong>{translate('Nên tránh')}</strong><ul>{(guidance.avoid || []).map(item => <li key={item}>{item}</li>)}</ul></div>
    </div>
    <div className="expert-forecast-grid">
      {Object.entries(guidance.forecast || {}).map(([horizon, advice]) => <article key={horizon}>
        <strong>{translate(horizon === 'short_term' ? 'Ngắn hạn' : horizon === 'medium_term' ? 'Trung hạn' : 'Dài hạn')}</strong>
        <small>{translate(horizon === 'short_term' ? '1-20 phiên (~1 tháng)' : horizon === 'medium_term' ? '1-6 tháng' : 'Trên 6 tháng')}</small>
        <p>{advice}</p>
      </article>)}
    </div>
    <p className="analysis-disclaimer">{guidance.risk_note}</p>
  </div>
}
