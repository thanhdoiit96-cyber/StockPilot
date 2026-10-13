# Dòng tiền khối ngoại

Ngày audit: 2026-10-13. Phạm vi hiện tại là nền tảng ingestion và aggregation; chưa dùng dòng tiền khối ngoại để thay đổi điểm dự báo hoặc đề xuất.

## Kết quả audit

- `stock_prices` hiện có 56.735 quan sát từ 02/01/2025 đến 12/10/2026 nhưng không có trường mua/bán khối ngoại. OHLCV không cho phép suy ra nhà đầu tư nước ngoài, nên tổng volume hoặc màu giá không được thay thế cho foreign flow.
- Recommendation hiện chỉ chấm kỹ thuật, momentum, RSI, stability và liquidity. Forecast current-data chỉ dùng return 1/5/20 phiên. Market breadth dùng A/D và volume breadth. Không luồng nào đang nhận dữ liệu khối ngoại; vì vậy ảnh hưởng hiện tại bằng không.
- Vnstock công bố `Market().equity(symbol).foreign_flow()` ở nhóm tính năng tài trợ. Nguồn có thể trả volume/value mua và bán theo ngày, nhưng quyền truy cập API không đồng nghĩa quyền hiển thị lại trên production. License và coverage phải được lưu cùng dữ liệu.
- Runtime development đang dùng `vnstock 4.0.8`; kiểm tra ngày 13/10 chưa thấy method `foreign_flow` trên equity client với entitlement hiện tại. Do đó bảng mới vẫn rỗng và F-flow-2 phụ thuộc quyền sponsor/API tương ứng; không có fixture nào được ghi vào PostgreSQL như dữ liệu thật.

## Contract đã triển khai

Migration `038_add_foreign_flow_metrics` tạo `foreign_flow_daily` tách khỏi OHLCV để nguồn, license, correction và độ phủ của foreign flow không làm thay đổi candle giá. Grain duy nhất là `(stock_id, provider, source, session_date)`.

Mỗi observation giữ bốn số gốc không âm: `buy_volume`, `sell_volume`, `buy_value`, `sell_value`; `net_volume` và `net_value` luôn tính khi đọc. Không chỉ nhận một số net vì không thể kiểm tra hai phía. Metadata gồm provider/source, provider symbol, currency, license URL, thời điểm tải và SHA-256 nội dung.

`VnstockForeignFlowAdapter` fail-closed khi thiếu một trong bốn số. Ingestion insert/skip/update correction idempotent. `foreignFlow` tổng hợp theo mã hoặc ngành, trả `available`, `partial` hoặc `unavailable`; dữ liệu thiếu không bao giờ được xem là dòng tiền 0. Ngưỡng coverage mặc định 80%. Output hiện có `scored: false`.

## Tác động dự kiến và thứ tự triển khai

1. **F-flow-1 — Persistence (đã triển khai):** schema, model, adapter boundary, hash provenance, idempotent ingestion, aggregation mã/ngành và coverage policy.
2. **F-flow-2 — Provider job (đã triển khai code, chờ entitlement):** bridge/worker endpoint riêng gọi foreign-flow sponsor API, CLI backfill giới hạn 50 mã và 366 ngày, scheduler development opt-in lúc 17:00 ICT. Probe FPT ngày 13/10 fail-closed với `foreign_flow capability is unavailable`; database không bị ghi. Nghiệm thu dữ liệu vẫn chờ đối chiếu field semantics và coverage.
3. **F-flow-3 — Read API/UI:** endpoint theo phiên, top mua/bán ròng và drill-down ngành/mã. UI hiển thị phiên, coverage, nguồn và trạng thái quyền; không render số 0 khi unavailable.
4. **F-flow-4 — Feature research:** tạo các feature khóa trước như net value/traded value, net volume/volume, z-score 20 phiên, persistence 5 phiên và breadth số mã mua ròng. Winsorize theo train, không dùng dữ liệu sau cutoff.
5. **F-flow-5 — Forecast/recommendation validation:** challenger walk-forward so với baseline không có foreign flow. Chỉ model version mới được dùng feature này nếu Brier/log-loss ngoài mẫu cải thiện ổn định và coverage đạt gate. Recommendation chỉ thêm điểm sau ablation; trước đó chỉ hiển thị evidence quan sát.

## Quy tắc an toàn

- Mua ròng không đồng nghĩa giá sẽ tăng và không được diễn giải nhân quả.
- Không trộn ranking top-N với universe đầy đủ để tính breadth/ngành; top-N bị selection bias.
- Aggregation ngành dùng taxonomy được đóng băng tại snapshot; mã thiếu ngành vào `other` và được báo coverage.
- Forecast snapshot phải seal feature value, session cutoff, membership, coverage và source hash. Correction về sau không viết lại dự báo đã phát hành.
- Production display tiếp tục bị khóa tới khi xác nhận quyền hiển thị/redistribution; development có thể ingest với nhãn quyền đang chờ xác nhận.
