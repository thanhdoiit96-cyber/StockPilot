# Trạng thái và bàn giao dự án

Cập nhật: 2026-10-21. Lịch sử checkpoint chi tiết trước lần rút gọn này nằm tại [PROJECT_STATUS_2026-10-19.md](archive/PROJECT_STATUS_2026-10-19.md). Tài liệu này chỉ giữ hiện trạng có thể dùng để tiếp tục công việc.

## Hiện trạng chạy local

- UI Vite Preview: `http://localhost:4173/`; backend: `http://localhost:5000`.
- `GET /api/ready` đã xác nhận database và worker local khả dụng. Đây là bằng chứng development, không phải production readiness.
- Cookie auth dùng same-origin `/api` qua proxy frontend. Không lưu hoặc ghi secret trong tài liệu.

## Các phần đã hoàn tất gần đây

### Khôi phục mật khẩu: thiết kế sẵn, chưa triển khai

- Đã rà soát auth hiện có: `users.password_version`, session revoke và validation password có thể tái dùng; chưa có email adapter hoặc provider.
- [PASSWORD_RECOVERY_DESIGN.md](PASSWORD_RECOVERY_DESIGN.md) chốt token 32 byte hash-only, expiry 30 phút, single-use/revocation, response chống enumeration, transaction revoke session và delivery adapter. Chưa thêm migration/API/UI để không tạo luồng gửi thư giả khi sender domain và mailbox test chưa có.

### Cảnh báo giá/dữ liệu: thiết kế sẵn, chưa triển khai

- [ALERTS_DESIGN.md](ALERTS_DESIGN.md) chốt cảnh báo in-app dựa trên close EOD/coverage có provenance, rule/event/evaluation ledger theo owner và dedupe theo rule/session. Không dùng quote intraday stale, không tự tạo tín hiệu từ Đề xuất và chưa có email/push.
- Chưa thêm migration/API/UI vì worker deploy có lock/ownership, retention và coverage SLA chưa được xác minh; node-cron local không là bằng chứng scheduler production.

### So sánh mã/ngành: thiết kế sẵn, chưa triển khai

- [COMPANY_COMPARISON_DESIGN.md](COMPANY_COMPARISON_DESIGN.md) chốt so sánh 2–5 mã theo metric cùng period/currency/basis, industry snapshot versioned và trạng thái unavailable/stale có provenance.
- Chưa thêm API/UI: company-data scheduler chỉ development opt-in, expansion coverage/provider rights và taxonomy snapshot chưa đủ để tạo peer/ranking trung thực.

### Đề xuất: đánh giá và hiệu chỉnh

- Outcome chỉ được tính vào report/calibration khi qua snapshot integrity, evaluation evidence, đủ phiên EOD, price provenance và return check.
- Runtime hiện có 0 outcome hợp lệ cho cohort `short_term_rule_v2`/20 phiên; 65 pending và 5 bị loại vì integrity. Không có cơ sở để hiệu chỉnh trọng số.
- Outcome của `short_term_rule_v2` không còn đổi trọng số `personalized_rule_v1`. API trả source/target/application status; mismatch giữ toàn bộ hệ số `1.00`. Xem [RECOMMENDATION_CALIBRATION_DESIGN.md](RECOMMENDATION_CALIBRATION_DESIGN.md).
- Kiểm chứng gần nhất: backend controller 12/12, frontend unit/contract 100/100, Playwright Recommendation 3/3, build và bundle integrity đạt.
- Lỗi hiển thị đã xác định: frontend từng bỏ snapshot EOD khi `as_of` nhỏ hơn ngày hiện tại. Snapshot gần nhất nay vẫn hiển thị kèm ngày EOD/stale notice; snapshot mới chỉ sinh sau khi EOD phiên hiện tại hoàn tất. Endpoint local đang có 5 đề xuất EOD ngày 2026-10-19, còn 5 outcome pending do kỳ theo dõi là 20 phiên.
- Evaluation job local được bật, nhưng outcome chỉ đổi khi đủ session EOD và snapshot integrity hợp lệ; UI Learning/History hiển thị rõ measured, pending và excluded thay vì suy diễn hiệu quả.
- EOD scheduler đã có luồng idempotent tạo snapshot sau ingestion chỉ khi coverage đầy đủ; `RECOMMENDATIONS_AFTER_INGEST` nay được đưa vào template và contract với default `false`. Local giữ cờ này `true`. Kiểm chứng: template contract đạt; Jest EOD/evaluation scheduler 16/16 đạt.
- Evidence scheduler ngày 2026-10-20 ghi 549/759 mã EOD, còn thiếu 210 nên job đã bỏ qua sinh snapshot đúng policy; retry cuối ngày vẫn chưa phủ đủ. Một snapshot `as_of=2026-10-20` hiện có nhưng endpoint `/latest` trước đây có side effect tự sinh khi snapshot cũ, nên không coi đó là bằng chứng scheduler đã hoàn tất. Endpoint nay chỉ đọc snapshot; chỉ EOD worker được quyền sinh dữ liệu. Test controller/EOD scheduler 25/25 đạt sau sửa.
- Cổng tạo snapshot EOD nay theo universe thật của `short_term_rule_v2`: mã listed có tối thiểu 50 phiên EOD trước phiên chạy và phải có close của phiên đó. Coverage 549/759 toàn thị trường tiếp tục được ghi để audit ingestion, nhưng không chặn một snapshot khi toàn bộ tập mô hình đã đủ; thiếu trong tập này vẫn bỏ qua và ghi `skipped_incomplete_recommendation_coverage`. Generator đọc riêng EOD `vnstock`/mã listed; test coverage, scheduler và persistence 33/33 đạt. Xem [RECOMMENDATION_EOD_AUTOMATION_DESIGN.md](RECOMMENDATION_EOD_AUTOMATION_DESIGN.md).
- Rà soát History/Calibration runtime: hai tab gọi được API và hiển thị pending/integrity/cohort đúng contract, nhưng 14 run/70 mã hiện có 0 outcome eligible; 65 pending, 5 excluded, 10 snapshot legacy chặn integrity và 70 mã thiếu taxonomy snapshot. Không tạo cohort tự động cho `personalized_rule_v1` vì weights là policy theo người dùng; xem quyết định tại [RECOMMENDATION_CALIBRATION_DESIGN.md](RECOMMENDATION_CALIBRATION_DESIGN.md).
- Forecast live endpoint local trả current-data preview nhưng frontend từng tắt cờ hiển thị. Local UI bật `VITE_ENABLE_FORECAST_LIVE=true`; nội dung vẫn là prototype/chưa có market-accuracy verified, không phải tín hiệu đầu tư.
- Tiêu đề “Xác suất prototype trên dữ liệu hiện tại” ở Tổng quan dùng màu cảnh báo và dấu trạng thái theo token sáng/tối, để phân biệt rõ current-data chưa xác minh với forecast đã qua gate.
- Xác suất dự đoán thị trường dùng RAG theo ý nghĩa kịch bản: Tăng lan tỏa đạt từ 60% là xanh, dưới 40% là đỏ; Giảm lan tỏa dùng thang đảo chiều (dưới 20% xanh, từ 40% đỏ); Cân bằng luôn vàng. Cả bản rút gọn và chi tiết có chú giải, giá trị phần trăm và nhãn kịch bản để màu không bị hiểu như khuyến nghị đầu tư. Unit test ngưỡng/giá trị lỗi đạt; build và preview local `:4173` trả HTML/bundle HTTP 200.
- Smoke check local `frontend/npm run verify:live:recommendations` nay bắt Chrome gọi trực tiếp proxy `:4173/api/recommendations/latest` (HTTP 200/5 mã), rồi đọc payload Recommendation/Forecast từ backend `127.0.0.1:5000` để kiểm tra UI `:4173`: snapshot EOD có danh sách mã và stale notice, tab Lịch sử mở được report, tab Hiệu chỉnh công bố trạng thái chưa áp dụng, Forecast hiển thị badge `Live`. Check chỉ đọc dữ liệu/API; không tạo recommendation, giao dịch hay outcome.
- Kiểm tra runtime 2026-10-21: scheduler evaluation đang bật và snapshot 2026-10-20 hash hợp lệ. Lifecycle ở `ready_to_evaluate`, nhưng 15 run/75 mã vẫn có 0 measured (70 pending, 5 excluded); không hiệu chỉnh trước khi đủ 20 phiên. UI Preview từng trả 404 do `dist/index.html` tracked tham chiếu bundle hash đã bị ignore. `dist` nay là build output hoàn toàn và `npm start` build trước khi preview; kiểm tra HTML và bundle hiện tại đều HTTP 200.
- Readiness nay dùng đúng contract scheduler (listed, `vnstock`/`1d`, close dương, phiên Việt Nam phân biệt và 50 phiên trước EOD). Audit 2026-10-21: 549 listed, 123 mã trong universe mô hình, 113 có EOD ngày 2026-10-20 và 10 mã (`VTQ`, `VW3`, `VWS`, `VXT`, `WTC`, `X26`, `XDH`, `XHC`, `XLV`, `YTC`) còn thiếu. Vì 10 mã đó vẫn có lịch sử đủ dài để được chấm điểm, snapshot scheduler vẫn phải bỏ qua cho đến khi provider có EOD hoặc evidence xác nhận chúng không còn thuộc universe; không hạ gate để tạo dữ liệu cũ.
- Scheduler coverage cũng yêu cầu close dương, nên một row EOD rỗng hoặc bằng 0 không thể được tính là covered rồi mở cổng snapshot.

### Danh mục: mục tiêu và nhật ký quyết định

- Mục tiêu phân bổ v1 lưu tỷ trọng theo mã, tổng tối đa 100%, trả deviation từ snapshot vị thế; không tạo lệnh hoặc notification.
- Nhật ký quyết định v1 lưu luận điểm, ngày rà soát, điều kiện vô hiệu và evidence snapshot server-verified. Nó không có return, giá mục tiêu hay kết luận đúng/sai. Xem [DECISION_JOURNAL_DESIGN.md](DECISION_JOURNAL_DESIGN.md).
- Close/Delete nhật ký có dialog xác nhận, nhận focus và hủy được bằng Escape trước mutation. Tab Danh mục có năm cột desktop, ba cột màn hình trung bình, hai cột mobile.
- Kiểm chứng gần nhất: frontend unit/contract 100/100; build/bundle integrity đạt; targeted Playwright Danh mục và Recommendation đạt. Không coi test mock là bằng chứng mutation trên dữ liệu người dùng thật.

### Nền tảng backend: lint

- Đã xử lý toàn bộ 38 warning ESLint: biến/đối số bỏ qua có chủ ý được đặt tên `_`, catch có lý do được ghi rõ, validation ký tự điều khiển giữ rule cục bộ có chú thích, và test/migration/seed không còn cảnh báo cơ học.
- Không thay đổi schema, API hay chính sách dữ liệu. Dịch vụ quote tiếp tục dùng nguồn VCI cố định như trước; tham số `source` vốn không có tác dụng đã được bỏ khỏi chữ ký nội bộ.
- Kiểm chứng: `npm.cmd run lint` sạch; Jest các mô-đun liên quan 101/101 và scheduler 4/4 đạt.

### Release gate backend

- `npm run verify:release` nay chạy lint trước toàn bộ Jest backend. Jest chạy tuần tự để tương thích môi trường hạn chế tạo tiến trình con; lệnh không thay thế kiểm thử PostgreSQL thật, browser, provider hay worker production.
- Kiểm chứng: full gate ngoài sandbox đạt 102 suite, 507 test trong 95,446 giây. Trong sandbox, hai test CLI bị chặn `spawnSync EPERM`; chạy riêng ngoài sandbox đạt 3/3, xác nhận đây là giới hạn môi trường kiểm thử chứ không phải lỗi assertion.

### Template cấu hình backend

- `backend/.env.example` đã bỏ các biến dự kiến/không được runtime đọc và chỉ giữ database, auth/CORS, worker/readiness, preview research và scheduler hiện hành. Không sửa `backend/.env` local.
- Bản sao template mặc định tắt preview và toàn bộ scheduler để không tự gọi provider. Bật từng phần vẫn cần worker, quyền nguồn và evidence tương ứng; điều này không làm thay đổi default của một môi trường đã có `.env`.
- `npm run check:env-template` nay khóa contract gồm 28 biến hoạt động, phát hiện key trùng/ngoài contract và bắt buộc mọi cờ scheduler/preview là `false`; lệnh đã nằm trong release gate.
- Kiểm chứng: full release gate ngoài sandbox đạt lint, contract template và 102 suite/507 test trong 96,059 giây.

### Template cấu hình frontend

- `npm run check:env-template` khóa ba biến public được hỗ trợ: `VITE_API_BASE_URL` phải rỗng để browser dùng proxy `/api` cùng origin; hai cờ forecast mặc định `false`; key trùng hoặc ngoài contract làm lệnh thất bại.
- Kiểm tra này đã nằm đầu `frontend/npm run verify:release`, nên không thể vô tình đưa secret vào template public hoặc làm cookie authentication đi qua URL API tuyệt đối.
- Kiểm chứng: frontend release gate đạt template contract, encoding, API error contract, 100 unit/contract test, bundle integrity và Prometheus contract.

### Hiệu năng Bảng giá: đo lifecycle trước refactor

- Trình đo live UI nay tách thao tác bấm điều hướng, mount panel, hàng dữ liệu và request `/api/stocks`, quote/status; mặc định lấy 5 mẫu để không kéo dài dev loop.
- Mẫu live ngày 2026-10-20 (UI `:4173`, backend `:5000`) ban đầu ghi 30 giây vì harness gọi `textContent()` trên locator lỗi không tồn tại; Playwright chờ timeout trước khi trả về. Mẫu xác nhận sau khi sửa: hàng đầu tiên gắn vào DOM 4 ms sau panel mount, panel không hidden, và quote settle 2.867 ms. Harness nay poll node DOM trực tiếp, chỉ đọc lỗi khi locator tồn tại và lưu snapshot state; default là 5 mẫu nhưng cho phép một mẫu khi chẩn đoán.
- Không có bằng chứng lazy chunk hay kích thước `App.jsx` là nút thắt. Request quote có dao động và có abort khi lifecycle đổi, nhưng chưa ngăn dữ liệu hiển thị. Không refactor/tách `App.jsx` vì suy đoán.
- `npm.cmd run build` đạt (Vite build và bundle integrity). Lần chạy Playwright `market-board-productivity` dùng web server test mới không render được `.dashboard-shell` trong 5 giây; đã dừng sau các failure đầu tiên, chưa dùng nó là bằng chứng hành vi Bảng giá.

## Giới hạn giữ nguyên

- Recommendation, forecast và dữ liệu provider vẫn research/internal prototype cho đến khi có evidence, quyền nguồn và validation ngoài mẫu phù hợp.
- Forecast live, company-data scope mở rộng, so sánh mã/ngành, cảnh báo giá/dữ liệu và khôi phục mật khẩu chưa được mở: chúng lần lượt cần evidence dữ liệu, scheduler/kênh gửi hoặc email delivery provider.
- Chưa kiểm chứng deploy production, worker/scheduler production, backup/restore hoặc browser flow bằng tài khoản development thật trong checkpoint hiện tại.

## Điểm tiếp tục

1. Chạy lại baseline 5 mẫu với harness đã sửa nếu cần thay đổi lifecycle; chỉ tách `App.jsx` khi số đo mới chứng minh lợi ích. Nền tảng lint, release gate và contract cấu hình backend/frontend hiện đã được chuẩn hóa.
2. Duy trì gate Đề xuất: không hiệu chỉnh hay diễn giải hiệu quả khi outcome chưa hợp lệ.
3. Khi thay đổi tính năng, cập nhật tài liệu thiết kế chịu trách nhiệm, file này và [ROADMAP.md](ROADMAP.md); đưa record cũ vào archive thay vì kéo dài tài liệu hiện hành.
