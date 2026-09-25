const money = value => value == null ? '—' : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(value)) + ' đ'
const date = value => value ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value)) : '—'

export default function RecommendationTracking({ entries = [] }) {
  return <section className="recommendation-tracking" aria-labelledby="recommendation-tracking-title">
    <div className="recommendation-tracking-heading"><div><h3 id="recommendation-tracking-title">Theo dõi mã đã thêm từ đề xuất</h3><p>Mỗi giao dịch được liên kết với điểm, giá tham chiếu và kỳ hạn tại lúc bạn thêm mã.</p></div><span className="chip neutral">{entries.length} giao dịch</span></div>
    {entries.length ? <><div className="table-wrap recommendation-tracking-table"><table><thead><tr><th>Mã / đề xuất</th><th>Giá vào thực tế</th><th>Giá hiện tại</th><th>Biến động từ giá vào</th><th>Kết quả dự báo</th></tr></thead><tbody>{entries.map(entry => {
      const result = entry.evaluation || {}
      const recommendation = entry.recommendation || {}
      const quote = entry.current_quote
      const currentPrice = quote?.price ?? entry.current_eod_price
      const actualEntry = Number(entry.actual_entry_price)
      const actualReturn = currentPrice != null && actualEntry > 0 ? (Number(currentPrice) / actualEntry - 1) * 100 : null
      const outcomeClass = result.status === 'pending' ? 'pending' : result.outcome === 'positive' ? 'positive' : result.outcome === 'negative' ? 'negative' : 'flat'
      return <tr key={entry.transaction_id}><td><strong>{entry.symbol}</strong><small>Điểm {Number(recommendation.score || 0).toFixed(1)} · {date(recommendation.generated_at)}</small><small>{entry.position_status === 'active' ? 'Còn vị thế' : 'Đã đóng / không còn vị thế'}</small></td><td>{money(entry.actual_entry_price)}<small>{date(entry.traded_at)}</small></td><td>{money(currentPrice)}<small>{quote ? `Intraday · ${date(quote.observed_at)}` : 'Giá EOD'}</small></td><td className={actualReturn == null ? '' : actualReturn >= 0 ? 'positive' : 'negative'}>{actualReturn == null ? 'Chưa có giá' : `${actualReturn >= 0 ? '+' : ''}${actualReturn.toFixed(2)}%`}</td><td><span className={`recommendation-outcome is-${outcomeClass}`}>{result.status === 'pending' ? `Đang chờ ${result.sessions_observed || 0}/${result.horizon_days || recommendation.horizon_days} phiên` : result.outcome === 'positive' ? `Đúng chiều · +${Number(result.forward_return_pct).toFixed(2)}%` : result.outcome === 'negative' ? `Ngược chiều · ${Number(result.forward_return_pct).toFixed(2)}%` : `Đi ngang · ${Number(result.forward_return_pct || 0).toFixed(2)}%`}</span><small>So giá tham chiếu {money(recommendation.expected_entry_price)} sau {result.horizon_days || recommendation.horizon_days} phiên</small></td></tr>
    })}</tbody></table></div><p className="recommendation-tracking-note">“Biến động từ giá vào” so giá hiện tại với giá trên giao dịch đã ghi nhận; đây không phải lãi/lỗ đã thực hiện. “Kết quả dự báo” so giá EOD ở phiên thứ {entries[0]?.evaluation?.horizon_days || entries[0]?.recommendation?.horizon_days || 20} với giá tham chiếu lúc đề xuất. Trạng thái chờ tự cập nhật khi có đủ phiên.</p></> : <p className="recommendation-tracking-empty">Mã thêm từ trang Đề xuất sẽ xuất hiện ở đây sau khi bạn lưu giao dịch. Những giao dịch cũ không có liên kết nguồn sẽ không được gán ngược thành giao dịch từ đề xuất.</p>}
  </section>
}
