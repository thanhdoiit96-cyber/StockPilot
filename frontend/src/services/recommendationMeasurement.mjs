const reasons = {
  snapshot_unverified: ['Chưa xác minh bản chụp gốc', 'Original snapshot not verified'],
  insufficient_observed_sessions: ['Chưa đủ phiên giá quan sát', 'Insufficient observed price sessions'],
  invalid_evaluation_boundary: ['Thiếu kỳ hạn hoặc ngày đánh giá hợp lệ', 'Invalid horizon or evaluation date'],
  evaluation_date_mismatch: ['Ngày đánh giá không khớp kỳ hạn', 'Evaluation date does not match horizon'],
  price_evidence_unavailable: ['Chưa đủ bằng chứng giá cùng nguồn và đơn vị', 'Compatible price evidence unavailable'],
  conflicting_session_prices: ['Giá trong cùng phiên không nhất quán', 'Conflicting prices within a session'],
  invalid_return: ['Giá hoặc lợi nhuận đã lưu không hợp lệ', 'Invalid stored price or return'],
  return_mismatch: ['Lợi nhuận đã lưu không khớp bằng chứng giá', 'Stored return does not match price evidence'],
}

export function measurementLabel(item, language = 'vi') {
  const en = language === 'en'
  if (item.measurement_status === 'excluded') return en ? 'Excluded from statistics' : 'Không tính thống kê'
  if (item.statistics_eligible === true) return en ? 'Eligible' : 'Đủ bằng chứng'
  return en ? 'Pending verification' : 'Chờ xác minh'
}

export function measurementReason(item, language = 'vi') {
  return (item.exclusion_reasons || []).map(key => reasons[key]?.[language === 'en' ? 1 : 0] || (language === 'en' ? 'Evidence requires review' : 'Bằng chứng cần rà soát')).join('; ')
}
