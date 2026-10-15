import { useId, useState } from 'react'
import { formatNumber } from '../services/userLocale.mjs'
import { translate } from '../services/i18n.mjs'

const COLORS = ['#5eead4', '#60a5fa', '#fbbf24', '#f472b6', '#a78bfa', '#34d399']

function annularPath(startPercent, endPercent) {
  const point = (radius, degrees) => {
    const radians = degrees * Math.PI / 180
    return { x: 50 + radius * Math.cos(radians), y: 50 + radius * Math.sin(radians) }
  }
  const startDegrees = startPercent * 3.6 - 90
  const span = Math.min((endPercent - startPercent) * 3.6, 359.999)
  const endDegrees = startDegrees + span
  const outerStart = point(49, startDegrees)
  const outerEnd = point(49, endDegrees)
  const innerEnd = point(35, endDegrees)
  const innerStart = point(35, startDegrees)
  const largeArc = span > 180 ? 1 : 0
  return `M ${outerStart.x} ${outerStart.y} A 49 49 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A 35 35 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y} Z`
}

export default function PortfolioAllocation({ allocations = [], positions = [], quoteCount = 0, positionCount = 0, quoteError = false, providerStatus, language = 'vi' }) {
  const t = key => translate(language, key)
  const money = value => `${formatNumber(value, language, { maximumFractionDigits: 0 })} ₫`
  const [tooltip, setTooltip] = useState(null)
  const tooltipId = useId().replaceAll(':', '')
  const total = allocations.reduce((sum, item) => sum + Number(item.market_value || 0), 0)
  const previousTotal = positions.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.previous_market_price || 0), 0)
  const change = previousTotal > 0 ? total - previousTotal : null
  const percent = change == null ? null : change / previousTotal * 100
  const getStockPriceRag = value => {
    if (!Number.isFinite(value)) return 'red'
    if (value > 6.7) return 'purple'
    if (value > 0) return 'green'
    if (value === 0) return 'yellow'
    if (value > -6.7) return 'red'
    return 'deep-red'
  }
  const rag = getStockPriceRag(percent ?? 0)
  const signedMoney = change == null ? '' : `${change >= 0 ? '+' : '-'}${money(Math.abs(change))}`
  const signedPercent = percent == null ? '' : `${percent >= 0 ? '+' : '-'}${formatNumber(Math.abs(percent), language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
  let cursor = 0
  const slices = allocations.map((item, index) => {
    const start = cursor
    cursor += Number(item.weight || 0)
    return { ...item, index, start, end: cursor }
  })
  const coverage = `${quoteCount}/${positionCount} ${t('portfolio.allocation.coverage')}`

  return <article className="panel allocation-panel" lang={language}>
    <div className="allocation-panel-heading"><div><h3>{t('portfolio.allocation.title')}</h3><p className="muted-text">{t('portfolio.allocation.subtitle')}</p></div><span className="chip neutral">{allocations.length} {t('portfolio.common.symbols')}</span></div>
    {allocations.length ? <div className="allocation-visual">
      <div className="allocation-donut" aria-label={t('portfolio.allocation.chart')} style={{ background: `conic-gradient(${slices.map(slice => `${COLORS[slice.index % COLORS.length]} ${slice.start.toFixed(2)}% ${slice.end.toFixed(2)}%`).join(', ')})` }}>
        <div><small className="allocation-total-label">{t('portfolio.allocation.total')}</small><strong className="allocation-total-value">{money(total)}</strong><small className="allocation-day-change" data-rag={rag} data-data-quality={quoteCount < positionCount ? 'partial' : 'complete'}>{t('portfolio.allocation.dayChange')} <span data-rag={rag} className={rag === 'purple' || rag === 'green' ? 'positive' : rag === 'deep-red' || rag === 'red' ? 'negative' : 'neutral'}>{change == null ? t('portfolio.common.noData') : `${signedMoney} ${signedPercent}`}</span></small></div>
        <svg className="allocation-donut-interaction-svg" viewBox="0 0 100 100" aria-label={t('portfolio.allocation.slices')}>
          {slices.map(slice => {
            const label = `${slice.symbol}: ${Number(slice.weight).toFixed(1)}%, ${money(slice.market_value)}`
            return <path key={slice.stock_id || slice.symbol} d={annularPath(slice.start, slice.end)} tabIndex="0" role="img" data-symbol={slice.symbol} aria-label={label} aria-describedby={tooltipId} onPointerEnter={() => setTooltip(slice)} onPointerLeave={() => setTooltip(null)} onFocus={() => setTooltip(slice)} onBlur={() => setTooltip(null)}><title>{label}</title></path>
          })}
        </svg>
        <output id={tooltipId} className="allocation-donut-tooltip" role="tooltip" hidden={!tooltip}><strong>{tooltip?.symbol}</strong><span>{tooltip ? `${Number(tooltip.weight).toFixed(1)}%` : ''}</span><small>{tooltip ? money(tooltip.market_value) : ''}</small></output>
      </div>
      <ol className="allocation-list">{slices.map(slice => <li title={`${slice.symbol}: ${Number(slice.weight).toFixed(1)}% · ${money(slice.market_value)}`} key={slice.stock_id || slice.symbol}><div className="allocation-item-heading"><i style={{ backgroundColor: COLORS[slice.index % COLORS.length] }} /><div><strong>{slice.symbol}</strong><small>{money(slice.market_value)}</small></div><b>{Number(slice.weight).toFixed(1)}%</b></div><div className="allocation-track"><span style={{ width: `${slice.weight}%`, backgroundColor: COLORS[slice.index % COLORS.length] }} /></div></li>)}</ol>
    </div> : <p className="muted-text">{t('portfolio.allocation.empty')}</p>}
    <p className="allocation-footnote">{coverage} · {t(quoteError || quoteCount < positionCount ? 'portfolio.allocation.partial' : 'portfolio.allocation.fresh')}{providerStatus === 'circuit_open' ? ` ${t('portfolio.allocation.circuit')}` : providerStatus === 'degraded' ? ` ${t('portfolio.allocation.degraded')}` : ''}</p>
    <aside className="portfolio-data-audit" aria-label={t('portfolio.allocation.audit')}><strong>{t('portfolio.allocation.audit')}</strong><p>{coverage}</p><p>{t('portfolio.allocation.formula')}</p><div className="portfolio-data-audit-legend" aria-label={t('portfolio.allocation.legend')}><span><i className="rag-green" />{t('portfolio.allocation.up')}</span><span><i className="rag-red" />{t('portfolio.allocation.down')}</span><span><i className="rag-amber" />{t('portfolio.common.noData')}</span></div></aside>
  </article>
}
