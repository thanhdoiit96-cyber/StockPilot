# Cảnh báo giá và chất lượng dữ liệu — thiết kế v1

> Trạng thái: đề xuất, chưa có migration, API, scheduler riêng hay UI. V1 chỉ mở thông báo trong ứng dụng sau khi worker ownership và EOD provenance được kiểm chứng; email/push không thuộc phạm vi cho đến khi có delivery channel.

## Vấn đề, người dùng và phạm vi

Nhà đầu tư cần biết khi một ngưỡng giá theo dõi đã được quan sát trong snapshot đáng tin cậy, hoặc khi dữ liệu EOD của mã họ đang theo dõi không đủ để diễn giải kết quả. Họ không cần một luồng quote liên tục gây nhiễu, dự báo giá hay lệnh giao dịch.

V1 có hai loại: `PRICE_CROSSED` dựa trên close EOD đã lưu và `DATA_COVERAGE_GAP` dựa trên kết quả coverage cùng ngày. Không suy luận từ quote intraday stale, không dùng alert để khuyến nghị mua/bán, không gửi email/push, không tự tạo rule từ Đề xuất.

## Lựa chọn và trade-off

| Hạng mục | Phương án chọn | Lý do |
| --- | --- | --- |
| Nguồn giá | `stock_prices` provider/interval/as_of được niêm phong tại lần trigger | Có provenance, replay được và không biến quote tạm thời thành sự kiện |
| Tần suất | Evaluate sau EOD ingestion hoàn chỉnh, không polling browser | Khớp policy dữ liệu, giảm request và duplicate |
| Phạm vi v1 | Rule do owner tạo, thông báo trong ứng dụng | Có ownership/read state; không phụ thuộc kênh gửi ngoài |
| Dedupe | Một event cho rule + session date + direction | Retry job idempotent không spam cùng phiên |
| Dữ liệu thiếu | Event chất lượng dữ liệu chỉ khi mã nằm trong watchlist/portfolio/rule active | Không cảnh báo toàn thị trường không liên quan |

Giải pháp đơn giản hơn là popup theo quote client. Nó mất sự kiện khi tab đóng, không có provenance và bị stale/refresh lặp. Phương án mở rộng với webhook/email/push cần outbox, retry, rate-limit delivery và consent riêng nên để sau.

## Contract dữ liệu và API đề xuất

Migration dự kiến có ba bảng, tất cả ownership theo `user_id`:

- `alert_rules`: `id`, `user_id`, `stock_id?`, `type`, `direction`, `threshold_price?`, `active`, `last_evaluated_session`, timestamps. Validation bắt buộc một mã và ngưỡng dương cho `PRICE_CROSSED`; `DATA_COVERAGE_GAP` không nhận ngưỡng.
- `alert_events`: `id`, `rule_id`, `user_id`, `session_date`, `event_type`, `payload` JSONB đã chuẩn hóa (symbol, close, provider, observed_at, coverage reason), `read_at`, timestamps. Unique `(rule_id, session_date, event_type)`.
- `alert_evaluations`: run ledger gồm session, worker run id, started/finished, status, counts và error đã sanitize. Không lưu quote/token/provider secret.

Endpoint dự kiến: `GET/POST/PATCH/DELETE /api/alerts/rules`, `GET /api/alerts/events?cursor=`, `POST /api/alerts/events/:id/read`. Mọi mutation requireAuth, ownership, CSRF ở cookie mode và validation server-side. Client không gửi payload event, price hoặc trạng thái trigger.

## Scheduler và tính đúng đắn

Evaluator chỉ chạy sau `ingestVnstockEod` báo coverage đầy đủ; nó nhận explicit `session_date` và `ingestion_run_id`, không tự đoán ngày giao dịch. Nếu coverage thiếu, không trigger price rule; có thể tạo data-gap event với reason/provenance khi và chỉ khi rule/mã liên quan. Retry cùng session dùng unique constraint và transaction để idempotent.

Worker phải có single ownership/lock ở môi trường deploy, retry bounded và ledger. Node-cron local hiện có chỉ là cơ chế development; không dùng nó làm bằng chứng job production. Khi worker dừng, UI hiển thị `last_evaluated_session` và unavailable/stale thay vì tuyên bố đang theo dõi.

## Trải nghiệm, riêng tư và hiệu năng

Tab Cảnh báo đặt trong Danh mục/Watchlist: form tạo rule trước, danh sách rule active/inactive sau đó, event mới nhất có ngày EOD, close, nguồn và nút đánh dấu đã đọc. Empty/loading/error/success rõ ràng; delete/disable có xác nhận, focus và Escape; form/mobile dùng label/keyboard/screen reader.

Ngân sách v1: tối đa 100 active rules/user, trả 50 event/lần với cursor; chỉ đọc event khi mở tab, không polling nhanh. Badge unread có thể cập nhật sau refresh hồ sơ hoặc websocket đã được thiết kế riêng, không thêm polling chỉ vì badge.

## Điều kiện mở và nghiệm thu

Trước khi code phải chốt worker deployment/lock, EOD coverage SLA thực tế, retention event, ownership khi user xóa mã, và hành vi holiday/provider outage. Nghiệm thu gồm migration up/down, ownership, CSRF, validation, EOD provenance, missing coverage, retry/idempotency, race, read/unread và UI accessibility. Email/push chỉ bắt đầu khi có consent, outbox và delivery provider được kiểm chứng.

Thiết kế này không phải schema/API hiện có và không tạo thông báo trong hệ thống đang chạy.
