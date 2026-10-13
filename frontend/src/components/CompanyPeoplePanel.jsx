import { useEffect, useState } from 'react'
import { requestJson } from '../services/api.mjs'
import { formatDateOnly, formatNumber } from '../services/userLocale.mjs'

export default function CompanyPeoplePanel({ stockId, language = 'vi', translate = value => value, embedded = false }) {
  const [state, setState] = useState({ status:'idle', data:null, error:'' })
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!stockId) return
    let active = true
    const controller = new AbortController()
    setState(previous => ({ status:'loading', data:previous.data, error:'' }))
    requestJson(`/api/stocks/${encodeURIComponent(stockId)}/company-people`, { signal:controller.signal })
      .then(payload => { if (active) setState({ status:'success', data:payload.data, error:'' }) })
      .catch(error => { if (active && !controller.signal.aborted) setState(previous => ({ status:'error', data:previous.data, error:error.message })) })
    return () => { active = false; controller.abort() }
  }, [stockId, retry])

  const data = state.data
  const unavailable = translate('Chưa công bố')
  const percent = value => value == null ? unavailable : `${formatNumber(value, language, { maximumFractionDigits:2 })}%`
  const shares = value => value == null ? unavailable : formatNumber(value, language, { maximumFractionDigits:0 })
  const date = value => value ? formatDateOnly(value, language, { day:'2-digit', month:'2-digit', year:'numeric' }) : unavailable
  return <section className={`${embedded ? 'company-tab-panel' : 'panel'} company-people-panel`} aria-labelledby="company-people-title" aria-busy={state.status === 'loading'} lang={language}>
    <header className="company-profile-heading"><div><span className="eyebrow accent">{translate('SỞ HỮU & QUẢN TRỊ')}</span><h3 id="company-people-title">{translate('Cổ đông và lãnh đạo')}</h3><p>{translate('Cơ cấu sở hữu công bố và đội ngũ điều hành hiện có từ nhà cung cấp dữ liệu.')}</p></div>{data && <span className={`chip ${data.status === 'available' ? 'success' : 'warning'}`}>{translate(data.status === 'available' ? 'Dữ liệu khả dụng' : data.status === 'partial' ? 'Dữ liệu một phần' : 'Chưa có dữ liệu')}</span>}</header>
    {!data && state.status === 'loading' && <div className="company-profile-state">{translate('Đang tải thông tin cổ đông và lãnh đạo…')}</div>}
    {!data && state.status === 'error' && <div className="company-profile-state error" role="alert"><span>{translate('Chưa tải được thông tin cổ đông và lãnh đạo.')}</span><button type="button" className="ghost-btn" onClick={() => setRetry(value => value + 1)}>{translate('Thử lại')}</button></div>}
    {data?.status === 'unavailable' && <div className="company-people-empty"><strong>{translate('Chưa có dữ liệu công bố phù hợp')}</strong><span>{translate('Hồ sơ giá và phân tích kỹ thuật vẫn hoạt động bình thường. Hệ thống không tự suy diễn danh sách cổ đông hoặc lãnh đạo.')}</span></div>}
    {data && data.status !== 'unavailable' && <div className="company-people-grid">
      <article><div className="company-people-subhead"><div><h4>{translate('Cổ đông lớn')}</h4><span>{data.summary?.shareholder_count || 0} {translate('bản ghi')}</span></div></div>{data.shareholders?.length ? <div className="company-people-list">{data.shareholders.map((item, index) => <div className="company-person-row" key={`${item.name}-${index}`}><div><strong>{item.name}</strong><small>{translate('Cập nhật')}: {date(item.updated_at)}</small></div><div className="company-person-values"><span>{percent(item.ownership_pct)}</span><small>{shares(item.shares)} {translate('cổ phiếu')}</small></div></div>)}</div> : <p className="company-people-inline-empty">{translate('Chưa có dữ liệu cổ đông.')}</p>}</article>
      <article><div className="company-people-subhead"><div><h4>{translate('Ban lãnh đạo')}</h4><span>{data.summary?.officer_count || 0} {translate('bản ghi')}</span></div></div>{data.officers?.length ? <div className="company-people-list">{data.officers.map((item, index) => <div className="company-person-row" key={`${item.name}-${index}`}><div><strong>{item.name}</strong><small>{item.position || unavailable}</small></div><div className="company-person-values"><span>{percent(item.ownership_pct)}</span><small>{shares(item.shares)} {translate('cổ phiếu')}</small></div></div>)}</div> : <p className="company-people-inline-empty">{translate('Chưa có dữ liệu lãnh đạo.')}</p>}</article>
    </div>}
    {data && <footer className="company-profile-provenance"><span>{translate('Nguồn')}: {data.provenance?.provider || unavailable}</span><span>{translate('Cập nhật')}: {data.provenance?.fetched_at ? new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', { dateStyle:'short', timeStyle:'short', timeZone:'Asia/Ho_Chi_Minh' }).format(new Date(data.provenance.fetched_at)) : unavailable}</span><span>{translate('Thông tin sở hữu có thể trễ so với giao dịch thực tế.')}</span></footer>}
  </section>
}
