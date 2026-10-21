# Tự động tạo snapshot Đề xuất sau EOD

## Quyết định

`short_term_rule_v2` chỉ xem một mã là ứng viên khi có ít nhất 50 quan sát giá EOD. Vì vậy cổng tạo snapshot theo lịch dùng tập mã đang niêm yết có ít nhất 50 **phiên EOD trước ngày chạy**, thay vì đòi toàn bộ mã niêm yết có giá trong phiên. Mỗi mã trong tập ứng viên vẫn phải có close EOD của chính phiên đó. Con số 50 khớp với điều kiện `analysis.observations >= 50` của mô hình.

Cổng coverage toàn thị trường vẫn giữ nguyên. Nó ghi evidence về độ đầy đủ của ingestion, gap retry và các mã mới/chưa được provider trả về; nó không còn chặn một snapshot mà mô hình có thể lập từ tập đầu vào hoàn chỉnh của chính nó.

## Luồng và bằng chứng

1. EOD worker ingest và retry gap như hiện có, rồi ghi `after` cho toàn bộ mã niêm yết.
2. Khi `RECOMMENDATIONS_AFTER_INGEST=true`, worker tính thêm `recommendation_coverage` với ngưỡng 50 phiên lịch sử hợp lệ.
3. Chỉ khi `recommendation_coverage.symbols > 0` và không còn `missing_symbols`, worker gọi snapshot generator. Một mã chỉ covered khi có close EOD dương; row rỗng/0 không thể mở gate. Evidence giữ cả hai coverage, ngưỡng lịch sử, trạng thái tạo hoặc lý do bỏ qua.
4. Generator đọc duy nhất rows `provider=vnstock`, `interval=1d`, stocks `listing_status=listed`; snapshot không được lấy intraday hay mã đã rời universe. `GET /api/recommendations/latest` chỉ đọc snapshot đã lưu.

Nếu tập ứng viên thiếu close, worker ghi `skipped_incomplete_recommendation_coverage`; không tạo fallback từ ngày cũ, giá intraday hoặc dữ liệu do request UI kích hoạt.

## Đánh đổi và giới hạn

Phương án đơn giản là đợi phủ toàn bộ mã niêm yết. Nó tạo false-negative liên tục vì các mã mới hoặc provider không hỗ trợ không thể là ứng viên của mô hình. Phương án được chọn giảm chặn sai nhưng vẫn không cho phép thiếu dữ liệu của bất cứ mã nào có thể được chấm điểm.

Ngưỡng 50 phiên được xác định bởi model hiện tại. Nếu thay đổi model hoặc ngưỡng quan sát, phải thay đổi đồng thời coverage gate, input provenance và test. Coverage đủ không xác nhận chất lượng tín hiệu, quyền provider hay hiệu quả đầu tư; những điều đó tiếp tục thuộc gate đánh giá/hiệu chỉnh tại `RECOMMENDATION_CALIBRATION_DESIGN.md`.

## Nghiệm thu

- Scheduler tạo snapshot khi coverage toàn thị trường còn gap nhưng eligible universe đủ close EOD.
- Scheduler không tạo snapshot khi eligible universe còn gap và evidence nêu rõ lý do.
- Snapshot chỉ dùng EOD `vnstock` của mã listed; query và test khóa contract này.
- Không có API đọc nào được tạo hoặc cập nhật snapshot.
