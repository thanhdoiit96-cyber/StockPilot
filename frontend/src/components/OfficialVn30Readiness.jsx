export default function OfficialVn30Readiness({ state, language = 'vi' }) {
  const copy = (vi, en) => language === 'en' ? en : vi
  const ready = state.status === 'ready_for_shadow'
  const coverage = state.coverage
  return <div className="forecast-validation-gate official-vn30-readiness" role="status">
    <div>
      <strong>{copy('Rổ OfficialVN30', 'OfficialVN30 basket')}</strong>
      <p>{ready
        ? copy(`Đã có membership snapshot và ${coverage.observed}/${coverage.universe} mã có EOD phiên ${state.sessionDate}. Chỉ sẵn sàng theo dõi shadow; chưa thay forecast 3 mã hoặc phát hành xác suất.`, `A membership snapshot and EOD for ${coverage.observed}/${coverage.universe} symbols exist for ${state.sessionDate}. Shadow monitoring only; this does not replace the three-symbol forecast or issue probabilities.`)
        : state.status === 'loading'
          ? copy('Đang kiểm tra snapshot membership OfficialVN30.', 'Checking the OfficialVN30 membership snapshot.')
          : state.reason === 'membership_snapshot_unavailable'
            ? copy('Chưa có snapshot membership OfficialVN30 đã niêm phong từ nguồn được phép sử dụng. Forecast hiện tại vẫn chỉ dùng FPT, HPG, VHM.', 'No sealed OfficialVN30 membership snapshot from an authorized source is available. The current forecast still uses FPT, HPG, and VHM.')
            : copy('OfficialVN30 chưa đủ điều kiện EOD hoặc membership để theo dõi shadow; hệ thống không suy diễn danh sách mã.', 'OfficialVN30 lacks the EOD or membership conditions for shadow monitoring; the system does not infer constituents.')}</p>
    </div>
    {coverage ? <ul aria-label={copy('Coverage EOD OfficialVN30', 'OfficialVN30 EOD coverage')}><li className={ready ? 'is-ready' : 'is-pending'}><span aria-hidden="true">{ready ? '✓' : '○'}</span>{copy('EOD thành viên', 'Member EOD')}<small>{coverage.observed}/{coverage.universe}</small></li></ul> : null}
  </div>
}
