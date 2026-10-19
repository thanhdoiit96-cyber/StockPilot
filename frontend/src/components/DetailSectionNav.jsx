import { useEffect, useState } from 'react'

const SECTIONS = [
  { id: 'detail-overview', label: 'Tổng quan' },
  { id: 'detail-chart', label: 'Lịch sử giá' },
  { id: 'detail-company', label: 'Doanh nghiệp' },
  { id: 'detail-analysis', label: 'Phân tích' }
]

export default function DetailSectionNav({ translate = value => value }) {
  const [active, setActive] = useState(SECTIONS[0].id)

  useEffect(() => {
    const sections = SECTIONS.map(section => document.getElementById(section.id)).filter(Boolean)
    if (!sections.length) return undefined

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0]

      if (visible?.target?.id) {
        setActive(visible.target.id)
      }
    }, {
      root: null,
      threshold: [0.2, 0.45, 0.7],
      rootMargin: '-10% 0px -30% 0px'
    })

    sections.forEach(section => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  const open = id => {
    const target = document.getElementById(id)
    if (!target) return
    setActive(id)
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    target.focus({ preventScroll: true })
  }

  return <nav className="detail-section-nav" aria-label={translate('Điều hướng nội dung Chi tiết mã')}>
    {SECTIONS.map(section => <button key={section.id} type="button" className={active === section.id ? 'active' : ''} aria-current={active === section.id ? 'location' : undefined} aria-label={translate(section.label)} onClick={() => open(section.id)}>{translate(section.label)}</button>)}
  </nav>
}
