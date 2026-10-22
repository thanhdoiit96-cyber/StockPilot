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

Rổ được chọn là [OfficialVN30](VN30_FORECAST_UNIVERSE_DESIGN.md): 30 thành viên theo publication VN30 point-in-time có quyền sử dụng, snapshot bất biến, 30-member/95% EOD gate và shadow evaluation riêng. Không hard-code, scrape không được cấp quyền hoặc suy ra constituent từ index/fixture/turnover hiện có.

OfficialVN30 bị khóa ở chế độ `internal_research_only`: không phát hành công khai/thương mại, không trả constituent qua readiness API và không phát hành forecast. Admin-only manifest ingest hiện chỉ nhận đúng 30 mã cùng HTTPS URL HOSE, canonical hashes và reference quyền; owner-attested pending được ghi rõ, không được hiểu là quyền đã xác minh. `GET /api/stocks/vn30-readiness` vẫn fail-closed với thiếu snapshot/quyền. Bước tiếp theo là nạp công bố HOSE kỳ đang hiệu lực, rồi thêm history/basis gate và forecast shadow. Liquid30 là nghiên cứu defer, không phải fallback tự động và không còn hiển thị trên Overview.

### 6. Exit guidance cho vị thế đang nắm giữ — shadow UI hoàn tất, scheduler đóng

[PORTFOLIO_EXIT_GUIDANCE_DESIGN.md](PORTFOLIO_EXIT_GUIDANCE_DESIGN.md) chốt hướng rule-based theo biến động/xu hướng, dữ liệu EOD bất biến và shadow evaluation riêng. Nó không tái sử dụng outcome của mô hình mua, không tự bán, không dùng quote intraday làm trigger và chưa có bằng chứng để gọi là khuyến nghị đầu tư.

Audit mã nguồn đã xác nhận weighted-average cost basis từ ledger giao dịch, nhưng corporate action hiện chỉ được áp trong valuation history. Engine thuần `position_exit_rule_v1` đã có và fail-closed với vị thế có corporate action chưa áp dụng.

Migration/snapshot ledger `043` đã hoàn tất local: snapshot bất biến theo portfolio chứa provenance/hash và cả trạng thái unavailable. Read-only API theo ownership và UI shadow trong Danh mục/Tổng quan cũng hoàn tất: UI chỉ gọi API khi tab này đang active, hiển thị rõ snapshot EOD hoặc unavailable, và không có thao tác lệnh. Không nối scheduler cho đến khi contract corporate-action/current-holding reconciliation được kiểm chứng.

`GET /api/portfolio/exit-guidance` chỉ trả snapshot shadow niêm phong gần nhất hoặc unavailable, không tạo snapshot/call provider khi đọc. Audit đã xác nhận writer `createPositionExitSnapshot` chưa có caller; vì vậy `no_shadow_snapshot` hiện là trạng thái mong đợi, không phải worker bị mất. Writer cũng đang đọc tối đa 200.000 row EOD toàn cục và chỉ nhận `portfolioId`, chưa đạt ngân sách truy vấn theo held symbol hay ownership scheduler. Contract [current-holding reconciliation](PORTFOLIO_CURRENT_HOLDINGS_RECONCILIATION_DESIGN.md), migration immutable `044`, pure reconciler và atomic sealing trước exit snapshot đã hoàn tất. [EOD generator design](PORTFOLIO_EXIT_EOD_GENERATOR_DESIGN.md) đã chốt durable owner/lock, held-symbol bounded query và dry-run gate. Bước tiếp theo cần evidence worker ownership và tối thiểu năm dry-run EOD trước khi thêm scheduler/config; sau đó mới baseline shadow ngoài mẫu. Scheduler, calibration và bất kỳ hành vi bán tự động nào vẫn đóng.

Exit EOD generator now has migration `047` and a manual bounded dry-run path; it has no scheduler. The first valid evidence run for 2026-10-21 covered 23/23 candidate holdings with exact-session EOD (aggregate: 19 hold, 2 cut-loss, 2 unavailable) and made zero provider calls; it created neither exit snapshots nor orders. Four further valid EOD dry-runs plus worker-owner/lock evidence are required before considering scheduler/config; automatic sales and calibration remain closed.

## Điều kiện nghiệm thu chung

- Backend thay đổi hành vi: test liên quan, migration khi đổi schema và lint không có warning hoặc error mới.
- Frontend thay đổi: unit/contract, production build và bundle integrity; browser smoke khi sửa luồng tương tác.
- Tài liệu: cập nhật PROJECT_STATUS, file thiết kế chịu trách nhiệm và INDEX/link khi thêm hoặc di chuyển tài liệu.
- Không gọi test/build là production proof; ghi rõ dependency và phần chưa chạy.
