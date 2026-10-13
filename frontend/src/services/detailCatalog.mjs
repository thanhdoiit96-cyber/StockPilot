// Source keys bridge the existing Detail components' translate prop.
// Only UI-owned strings belong here; provider narrative is kept in its original language.
const entries = [
  ['Hồ sơ', 'Profile'], ['Cổ đông & lãnh đạo', 'Ownership & leadership'], ['Vốn & cổ tức', 'Capital & dividends'], ['Thông tin doanh nghiệp', 'Company information'], ['Nhóm thông tin doanh nghiệp', 'Company information sections'],
  ['VỐN & QUYỀN LỢI', 'CAPITAL & ENTITLEMENTS'], ['Vốn và sự kiện doanh nghiệp', 'Capital and company events'], ['Lịch sử vốn và thông báo quyền lợi từ nhà cung cấp dữ liệu.', 'Capital history and entitlement disclosures from the data provider.'],
  ['Đang tải lịch sử vốn và sự kiện…', 'Loading capital history and events…'], ['Chưa tải được lịch sử vốn và sự kiện.', 'Unable to load capital history and events.'], ['Chưa có lịch sử vốn hoặc sự kiện phù hợp', 'No suitable capital history or events'], ['Hệ thống không tự tạo quyền lợi khi nguồn chưa công bố dữ liệu.', 'The system does not create entitlements when the source has not published data.'],
  ['Lịch sử vốn', 'Capital history'], ['Thông báo quyền lợi', 'Entitlement disclosures'], ['cổ phiếu phát hành', 'issued shares'], ['Chưa có lịch sử vốn.', 'No capital history.'], ['Chưa có thông báo quyền lợi.', 'No entitlement disclosures.'],
  ['Không tự động ghi vào danh mục', 'Not automatically recorded in your portfolio'], ['Thông báo provider chỉ để tham khảo. Cổ tức hoặc corporate action chỉ ảnh hưởng tiền, số lượng và hiệu suất sau khi có event ledger được xác nhận trong Danh mục.', 'Provider disclosures are informational. Dividends or corporate actions affect cash, quantity and performance only after a confirmed event-ledger entry in Portfolio.'],
  ['SỞ HỮU & QUẢN TRỊ', 'OWNERSHIP & GOVERNANCE'], ['Cổ đông và lãnh đạo', 'Shareholders and leadership'], ['Cơ cấu sở hữu công bố và đội ngũ điều hành hiện có từ nhà cung cấp dữ liệu.', 'Published ownership structure and current leadership available from the data provider.'],
  ['Dữ liệu khả dụng', 'Data available'], ['Dữ liệu một phần', 'Partial data'], ['Đang tải thông tin cổ đông và lãnh đạo…', 'Loading shareholders and leadership…'], ['Chưa tải được thông tin cổ đông và lãnh đạo.', 'Unable to load shareholders and leadership.'],
  ['Chưa công bố', 'Not disclosed'], ['Chưa có dữ liệu công bố phù hợp', 'No suitable published data'], ['Hồ sơ giá và phân tích kỹ thuật vẫn hoạt động bình thường. Hệ thống không tự suy diễn danh sách cổ đông hoặc lãnh đạo.', 'Price history and technical analysis remain available. The system does not infer shareholders or leadership.'],
  ['Cổ đông lớn', 'Major shareholders'], ['Ban lãnh đạo', 'Leadership'], ['bản ghi', 'records'], ['Chưa có dữ liệu cổ đông.', 'No shareholder data.'], ['Chưa có dữ liệu lãnh đạo.', 'No leadership data.'], ['Thông tin sở hữu có thể trễ so với giao dịch thực tế.', 'Ownership disclosures may lag actual transactions.'],
  ['Tổng quan', 'Overview'], ['Doanh nghiệp', 'Company'], ['Biểu đồ', 'Chart'], ['Phân tích', 'Analysis'],
  ['DOANH NGHIỆP', 'COMPANY'], ['Hồ sơ doanh nghiệp', 'Company profile'], ['Thông tin nền tảng để đánh giá doanh nghiệp bên cạnh diễn biến giá và kỹ thuật.', 'Core company information to complement price and technical analysis.'],
  ['Đủ dữ liệu provider', 'Provider data available'], ['Dữ liệu cơ bản', 'Basic data'], ['Đang tải hồ sơ doanh nghiệp…', 'Loading company profile…'], ['Chưa tải được hồ sơ doanh nghiệp.', 'Unable to load the company profile.'], ['Thử lại', 'Retry'],
  ['Sàn', 'Exchange'], ['Ngành', 'Industry'], ['Ngày niêm yết', 'Listing date'], ['Vốn hóa', 'Market capitalization'], ['Vốn điều lệ', 'Charter capital'], ['Cổ phiếu phát hành', 'Issued shares'], ['Nhân sự', 'Employees'], ['Giới thiệu', 'Overview'], ['Thông tin liên hệ', 'Contact information'], ['Địa chỉ', 'Address'], ['Website', 'Website'], ['Mã số thuế', 'Tax ID'], ['Nguồn', 'Source'], ['Cập nhật', 'Updated'], ['Provider chưa khả dụng; đang hiển thị dữ liệu tham chiếu đã lưu.', 'The provider is unavailable; stored reference data is shown.'],
  ['Điều hướng nội dung Chi tiết mã', 'Stock detail sections'],
  ['Mã cổ phiếu', 'Stock symbol'], ['Nhập mã, ví dụ: HPG', 'Enter a symbol, e.g. HPG'], ['Xem mã', 'View stock'],
  ['Đang tải chi tiết cổ phiếu', 'Loading stock details'], ['Không thể tải chi tiết cổ phiếu', 'Unable to load stock details'], ['Thử lại chi tiết', 'Retry details'],
  ['Provider tạm ngắt; giá gần nhất vẫn được giữ và sẽ tự thử lại.', 'The provider is temporarily paused. The latest price is retained and will refresh automatically.'],
  ['Provider đang chậm; hệ thống sẽ tự cập nhật lại.', 'The provider is responding slowly. Prices will refresh automatically.'],
  ['Chưa cập nhật được intraday; đang giữ giá ghi nhận gần nhất.', 'Intraday update unavailable. Showing the last recorded price.'],
  ['Chưa lấy được giá intraday; đang hiển thị EOD và sẽ tự thử lại.', 'Intraday price unavailable. Showing EOD prices and retrying automatically.'],
  ['Giá intraday', 'Intraday price'], ['Cập nhật:', 'Updated:'], ['Giấy phép dữ liệu', 'Data license'], ['Giá đóng cửa EOD', 'EOD closing price'],
  ['Đang phân tích...', 'Analyzing...'], ['Cập nhật phân tích', 'Refresh analysis'], ['Phân tích chuyên sâu', 'Deep analysis'], ['Thêm vào danh mục', 'Add to portfolio'],
  ['Phân tích nâng cao đã sẵn sàng', 'Advanced analysis is ready'], ['Điểm kỹ thuật', 'Technical score'],
  ['Lịch sử giá', 'Price history'], ['Intraday + EOD', 'Intraday + EOD'], ['Dữ liệu EOD', 'EOD data'],
  ['Khối lượng phiên tăng', 'Volume on rising sessions'], ['Khối lượng phiên giảm', 'Volume on falling sessions'],
  ['AI nhận định', 'Analysis summary'], ['Tín hiệu', 'Signal'], ['Chưa có nhận định', 'No assessment yet'], ['RSI14', 'RSI14'], ['Quan sát', 'Observations'], ['phiên', 'sessions'], ['Phiên', 'Sessions'],
  ['Chưa có dữ liệu', 'No data'], ['Chưa đủ dữ liệu', 'Insufficient data'], ['Chất lượng', 'Quality'], ['Cập nhật phân tích:', 'Analysis updated:'], ['Chưa có điểm', 'Not scored'],
  ['Số phiên hiển thị', 'Displayed sessions'], ['Zoom và dịch biểu đồ', 'Chart zoom and pan'], ['Phóng to biểu đồ', 'Zoom in'], ['Thu nhỏ biểu đồ', 'Zoom out'], ['Cũ hơn', 'Older'], ['Mới hơn', 'Newer'],
  ['Chưa có lịch sử giá từ nguồn dữ liệu cho mã này.', 'No price history is available for this symbol.'],
  ['Giá intraday hiện tại', 'Current intraday price'], ['Đóng cửa', 'Close'], ['Mở cửa', 'Open'], ['Cao', 'High'], ['Thấp', 'Low'], ['KL', 'Vol.'],
  ['Biểu đồ giá đóng cửa', 'Closing price chart'], ['Đường giá đóng cửa theo phiên', 'Closing prices by session'], ['Cập nhật lúc', 'Updated at'],
  ['Thang đo khối lượng', 'Volume scale'], ['KL cổ phiếu cao nhất', 'Maximum share volume'], ['Khối lượng theo phiên', 'Volume by session'], ['cổ phiếu', 'shares'],
  ['Chú giải biểu đồ', 'Chart legend'], ['Giá đóng cửa', 'Closing price'], ['Mới nhất', 'Latest'], ['Cao nhất', 'Highest'], ['Thấp nhất', 'Lowest'], ['Khối lượng mới nhất', 'Latest volume'],
  ['Đã phân tích', 'Analysis ready'], ['Chưa phân tích', 'Not analyzed'], ['Chưa có kết quả phân tích', 'No analysis results yet'], ['Đang tải các chỉ báo kỹ thuật...', 'Loading technical indicators...'],
  ['Nhấn Phân tích chuyên sâu để xem điểm số, chỉ báo và nhận định theo kỳ hạn.', 'Select Deep analysis to view scores, indicators and assessments by horizon.'],
  ['Nhận định chuyên gia', 'Expert assessment'], ['Cần theo dõi', 'Watch for'], ['Nên tránh', 'Avoid'], ['Điểm kỹ thuật tổng hợp', 'Combined technical score'],
  ['Dữ liệu', 'Data'], ['Đến', 'As of'], ['Mây', 'Cloud'], ['Trên mây', 'Above cloud'], ['Dưới mây', 'Below cloud'], ['Trong mây', 'Inside cloud'],
  ['Tăng', 'Bullish'], ['Giảm', 'Bearish'], ['Trung tính', 'Neutral'], ['Vượt dải trên', 'Above upper band'], ['Dưới dải dưới', 'Below lower band'], ['Nửa trên dải', 'Upper half'], ['Nửa dưới dải', 'Lower half'],
  ['Nền xu hướng trung hạn', 'Medium-term trend'], ['Động lượng ngắn hạn', 'Short-term momentum'], ['Trên 70: quá mua · dưới 30: quá bán', 'Above 70: overbought · below 30: oversold'], ['Đường MACD và histogram', 'MACD line and histogram'], ['Biên dưới - biên trên', 'Lower - upper band'], ['điểm', 'points'],
  ['Ngắn hạn', 'Short term'], ['Trung hạn', 'Medium term'], ['Dài hạn', 'Long term'], ['1-20 phiên (~1 tháng)', '1–20 sessions (~1 month)'], ['1-6 tháng', '1–6 months'], ['Trên 6 tháng', 'Over 6 months'],
  ['Kịch bản tham khảo', 'Reference scenarios'], ['Khung thời gian', 'Time horizon'], ['Kỳ vọng', 'Outlook'], ['Tỷ trọng', 'Allocation'], ['Chốt lời', 'Take profit'], ['Cắt lỗ', 'Stop loss'], ['điều chỉnh theo giá hiện tại', 'adjusted to current price'],
  ['Yếu tố bên ngoài', 'External factors'], ['Nguồn xác minh', 'Verified sources'], ['Chưa có nguồn xác minh', 'No verified sources'], ['Chưa có dữ liệu tin tức hoặc vĩ mô cho mã này.', 'No news or macroeconomic data is available for this symbol.'], ['Sự kiện không có tiêu đề', 'Untitled event'], ['Nguồn chưa xác nhận', 'Unconfirmed source']
]

export const detailCatalogs = {
  vi: Object.fromEntries(entries.map(([vi]) => [vi, vi])),
  en: Object.fromEntries(entries)
}
export const translateDetail = (language, text) => detailCatalogs[language]?.[text] || detailCatalogs.vi[text] || text
