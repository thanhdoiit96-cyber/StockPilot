# Lộ trình hoàn thiện dự án

Cập nhật: 2026-10-22. Lịch sử roadmap và checkpoint đã thay thế được giữ tại [ROADMAP_2026-10-19.md](archive/ROADMAP_2026-10-19.md). Bản này là nguồn ưu tiên, phụ thuộc và tiêu chí nghiệm thu hiện hành.

## Nguyên tắc phát triển

- Không hạ gate evidence để mở forecast, recommendation, provider scope hoặc tín hiệu đầu tư.
- Mọi số liệu tài chính mới cần `as_of`, provenance và trạng thái unavailable/stale trung thực.
- Đo request, payload và render trước khi thêm pagination, polling, cache hoặc virtualization.
- Tính năng có mutation phải có ownership, validation, empty/loading/error/success và kiểm thử tương xứng.

## Trạng thái mốc

| Mốc | Trạng thái | Điều kiện còn lại |
| --- | --- | --- |
| A — Nền tảng | Code/config chính hoàn thành | Archive tài liệu, dọn sạch 38 warning ESLint, release gate và contract template backend/frontend an toàn đã hoàn thành; verification tiếp tục theo thay đổi |
| B — Frontend/lifecycle | Lazy-load và request ownership chính hoàn thành | Chẩn đoán live 2026-10-20 xác nhận hàng đầu tiên gắn vào DOM 4 ms sau panel mount; số 30 giây ban đầu là harness đọc locator lỗi không tồn tại. Baseline API 5 mẫu 2026-10-21 ghi quote p50/p95 683/1.732 ms; đo lại 2026-10-22 ghi 952/3.762 ms. Cả hai vẫn thiếu BCG ở 5/5 mẫu (39/40 mã): harness, endpoint và Bảng giá công bố coverage/mã thiếu, dùng EOD trung thực cho phần còn lại thay vì coi HTTP 200 là đầy đủ. Vite local fallback dùng IPv4 `127.0.0.1:5000` để tránh request treo khi backend chỉ bind IPv4. Chỉ tách App.jsx khi baseline browser mới cho thấy lợi ích |
| C — Readiness dữ liệu | Database/worker local và EOD scheduler sau phiên đã cấu hình | EOD local chạy từ 15:05 ICT, retry đến 19:45 và worker healthy, nhưng phiên 2026-10-21 chỉ phủ 357/549 mã (65,0%); gap tập trung UPCoM (coverage 38,8%, so với HSX 94,4% và HNX 72,8%). Chưa xác nhận scheduler/worker production, provider rights hoặc coverage đủ để mở các tính năng phụ thuộc |
| D — Tính năng người dùng | Allocation target, decision journal và accessibility/mobile hoàn thành | Hạng mục còn lại có dependency bên ngoài |
| M6 — Phát hành | Tạm hoãn theo quyết định sản phẩm | Preflight local và [RELEASE_READINESS_DESIGN.md](RELEASE_READINESS_DESIGN.md) được giữ để tiếp tục khi có authority môi trường đích. Không triển khai hay suy diễn production readiness trong thời gian tạm hoãn |

## Ưu tiên tiếp theo theo dependency

### 1. Khôi phục mật khẩu — thiết kế sẵn, chờ email delivery

Thiết kế token một lần, hash trong database, expiry/revocation, rate limit và audit đã ghi tại [PASSWORD_RECOVERY_DESIGN.md](PASSWORD_RECOVERY_DESIGN.md). Nghiệm thu chỉ bắt đầu sau khi email provider, domain gửi và môi trường test được chốt.

### 2. Cảnh báo giá/dữ liệu — thiết kế sẵn, chờ worker ownership

Bắt đầu bằng cảnh báo trong ứng dụng dùng dữ liệu snapshot/provenance. [ALERTS_DESIGN.md](ALERTS_DESIGN.md) đã chốt rule/event/ledger và EOD gate. Chỉ thêm email hoặc push sau khi job lock, retry, worker ownership và delivery channel được xác minh. Không polling nhanh hơn quote policy.

### 3. So sánh mã/ngành — thiết kế sẵn, chờ coverage và license

Chỉ mở dữ liệu doanh nghiệp/ngành khi coverage, freshness, provider rights và schema thống nhất đạt gate. [COMPANY_COMPARISON_DESIGN.md](COMPANY_COMPARISON_DESIGN.md) chốt period/provenance/taxonomy contract. Mọi nhóm thiếu dữ liệu phải hiển thị unavailable thay vì proxy bằng số liệu không tương đương.

### 4. Recommendation calibration — chờ outcome tương thích

Chỉ áp dụng hệ số sau khi chính model/horizon đích có snapshot bất biến, outcome hợp lệ, đủ mẫu và kiểm tra ổn định theo snapshot độc lập. Chi tiết ở [RECOMMENDATION_CALIBRATION_DESIGN.md](RECOMMENDATION_CALIBRATION_DESIGN.md).

Trước khi mở cohort `personalized_rule_v1`, cần chốt profile criteria versioned theo owner; không gộp các xếp hạng cá nhân vào một cohort chung.

Recommendation snapshot theo lịch chỉ được coi là tự động hoàn tất khi evidence EOD coverage của chính session đạt gate; `GET /api/recommendations/latest` chỉ đọc, không được dùng để bù scheduler.

Gate EOD của snapshot dùng coverage của universe đủ 50 phiên lịch sử theo model, đồng thời vẫn lưu coverage toàn bộ mã listed để theo dõi ingestion. Chi tiết và tiêu chí nghiệm thu: [RECOMMENDATION_EOD_AUTOMATION_DESIGN.md](RECOMMENDATION_EOD_AUTOMATION_DESIGN.md).

Pending progress is display-only: it may count distinct stored EOD sessions after the snapshot, but cannot imply an outcome, return or calibration before the full horizon and integrity checks.

### 5. Forecast/live data — giữ research gate

Tiếp tục data evidence, point-in-time availability, out-of-sample validation và shadow evaluation. Current-data UI nay công bố riêng các điều kiện dữ liệu và những điều kiện market-evidence còn chờ, nhưng đó chỉ là disclosure không phải mở gate. Không mở UI live signal hoặc diễn giải market performance trước khi tất cả gate đạt.

Mở rộng VN30 bắt đầu tại F0 contract trong [VN30_FORECAST_UNIVERSE_DESIGN.md](VN30_FORECAST_UNIVERSE_DESIGN.md): cần membership source point-in-time có quyền sử dụng, snapshot bất biến, 30-member/95% EOD gate và shadow evaluation riêng. Không hard-code hoặc suy ra constituent từ index/fixture hiện có.

Ưu tiên được chọn thay VN30 là [Liquid30](LIQUID30_FORECAST_UNIVERSE_DESIGN.md): Top 30 theo `traded_value` EOD toàn thị trường, chỉ phát hành khi coverage ≥95%. Theo ngoại lệ nghiên cứu tạm thời được phê duyệt, ≥65% có thể tạo rổ `partial_observed_universe` từ EOD đã quan sát, kèm numerator/denominator/scope và `research_only`; nó không phải toàn thị trường, không phát hành xác suất và không mở calibration. Coverage hiện 65,0%, nên chỉ đường nghiên cứu này khả dụng; release gate không hạ.

Hiện đường nghiên cứu cũng chưa mở được: kiểm tra runtime ghi 0/549 row có đồng thời close, `traded_value` dương và `price_unit` cho phiên 2026-10-21. Bước phụ thuộc kế tiếp là xác minh mapping/provenance turnover trong ingestion; không thay bằng `close×volume` hoặc ranking từ dữ liệu không so sánh được.

### 6. Exit guidance cho vị thế đang nắm giữ — thiết kế sẵn, chưa triển khai

[PORTFOLIO_EXIT_GUIDANCE_DESIGN.md](PORTFOLIO_EXIT_GUIDANCE_DESIGN.md) chốt hướng rule-based theo biến động/xu hướng, dữ liệu EOD bất biến và shadow evaluation riêng. Nó không tái sử dụng outcome của mô hình mua, không tự bán, không dùng quote intraday làm trigger và chưa có bằng chứng để gọi là khuyến nghị đầu tư. Bước tiếp theo là audit quality/adjustment/cost basis của các vị thế đang nắm giữ trước khi viết schema hay UI.

Audit mã nguồn đã xác nhận weighted-average cost basis từ ledger giao dịch, nhưng corporate action hiện chỉ được áp trong valuation history. Engine thuần `position_exit_rule_v1` đã có và fail-closed với vị thế có corporate action chưa áp dụng; bước tiếp theo là migration/snapshot ledger cho exit guidance, rồi mới có read API và UI shadow.

## Điều kiện nghiệm thu chung

- Backend thay đổi hành vi: test liên quan, migration khi đổi schema và lint không có warning hoặc error mới.
- Frontend thay đổi: unit/contract, production build và bundle integrity; browser smoke khi sửa luồng tương tác.
- Tài liệu: cập nhật PROJECT_STATUS, file thiết kế chịu trách nhiệm và INDEX/link khi thêm hoặc di chuyển tài liệu.
- Không gọi test/build là production proof; ghi rõ dependency và phần chưa chạy.
