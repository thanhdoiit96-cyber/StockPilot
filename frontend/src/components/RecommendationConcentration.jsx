export default function RecommendationConcentration({ risk, language = 'vi' }) {
  if (risk?.basis !== 'selected_symbol_count') return null
  const text = (vi, en) => language === 'en' ? en : vi
  return <section className="recommendation-concentration" aria-label={text('Phân bố ngành của đợt đề xuất', 'Sector distribution of the recommendation run')}>
    <div><strong>{text('Phân bố ngành · đợt đề xuất theo lịch', 'Sector distribution · scheduled run')}</strong><span className="chip neutral">{risk.classified_count}/{risk.selected_count} {text('mã có ngành trong snapshot', 'symbols with frozen taxonomy')}</span></div>
    {risk.status === 'complete' ? <p>{text('Ngành chiếm nhiều mã nhất', 'Largest sector by selected symbols')}: <strong>{risk.max_sector}</strong> · {risk.max_sector_share_pct}%. {risk.concentration_warning ? text('Đã chạm ngưỡng cảnh báo 60% số mã cùng ngành.', 'The 60% same-sector symbol threshold is reached.') : text('Dưới ngưỡng cảnh báo 60%.', 'Below the 60% warning threshold.')}</p> : <p>{risk.status === 'snapshot_unverified' ? text('Snapshot chưa được xác minh; chưa thể kết luận mức tập trung ngành.', 'The snapshot is unverified; sector concentration is unavailable.') : text('Thiếu ngành được lưu cùng snapshot; chưa thể kết luận mức tập trung ngành.', 'Frozen sector data is incomplete; sector concentration is unavailable.')}</p>}
    <small>{text('Tỷ lệ theo số mã được chọn, không thể hiện tỷ trọng vốn trong danh mục cá nhân.', 'Shares count selected symbols and do not represent monetary weights in your portfolio.')}</small>
  </section>
}
