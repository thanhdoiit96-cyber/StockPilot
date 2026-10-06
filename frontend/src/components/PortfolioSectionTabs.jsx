import { useRef } from 'react'

const tabs = [
  { id: 'overview', label: 'Tổng quan', description: 'Vị thế và hiệu suất' },
  { id: 'transactions', label: 'Giao dịch', description: 'Ghi nhận và nhật ký' },
  { id: 'cash', label: 'Dòng tiền', description: 'Nạp và rút tiền' },
  { id: 'watchlist', label: 'Watchlist', description: 'Mã đang quan tâm' }
]

export default function PortfolioSectionTabs({ active, onChange, counts = {} }) {
  const refs = useRef([])
  const selectRelative = (index, offset) => {
    const next = (index + offset + tabs.length) % tabs.length
    onChange(tabs[next].id)
    refs.current[next]?.focus()
  }
  return <nav className="portfolio-section-tabs" aria-label="Khu vực danh mục cá nhân">
    <div role="tablist" aria-label="Nội dung danh mục">
      {tabs.map((tab, index) => <button key={tab.id} ref={node => { refs.current[index] = node }} id={`portfolio-tab-${tab.id}`} type="button" role="tab" aria-selected={active === tab.id} aria-controls={`portfolio-panel-${tab.id}`} tabIndex={active === tab.id ? 0 : -1} className={active === tab.id ? 'active' : ''} onClick={() => onChange(tab.id)} onKeyDown={event => {
        if (event.key === 'ArrowRight') { event.preventDefault(); selectRelative(index, 1) }
        if (event.key === 'ArrowLeft') { event.preventDefault(); selectRelative(index, -1) }
        if (event.key === 'Home') { event.preventDefault(); onChange(tabs[0].id); refs.current[0]?.focus() }
        if (event.key === 'End') { event.preventDefault(); onChange(tabs.at(-1).id); refs.current.at(-1)?.focus() }
      }}><span><strong>{tab.label}</strong>{Number.isFinite(Number(counts[tab.id])) ? <small>{counts[tab.id]}</small> : null}</span><em>{tab.description}</em></button>)}
    </div>
  </nav>
}
