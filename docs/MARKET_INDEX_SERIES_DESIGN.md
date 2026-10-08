# Contract series chỉ số thị trường (đề xuất)

## Mục tiêu

Thay fixture development trên Bảng giá bằng dữ liệu chỉ số có quyền hiển thị, timezone và semantics đủ rõ để người dùng không nhầm biểu đồ/biến động là dữ liệu thật khi nguồn chưa bảo đảm.

## Contract tối thiểu

Adapter provider cần cung cấp một object cho mỗi chỉ số với các trường sau:

| Trường | Ý nghĩa |
| --- | --- |
| `symbol` | Mã chỉ số ổn định, ví dụ `VNINDEX`, `VN30`, `HNXINDEX`, `HNX30`. |
| `provider`, `license`, `source_url` | Provider khác `fixture`, định danh quyền hiển thị đã duyệt, và URL HTTPS provenance. |
| `session_timezone` | Hiện bắt buộc `Asia/Ho_Chi_Minh`. |
| `return_type` | Chỉ một semantics `price_return` hoặc `total_return`; không trộn hai loại trong cùng so sánh/benchmark. |
| `observed_at`, `stale_after_seconds` | Thời điểm và cửa sổ stale rõ ràng. |
| `previous_close` | `session_date` và `close` dương để vẽ baseline/biến động phiên. |
| `points` | Ít nhất hai daily close dương, ngày ISO duy nhất và tăng chặt. |
| `intraday_points` | Nếu cung cấp: tối thiểu hai quote cùng ngày `observed_at`, tăng chặt, không nội suy/điền khuyết. |

`validateMarketIndexSeries` kiểm tra contract này ở frontend test boundary. Nó không fetch dữ liệu, không phê duyệt license và không tự sửa data gap. Backend adapter vẫn là nơi xác thực quyền truy cập, lưu raw provenance và áp dụng stale/session policy.

## Điều kiện mở production

1. Có văn bản/quyền hiển thị được ghi nhận cho từng provider/index.
2. Adapter backend trả payload đạt contract và test provider thực tế bao phủ timezone, previous close, stale và continuity.
3. API trả trạng thái `fresh`/`stale`/`error`; UI không fallback sang fixture ở production.
4. Chạy smoke với series thật trước khi bật selector chỉ số theo tài khoản hoặc benchmark hiệu suất.

Fixture hiện tại chỉ dành development/Preview và không phải implementation của contract này.
