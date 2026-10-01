import SourceLink from './SourceLink.jsx'

export default function DetailExternalFactors({ externalFactors, translate = value => value, formatDate = value => value }) {
  if (!externalFactors) return null

  return <div className="external-factor-box external-factors-panel">
    <strong>{translate('Yếu tố bên ngoài')}</strong>
    <span className="chip neutral">{externalFactors.status === 'available' ? translate('Nguồn xác minh') : translate('Chưa có nguồn xác minh')}</span>
    <p className="muted-text">{externalFactors.disclaimer || translate('Chưa có dữ liệu tin tức hoặc vĩ mô cho mã này.')}</p>
    {(externalFactors.factors || []).map((factor, index) => <p className="muted-text" key={`${factor.source || 'factor'}-${index}`}>
      {factor.type}: <SourceLink url={factor.source_url || factor.url}>{factor.title || translate('Sự kiện không có tiêu đề')}</SourceLink> - {factor.source || translate('Nguồn chưa xác nhận')} - {formatDate(factor.published_at)}
    </p>)}
  </div>
}
