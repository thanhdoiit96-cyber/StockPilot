export default function ForecastDataStatus({ payload, status, retry, language = 'vi' }) {
  const en = language === 'en'
  const text = (vi, english) => en ? english : vi
  if (!payload) return <div className="forecast-data-status" role="status"><span>{status === 'loading' ? text('Đang tải dữ liệu dự báo…', 'Loading forecast data…') : text('Chưa có dữ liệu dự báo hợp lệ.', 'Valid forecast data is unavailable.')}</span>{status === 'unavailable' && <button type="button" className="ghost-btn small-btn" onClick={retry}>{text('Thử lại', 'Retry')}</button>}</div>
  const current = payload.status === 'live_preview'
  const scope = payload.current_data?.input_scope
  const symbols = Array.isArray(scope?.used_symbols) ? scope.used_symbols : null
  const requested = Array.isArray(scope?.requested_symbols) && scope.requested_symbols.length ? scope.requested_symbols : null
  const missing = Array.isArray(scope?.missing_symbols) ? scope.missing_symbols : []
  const age = payload.staleness_days
  const maximum = payload.maximum_staleness_days
  const ageKnown = age != null && Number.isFinite(Number(age)) && Number(age) >= 0
  const number = value => new Intl.NumberFormat(en ? 'en-US' : 'vi-VN', { maximumFractionDigits: 1 }).format(value)
  return <div className="forecast-data-status">
    <dl><div><dt>{text('Dữ liệu chốt đến', 'Data as of')}</dt><dd>{payload.as_of && Number.isFinite(Date.parse(payload.as_of)) ? new Intl.DateTimeFormat(en ? 'en-US' : 'vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(payload.as_of)) : '—'}</dd></div>
      <div><dt>{text('Phạm vi đầu vào', 'Input scope')}</dt><dd>{current ? symbols ? `${symbols.length}${requested ? `/${requested.length}` : ''} ${text('mã được dùng', 'symbols used')}` : text('Chưa công bố', 'Not disclosed') : text('Replay mô phỏng', 'Synthetic replay')}</dd></div>
      <div><dt>{text('Tuổi dữ liệu', 'Data age')}</dt><dd>{current && ageKnown ? `${number(age)} ${text('ngày', 'days')}` : '—'}{current && ageKnown && maximum != null && Number.isFinite(Number(maximum)) ? ` / ${text('giới hạn', 'limit')} ${number(maximum)}` : ''}</dd></div></dl>
    {symbols?.length > 0 && <p>{text('Mã tham gia mô hình', 'Model inputs')}: {symbols.join(', ')}. {text('Phạm vi này không đại diện toàn thị trường.', 'This scope does not represent the whole market.')}</p>}
    {missing.length > 0 && <p>{text('Chưa đạt điều kiện đầu vào', 'Input requirements not met')}: {missing.join(', ')}</p>}
    {Array.isArray(scope?.exclusions) && scope.exclusions.map(item => <p key={item.symbol}>{item.symbol}: {item.reason === 'conflicting_session_prices' ? text('Giá đóng cửa mâu thuẫn trong cùng ngày.', 'Conflicting closing prices on the same date.') : item.reason === 'invalid_observation_time' ? text('Thời điểm dữ liệu không hợp lệ.', 'Invalid observation time.') : text('Chưa đủ 21 ngày dữ liệu riêng biệt.', 'Fewer than 21 distinct observation dates.')}</p>)}
    {current && <small>{text('Xác suất prototype chưa được hiệu chỉnh và kiểm chứng hiệu quả.', 'Prototype probabilities are not calibrated or performance-validated.')}</small>}
  </div>
}
