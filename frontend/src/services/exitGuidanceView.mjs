const copy = {
  vi: {
    cut_loss: 'Cắt lỗ — cần xem xét',
    trailing_protect: 'Bảo vệ lợi nhuận — cần xem xét',
    take_profit_review: 'Chốt lời từng phần — cần xem xét',
    hold: 'Theo dõi',
    unavailable: 'Chưa đủ dữ liệu'
  },
  en: {
    cut_loss: 'Review loss limit',
    trailing_protect: 'Review profit protection',
    take_profit_review: 'Review partial profit taking',
    hold: 'Monitor',
    unavailable: 'Data unavailable'
  }
}

const reasonCopy = {
  vi: {
    close_at_or_below_active_stop: 'Giá đóng cửa tại hoặc dưới mức dừng đang áp dụng.',
    trailing_stop_armed: 'Mức dừng bảo vệ lợi nhuận đã được kích hoạt.',
    close_near_active_stop: 'Giá đóng cửa đang ở gần mức dừng bảo vệ.',
    profit_target_reached: 'Giá đóng cửa đã chạm ngưỡng rà soát chốt lời.',
    trend_weakened: 'Xu hướng ngắn hạn yếu đi theo SMA.',
    rsi_left_overbought: 'RSI đã rời vùng quá mua.',
    no_exit_trigger: 'Chưa có điều kiện thoát vị thế theo bộ quy tắc này.',
    insufficient_eod_sessions: 'Chưa đủ 60 phiên EOD nhất quán.',
    unapplied_corporate_action: 'Có sự kiện doanh nghiệp chưa được đối soát vào vị thế.',
    missing_price_provenance: 'Thiếu provenance của dữ liệu giá.',
    mixed_price_basis: 'Dữ liệu giá có basis hoặc provenance không đồng nhất.',
    position_cost_or_quantity_invalid: 'Thiếu giá vốn hoặc số lượng vị thế hợp lệ.',
    insufficient_indicator_history: 'Chưa đủ lịch sử để tính chỉ báo.',
    entry_after_available_eod: 'Ngày vào vị thế nằm sau dữ liệu EOD hiện có.'
  },
  en: {
    close_at_or_below_active_stop: 'The close is at or below the active stop.',
    trailing_stop_armed: 'The profit-protection stop is armed.',
    close_near_active_stop: 'The close is near the profit-protection stop.',
    profit_target_reached: 'The close reached the profit-review threshold.',
    trend_weakened: 'The short-term SMA trend weakened.',
    rsi_left_overbought: 'RSI left the overbought range.',
    no_exit_trigger: 'This rule set has no exit trigger yet.',
    insufficient_eod_sessions: 'Fewer than 60 consistent EOD sessions are available.',
    unapplied_corporate_action: 'A corporate action has not been reconciled to the position.',
    missing_price_provenance: 'Price provenance is missing.',
    mixed_price_basis: 'Price basis or provenance is inconsistent.',
    position_cost_or_quantity_invalid: 'A valid cost basis or position quantity is missing.',
    insufficient_indicator_history: 'There is not enough history for the indicators.',
    entry_after_available_eod: 'The position entry date is after the available EOD data.'
  }
}

export function exitGuidanceLabel(status, language = 'vi') {
  return (copy[language] || copy.vi)[status] || (language === 'en' ? 'Data unavailable' : 'Chưa đủ dữ liệu')
}

export function exitGuidanceReason(reason, language = 'vi') {
  return (reasonCopy[language] || reasonCopy.vi)[reason] || (language === 'en' ? 'The snapshot does not include a displayable explanation.' : 'Snapshot không có diễn giải có thể hiển thị.')
}

export function exitGuidanceTone(status) {
  return ['cut_loss', 'trailing_protect', 'take_profit_review'].includes(status) ? 'review' : status === 'hold' ? 'neutral' : 'unavailable'
}
