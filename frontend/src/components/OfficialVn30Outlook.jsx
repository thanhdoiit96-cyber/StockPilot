import { useEffect, useState } from 'react'
import { fetchOfficialVn30Preview } from '../services/forecastPreview.mjs'

const reasons = {
  membership_snapshot_unavailable: ['Chưa có danh sách OfficialVN30 đã xác minh và lưu.', 'A reviewed, sealed OfficialVN30 membership is not available.'],
  membership_snapshot_invalid: ['Danh sách hoặc mã kiểm tra toàn vẹn không hợp lệ.', 'Membership or integrity hashes are invalid.'],
  membership_rights_unverified: ['Chưa ghi nhận phạm vi quyền sử dụng dữ liệu.', 'Data usage scope has not been recorded.'],
  membership_not_effective_for_session: ['Danh sách chưa có hiệu lực cho phiên cần dự báo.', 'Membership is not effective for the forecast session.'],
  member_history_coverage_below_threshold: ['Chưa đủ lịch sử EOD hợp lệ của ít nhất 29/30 mã.', 'Valid EOD histories are required for at least 29/30 members.'],
  preview_disabled: ['Chế độ nghiên cứu chưa được bật.', 'Research preview is disabled.'],
  request_failed: ['Không tải được dữ liệu. Hãy thử lại.', 'Unable to load data. Please retry.'],
  invalid_contract: ['Dữ liệu trả về không đúng hợp đồng OfficialVN30.', 'The response does not satisfy the OfficialVN30 contract.'],
  input_limit_exceeded: ['Dữ liệu vượt giới hạn kiểm tra; cần rà soát bản ghi trùng.', 'Input limit exceeded; duplicate rows need review.']
}

export default function OfficialVn30Outlook({ language = 'vi', onOpenIdeas }) {
  const en = language === 'en', t = (vi, english) => en ? english : vi
  const [horizon, setHorizon] = useState(() => { try { return sessionStorage.getItem('stockpilot.outlook.horizon') === '1' ? 1 : 5 } catch { return 5 } })
  const [attempt, setAttempt] = useState(0), [state, setState] = useState({ status: 'loading' })
  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })
    fetchOfficialVn30Preview(horizon, { signal: controller.signal }).then(setState).catch(error => { if (error.name !== 'AbortError') setState({ status: 'unavailable', reason: 'request_failed' }) })
    return () => controller.abort()
  }, [horizon, attempt])
  const ready = state.status === 'official_vn30_preview'
  const labels = [t('Tăng lan tỏa', 'Broad advance'), t('Cân bằng', 'Balanced'), t('Giảm lan tỏa', 'Broad decline')]
  const tones = ['advance', 'balanced', 'decline']
  return <section className="panel short-term-outlook" aria-labelledby="short-term-outlook-title">
    <header className="outlook-header"><div><h2 id="short-term-outlook-title">{t('Triển vọng OfficialVN30', 'OfficialVN30 outlook')}</h2><p className="muted-text">{t('Nghiên cứu nội bộ · Không phát hành công khai hoặc thương mại', 'Internal research · No public or commercial release')}</p></div>
      <div className="outlook-horizons" role="group" aria-label={t('Kỳ dự báo', 'Forecast horizon')}>{[1, 5].map(value => <button key={value} type="button" className="ghost-btn small-btn" aria-pressed={value === horizon} onClick={() => { setHorizon(value); try { sessionStorage.setItem('stockpilot.outlook.horizon', String(value)) } catch { /* Optional preference. */ } }}>{value} {t('phiên', 'sessions')}</button>)}</div>
    </header>
    <div className="forecast-data-status" role="status" aria-busy={state.status === 'loading'}>
      {state.status === 'loading' ? <p>{t('Đang kiểm tra rổ và dữ liệu EOD…', 'Checking membership and EOD histories…')}</p> : <>
        <dl><div><dt>{t('Phiên dữ liệu yêu cầu', 'Required data session')}</dt><dd>{state.as_of || '—'}</dd></div><div><dt>{t('Đầu vào đủ điều kiện', 'Eligible inputs')}</dt><dd>{state.coverage ? `${state.coverage.observed}/30 ${t('mã', 'members')}` : '—'}</dd></div><div><dt>{t('Lịch sử mỗi mã', 'History per member')}</dt><dd>60 {t('phiên', 'sessions')}</dd></div></dl>
        {!ready && <p>{(reasons[state.reason] || [t('Chưa có dữ liệu dự báo hợp lệ.', 'Valid forecast data is unavailable.')])[en ? 1 : 0] || t('Chưa có dữ liệu dự báo hợp lệ.', 'Valid forecast data is unavailable.')}</p>}
        <button className="ghost-btn small-btn" type="button" onClick={() => setAttempt(value => value + 1)}>{t('Thử lại', 'Retry')}</button>
      </>}
    </div>
    {ready && <div className="outlook-compact-grid">{labels.map((label, index) => <div className={`outlook-compact-cell outcome-${tones[index]}`} key={label}><span>{label}</span><strong>{new Intl.NumberFormat(en ? 'en-US' : 'vi-VN', { style: 'percent', maximumFractionDigits: 1 }).format(state.probabilities[index].value)}</strong></div>)}</div>}
    {ready && <p className="outlook-note">{t('Xác suất prototype · Chưa hiệu chỉnh hoặc kiểm chứng độ chính xác', 'Prototype probabilities · Not calibrated or accuracy-validated')}</p>}
    <p className="outlook-note">{t('Không thay bằng ba mã mẫu khi thiếu dữ liệu. Rổ VN30 không đại diện toàn thị trường.', 'No three-symbol fallback when data is missing. VN30 does not represent the entire market.')}</p>
    <details className="secondary-disclosure outlook-basis"><summary>{t('Cơ sở và giới hạn mô hình', 'Model basis and limitations')}</summary>
      <p>{t('Tối thiểu 29/30 thành viên có 60 phiên EOD cùng lịch, đúng đơn vị giá và phiên chốt gần nhất. Dự báo độ rộng rổ, không phải điểm số VN30 hoặc lợi nhuận.', 'At least 29/30 members need 60 aligned EOD sessions, validated price units and the latest completed session. This forecasts basket breadth, not VN30 index points or returns.')}</p>
      <p>{t('Prototype dùng trọng số cố định, chưa hiệu chỉnh hoặc đo hiệu quả độc lập; kỳ 1/5 phiên chưa được huấn luyện riêng. Có thêm dữ liệu không tự cải thiện mô hình. Không sử dụng kết quả đánh giá của rổ ba mã.', 'Fixed-weight prototype, not calibrated or independently evaluated; 1/5-session horizons are not separately trained. Additional data does not automatically improve the model. Three-symbol evaluation results are not reused.')}</p>
      {state.membership && <p style={{ overflowWrap: 'anywhere' }}>{state.membership.source_identifier} · {state.membership.effective_from} · {t('Quyền sử dụng', 'Usage rights')}: {state.rights_verification === 'owner_attested_pending' ? t('Chủ sở hữu chấp thuận nghiên cứu, chờ xác minh quyền', 'Owner-attested research, rights verification pending') : t('Đã ghi nhận bằng chứng', 'Evidence recorded')}</p>}
    </details>
    {onOpenIdeas && <button type="button" className="ghost-btn small-btn" onClick={onOpenIdeas}>{t('Mở Đề xuất', 'Open Ideas')}</button>}
  </section>
}
