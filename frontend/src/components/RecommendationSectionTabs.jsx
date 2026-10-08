import { useRef } from 'react'

const tabs = [
  ['ideas', 'Đề xuất', 'Ideas', 'Tiêu chí và kết quả', 'Criteria and results'],
  ['history', 'Lịch sử & báo cáo', 'History & reports', 'Kết quả từng đợt', 'Run outcomes'],
  ['saved', 'So sánh bản lưu', 'Compare saved', 'Đối chiếu tiêu chí', 'Compare criteria'],
  ['learning', 'Hiệu chỉnh', 'Calibration', 'Bằng chứng thống kê', 'Statistical evidence'],
]

export default function RecommendationSectionTabs({ active, onChange, language }) {
  const refs = useRef([])
  const en = language === 'en'
  return <nav className="portfolio-section-tabs recommendation-section-tabs" aria-label={en ? 'Recommendation sections' : 'Các mục Đề xuất'}>
    <div role="tablist" aria-label={en ? 'Recommendation content' : 'Nội dung Đề xuất'}>
      {tabs.map(([id, vi, english, desc, englishDesc], index) => <button key={id} ref={node => { refs.current[index] = node }}
        type="button" role="tab" id={`recommendation-tab-${id}`} aria-controls={`recommendation-panel-${id}`}
        aria-selected={active === id} tabIndex={active === id ? 0 : -1} className={active === id ? 'active' : ''}
        onClick={() => onChange(id)} onKeyDown={event => {
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : null
          if (next == null) return
          event.preventDefault(); onChange(tabs[next][0]); refs.current[next]?.focus()
        }}><span><strong>{en ? english : vi}</strong></span><em>{en ? englishDesc : desc}</em></button>)}
    </div>
  </nav>
}
