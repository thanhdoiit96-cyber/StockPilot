import { useEffect, useId, useState } from 'react'
import { requestJson } from '../services/api.mjs'
import { localizeApiError } from '../services/apiErrorCatalog.mjs'
import { formatDateOnly, formatMoney, formatNumber } from '../services/userLocale.mjs'
import { exitGuidanceLabel, exitGuidanceReason, exitGuidanceTone } from '../services/exitGuidanceView.mjs'

function safeMoney(value, language) {
  return Number.isFinite(Number(value)) ? formatMoney(value, language, { maximumFractionDigits: 2 }) : '—'
}

function GuidanceItem({ item, language }) {
  const status = item?.status || 'unavailable'
  const position = item?.position || {}
  const levels = item?.levels || {}
  const reference = item?.reference || {}
  const coverage = item?.coverage
  const symbol = item?.symbol || position.symbol || '—'
  const reasons = Array.isArray(item?.reasons) ? item.reasons : item?.reason ? [item.reason] : []
  return <li className={`exit-guidance-item is-${exitGuidanceTone(status)}`}>
    <div className="exit-guidance-item-heading">
      <div><strong className="symbol">{symbol}</strong>{item?.name ? <span className="muted-text">{item.name}</span> : null}</div>
      <span className={`chip exit-guidance-status ${exitGuidanceTone(status)}`}>{exitGuidanceLabel(status, language)}</span>
    </div>
    <p className="exit-guidance-reasons">{reasons.length ? reasons.map(reason => exitGuidanceReason(reason, language)).join(' ') : exitGuidanceReason(null, language)}</p>
    {status !== 'unavailable' && <div className="exit-guidance-levels">
      <span><small>{language === 'en' ? 'EOD close' : 'Đóng cửa EOD'}</small><strong>{safeMoney(reference.close, language)}</strong></span>
      <span><small>{language === 'en' ? 'Active stop' : 'Ngưỡng dừng áp dụng'}</small><strong>{safeMoney(levels.active_stop, language)}</strong></span>
      <span><small>{language === 'en' ? 'Profit-review level' : 'Ngưỡng rà soát chốt lời'}</small><strong>{safeMoney(levels.take_profit_review, language)}</strong></span>
    </div>}
    <details className="exit-guidance-details">
      <summary>{language === 'en' ? 'Snapshot details' : 'Chi tiết snapshot'}</summary>
      <dl>
        <div><dt>{language === 'en' ? 'Average cost' : 'Giá vốn bình quân'}</dt><dd>{safeMoney(position.average_cost, language)}</dd></div>
        <div><dt>{language === 'en' ? 'Quantity' : 'Số lượng'}</dt><dd>{Number.isFinite(Number(position.quantity)) ? formatNumber(position.quantity, language, { maximumFractionDigits: 4 }) : '—'}</dd></div>
        <div><dt>{language === 'en' ? 'EOD coverage' : 'Phủ EOD'}</dt><dd>{coverage ? `${coverage.observed}/${coverage.minimum}` : '—'}</dd></div>
        <div><dt>{language === 'en' ? 'As of' : 'Chốt đến'}</dt><dd>{item?.as_of ? formatDateOnly(item.as_of, language) : '—'}</dd></div>
      </dl>
    </details>
  </li>
}

export default function PortfolioExitGuidance({ token, active, language = 'vi' }) {
  const titleId = useId()
  const [retry, setRetry] = useState(0)
  const [state, setState] = useState({ status: 'idle', data: null, error: '' })
  const en = language === 'en'

  useEffect(() => {
    if (!active || !token) return undefined
    let mounted = true
    const controller = new AbortController()
    setState(previous => ({ status: 'loading', data: previous.data, error: '' }))
    requestJson('/api/portfolio/exit-guidance', { token, signal: controller.signal })
      .then(response => { if (mounted) setState({ status: 'success', data: response.data, error: '' }) })
      .catch(error => { if (mounted && !controller.signal.aborted && error.status !== 401) setState(previous => ({ status: 'error', data: previous.data, error: localizeApiError(error, language) })) })
    return () => { mounted = false; controller.abort() }
  }, [active, token, retry, language])

  const data = state.data
  const guidance = Array.isArray(data?.guidance) ? data.guidance : []
  const unavailable = data?.status === 'unavailable'
  return <section className="panel portfolio-exit-guidance" aria-labelledby={titleId} aria-busy={state.status === 'loading'} lang={language}>
    <div className="exit-guidance-heading">
      <div><span className="eyebrow accent">{en ? 'EOD shadow' : 'Shadow EOD'}</span><h3 id={titleId}>{en ? 'Position exit review' : 'Rà soát thoát vị thế'}</h3><p className="muted-text">{en ? 'A sealed EOD research snapshot. It does not place or change any order.' : 'Snapshot nghiên cứu EOD đã niêm phong. Không đặt hoặc thay đổi bất kỳ lệnh nào.'}</p></div>
      {data?.as_of ? <span className="chip neutral">EOD · {formatDateOnly(data.as_of, language)}</span> : null}
    </div>
    {state.status === 'error' && <div className="exit-guidance-error" role="alert"><span>{state.error}</span><button type="button" className="ghost-btn" onClick={() => setRetry(value => value + 1)}>{en ? 'Retry' : 'Thử lại'}</button></div>}
    {!data && state.status === 'loading' ? <div className="exit-guidance-empty" role="status"><strong>{en ? 'Reading the sealed shadow snapshot…' : 'Đang đọc snapshot shadow đã niêm phong…'}</strong></div> : null}
    {unavailable ? <div className="exit-guidance-empty"><strong>{en ? 'No EOD shadow snapshot is available yet.' : 'Chưa có snapshot shadow EOD.'}</strong><p>{en ? 'The app will not infer an exit signal from live quotes or incomplete data.' : 'Ứng dụng không suy diễn tín hiệu thoát từ quote live hoặc dữ liệu chưa đầy đủ.'}</p></div> : null}
    {data?.status === 'shadow' && !guidance.length ? <div className="exit-guidance-empty"><strong>{en ? 'No open positions were recorded in this snapshot.' : 'Snapshot không ghi nhận vị thế mở.'}</strong></div> : null}
    {guidance.length ? <ul className="exit-guidance-list">{guidance.map(item => <GuidanceItem key={item.stock_id || item.symbol} item={item} language={language} />)}</ul> : null}
    {data?.status === 'shadow' ? <p className="exit-guidance-note">{en ? `Research-only · ${data.model || 'position_exit_rule_v1'} · ${data.provider || 'unknown provider'}` : `Chỉ phục vụ nghiên cứu · ${data.model || 'position_exit_rule_v1'} · ${data.provider || 'không rõ provider'}`}</p> : null}
  </section>
}
