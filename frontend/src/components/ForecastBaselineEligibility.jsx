export default function ForecastBaselineEligibility({ group, language = 'vi' }) {
  const copy = (vi, en) => language === 'en' ? en : vi
  const eligible = group.baseline_eligible_measured
  const excluded = group.baseline_ineligible_measured
  const known = Number.isInteger(eligible) && eligible >= 0 && Number.isInteger(excluded) && excluded >= 0 && eligible + excluded === group.measured
  return <p>{known ? copy(`${eligible}/${group.minimum_samples} kết quả có baseline tương thích · ${excluded} kết quả thiếu hoặc không tương thích baseline.`, `${eligible}/${group.minimum_samples} outcomes with compatible baselines · ${excluded} outcomes with missing or incompatible baselines.`) : copy('Chưa có thống kê điều kiện baseline.', 'Baseline eligibility counts are unavailable.')} {copy('Đủ mẫu không đồng nghĩa dự báo đã được xác minh độ chính xác.', 'Meeting the sample threshold does not establish forecast accuracy.')}</p>
}
