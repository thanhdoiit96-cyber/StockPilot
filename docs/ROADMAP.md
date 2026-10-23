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

Exit EOD generator has migration `047`, a manual bounded dry-run path, and five valid local-development dry-runs for 2026-10-16/19/20/21/22. Each observed 23/23 candidate holdings with exact-session EOD, made zero provider calls and created neither exit snapshots nor orders. Migrations `048`/`049` supply atomic expiring ownership, heartbeat/fencing and immutable aggregate lifecycle audit events, with a bounded admin-only read endpoint. Local concurrent-owner evidence confirms a second owner is rejected while the first heartbeats the lease. An explicit lease-only worker and opt-in Compose `exit-guidance-observe` profile are ready for environment-owned verification; neither schedules or generates guidance. Docker is unavailable locally, so the Compose profile remains unverified. The remaining dependency is deployment authority and evidence of that dedicated worker process/queue continuously owning the lease outside a local command; scheduler/config, automatic sales and calibration remain closed.

Model-integrity follow-up (2026-10-23) is complete: a recent bounded EOD window no longer fabricates the high-water mark for holdings that predate the window (`entry_before_available_eod`); an armed trailing position now reaches `trailing_protect` on the documented bearish-trend condition. The next exit-specific milestone remains an explicit, separately approved snapshot-generation owner followed by the predeclared 1/5/20-session shadow-evaluation cohort. It cannot be replaced with aggregate dry-run counts or buy-recommendation outcomes.

The pure evaluation contract is implemented as `position_exit_shadow_evaluation_v1`: it exposes pending/evaluated/excluded cohort mechanics, 1/5/20-session observations, MAE/MFE and boundary crossings without a correctness flag or parameter mutation. Its persistence/report remains intentionally deferred until immutable exit snapshots exist.

Migration `050` adds the immutable, one-per-guidance evaluation ledger and a create-or-return persistence boundary. Collection/reporting remains deferred: no scheduler, UI publication or performance claim is enabled.

A bounded database-only evaluation runner is implemented (100 guidance records; 20 subsequent EOD rows each). It reports `no_snapshots` honestly and does not call a provider. It is deliberately not scheduled until immutable exit snapshot generation has an authorized owner.

Migration `050` is applied locally. Its first bounded opt-in evaluation returned `no_snapshots` with zero provider requests, as expected before exit guidance snapshots are generated.

## Điều kiện nghiệm thu chung

Outcome availability guard and mixed-cohort browser verification completed (2026-10-23). v3 requires fetched evidence after local close and no later than evaluation time across the selected horizon; mock desktop/mobile disclosures pass. Next: baseline participation/temporal-contract audit; fetched time remains an availability proxy, not provider publication certification.

Cohort identity UI and v3 Vietnam-date evaluation implemented (2026-10-23). Separate disclosures reuse current requests; mixed counts do not unlock pooled scores. Target-close/conflicting-price guards apply to v3 outcomes; legacy records stay immutable. Remaining: mixed-cohort visual fixture and outcome availability-time audit.

Immutable forecast input provenance completed (2026-10-23): freeze actual participation and contract, separate generation identities and cohort scores by provider/model/contract, retain legacy evidence. Next: cohort identity disclosure in UI and evaluator Vietnam-date consistency; no accuracy or calibration claim.

Common forecast endpoint-date alignment completed (2026-10-23): input contract v3 excludes stale/future-ending members and exposes reasons using existing response/UI. Next: verify input-contract provenance in immutable issuance/evaluation cohorts. Intermediate-date completeness and forecast accuracy remain unverified.

Forecast distinct-date input correction completed (2026-10-23): versioned input scope requires 21 distinct Vietnam dates; duplicates cannot satisfy history and ambiguous prices/timestamps exclude the symbol with UI disclosure. No new provider dependency. Follow-up: common as-of alignment across participating symbols; exchange-calendar completeness and accuracy validation remain open.

Recommendation browser baseline recorded (2026-10-23): five desktop/mobile navigation samples with real local read data and isolated account, p50 visible-content latency 136–167 ms; tab return does not refetch cohort summary. Existing lifecycle is retained without cache/render refactor. These are instrumented local measurements; provider-backed forecast and actual-account end-to-end timing remain separate work.

Prediction database-read baseline recorded (2026-10-23): current runtime health/contracts verified after backend restart; five samples per endpoint show p50 ~20 ms latest, ~12 ms history, ~22 ms history summary and ~3 ms forecast cohort, max payload <16 kB. No measured justification for cache/pagination/refactor here. Live-preview/provider and browser-render latency are separate pending measurements; the existing script intentionally excludes provider-backed generation.

Forecast freshness/input-scope disclosure completed (2026-10-23): always-visible as-of/age and feature-derived participating/missing symbols, plus compact retry, reuse existing preview response. Mocked desktop/mobile request counts show expansion requires no extra preview request. Next: read-only local payload/latency baseline for recommendation and forecast APIs, then optimize only demonstrated bottlenecks.

Recommendation history exclusion breakdown completed (2026-10-23): reason counts follow assessed model/horizon cohorts with explicit overlapping-count explanation and localized disclosure. No extra query/request or provider dependency. Next product priority: forecast data-age/coverage usability; performance changes require request/payload measurements first.

Frozen-sector concentration disclosure completed (2026-10-23): API/monitor/UI use verified snapshot taxonomy, publish missing coverage, and distinguish selected-symbol share from personal capital exposure. Local evidence has 1/5 taxonomy coverage; concentration remains unknown. Existing snapshot creation already freezes available industry; no legacy backfill or provider expansion. Next: cohort exclusion-reason breakdown and its UI.

History cohort progress UI completed (2026-10-23): visible per-model/horizon evidence counts, server comparison threshold, explicit loading/error/retry, and detailed statistics under disclosure reuse the summary request. Next: frozen-sector concentration explanation and data-quality breakdown, without new provider dependence or calibration from individual outcomes.

Recommendation explanation/lifecycle UI completed (2026-10-23): compact per-symbol criterion comparison, declared horizon, reference timestamp and backend eligibility disclosure reuse the existing payload. Personalized results honestly disclose unavailable outcome tracking. No ranking weights, provider dependencies or automatic calibration changed. Follow-up: model/horizon cohort history usability and evidence-based concentration analysis.

Exit shadow evaluation lifecycle v2 (2026-10-23): migration `051` preserves legacy records and permits immutable 1/5/20-session results per guidance/version. Pending horizons remain retryable; completed guidance no longer occupies the bounded scan. Price reads deduplicate Vietnam sessions, exclude the signal date and validate basis/hash. Evaluation reporting separates horizon cohorts from legacy evidence. This foundation precedes signal-lifecycle UI and explanatory recommendation enhancements; calibration remains gated by valid outcomes.

- Backend thay đổi hành vi: test liên quan, migration khi đổi schema và lint không có warning hoặc error mới.
- Frontend thay đổi: unit/contract, production build và bundle integrity; browser smoke khi sửa luồng tương tác.
- Tài liệu: cập nhật PROJECT_STATUS, file thiết kế chịu trách nhiệm và INDEX/link khi thêm hoặc di chuyển tài liệu.
- Không gọi test/build là production proof; ghi rõ dependency và phần chưa chạy.
