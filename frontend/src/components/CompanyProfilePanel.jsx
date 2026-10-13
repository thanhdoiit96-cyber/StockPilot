import { useEffect, useState } from 'react'
import { requestJson } from '../services/api.mjs'
import { formatDateOnly, formatNumber } from '../services/userLocale.mjs'

const safeUrl = value => { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null } catch { return null } }

export default function CompanyProfilePanel({ stockId, language = 'vi', translate = value => value, embedded = false }) {
  const [state, setState] = useState({ status:'idle', data:null, error:'' })
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!stockId) return
    let active = true
    const controller = new AbortController()
    setState(previous => ({ status:'loading', data:previous.data, error:'' }))
    requestJson(`/api/stocks/${encodeURIComponent(stockId)}/company-profile`, { signal:controller.signal })
      .then(payload => { if (active) setState({ status:'success', data:payload.data, error:'' }) })
      .catch(error => { if (active && !controller.signal.aborted) setState(previous => ({ status:'error', data:previous.data, error:error.message })) })
    return () => { active = false; controller.abort() }
  }, [stockId, retry])

  const data = state.data
  const profile = data?.profile
  const website = safeUrl(profile?.website)
  const unavailable = translate('Chưa có dữ liệu')
  const value = input => input == null || input === '' ? unavailable : input
  const number = input => input == null ? unavailable : formatNumber(input, language, { maximumFractionDigits:0 })
  const date = input => input ? formatDateOnly(input, language, { day:'2-digit', month:'2-digit', year:'numeric' }) : unavailable
  return <section className={`${embedded ? 'company-tab-panel' : 'panel'} company-profile-panel`} aria-labelledby="company-profile-title" aria-busy={state.status === 'loading'} lang={language}>
    <div className="company-profile-heading"><div><span className="eyebrow accent">{translate('DOANH NGHIỆP')}</span><h3 id="company-profile-title">{translate('Hồ sơ doanh nghiệp')}</h3><p>{translate('Thông tin nền tảng để đánh giá doanh nghiệp bên cạnh diễn biến giá và kỹ thuật.')}</p></div>{data && <span className={`chip ${data.status === 'available' ? 'success' : 'warning'}`}>{translate(data.status === 'available' ? 'Đủ dữ liệu provider' : 'Dữ liệu cơ bản')}</span>}</div>
    {!data && state.status === 'loading' && <div className="company-profile-state">{translate('Đang tải hồ sơ doanh nghiệp…')}</div>}
    {!data && state.status === 'error' && <div className="company-profile-state error" role="alert"><span>{translate('Chưa tải được hồ sơ doanh nghiệp.')}</span><button type="button" className="ghost-btn" onClick={() => setRetry(value => value + 1)}>{translate('Thử lại')}</button></div>}
    {profile && <>
      <div className="company-profile-identity"><div><strong>{value(profile.name)}</strong><span>{[profile.symbol, profile.short_name].filter(Boolean).join(' · ')}</span></div><dl><div><dt>{translate('Sàn')}</dt><dd>{value(profile.exchange)}</dd></div><div><dt>{translate('Ngành')}</dt><dd>{value(profile.industry)}</dd></div><div><dt>{translate('Ngày niêm yết')}</dt><dd>{date(profile.listing_date)}</dd></div></dl></div>
      <div className="company-profile-metrics"><div><small>{translate('Vốn hóa')}</small><strong>{profile.market_cap == null ? unavailable : `${number(profile.market_cap)} ₫`}</strong></div><div><small>{translate('Vốn điều lệ')}</small><strong>{profile.charter_capital == null ? unavailable : `${number(profile.charter_capital)} ₫`}</strong></div><div><small>{translate('Cổ phiếu phát hành')}</small><strong>{number(profile.issued_shares)}</strong></div><div><small>{translate('Nhân sự')}</small><strong>{number(profile.employees)}</strong></div></div>
      <div className="company-profile-body"><article><h4>{translate('Giới thiệu')}</h4><p>{value(profile.description)}</p></article><aside><h4>{translate('Thông tin liên hệ')}</h4><dl><div><dt>{translate('Địa chỉ')}</dt><dd>{value(profile.address)}</dd></div><div><dt>{translate('Website')}</dt><dd>{website ? <a href={website} target="_blank" rel="noopener noreferrer">{profile.website}</a> : value(profile.website)}</dd></div><div><dt>Email</dt><dd>{value(profile.email)}</dd></div><div><dt>{translate('Mã số thuế')}</dt><dd>{value(profile.tax_id)}</dd></div></dl></aside></div>
      <footer className="company-profile-provenance"><span>{translate('Nguồn')}: {data.provenance?.provider || unavailable}</span><span>{translate('Cập nhật')}: {data.provenance?.fetched_at ? new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', { dateStyle:'short', timeStyle:'short', timeZone:'Asia/Ho_Chi_Minh' }).format(new Date(data.provenance.fetched_at)) : unavailable}</span>{data.status !== 'available' && <span>{translate('Provider chưa khả dụng; đang hiển thị dữ liệu tham chiếu đã lưu.')}</span>}</footer>
    </>}
  </section>
}
