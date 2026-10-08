import { useState } from 'react'
import { filterPositions } from '../services/positionSearch.mjs'
import QuickWatchlistButton from './QuickWatchlistButton.jsx'
import StockDetailLink from './StockDetailLink.jsx'
import { formatDateTime, formatMoney, formatNumber } from '../services/userLocale.mjs'
import { translate } from '../services/i18n.mjs'
import { sortPositions } from '../services/positionView.mjs'

const openDetail = (event, position, callback) => {
  if (event && event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return
  event?.preventDefault()
  callback?.(position.stock_id)
}

function PositionRow({ position, onOpenDetail, watched, onAddToWatchlist, language, timezone }) {
  const t = key => translate(language, key)
  const number = value => formatNumber(value, language, { maximumFractionDigits: 4 })
  const money = value => value == null ? '-' : formatMoney(value, language, { maximumFractionDigits: 2 })
  const dateTime = value => formatDateTime(value, language, timezone)
  return <tr className="portfolio-row-clickable" role="link" tabIndex="0" aria-label={`${t('portfolio.positions.openDetail')} ${position.symbol}`} onClick={event => openDetail(event, position, onOpenDetail)} onKeyDown={event => openDetail(event, position, onOpenDetail)}>
    <td><div className="portfolio-symbol-actions"><StockDetailLink className="symbol portfolio-detail-link" stockId={position.stock_id} symbol={position.symbol} onOpenDetail={onOpenDetail}>{position.symbol}</StockDetailLink><QuickWatchlistButton symbol={position.symbol} watched={watched} onAdd={onAddToWatchlist} /></div></td>
    <td>{number(position.quantity)}</td><td>{money(position.avg_cost)}</td>
    <td>{money(position.market_price)}<small className="data-time">{position.quote ? `${t('portfolio.positions.intraday')} · ${dateTime(position.quote.observed_at)}` : t('portfolio.positions.eod')}</small></td>
    <td className={Number(position.unrealized_pnl) >= 0 ? 'positive' : 'negative'}>{money(position.unrealized_pnl)}</td>
    <td className={Number(position.realized_pnl) >= 0 ? 'positive' : 'negative'}>{money(position.realized_pnl)}</td>
  </tr>
}

function ClosedPositionRow({ position, onOpenDetail, watched, onAddToWatchlist, language, timezone }) {
  const t = key => translate(language, key)
  const money = value => value == null ? '-' : formatMoney(value, language, { maximumFractionDigits: 2 })
  const dateTime = value => formatDateTime(value, language, timezone)
  return <tr className="portfolio-row-clickable" role="link" tabIndex="0" aria-label={`${t('portfolio.positions.openDetail')} ${position.symbol}`} onClick={event => openDetail(event, position, onOpenDetail)} onKeyDown={event => openDetail(event, position, onOpenDetail)}>
    <td><div className="portfolio-symbol-actions"><StockDetailLink className="symbol portfolio-detail-link" stockId={position.stock_id} symbol={position.symbol} onOpenDetail={onOpenDetail}>{position.symbol}</StockDetailLink><QuickWatchlistButton symbol={position.symbol} watched={watched} onAdd={onAddToWatchlist} /></div>{position.name ? <small>{position.name}</small> : null}</td>
    <td><span className="chip neutral">{t('portfolio.positions.closed')}</span></td><td>{dateTime(position.closed_at)}</td>
    <td className={Number(position.realized_pnl) >= 0 ? 'positive' : 'negative'}>{money(position.realized_pnl)}</td>
  </tr>
}

export default function PortfolioPositions({ positions = [], closedPositions = [], loading = false, error = '', onOpenDetail, watchlistSymbols = [], onAddToWatchlist, language = 'vi', timezone = 'Asia/Ho_Chi_Minh' }) {
  const t = key => translate(language, key)
  const [filter, setFilter] = useState('open')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('symbol')
  const closed = filter === 'closed'
  const sourceRows = closed ? closedPositions : positions
  const rows = sortPositions(filterPositions(sourceRows, query), sort, language)
  const watched = new Set(watchlistSymbols.map(symbol => String(symbol).toUpperCase()))
  return <section className="portfolio-positions" aria-labelledby="portfolio-positions-title" aria-busy={loading} lang={language}>
    <div className="portfolio-positions-heading">
      <div><h3 id="portfolio-positions-title">{t('portfolio.positions.title')}</h3><p className="muted-text">{t('portfolio.positions.subtitle')}</p></div>
      <div className="portfolio-position-filters" role="group" aria-label={t('portfolio.positions.filterAria')}>
        <button type="button" className={filter === 'open' ? 'active' : ''} aria-pressed={filter === 'open'} onClick={() => setFilter('open')}>{t('portfolio.positions.open')} <span>{positions.length}</span></button>
        <button type="button" className={closed ? 'active' : ''} aria-pressed={closed} onClick={() => setFilter('closed')}>{t('portfolio.positions.closed')} <span>{closedPositions.length}</span></button>
      </div>
    </div>
    <div className="position-search-toolbar">
      <label className="search-field-label" htmlFor="position-search">{t('portfolio.positions.search')}
        <input className="app-search-input" id="position-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t('portfolio.positions.placeholder')} />
      </label>
      {query && <button type="button" className="ghost-btn small-btn search-clear-btn" onClick={() => { setQuery(''); document.getElementById('position-search')?.focus() }}>{t('portfolio.positions.clear')}</button>}
      <label className="position-sort-control">{t('portfolio.positions.sort')}<select value={sort} onChange={event => setSort(event.target.value)}><option value="symbol">{t('portfolio.positions.sortSymbol')}</option><option value="value">{t('portfolio.positions.sortValue')}</option><option value="pnl">{t('portfolio.positions.sortPnl')}</option></select></label>
      {!loading && !error && <span className="search-result-count" role="status">{rows.length}/{sourceRows.length} {t('portfolio.positions.position')} {t(closed ? 'portfolio.positions.closed' : 'portfolio.positions.open').toLowerCase()}</span>}
    </div>
    {loading && <div className="portfolio-positions-state loading" role="status"><span className="state-spinner" aria-hidden="true" />{t('portfolio.positions.loading')}</div>}
    {!loading && error && <div className="portfolio-positions-state error" role="alert"><strong>{t('portfolio.positions.errorTitle')}</strong><span>{error}</span></div>}
    {!loading && !error && query.trim() && !rows.length ? <p role="status">{t('portfolio.positions.noMatch')}</p> : null}
    {!loading && !error && <div className="table-wrap portfolio-table">
      <table aria-label={t(closed ? 'portfolio.positions.closedTable' : 'portfolio.positions.openTable')}>
        {closed ? <><thead><tr><th>{t('portfolio.positions.symbol')}</th><th>{t('portfolio.positions.status')}</th><th>{t('portfolio.positions.lastClosed')}</th><th>{t('portfolio.positions.realized')}</th></tr></thead><tbody>{rows.map(position => <ClosedPositionRow key={position.stock_id} position={position} onOpenDetail={onOpenDetail} watched={watched.has(String(position.symbol).toUpperCase())} onAddToWatchlist={onAddToWatchlist} language={language} timezone={timezone} />)}{!loading && !error && !query.trim() && !rows.length ? <tr><td colSpan="4">{t('portfolio.positions.noClosed')}</td></tr> : null}</tbody></> : <><thead><tr><th>{t('portfolio.positions.symbol')}</th><th>{t('portfolio.transaction.quantity')}</th><th>{t('portfolio.positions.avgCost')}</th><th>{t('portfolio.positions.currentPrice')}</th><th>{t('portfolio.positions.unrealized')}</th><th>{t('portfolio.positions.realized')}</th></tr></thead><tbody>{rows.map(position => <PositionRow key={position.stock_id} position={position} onOpenDetail={onOpenDetail} watched={watched.has(String(position.symbol).toUpperCase())} onAddToWatchlist={onAddToWatchlist} language={language} timezone={timezone} />)}{!loading && !error && !query.trim() && !rows.length ? <tr><td colSpan="6">{t('portfolio.positions.noOpen')}</td></tr> : null}</tbody></>}
      </table>
    </div>}
  </section>
}
