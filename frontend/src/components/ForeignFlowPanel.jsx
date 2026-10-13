import React from 'react'
import useApiResource from '../hooks/useApiResource.js'
import { foreignFlowSnapshot, shouldShowForeignFlow } from '../services/foreignFlowSnapshot.mjs'

const money = (value, language) => new Intl.NumberFormat(language === 'en' ? 'en-US' : 'vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0))
const signed = (value, language) => `${Number(value) > 0 ? '+' : ''}${money(value, language)}`

export default function ForeignFlowPanel({ language = 'vi' }) {
  const state = useApiResource('/api/market-data/foreign-flow?limit=6', foreignFlowSnapshot)
  if (state.status !== 'success' || !shouldShowForeignFlow(state.data)) return null
  const data = state.data
  const text = (vi, en) => language === 'en' ? en : vi
  const tone = value => Number(value) > 0 ? 'positive' : Number(value) < 0 ? 'negative' : ''
  return <section className="panel foreign-flow-panel" aria-labelledby="foreign-flow-heading">
    <div className="foreign-flow-heading">
      <div><span className="eyebrow">{text('DÒNG TIỀN THEO NHÓM NHÀ ĐẦU TƯ', 'INVESTOR FLOW')}</span><h3 id="foreign-flow-heading">{text('Giao dịch khối ngoại', 'Foreign investor activity')}</h3><p>{text(`Phiên ${data.session_date} · ${data.coverage.observed}/${data.coverage.universe_size} mã có dữ liệu`, `Session ${data.session_date} · ${data.coverage.observed}/${data.coverage.universe_size} symbols observed`)}</p></div>
      <span className={`foreign-flow-coverage ${data.status}`}>{data.status === 'available' ? text('Đủ độ phủ', 'Coverage ready') : text('Độ phủ một phần', 'Partial coverage')}</span>
    </div>
    <div className="foreign-flow-metrics">
      <article><span>{text('Mua', 'Buy value')}</span><strong>{money(data.totals.buy_value, language)}</strong></article>
      <article><span>{text('Bán', 'Sell value')}</span><strong>{money(data.totals.sell_value, language)}</strong></article>
      <article><span>{text('Mua/bán ròng', 'Net value')}</span><strong className={tone(data.totals.net_value)}>{signed(data.totals.net_value, language)}</strong><small>VND</small></article>
      <article><span>{text('Độ phủ', 'Coverage')}</span><strong>{(data.coverage.ratio * 100).toFixed(1)}%</strong></article>
    </div>
    <div className="foreign-flow-lists">
      <div><strong>{text('Mã nổi bật theo giá trị ròng', 'Symbols by absolute net value')}</strong><ol>{data.symbols.slice(0, 6).map(item => <li key={item.symbol}><span><b>{item.symbol}</b><small>{item.sector}</small></span><em className={tone(item.net_value)}>{signed(item.net_value, language)}</em></li>)}</ol></div>
      <div><strong>{text('Nhóm ngành', 'Sectors')}</strong><ol>{data.sectors.slice(0, 6).map(item => <li key={item.sector}><span><b>{item.sector}</b><small>{item.observed} {text('mã', 'symbols')}</small></span><em className={tone(item.totals.net_value)}>{signed(item.totals.net_value, language)}</em></li>)}</ol></div>
    </div>
    <p className="foreign-flow-note">{text('Dữ liệu quan sát, chưa được dùng để chấm điểm dự báo hoặc đề xuất. Mua ròng không đồng nghĩa giá sẽ tăng.', 'Observed data only; it is not used to score forecasts or ideas. Net buying does not imply that prices will rise.')}</p>
  </section>
}
