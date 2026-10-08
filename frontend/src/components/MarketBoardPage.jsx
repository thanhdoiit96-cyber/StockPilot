import { useEffect, useMemo, useState } from 'react'
import PageLoadingOverlay from './PageLoadingOverlay.jsx'
import QuickWatchlistButton from './QuickWatchlistButton.jsx'
import useLiveQuotes from '../hooks/useLiveQuotes.js'
import { requestJson, stockList } from '../services/api.mjs'
import { SECTOR_OPTIONS } from '../constants/sectorOptions.mjs'
import { translate } from '../services/i18n.mjs'
import { localizeApiError } from '../services/apiErrorCatalog.mjs'
import {
  MARKET_COLUMN_DEFINITIONS,
  MARKET_COLUMN_PRESETS,
  MARKET_COLUMNS_KEY,
  marketColumnPresetKey,
  normalizeMarketColumns,
  serializeMarketBoardCsv
} from '../runtime/market-board-tools-core.mjs'
import { INDEX_SERIES_FIXTURES, indexSeriesFixtureLabel } from '../services/indexSeriesFixture.mjs'

const PAGE_SIZES = [25, 40, 50, 100]
const SESSION_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00']

const formatPrice = (value, language) => Number.isFinite(Number(value))
  ? new Intl.NumberFormat(language === 'en' ? 'en-US' : 'vi-VN', { maximumFractionDigits: 0 }).format(Number(value))
  : '—'
const formatVolume = (value, language) => Number.isFinite(Number(value))
  ? new Intl.NumberFormat(language === 'en' ? 'en-US' : 'vi-VN', { notation: Number(value) >= 1_000_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(Number(value))
  : '—'
const formatChange = value => Number.isFinite(Number(value)) ? `${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(2)}%` : '—'
const validHttpUrl = value => {
  try { return ['http:', 'https:'].includes(new URL(value).protocol) } catch { return false }
}
const getSymbol = stock => String(stock.symbol || stock.code || stock.stock_code || '').toUpperCase()
const quoteFor = (quotes, symbol) => quotes[symbol] || quotes[symbol.toUpperCase()] || null
const observedLabel = (quote, language, t) => quote?.observed_at
  ? new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(quote.observed_at))
  : t('market.latestEod')
const todayLabel = language => new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())

function loadColumns() {
  try { return normalizeMarketColumns(JSON.parse(localStorage.getItem(MARKET_COLUMNS_KEY) || '{}')) } catch { return normalizeMarketColumns() }
}

function MarketTimeline({ rows, language, t }) {
  const quoted = rows.filter(row => row.quote)
  const averagePrice = quoted.length ? quoted.reduce((sum, row) => sum + Number(row.price || 0), 0) / quoted.length : null
  const totalVolume = quoted.reduce((sum, row) => sum + Number(row.volume || 0), 0)
  const currentHour = new Date().getHours()
  const currentSlot = currentHour >= 13 ? Math.min(5, currentHour - 9) : Math.max(0, currentHour - 9)
  return <section className="market-session-timeline" aria-label={t('market.timelineAria')}>
    <div className="market-session-timeline-header">
      <div>
        <div className="market-session-timeline-title"><span aria-hidden="true">⌁</span><strong>{t('market.timelineTitle')} · {todayLabel(language)}</strong></div>
        <small>{t('market.timelineSubtitle')}</small>
        <span className="market-session-updated">{quoted.length ? `${t('market.updated')} ${observedLabel(quoted[0].quote, language, t)}` : t('market.noSnapshot')}</span>
      </div>
      <div className="market-session-timeline-legend"><span><i className="price-dot" />{t('market.price')}</span><span><i className="volume-dot" />{t('market.volume')}</span></div>
    </div>
    <div className="market-session-timeline-grid">
      {SESSION_SLOTS.map((slot, index) => <article className={`market-session-slot ${index === currentSlot ? 'is-current' : ''}`} key={slot}>
        <strong>{slot}</strong>
        <div className="market-session-bars">
          <div><i className="price-bar" style={{ height: averagePrice ? `${28 + index * 7}%` : '3px' }} /><span>{t('market.priceShort')}</span></div>
          <div><i className="volume-bar" style={{ height: totalVolume ? `${20 + index * 9}%` : '3px' }} /><span>{t('market.volumeShort')}</span></div>
        </div>
        <small className={`market-session-value ${quoted.length ? '' : 'market-session-empty'}`}>{quoted.length ? `${quoted.length} ${t('market.symbols')}` : t('market.noData')}</small>
      </article>)}
    </div>
  </section>
}

export default function MarketBoardPage({ active, overviewStocks = [], overviewTotal = 0, overviewQuotes = {}, portfolioSymbols = [], watchlistSymbols = [], onOpenDetail, onAddToPortfolio, onAddToWatchlist, language = 'vi' }) {
  const t = (key, values) => translate(language, key, values)
  const [query, setQuery] = useState('')
  const [queryInput, setQueryInput] = useState('')
  const [sector, setSector] = useState('')
  const [sort, setSort] = useState({ key: 'volume', direction: 'desc' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(40)
  const [stocks, setStocks] = useState(overviewStocks)
  const [listAttempt, setListAttempt] = useState(0)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 40, total: overviewTotal || overviewStocks.length, totalPages: Math.max(1, Math.ceil((overviewTotal || overviewStocks.length) / 40)) })
  const [listState, setListState] = useState({ loading: !overviewStocks.length, error: '' })
  const [columns, setColumns] = useState(loadColumns)
  const [exportScope, setExportScope] = useState('page')
  const [exportError, setExportError] = useState('')
  const [exportNotice, setExportNotice] = useState('')
  const [exporting, setExporting] = useState(false)
  const [sharedQuotes, setSharedQuotes] = useState(() => window.__stockpilotRecentQuotes || {})
  const [fixtureSymbols, setFixtureSymbols] = useState(() => { try { const saved = JSON.parse(sessionStorage.getItem('stockpilot-index-fixtures') || '[]'); return Array.isArray(saved) && saved.length ? saved.slice(0, 4) : ['VNINDEX', 'VN30'] } catch { return ['VNINDEX', 'VN30'] } })
  const selectedFixtureSeries = fixtureSymbols.map(symbol => INDEX_SERIES_FIXTURES.find(series => series.symbol === symbol)).filter(Boolean)
  const moveFixture = (symbol, direction) => setFixtureSymbols(current => {
    const index = current.indexOf(symbol)
    const target = index + direction
    if (index < 0 || target < 0 || target >= current.length) return current
    const next = [...current]
    ;[next[index], next[target]] = [next[target], next[index]]
    return next
  })

  useEffect(() => { try { sessionStorage.setItem('stockpilot-index-fixtures', JSON.stringify(fixtureSymbols)) } catch {} }, [fixtureSymbols])

  useEffect(() => {
    const receive = () => setSharedQuotes(window.__stockpilotRecentQuotes || {})
    window.addEventListener('stockpilot:quotes-received', receive)
    receive()
    return () => window.removeEventListener('stockpilot:quotes-received', receive)
  }, [])

  const portfolioSet = useMemo(() => new Set(portfolioSymbols.map(value => String(value).toUpperCase())), [portfolioSymbols])
  const watchlistSet = useMemo(() => new Set(watchlistSymbols.map(value => String(value).toUpperCase())), [watchlistSymbols])
  const pinned = useMemo(() => [...new Set([...portfolioSet, ...watchlistSet])].sort(), [portfolioSet, watchlistSet])
  const pinnedKey = pinned.join(',')
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(queryInput), 250)
    return () => window.clearTimeout(timer)
  }, [queryInput])
  useEffect(() => { setPage(1) }, [pinnedKey, query, sector, pageSize])
  useEffect(() => {
    if (!active) {
      if (overviewStocks.length) {
        setStocks(overviewStocks)
        setPagination({ page: 1, pageSize: 40, total: overviewTotal || overviewStocks.length, totalPages: Math.max(1, Math.ceil((overviewTotal || overviewStocks.length) / 40)) })
        setListState({ loading: false, error: '' })
      }
      return
    }
    if (overviewStocks.length && page === 1 && !query && !sector) {
      setStocks(overviewStocks)
      setPagination({ page: 1, pageSize: 40, total: overviewTotal || overviewStocks.length, totalPages: Math.max(1, Math.ceil((overviewTotal || overviewStocks.length) / 40)) })
      setListState({ loading: false, error: '' })
    }
    const controller = new AbortController()
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sort: sort.key, direction: sort.direction })
    if (query.trim()) params.set('q', query.trim())
    if (sector) params.set('sector', sector)
    if (pinnedKey) params.set('pinned', pinnedKey)
    setListState(previous => ({ ...previous, loading: true, error: '' }))
    requestJson(`/api/stocks?${params}`, { signal: controller.signal })
      .then(payload => {
        const list = stockList(payload)
        setStocks(list)
        setPagination(list.pagination || { page, pageSize, total: list.length, totalPages: 1 })
        setListState({ loading: false, error: '' })
      })
      .catch(error => { if (!controller.signal.aborted) setListState({ loading: false, error: localizeApiError(error, language) }) })
    return () => controller.abort()
  }, [active, page, pageSize, query, sector, sort.key, sort.direction, pinnedKey, listAttempt, overviewStocks, overviewTotal])

  const symbols = useMemo(() => stocks.map(getSymbol).filter(Boolean), [stocks])
  const quoteState = useLiveQuotes(symbols, { enabled: active, requestParam: 'board_refresh' })
  const mergedQuotes = useMemo(() => ({ ...sharedQuotes, ...overviewQuotes, ...quoteState.data }), [sharedQuotes, overviewQuotes, quoteState.data])
  const rows = useMemo(() => stocks.map(stock => {
    const symbol = getSymbol(stock)
    const quote = quoteFor(mergedQuotes, symbol)
    return {
      stock, symbol, quote,
      price: quote?.price ?? stock.price,
      change: quote?.change ?? stock.change,
      volume: quote?.volume ?? stock.volume,
      pinned: pinned.includes(symbol),
      inPortfolio: portfolioSet.has(symbol),
      inWatchlist: watchlistSet.has(symbol)
    }
  }), [stocks, mergedQuotes, pinnedKey, portfolioSet, watchlistSet])

  useEffect(() => {
    try { localStorage.setItem(MARKET_COLUMNS_KEY, JSON.stringify(columns)) } catch {}
  }, [columns])

  useEffect(() => {
    const receiveColumnPreference = event => {
      if (event.key !== MARKET_COLUMNS_KEY) return
      if (event.newValue === null) {
        setColumns(normalizeMarketColumns())
        return
      }
      try {
        const saved = JSON.parse(event.newValue)
        if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return
        setColumns(normalizeMarketColumns(saved))
      } catch {}
    }
    window.addEventListener('storage', receiveColumnPreference)
    return () => window.removeEventListener('storage', receiveColumnPreference)
  }, [])

  const toggleSort = key => setSort(current => current.key === key
    ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
    : { key, direction: 'asc' })
  const downloadBlob = (blob, filename) => {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
  }
  const exportCsv = async () => {
    setExportError('')
    setExportNotice('')
    if (exportScope === 'all') {
      setExporting(true)
      try {
        const params = new URLSearchParams({ sort: sort.key, direction: sort.direction })
        if (query.trim()) params.set('q', query.trim())
        if (sector) params.set('sector', sector)
        if (pinnedKey) params.set('pinned', pinnedKey)
        params.set('columns', ['name', 'volume'].filter(key => columns[key] !== false).join(','))
        const response = await fetch(`/api/stocks/export.csv?${params}`, { signal: AbortSignal.timeout(30000), headers: { Accept: 'text/csv' } })
        if (!response.ok) throw new Error(t('market.exportFailed', { status: response.status }))
        const exportedCount = Number(response.headers.get('X-Export-Count'))
        const exportLimit = Number(response.headers.get('X-Export-Limit'))
        const truncated = response.headers.get('X-Export-Truncated') === 'true'
        const blob = await response.blob()
        const filename = response.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/i)?.[1] || `stockpilot-bang-gia-${new Date().toISOString().slice(0, 10)}.csv`
        downloadBlob(blob, filename)
        setExportNotice(truncated
          ? t('market.exportTruncated', { count: Number.isFinite(exportedCount) ? exportedCount : exportLimit, limit: exportLimit })
          : t('market.exportDone', { count: Number.isFinite(exportedCount) ? exportedCount : t('market.exportAllDone') }))
      } catch (error) {
        setExportError(error.name === 'TimeoutError' ? t('market.exportTimeout') : localizeApiError(error, language))
      } finally {
        setExporting(false)
      }
      return
    }
    const headers = ['market.symbol', 'market.name', 'market.price', 'market.change', 'market.volume', 'market.dataSource', 'market.analysis', 'market.actions'].map(key => t(key))
    const csvRows = rows.map(row => [row.symbol, row.stock.name || '', formatPrice(row.price, language), formatChange(row.change), formatVolume(row.volume, language), '', '', ''])
    const blob = new Blob([serializeMarketBoardCsv({ headers, rows: csvRows, columns })], { type: 'text/csv;charset=utf-8' })
    downloadBlob(blob, `stockpilot-bang-gia-${new Date().toISOString().slice(0, 10)}.csv`)
  }
  const columnClasses = MARKET_COLUMN_DEFINITIONS.filter(column => columns[column.key] === false).map(column => `market-board-hide-${column.key}`).join(' ')
  const activePreset = marketColumnPresetKey(columns)
  const changePageSize = event => setPageSize(Number(event.target.value))
  const quoteProviders = [...new Set(Object.values(mergedQuotes).map(quote => quote?.upstream || quote?.provider).filter(Boolean))]
  const hasFilters = Boolean(queryInput.trim() || sector)
  const clearFilters = () => { setQueryInput(''); setQuery(''); setSector(''); setPage(1) }
  const openRowWithKeyboard = (event, stock) => {
    if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    onOpenDetail?.(stock)
  }

  return <section className={`panel table-panel ${columnClasses}`} hidden={!active} aria-label={t('market.label')} data-react-market-board="true" lang={language}>
    <div className="panel-header">
      <h3>{t('market.list')}</h3>
      <div className="table-tools overview-filter-row">
        <div className="table-tabs">
          <button className="tab-btn active" type="button">{t('market.all')}</button>
          <select className="sector-select" aria-label={t('market.sector')} value={sector} onChange={event => setSector(event.target.value)}>
            {SECTOR_OPTIONS.map(([value, label]) => <option value={value} key={value}>{t(`market.sector.${value || 'all'}`)}</option>)}
          </select>
        </div>
        <input className="table-search app-search-input" type="search" aria-label={t('market.search')} placeholder={t('market.searchPlaceholder')} value={queryInput} onChange={event => setQueryInput(event.target.value)} />
        <span className="muted-text overview-original-result-count">{pagination.total || rows.length} {t('market.symbols')}</span>
        {hasFilters && <button type="button" className="ghost-btn small-btn" onClick={clearFilters}>{t('market.clearFilters')}</button>}
        <label className="page-size-control"><span>{t('market.pageSize')}</span><select value={pageSize} onChange={changePageSize}>{PAGE_SIZES.map(size => <option value={size} key={size}>{size}</option>)}</select></label>
      </div>
    </div>
    {(import.meta.env.DEV || import.meta.env.VITE_SHOW_INDEX_FIXTURE === 'true') && <section className="market-index-fixture-section" aria-label="Chỉ số mô phỏng"><div className="market-index-fixture-selector" role="group" aria-label="Chọn chỉ số mô phỏng">{INDEX_SERIES_FIXTURES.map(series => <label key={series.symbol}><input type="checkbox" checked={fixtureSymbols.includes(series.symbol)} onChange={event => setFixtureSymbols(current => event.target.checked ? [...current, series.symbol].slice(0, 4) : current.filter(symbol => symbol !== series.symbol))} />{series.symbol}</label>)}</div><div className="market-index-fixture-grid">{selectedFixtureSeries.map((series, index) => { const latest = series.points.at(-1); const previous = series.points.at(-2); const change = latest.close - previous.close; const pct = change / previous.close * 100; return <div className="market-index-fixture" key={series.symbol} title={`${indexSeriesFixtureLabel(series)} · ${series.session_timezone}`} aria-label={`${series.symbol}: ${latest.close}, ${latest.session_date}`}><span className="market-index-fixture-dot" aria-hidden="true" /><strong>{series.symbol}</strong><span>{latest.close.toLocaleString('en-US')}</span><span className={change >= 0 ? 'positive' : 'negative'}>{change >= 0 ? '+' : ''}{change.toFixed(0)} ({pct >= 0 ? '+' : ''}{pct.toFixed(2)}%)</span><span className="market-index-fixture-order"><button type="button" aria-label={`Đưa ${series.symbol} sang trái`} disabled={index === 0} onClick={() => moveFixture(series.symbol, -1)}>←</button><button type="button" aria-label={`Đưa ${series.symbol} sang phải`} disabled={index === selectedFixtureSeries.length - 1} onClick={() => moveFixture(series.symbol, 1)}>→</button></span><small>{indexSeriesFixtureLabel(series)} · {latest.session_date}</small></div> })}</div></section>}
    <div className="market-board-toolbar">
      <div className="market-board-presets" role="group" aria-label={t('market.columnPresets')}>
        <span>{t('market.display')}</span>
        {MARKET_COLUMN_PRESETS.map(preset => <button key={preset.key} type="button" className={`market-board-preset${activePreset === preset.key ? ' is-active' : ''}`} aria-pressed={activePreset === preset.key} onClick={() => setColumns(normalizeMarketColumns(preset.columns))}>{t(`market.preset.${preset.key}`)}</button>)}
        {activePreset === 'custom' && <span className="market-board-custom-state" role="status">{t('market.custom')}</span>}
      </div>
      <details className="market-board-column-picker">
        <summary>{t('market.customColumns')}</summary>
        <div className="market-board-column-menu">
          {MARKET_COLUMN_DEFINITIONS.map(column => <label key={column.key}><input type="checkbox" checked={columns[column.key]} onChange={event => setColumns(current => ({ ...current, [column.key]: event.target.checked }))} />{t(`market.column.${column.key}`)}</label>)}
          <button type="button" className="ghost-btn small-btn" onClick={() => setColumns(normalizeMarketColumns())}>{t('market.restore')}</button>
        </div>
      </details>
      <label className="market-board-export-scope"><span>{t('market.exportScope')}</span><select className="app-select" aria-label={t('market.exportScopeAria')} value={exportScope} onChange={event => setExportScope(event.target.value)}><option value="page">{t('market.currentPage')}</option><option value="all">{t('market.allResults')}</option></select></label>
      <button type="button" className="ghost-btn small-btn market-board-export" disabled={exporting} onClick={exportCsv}>{exporting ? t('market.exporting') : exportScope === 'all' ? t('market.exportAll') : t('market.exportCount', { count: rows.length })}</button>
    </div>
    {exportError && <p className="error-text market-board-export-error" role="alert">{exportError}</p>}
    {exportNotice && <p className="market-board-export-notice" role="status">{exportNotice}</p>}
    <p className="overview-data-status" role="status">{listState.loading && stocks.length ? t('market.updatingList') : quoteState.error || (quoteState.loading ? t('market.updatingIntraday') : Object.keys(mergedQuotes).length ? t('market.hasIntraday') : t('market.usingEod'))}</p>
    <p className="overview-source-summary"><span className="overview-source-label">{t('market.dataSource')}</span><span className={`overview-source-provider${quoteProviders.length ? '' : ' is-fallback'}`}>{quoteProviders.length ? quoteProviders.join(', ') : t('market.latestEod')}</span><span className="overview-source-description">{t('market.sourceDescription')}</span><button className="overview-source-help" type="button" aria-label={t('market.sourceHelpAria')} title={t('market.sourceHelp')}>?</button></p>
    <MarketTimeline rows={rows} language={language} t={t} />
    {listState.error && <p className="error-text" role="alert">{listState.error} <button type="button" className="ghost-btn small-btn" onClick={() => setListAttempt(value => value + 1)}>{t('market.retryList')}</button></p>}
    <p id="market-board-scroll-hint" className="table-scroll-hint" role="note">{t('market.scrollHint')}</p>
    <div className="table-wrap" aria-busy={listState.loading}>
      <table aria-describedby="market-board-scroll-hint">
        <caption className="sr-only">{t('market.caption')}</caption>
        <thead><tr>
          <th aria-sort={sort.key === 'symbol' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}><button className="table-sort-btn" type="button" title={t('market.sortSymbol')} onClick={() => toggleSort('symbol')}>{t('market.symbol')} {sort.key === 'symbol' ? (sort.direction === 'asc' ? '↑' : '↓') : ''}</button></th>
          <th>{t('market.name')}</th><th>{t('market.price')}</th><th>{t('market.change')}</th>
          <th aria-sort={sort.key === 'volume' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}><button className="table-sort-btn" type="button" title={t('market.sortVolume')} onClick={() => toggleSort('volume')}>{t('market.volume')} {sort.key === 'volume' ? (sort.direction === 'asc' ? '↑' : '↓') : ''}</button></th>
          <th>{t('market.dataSource')}</th><th>{t('market.analysis')}</th><th>{t('market.actions')}</th>
        </tr></thead>
        <tbody>{rows.length ? rows.map(row => <tr className={row.pinned ? 'pinned-stock' : ''} key={row.stock.id} tabIndex="0" onClick={() => onOpenDetail?.(row.stock)} onKeyDown={event => openRowWithKeyboard(event, row.stock)}>
          <td className="market-symbol-cell"><button className="symbol" type="button" onClick={event => { event.stopPropagation(); onOpenDetail?.(row.stock) }}>{row.symbol}</button>{row.pinned && <span className="pin-labels" aria-label={`${t('market.personalLabels')} ${row.symbol}`}>{row.inPortfolio && <small className="pin-badge portfolio">{t('market.portfolio')}</small>}{row.inWatchlist && <small className="pin-badge watchlist">Watchlist</small>}</span>}</td>
          <td>{validHttpUrl(row.stock.website_url)
            ? <a href={row.stock.website_url} target="_blank" rel="noreferrer" title={row.stock.website_url} onClick={event => event.stopPropagation()}>{row.stock.name || row.symbol}</a>
            : row.stock.name || row.symbol}</td>
          <td>{formatPrice(row.price, language)}</td>
          <td className={Number(row.change) > 0 ? 'positive' : Number(row.change) < 0 ? 'negative' : ''}>{formatChange(row.change)}</td>
          <td><span className="volume-context" title={`${t('market.tradingVolume')} ${row.quote ? 'Intraday' : 'EOD'}`} tabIndex="0">{formatVolume(row.volume, language)}</span></td>
          <td className="data-time"><span>{observedLabel(row.quote, language, t)}</span></td>
          <td className="overview-assessment overview-analysis-action"><button type="button" className="ghost-btn small-btn" aria-label={t('market.openAnalysis')} onClick={event => { event.stopPropagation(); onOpenDetail?.(row.stock, { analyze: true }) }}>{t('market.deepAnalysis')}</button></td>
          <td><div className="stock-row-actions"><button type="button" className="ghost-btn small-btn add-portfolio-btn" aria-label={t('market.addPortfolio', { symbol: row.symbol })} onClick={event => { event.stopPropagation(); onAddToPortfolio?.({ ...row.stock, price: row.price }) }}>{t('market.add')}</button><QuickWatchlistButton language={language} symbol={row.symbol} watched={row.inWatchlist} onAdd={onAddToWatchlist} /></div></td>
        </tr>) : listState.error ? null : <tr><td colSpan="8"><div className="empty-state market-board-empty-state" role="status"><strong>{t(listState.loading ? 'market.loading' : hasFilters ? 'market.noMatch' : 'market.empty')}</strong>{hasFilters && !listState.loading && <><span>{t('market.filterHint')}</span><button type="button" className="ghost-btn small-btn" onClick={clearFilters}>{t('market.clearFilters')}</button></>}</div></td></tr>}</tbody>
      </table>
    </div>
    <div className="table-pagination">
      <span className="overview-pagination-count">{t('market.showing', { shown: rows.length, total: pagination.total || rows.length })}</span>
      <label className="page-size-control overview-page-size-control"><span>{t('market.perPage')}</span><select className="app-select" value={pageSize} onChange={changePageSize}>{PAGE_SIZES.map(size => <option value={size} key={size}>{size}</option>)}</select></label>
      <div className="pagination-actions" role="navigation" aria-label={t('market.pagination')}><button type="button" className="ghost-btn small-btn" aria-label={t('market.previousAria')} disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>{t('market.previous')}</button><span aria-live="polite">{t('market.page', { page: pagination.page || page, total: pagination.totalPages || 1 })}</span><button type="button" className="ghost-btn small-btn" aria-label={t('market.nextAria')} disabled={page >= (pagination.totalPages || 1)} onClick={() => setPage(value => value + 1)}>{t('market.next')}</button></div>
    </div>
    <PageLoadingOverlay active={active && (listState.loading || quoteState.loading)} id="market-board-loading-overlay" className="market-board-loading-overlay" label={t('market.overlay')} />
  </section>
}
