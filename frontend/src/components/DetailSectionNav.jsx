import { useState } from 'react'

const SECTIONS = [
  { id: 'detail-overview', label: 'Tổng quan' },
  { id: 'detail-chart', label: 'Biểu đồ' },
  { id: 'detail-analysis', label: 'Phân tích' }
]

export default function DetailSectionNav() {
  const [active, setActive] = useState(SECTIONS[0].id)
  const open = id => {
    const target = document.getElementById(id)
    if (!target) return
    setActive(id)
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    target.focus({ preventScroll: true })
  }
  return <nav className="detail-section-nav" aria-label="Điều hướng nội dung Chi tiết mã">
    {SECTIONS.map(section => <button key={section.id} type="button" className={active === section.id ? 'active' : ''} aria-current={active === section.id ? 'location' : undefined} onClick={() => open(section.id)}>{section.label}</button>)}
  </nav>
}
