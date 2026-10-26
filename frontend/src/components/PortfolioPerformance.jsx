import { formatMoney, formatNumber } from '../services/userLocale.mjs'
import { translate } from '../services/i18n.mjs'
const tone = value => value == null || Number(value) === 0 ? 'neutral' : Number(value) > 0 ? 'positive' : 'negative'

export default function PortfolioPerformance({ performance, positions, loading = false, language = 'vi' }) {
  const t = key => translate(language, key)
  const money = value => value == null ? t('portfolio.common.noData') : formatMoney(value, language)
  const percent = value => value == null ? t('portfolio.common.noData') : `${Number(value) >= 0 ? '+' : ''}${formatNumber(value, language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
  if (loading) return <section className="panel performance-panel" aria-busy="true" lang={language}><p className="muted-text">{t('portfolio.performance.loading')}</p></section>
  if (!performance || performance.status === 'empty') {
    const hasPositions = Array.isArray(positions) && positions.length > 0
    return <section className="panel performance-panel" aria-labelledby="performance-title" lang={language}><div className="performance-heading"><div><span className="eyebrow accent">{t('portfolio.performance.eyebrow')}</span><h3 id="performance-title">{hasPositions ? (language === 'en' ? 'Performance is not available yet' : 'Chưa có tổng hợp hiệu suất') : t('portfolio.performance.start')}</h3></div><span className="chip neutral">{t('portfolio.performance.emptyChip')}</span></div><p className="muted-text">{hasPositions ? (language === 'en' ? 'Your positions are shown below. Portfolio performance data is not available yet.' : 'Các vị thế đang nắm giữ được hiển thị bên dưới. Chưa có đủ dữ liệu tổng hợp hiệu suất danh mục.') : t('portfolio.performance.emptyText')}</p></section>
  }
  const livePositions = Array.isArray(positions) ? positions : null
  const pricedPositions = livePositions?.filter(item => item.market_value != null && Number.isFinite(Number(item.market_value)))
  const liveComplete = livePositions ? pricedPositions.length === livePositions.length : performance.status === 'complete'
  const liveUnrealized = liveComplete && livePositions ? livePositions.reduce((sum, item) => sum + Number(item.unrealized_pnl || 0), 0) : performance.unrealized_pnl
  const liveTotal = liveUnrealized == null ? null : Number(performance.realized_pnl || 0) + liveUnrealized
  const liveMarketValue = liveComplete && livePositions ? livePositions.reduce((sum, item) => sum + Number(item.market_value || 0), 0) : performance.market_value
  const liveReturn = liveTotal == null || Number(performance.total_cost_basis) <= 0 ? null : liveTotal / Number(performance.total_cost_basis) * 100
  const complete = liveComplete
  return <section className="panel performance-panel" aria-labelledby="performance-title" lang={language}>
    <div className="performance-heading"><div><span className="eyebrow accent">{t('portfolio.performance.eyebrow')}</span><h3 id="performance-title">{t('portfolio.performance.costBasis')}</h3><p className="muted-text">{t('portfolio.performance.snapshot')}</p></div><span className={`chip ${complete ? 'success' : 'warning'}`}>{t(complete ? 'portfolio.performance.complete' : 'portfolio.performance.partial')}</span></div>
    <div className="performance-hero"><div><small>{t('portfolio.performance.totalPnl')}</small><strong className={tone(liveTotal)}>{money(liveTotal)}</strong><span className={tone(liveReturn)}>{percent(liveReturn)} {t('portfolio.performance.onCost')}</span></div><div className="performance-value"><small>{t('portfolio.performance.currentValue')}</small><b>{money(liveMarketValue)}</b><span>{pricedPositions?.length ?? performance.coverage?.priced_positions ?? 0}/{livePositions?.length ?? performance.coverage?.open_positions ?? 0} {t('portfolio.performance.pricedPositions')}</span></div></div>
    <dl className="performance-breakdown"><div><dt>{t('portfolio.performance.realized')}</dt><dd className={tone(performance.realized_pnl)}>{money(performance.realized_pnl)}</dd></div><div><dt>{t('portfolio.performance.unrealized')}</dt><dd className={tone(liveUnrealized)}>{money(liveUnrealized)}</dd></div><div><dt>{t('portfolio.performance.totalCost')}</dt><dd>{money(performance.total_cost_basis)}</dd></div></dl>
    <p className="performance-note">{t('portfolio.performance.note')}</p>
  </section>
}
