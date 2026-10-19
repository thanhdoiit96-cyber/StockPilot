import { useRef } from 'react'
import { translate } from '../services/i18n.mjs'

const tabs = [
  { id: 'overview', label: 'portfolio.tabs.overview', description: 'portfolio.tabs.overviewDesc' },
  { id: 'transactions', label: 'portfolio.tabs.transactions', description: 'portfolio.tabs.transactionsDesc' },
  { id: 'decisions', label: 'portfolio.tabs.decisions', description: 'portfolio.tabs.decisionsDesc' },
  { id: 'cash', label: 'portfolio.tabs.cash', description: 'portfolio.tabs.cashDesc' },
  { id: 'watchlist', label: 'portfolio.tabs.watchlist', description: 'portfolio.tabs.watchlistDesc' }
]

export default function PortfolioSectionTabs({ active, onChange, counts = {}, language = 'vi' }) {
  const t = key => translate(language, key)
  const refs = useRef([])
  const selectRelative = (index, offset) => {
    const next = (index + offset + tabs.length) % tabs.length
    onChange(tabs[next].id)
    refs.current[next]?.focus()
  }
  return <nav className="portfolio-section-tabs" aria-label={t('portfolio.tabs.region')} lang={language}>
    <div role="tablist" aria-label={t('portfolio.tabs.content')}>
      {tabs.map((tab, index) => <button key={tab.id} ref={node => { refs.current[index] = node }} id={`portfolio-tab-${tab.id}`} type="button" role="tab" aria-selected={active === tab.id} aria-controls={`portfolio-panel-${tab.id}`} tabIndex={active === tab.id ? 0 : -1} className={active === tab.id ? 'active' : ''} onClick={() => onChange(tab.id)} onKeyDown={event => {
        if (event.key === 'ArrowRight') { event.preventDefault(); selectRelative(index, 1) }
        if (event.key === 'ArrowLeft') { event.preventDefault(); selectRelative(index, -1) }
        if (event.key === 'Home') { event.preventDefault(); onChange(tabs[0].id); refs.current[0]?.focus() }
        if (event.key === 'End') { event.preventDefault(); onChange(tabs.at(-1).id); refs.current.at(-1)?.focus() }
      }}><span><strong>{t(tab.label)}</strong>{Number.isFinite(Number(counts[tab.id])) ? <small>{counts[tab.id]}</small> : null}</span><em>{t(tab.description)}</em></button>)}
    </div>
  </nav>
}
