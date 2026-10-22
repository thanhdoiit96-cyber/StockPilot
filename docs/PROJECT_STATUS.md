# Trạng thái và bàn giao dự án

Cập nhật: 2026-10-22. Lịch sử checkpoint chi tiết trước lần rút gọn này nằm tại [PROJECT_STATUS_2026-10-19.md](archive/PROJECT_STATUS_2026-10-19.md). Tài liệu này chỉ giữ hiện trạng có thể dùng để tiếp tục công việc.

## Hiện trạng chạy local

- UI Vite Preview: `http://localhost:4173/`; backend: `http://localhost:5000`.
- `GET /api/ready` đã xác nhận database và worker local khả dụng. Đây là bằng chứng development, không phải production readiness.
- Kiểm tra vận hành lại ngày 2026-10-21: worker Vnstock (`:8787`) trả `200` với concurrency `1`; backend health/ready (`:5000`) và UI preview (`:4173`) đều trả `200`. Readiness ghi database khả dụng (99 ms) và worker khả dụng (1 ms). Các tiến trình được giữ chạy local; không suy diễn kết quả này thành xác nhận scheduler, provider hoặc production.
- Khởi động lại và smoke local ngày 2026-10-22: worker, backend health/ready, UI Preview và `/api/health` qua proxy đều trả thành công. Worker dùng interpreter `py` đã có `vnstock 4.0.8`/`vnai 2.6.0`; shared `.venv` không phải runtime của worker và không được dùng để suy ra dependency bị thiếu.
- Forecast LIVE từng trả `503 { code: "EPERM" }` sau khi backend được khởi động trong sandbox: route LIVE cố ý bypass worker để spawn bridge Python EOD riêng, nên sandbox chặn child process. Đây không phải worker thiếu, cờ `FORECAST_LIVE_PREVIEW` sai hay fallback logic. Khởi động lại cùng backend ngoài sandbox ngày 2026-10-22 đã khôi phục `/api/forecast/live-preview` và frontend proxy: `200`, provider `vnstock`, `live=true`, `synthetic=false`, `research_only=false`, gate `live_ready=true`, 252 quan sát mới ngày 2026-10-22. Đây vẫn là current-data prototype, không phải forecast đã xác minh độ chính xác.
- Check read-only sau khung retry cùng ngày vẫn ghi EOD `2026-10-21` là 357/549 mã (65,0%), thiếu 192 và `ready=false`; evidence mới nhất là gap retry lúc `12:45:00Z` (19:45 ICT), còn 192 mã. Backend `ready`, worker concurrency 1 và frontend/proxy `/api/ready` đều trả thành công. Không chạy lại ingest hoặc nới gate vì chưa có tín hiệu provider mới.
- Cookie auth dùng same-origin `/api` qua proxy frontend. Không lưu hoặc ghi secret trong tài liệu.

## Forecast/recommendation experience update — 2026-10-22

- Product analysis completed for exit guidance on held positions: [PORTFOLIO_EXIT_GUIDANCE_DESIGN.md](PORTFOLIO_EXIT_GUIDANCE_DESIGN.md) proposes a separately versioned EOD, volatility/trend rule model for `cut_loss`, `trailing_protect`, `take_profit_review`, `hold` and `unavailable`. It is shadow-first, records position/cost/input provenance, does not auto-sell or reuse buy-model outcomes, and remains unimplemented pending a held-position price/cost/adjustment audit.

- Forecast current-data now exposes a fail-closed `validation` disclosure in the existing live-preview response. The expanded Evidence panel separates completed current-data checks from the pending probability-calibration, independent-audit and provider-validation gates. `market_accuracy_verified` remains false; this is a monitoring/provenance disclosure, not a live signal, recommendation or performance claim.
- Returning to Overview now reuses a valid Forecast LIVE payload in module memory for at most 60 seconds, keyed by horizon and symbols. Retry bypasses it; errors are never cached and no data is persisted. This removes repeated bridge calls caused solely by page unmount/remount without masking freshness.
- The implementation reuses the preview payload. It adds no provider request, polling, cache or persisted client state. The frontend rejects a live payload without this disclosure instead of implying readiness.
- Recommendation remains at 0 eligible outcomes for the compatible `short_term_rule_v2`/20-session cohort. Its existing history/calibration UI continues to show pending/integrity states; no cross-model calibration is enabled.
- Recommendation History now reads only stored EOD rows to show each pending symbol's observed/remaining session count. It does not manufacture an outcome, alter an immutable snapshot, query a provider or unlock calibration.
- VN30 expansion F0 is specified in [VN30_FORECAST_UNIVERSE_DESIGN.md](VN30_FORECAST_UNIVERSE_DESIGN.md). Audit found no licensed point-in-time constituent source/schema in the current repository; index fixtures/series are not a constituent source. The work is therefore fail-closed at the readiness boundary and does not replace the three-symbol LIVE prototype.
- Product decision now prefers Liquid30 over VN30: [LIQUID30_FORECAST_UNIVERSE_DESIGN.md](LIQUID30_FORECAST_UNIVERSE_DESIGN.md) defines Top 30 by stored, verified EOD `traded_value` with a 95% whole-market coverage gate. Latest evidence is 357/549 (65.0%), so no ranking, shadow issuance or UI switch is permitted yet.
- Liquid30 readiness service now enforces the contract against stored rows: same latest session, positive close/turnover, non-empty `price_unit`, 95% coverage, deterministic turnover ranking and exactly 30 constituents. It is not wired to issuance while runtime coverage is below gate.
- Read-only coverage audit on 2026-10-22 confirms the 2026-10-21 EOD gap is 192/549: HSX 11/196 missing (94.4% covered), HNX 28/103 (72.8%) and UPCoM 153/250 (38.8%). Missing rows split into 48 never seen, 29 only previous session and 115 stale history. The final scheduled gap retry requested 192 but selected 25 without any traded match; treat UPCoM/provider capability and symbol mapping as the first remediation investigation, not a reason to lower Liquid30's 95% gate or repeatedly re-ingest the full universe.
- User-approved temporary exception: Liquid30 may use a >=65% observed-EOD subset only as `partial_observed_universe` research. It must retain coverage/scope, cannot be called whole-market, and keeps market-accuracy/calibration gates closed.
- Liquid30 now has a database-only `GET /api/stocks/liquid30-readiness` contract. It reads one stored VNStock daily session, verifies positive close/turnover and `price_unit`, ranks deterministic Top 30, and returns `ready` at >=95% or the user-approved `partial_observed_universe` at >=65%; the latter is `research_only` with the frozen session/coverage in payload. Dashboard Evidence consumes this endpoint rather than independently inferring a basket from generic quality data. It makes no provider request and still does not issue a Liquid30 forecast.
- Runtime check after backend restart: `GET /api/stocks/liquid30-readiness` now reaches the new route, but returns `unavailable` for `2026-10-21` with eligible coverage `0/549` and reason `market_coverage_below_threshold`. The generic 357/549 EOD count does not prove a verified turnover basis: current stored rows lack the required positive `traded_value` and/or `price_unit`. Therefore the UI message “Chưa đủ dữ liệu EOD để lập rổ Liquid30” is correct for this session. Do not derive turnover from close×volume; investigate the ingestion field mapping/provenance before enabling the 65% observed-subset path.

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
- Preflight `check:sector-readiness` nay chỉ in summary theo ngành và giữ report mã chi tiết ở evidence; đặt `SECTOR_READINESS_VERBOSE=true` khi điều tra. Regression test khóa việc summary không lộ danh sách mã; bộ test scheduler/controller/CLI liên quan đạt 33/33, contract template và lint đạt. Kiểm tra 2026-10-21: 124/624 mã đạt ngưỡng 50 quan sát, 500 mã chưa đạt, nên vẫn không mở so sánh/ranking.

### Đề xuất: đánh giá và hiệu chỉnh

- Outcome chỉ được tính vào report/calibration khi qua snapshot integrity, evaluation evidence, đủ phiên EOD, price provenance và return check.
- Vận hành ngày 2026-10-21: preflight xác nhận phiên EOD `2026-10-21` sẵn sàng sinh snapshot; generator đã tạo run `8960236f-75ec-4475-8098-f591496a828a` cho 549 mã, chọn 5 mã bằng `short_term_rule_v2`, với snapshot hash `87ae8b294f990d98ba0f8cb8ef6a4ad0230f725e30dd4c51827753c32c53ae8d`. Lifecycle sau đó là `ready_to_evaluate`; evaluation đã xét 25 recommendation trên 5 run integrity hợp lệ, nhưng `measured=0` và không có outcome dương/âm. Có 18 run legacy bị bỏ qua vì `snapshot_integrity_failed`. Snapshot mới giữ `pending` theo horizon 20 phiên; API learning báo `sample_count=0`, `model_mismatch` và `application_status=not_applied`, nên không hiệu chỉnh trọng số.
- Runtime hiện có 0 outcome hợp lệ cho cohort `short_term_rule_v2`/20 phiên; 75 pending và 5 bị loại vì integrity. Không có cơ sở để hiệu chỉnh trọng số.
- Outcome của `short_term_rule_v2` không còn đổi trọng số `personalized_rule_v1`. API trả source/target/application status; mismatch giữ toàn bộ hệ số `1.00`. Xem [RECOMMENDATION_CALIBRATION_DESIGN.md](RECOMMENDATION_CALIBRATION_DESIGN.md).
- Kiểm chứng gần nhất: backend controller 12/12, frontend unit/contract 100/100, Playwright Recommendation 3/3, build và bundle integrity đạt.
- Lỗi hiển thị đã xác định: frontend từng bỏ snapshot EOD khi `as_of` nhỏ hơn ngày hiện tại. Snapshot gần nhất nay vẫn hiển thị kèm ngày EOD/stale notice; snapshot mới chỉ sinh sau khi EOD phiên hiện tại hoàn tất. Endpoint local đang có 5 đề xuất EOD ngày 2026-10-19, còn 5 outcome pending do kỳ theo dõi là 20 phiên.
- Evaluation job local được bật, nhưng outcome chỉ đổi khi đủ session EOD và snapshot integrity hợp lệ; UI Learning/History hiển thị rõ measured, pending và excluded thay vì suy diễn hiệu quả.
- EOD scheduler đã có luồng idempotent tạo snapshot sau ingestion chỉ khi coverage đầy đủ; `RECOMMENDATIONS_AFTER_INGEST` nay được đưa vào template và contract với default `false`. Local giữ cờ này `true`. Kiểm chứng: template contract đạt; Jest EOD/evaluation scheduler 16/16 đạt.
- Lịch EOD mặc định được đưa sớm lên 15:05 `Asia/Ho_Chi_Minh`, năm phút sau khi phiên UPCoM kết thúc lúc 15:00; retry gap chạy lúc 15:15/15:30/15:45, rồi mỗi 15 phút từ 16:00 đến 19:45. Lần chạy sớm vẫn phải qua coverage/close dương, nên response provider partial chỉ được ghi incomplete và không tạo snapshot. Backend local đã restart, API `data-quality` công bố đúng ba lịch này; controller/EOD scheduler 32/32 và lint đạt. Đây là lịch development process-local, chưa xác nhận scheduler production hoặc SLA công bố EOD của provider.
- Kết thúc khung retry 2026-10-21 lúc 19:45 ICT: worker health đạt, coverage EOD phiên 2026-10-21 là 357/549 mã (65,0%), còn 192 mã thiếu nên `ready=false`. Snapshot Đề xuất hash-backed hiện hữu vẫn hợp lệ; không sinh dữ liệu hay snapshot từ phần coverage thiếu.
- Probe read-only rải đều 10/192 gap EOD sau phiên cho `SBM, SGH, SSC, TDF, TNB, TVA, VCR, VIN, VSM, YTC`: 10/10 vẫn present trong listing và có history provider, không có request error; price-board chỉ có reference price, không có trade price, và latest session provider đều trước 2026-10-21. Evidence `vnstock-history-gap-probe-2026-10-21T15-42-47-538Z.json` chỉ cho thấy provider chưa trả EOD mới cho mẫu này, không phải bằng chứng mã không giao dịch; giữ nguyên gap/retry policy.
- Probe read-only EODHD cho cùng 10 mã gap của phiên `2026-10-21` cũng trả `no_rows` 10/10, không có request error; control `FPT` cùng phiên trả một hàng EOD. Evidence `eodhd-session-2026-10-21-2026-10-21-2026-10-21T16-32-22-818Z.json` và `eodhd-session-2026-10-21-2026-10-21-2026-10-21T16-32-42-430Z.json`. Đây là mẫu nhỏ cho thấy EODHD không phải một backfill tức thời hợp lệ cho các gap đã chọn, không phải kết luận coverage toàn thị trường hay quyền dùng provider; giữ integration tắt và không ghi đè dữ liệu.
- Phân bố 192 gap theo listing worker/API local: HSX thiếu 11/196 (coverage 94,4%), HNX thiếu 28/103 (72,8%), UPCoM thiếu 153/250 (38,8%). Vì vậy gap tập trung mạnh ở UPCoM, không phải thiếu ngẫu nhiên toàn bộ universe. Không loại UPCoM khỏi gate hoặc hạ chuẩn để đổi `ready` thành true; cần evidence provider/coverage riêng trước khi thay đổi chính sách ingestion.
- `GET /api/stocks/data-quality` nay công bố `exchange_coverage` gồm listed/covered/missing/coverage phần trăm theo sàn, để vận hành và UI đọc cùng một contract thay vì lặp lại truy vấn thủ công. Đây chỉ là observability EOD, không đổi universe, retry hay `ready` gate.
- Evidence scheduler ngày 2026-10-20 ghi 549/759 mã EOD, còn thiếu 210 nên job đã bỏ qua sinh snapshot đúng policy; retry cuối ngày vẫn chưa phủ đủ. Một snapshot `as_of=2026-10-20` hiện có nhưng endpoint `/latest` trước đây có side effect tự sinh khi snapshot cũ, nên không coi đó là bằng chứng scheduler đã hoàn tất. Endpoint nay chỉ đọc snapshot; chỉ EOD worker được quyền sinh dữ liệu. Test controller/EOD scheduler 25/25 đạt sau sửa.
- Cổng tạo snapshot EOD nay theo universe thật của `short_term_rule_v2`: mã listed có tối thiểu 50 phiên EOD trước phiên chạy và phải có close của phiên đó. Coverage 549/759 toàn thị trường tiếp tục được ghi để audit ingestion, nhưng không chặn một snapshot khi toàn bộ tập mô hình đã đủ; thiếu trong tập này vẫn bỏ qua và ghi `skipped_incomplete_recommendation_coverage`. Generator đọc riêng EOD `vnstock`/mã listed; test coverage, scheduler và persistence 33/33 đạt. Xem [RECOMMENDATION_EOD_AUTOMATION_DESIGN.md](RECOMMENDATION_EOD_AUTOMATION_DESIGN.md).
- Rà soát History/Calibration runtime: hai tab gọi được API và hiển thị pending/integrity/cohort đúng contract, nhưng 16 run/80 mã hiện có 0 outcome eligible; 75 pending, 5 excluded, 10 snapshot legacy chặn integrity và 79 mã thiếu taxonomy snapshot. Không tạo cohort tự động cho `personalized_rule_v1` vì weights là policy theo người dùng; xem quyết định tại [RECOMMENDATION_CALIBRATION_DESIGN.md](RECOMMENDATION_CALIBRATION_DESIGN.md).
- Forecast live endpoint local trả current-data preview nhưng frontend từng tắt cờ hiển thị. Local UI bật `VITE_ENABLE_FORECAST_LIVE=true`; nội dung vẫn là prototype/chưa có market-accuracy verified, không phải tín hiệu đầu tư.
- Tiêu đề “Xác suất prototype trên dữ liệu hiện tại” ở Tổng quan dùng màu cảnh báo và dấu trạng thái theo token sáng/tối, để phân biệt rõ current-data chưa xác minh với forecast đã qua gate.
- Forecast Tổng quan lấy trực tiếp xác suất từ payload provider live khi có (`vnstock`, `as_of`, provenance hiển thị); không còn đổ fixture khi payload không hợp lệ. Xác suất hiển thị với một chữ số thập phân theo locale.
- Màu kịch bản cố định theo nghĩa nghiệp vụ: Tăng lan tỏa xanh, Cân bằng vàng, Giảm lan tỏa đỏ. “Tỷ lệ mã tăng trong rổ” vẽ lại band thật trên đồ thị 0–100%; không dùng khoảng fixture hoặc điểm giữa giả. Contract `breadth_forward_v1` công bố band giảm `<45%`, cân bằng `45–55%`, tăng `>55%` và đánh dấu không có point estimate. Tổng quan hiển thị band của lớp xác suất cao nhất cùng lưu ý rõ ràng; thiếu contract thì unavailable. Kiểm chứng 2026-10-21: frontend 104/104, backend forecast liên quan 27/27, build/bundle và payload local `live-preview` có `breadth_target` hợp lệ đạt.
- Giá trị biên của band được chuẩn hóa trước khi render, tránh artifact dấu chấm động như `55.00000000000001%`; giao diện hiển thị một chữ số thập phân theo locale, ví dụ `> 55,0 %` trong tiếng Việt.
- Smoke check local `frontend/npm run verify:live:recommendations` nay bắt Chrome gọi trực tiếp proxy `:4173/api/recommendations/latest` (HTTP 200/5 mã), rồi đọc payload Recommendation/Forecast từ backend `127.0.0.1:5000` để kiểm tra UI `:4173`: snapshot EOD có danh sách mã và stale notice, tab Lịch sử mở được report, tab Hiệu chỉnh công bố trạng thái chưa áp dụng, Forecast hiển thị badge `Live`. Check chỉ đọc dữ liệu/API; không tạo recommendation, giao dịch hay outcome.
- Kiểm tra runtime 2026-10-21: scheduler evaluation đang bật và snapshot 2026-10-21 hash hợp lệ. Lifecycle ở `ready_to_evaluate`, nhưng 16 run/80 mã vẫn có 0 measured (75 pending, 5 excluded); không hiệu chỉnh trước khi đủ 20 phiên. UI Preview từng trả 404 do `dist/index.html` tracked tham chiếu bundle hash đã bị ignore. `dist` nay là build output hoàn toàn và `npm start` build trước khi preview; kiểm tra HTML và bundle hiện tại đều HTTP 200.
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
- Kiểm chứng mới nhất 2026-10-21: full Jest ngoài sandbox đạt 105 suite, 519 test trong 94,852 giây; lint và contract template cũng đạt. Cảnh báo partial EOD của fixture không có assertion thất bại. Trong sandbox, hai test CLI từng bị chặn `spawnSync EPERM`; chạy riêng ngoài sandbox đạt 3/3, xác nhận đây là giới hạn môi trường kiểm thử chứ không phải lỗi assertion.

### Template cấu hình backend

- `backend/.env.example` đã bỏ các biến dự kiến/không được runtime đọc và chỉ giữ database, auth/CORS, worker/readiness, preview research và scheduler hiện hành. Không sửa `backend/.env` local.
- Bản sao template mặc định tắt preview và toàn bộ scheduler để không tự gọi provider. Bật từng phần vẫn cần worker, quyền nguồn và evidence tương ứng; điều này không làm thay đổi default của một môi trường đã có `.env`.
- `npm run check:env-template` nay khóa contract gồm 31 biến hoạt động, gồm ba cron EOD công khai (ingest 15:05, retry sớm và retry muộn), phát hiện key trùng/ngoài contract và bắt buộc mọi cờ scheduler/preview là `false`; lệnh đã nằm trong release gate.
- Kiểm chứng mới nhất: lint, contract template 31 khóa và full Jest 105 suite/519 test đạt; chi tiết thời lượng ở mục Release gate backend.

### Template cấu hình frontend

- `npm run check:env-template` khóa ba biến public được hỗ trợ: `VITE_API_BASE_URL` phải rỗng để browser dùng proxy `/api` cùng origin; hai cờ forecast mặc định `false`; key trùng hoặc ngoài contract làm lệnh thất bại.
- Kiểm tra này đã nằm đầu `frontend/npm run verify:release`, nên không thể vô tình đưa secret vào template public hoặc làm cookie authentication đi qua URL API tuyệt đối.
- Kiểm chứng: frontend release gate đạt template contract, encoding, API error contract, 100 unit/contract test, bundle integrity và Prometheus contract.

### Hiệu năng Bảng giá: đo lifecycle trước refactor

- Trình đo live UI nay tách thao tác bấm điều hướng, mount panel, hàng dữ liệu và request `/api/stocks`, quote/status; mặc định lấy 5 mẫu để không kéo dài dev loop.
- Mẫu live ngày 2026-10-20 (UI `:4173`, backend `:5000`) ban đầu ghi 30 giây vì harness gọi `textContent()` trên locator lỗi không tồn tại; Playwright chờ timeout trước khi trả về. Mẫu xác nhận sau khi sửa: hàng đầu tiên gắn vào DOM 4 ms sau panel mount, panel không hidden, và quote settle 2.867 ms. Harness nay poll node DOM trực tiếp, chỉ đọc lỗi khi locator tồn tại và lưu snapshot state; default là 5 mẫu nhưng cho phép một mẫu khi chẩn đoán.
- Baseline API 5 mẫu ngày 2026-10-21: list p50/p95 3/143 ms; quote p50/p95 683/1.732 ms. Cả năm response HTTP thành công nhưng chỉ trả 39/40 mã; BCG thiếu quote intraday. Harness nay công bố `coverage_pct`, `complete`, `missing_symbols` ở cả request và batch để partial response không bị coi là đầy đủ. Endpoint quote cũng trả các metadata này, dedupe mã trước khi gọi provider; Bảng giá nói rõ số mã có intraday và các mã còn lại đang dùng EOD thay vì gắn nhãn chung là đủ intraday. Kiểm chứng contract: controller test 18/18, frontend test 104/104 và build/bundle đạt. Đây là số đo API local, không thay thế browser render và không đủ cơ sở tách `App.jsx`.
- Đo lại 5 mẫu trên stack local ngày 2026-10-21 lúc 10:10 UTC: list p50/p95 3/140 ms; quote p50/p95 2.393/2.975 ms. Mỗi response HTTP thành công nhưng vẫn trả 39/40 mã (97,5%), thiếu duy nhất `BCG` ở cả năm mẫu. Đây là dao động provider/runtime cần tiếp tục theo dõi, không phải bằng chứng thay đổi render hay lý do để thêm cache, polling, pagination hoặc tách `App.jsx`.
- Đo lại 5 mẫu read-only ngày 2026-10-22 lúc 02:51 UTC trên backend `127.0.0.1:5000`: list p50/p95 4/363 ms; quote p50/p95 952/3.762 ms. Cả 5 response quote đều HTTP thành công nhưng chỉ trả 39/40 mã (97,5%), thiếu `BCG` ở mọi mẫu. Mẫu chậm nhất là 3.762 ms, nên chưa có cơ sở kết luận latency ổn định hơn hoặc tách `App.jsx`; tiếp tục hiển thị coverage/mã thiếu và dùng EOD trung thực cho phần thiếu.
- Không có bằng chứng lazy chunk hay kích thước `App.jsx` là nút thắt. Request quote có dao động và có abort khi lifecycle đổi, nhưng chưa ngăn dữ liệu hiển thị. Không refactor/tách `App.jsx` vì suy đoán.
- `npm.cmd run build` đạt (Vite build và bundle integrity). Lần chạy Playwright `market-board-productivity` dùng web server test mới không render được `.dashboard-shell` trong 5 giây; đã dừng sau các failure đầu tiên, chưa dùng nó là bằng chứng hành vi Bảng giá.

## Giới hạn giữ nguyên

- M6 (phát hành) tạm hoãn theo quyết định sản phẩm ngày 2026-10-21. Giữ thiết kế và preflight làm điểm tiếp tục; không thực hiện deploy, backup/restore, thay đổi hạ tầng hay tuyên bố production-ready cho đến khi được mở lại.
- [RELEASE_READINESS_DESIGN.md](RELEASE_READINESS_DESIGN.md) đã chốt ranh giới M6: release/migration tách build, worker production có owner/lock/ledger, backup chỉ đạt khi restore drill cô lập có evidence, và observability cần alert drill. Đây là thiết kế, chưa chọn provider hay triển khai hạ tầng.
- Preflight M6 ngày 2026-10-21: backend `ready` với database/worker local khả dụng, nhưng workstation không có Docker, `pg_dump` hoặc `psql`. Chưa thể kiểm chứng Compose, backup/restore hay deploy; không suy diễn runtime local/Sentry configuration thành observability hoặc production readiness.
- Recommendation, forecast và dữ liệu provider vẫn research/internal prototype cho đến khi có evidence, quyền nguồn và validation ngoài mẫu phù hợp.
- Forecast live, company-data scope mở rộng, so sánh mã/ngành, cảnh báo giá/dữ liệu và khôi phục mật khẩu chưa được mở: chúng lần lượt cần evidence dữ liệu, scheduler/kênh gửi hoặc email delivery provider.
- Chưa kiểm chứng deploy production, worker/scheduler production, backup/restore hoặc browser flow bằng tài khoản development thật trong checkpoint hiện tại.

## Điểm tiếp tục

1. Chạy lại baseline 5 mẫu hoặc browser trace khi thay đổi lifecycle; theo dõi `missing_symbols` của quote provider và chỉ tách `App.jsx` khi số đo mới chứng minh lợi ích. Nền tảng lint, release gate và contract cấu hình backend/frontend hiện đã được chuẩn hóa.
2. Duy trì gate Đề xuất: không hiệu chỉnh hay diễn giải hiệu quả khi outcome chưa hợp lệ.
3. Khi thay đổi tính năng, cập nhật tài liệu thiết kế chịu trách nhiệm, file này và [ROADMAP.md](ROADMAP.md); đưa record cũ vào archive thay vì kéo dài tài liệu hiện hành.
4. M6 đang tạm hoãn. Khi được mở lại và có authority môi trường đích, dùng [RELEASE_READINESS_DESIGN.md](RELEASE_READINESS_DESIGN.md) để chốt provider/retention/RPO-RTO, owner worker/alert và thực hiện deploy, restore drill, worker/alert evidence trước khi đổi trạng thái M6.
