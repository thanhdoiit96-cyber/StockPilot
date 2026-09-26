# Trạng thái và bàn giao dự án

Cập nhật: 2026-09-18.

## Yêu cầu làm việc đã ghi nhận

Người dùng yêu cầu xây dựng lộ trình hoàn thiện dự án, thực thi lộ trình và luôn cập nhật tài liệu liên quan hoặc tiến độ để lần sau dễ nắm bắt. Tài liệu này lưu ngữ cảnh trong workspace; không dựa vào khả năng nhớ cuộc trò chuyện đã đóng.

## Hiện trạng đã đối chiếu mã nguồn

- Backend Express, Sequelize/PostgreSQL; migrations cho cache, stocks, stock_prices; seed dữ liệu demo.
- Có API danh sách/chi tiết/giá cổ phiếu, cập nhật cổ phiếu và cache; thao tác quản trị dùng ADMIN_API_KEY.
- Frontend React/Vite đã gá»i API health, cache stats, danh sách và chi tiết cổ phiếu; có dashboard và lịch sử giá.
- Danh mục dùng số lượng giả định; AI chỉ là phản hồi demo; chưa có nguồn giá trực tiếp, tài khoản người dùng hoặc danh mục lưu backend.
- Tài liệu vận hành đã được hợp nhất trong đợt rà soát bên dưới. Các tài liệu thiết kế mục tiêu trong docs có nhãn phạm vi; đối chiếu mã nguồn trước khi dùng ví dụ thiết kế.

## 2026-09-18 — Khôi phục tiến độ

- Thiết lập `AGENTS.md` để hướng dẫn phiên sau đọc/cập nhật tài liệu tiến độ.
- Tạo `ROADMAP.md` với các mốc, phụ thuộc và tiêu chí nghiệm thu.
- Chạy `npm.cmd test -- --runInBand` tại backend: 2 suites, 15 tests đạt. Các test hiện có không xác nhận PostgreSQL thực tế hoặc toàn bộ ứng dụng.
- Chạy `npm.cmd run build` tại frontend: thành công; Vite có cảnh báo CJS Node API deprecated.
- Chưa kiểm tra giao diện bằng trình duyệt, API đang chạy, migrations trên database hoặc Docker trong phiên này.
- Lệnh `git` không có trong PATH của phiên; chưa xác minh diff/status bằng Git.
- Phiên này cập nhật tài liệu và kiểm chứng ná»n tảng, chưa triển khai M1–M6.

## 2026-09-18 — Rà soát và hợp nhất tài liệu

- Yêu cầu: rà soát các tài liệu gốc, thống nhất vai trò/nội dung và xóa file dư thừa.
- README trở thành điểm vào; QUICK_START sở hữu hướng dẫn chạy; AGENTS sở hữu quy trình cập nhật; INDEX chỉ điều hướng. PROJECT_STATUS và ROADMAP tiếp tục quản lý bàn giao và mốc phát triển.
- Viết lại README của backend/frontend theo mã hiện có; bá» API, bảng, dịch vụ, bảo mật và hiệu năng chưa triển khai khá»i mô tả hiện trạng.
- Sửa hướng dẫn cổng 5000, migrations có sẵn, seed một lần, quyá»n quản trị, cấu hình Docker/thủ công và định dạng thống kê cache. Bá» hướng dẫn tạo lại app.js, sync alter và khởi tạo lại Sequelize.
- Giữ các tài liệu thiết kế chuyên môn với nhãn phạm vi rõ ràng; chưa nghiệm thu má»i ví dụ thiết kế bên trong.

| Tệp đã xóa | Lý do và nơi giữ nội dung cần thiết |
| --- | --- |
| IMPLEMENTATION_CHECKLIST.md | Trùng tiến độ/lộ trình; thay bằng ROADMAP và PROJECT_STATUS, kiểm tra setup ở QUICK_START |
| DELIVERY_CHECKLIST.md | Báo cáo giao file cũ, thống kê không còn đúng; thay bằng hiện trạng/bằng chứng trong PROJECT_STATUS |
| BACKEND_QUICK_REFERENCE.md | Trùng điều hướng và lệnh chạy; chuyển vá» INDEX, QUICK_START và backend/README |
| BACKEND_IMPLEMENTATION_COMPLETE.md | Trùng báo cáo, kết luận production-ready không có bằng chứng; thay bằng PROJECT_STATUS |
| backend/SETUP_GUIDE.md | Trùng setup và có lệnh lỗi thá»i; hợp nhất vào QUICK_START |
| backend/INTEGRATION_GUIDE.md | Mã mẫu không khớp factory/constructor thực tế; mô tả tích hợp đúng ở backend/README, tham chiếu trực tiếp mã nguồn |
| backend/BACKEND_SUMMARY.md | Trùng tổng kết/tiến độ; nội dung kỹ thuật hiện hành ở backend/README |

Các yêu cầu kiểm thử, monitoring, tối ưu và phát hành còn phù hợp trong checklist cũ được giữ tại tiêu chí M1/M3/M6 của ROADMAP; bá» các ước lượng thá»i gian và tỷ lệ hoàn thành chưa đo.

Kiểm chứng đợt này: đối chiếu scripts, Compose, cấu hình Vite, routes, cache service và khởi tạo backend. Chỉ sửa tài liệu; không chạy lại test/build ứng dụng. Kết quả 15 tests/build ở đợt trước vẫn là bằng chứng có ngày, không phải xác nhận mới cho runtime.

Kiểm tra tài liệu: 18 tệp Markdown, 120 liên kết nội bộ, không có đường dẫn hoặc anchor bị há»ng. Tên 7 file đã xóa chỉ còn xuất hiện trong bảng lịch sử hợp nhất ở trên; không còn liên kết hướng dẫn tới chúng. Thư mục gốc còn 3 tệp Markdown: README, QUICK_START và AGENTS.

## Điểm tiếp tục cụ thể

Tiếp tục M1 trong [ROADMAP.md](ROADMAP.md): kiểm chứng Compose trong môi trường có Docker. Tương tác trình duyệt, TTL/invalidation PostgreSQL và CLI/startup trong schema riêng đã kiểm tra bên dưới. Không seed lặp hoặc xóa dữ liệu hiện hữu.

## 2026-09-18 — Đóng M2 cho prototype nội bộ

- M2 đạt tiêu chí kỹ thuật: backend unit **25/25**, PostgreSQL verification đạt toàn bộ nhóm kiểm tra, frontend test **7/7**, frontend production build đạt.
- Vnstock coverage probe cuối kỳ đạt **15/15 bản ghi, 3/3 mã, coverage 100%** cho FPT/MWG/VHM trong khoảng 2026-09-11 đến 2026-09-17.
- EODHD key/suffix đã từng xác minh thành công với exchange `VN` và FPT/PVS; một lần verify cuối kỳ gặp lỗi mạng tạm thá»i, không thay đổi kết luận đã có bằng chứng trước đó.
- Ingestion dedup, source/fetched time trên UI, corporate-action metadata, volume policy normalized/advisory và reconciliation audit đã được triển khai.
- M2 chỉ được đóng cho **prototype nội bộ**. Chưa tuyên bố quyá»n public/redistribution/commercial; M1 vẫn còn hạng mục Compose và M3 chưa bắt đầu.

## 2026-09-18 — Bắt đầu M3: tài khoản và watchlist

- Thêm migration `007_create_users_watchlist`, model `User` và `WatchlistItem` với unique `(user_id, stock_id)` và foreign key cascade.
- Thêm `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` dùng bcrypt và JWT; thêm `requireAuth` middleware trả 401 cho token thiếu/sai/hết hạn.
- Thêm `GET/POST /api/watchlist` và `DELETE /api/watchlist/:symbol`; má»i truy vấn đều gắn `user_id` từ token, không nhận user id từ request body.
- PostgreSQL verification đạt 7 migrations và kiểm thử ownership: user A thấy watchlist của mình, user B không thấy dữ liệu đó. M3 còn cần UI đăng nhập/watchlist, test API auth đầy đủ và kiểm tra hết hạn phiên.
- Bổ sung `requireRole(...roles)` cho phân quyá»n theo role và test middleware JWT cho token thiếu, sai và hết hạn. Watchlist tiếp tục là quyá»n của chính user; role admin không được dùng để đọc watchlist của user khác.
- Hoàn thiện UI M3: đăng ký/đăng nhập, lưu token phiên ở local storage, đăng xuất, thêm/xóa mã watchlist và tải lại watchlist từ backend. Frontend test 7/7 và build production đạt. M3 hoàn thành cho prototype nội bộ; cần hardening cookie/session và kiểm thử trình duyệt auth trước public.

## 2026-09-18 — Củng cố tải dữ liệu frontend (M1)

- Thêm `frontend/src/services/api.mjs`: kiểm tra HTTP trước JSON, phân biệt lỗi mạng/JSON/payload với danh sách rỗng hợp lệ, xác thực cấu trúc danh sách/chi tiết.
- Thêm `useApiResource`: tài nguyên tải độc lập, nút thử lại, AbortController và chặn callback sau hủy; dữ liệu URL cũ bị ẩn ngay trong render khi chá»n cổ phiếu khác.
- UI có lỗi riêng cho danh sách, chi tiết, health và cache. Lỗi cache không xóa danh sách; cache chưa tải không được hiển thị như số 0 đã xác nhận.
- Thêm lệnh frontend `npm.cmd test` dùng Node test runner, không thêm dependency. 7 tests đạt: HTTP 404/429/500, JSON/payload sai, danh sách rỗng, mạng lỗi/retry, phản hồi đến sai thứ tự, cleanup và lỗi tài nguyên phụ.
- `npm.cmd run build` frontend đạt; vẫn có cảnh báo CJS Node API của Vite. Test/build ban đầu bị sandbox chặn spawn EPERM, chạy lại ngoài sandbox sau phê duyệt và đạt.
- Smoke check API tại `http://127.0.0.1:5000`: health.success=true, 3 cổ phiếu, request đầu source=database, request lặp source=cache, chi tiết success=true với 1 giá lịch sử. Dùng server/database đang tồn tại; không chạy migrations/seed hoặc xóa dữ liệu.
- Thử khởi động thêm backend xác nhận kết nối PostgreSQL thành công nhưng cổng 5000 đã có tiến trình (EADDRINUSE); tiến trình thử đã thoát. Không dừng server hiện hữu.
- Chưa kiểm chứng tương tác trên trình duyệt; 7 test chỉ kiểm tra lớp tải dữ liệu, không xác nhận render/effect của React. Chưa chạy lại test backend vì không sửa backend.
- Đã cập nhật frontend README, QUICK_START và ROADMAP. M1 vẫn đang thực hiện.

## 2026-09-18 — Nghiệm thu tương tác trình duyệt và cache PostgreSQL

- Thêm Playwright vào devDependencies frontend và lockfile; cấu hình Chrome headless có sẵn, Vite riêng cổng 4180. Thêm 8 kịch bản trong e2e/loading.spec.mjs; báo cáo/trace/ảnh được loại khá»i Git và Docker context.
- 8/8 kịch bản Chrome đạt: chuyển mã lúc request chá» (ẩn chi tiết cũ, bá» phản hồi muộn), lỗi mạng/404/500/JSON và retry danh sách, danh sách rỗng hợp lệ, lỗi/retry chi tiết, lỗi health/cache không ảnh hưởng stocks. Đã xem ảnh chụp trang chi tiết. API trong bộ trình duyệt là fixture, không phải dữ liệu thật.
- Thêm scripts/verify-postgres.cjs và lệnh test:postgres. Đạt 6 nhóm kiểm chứng: ba migrations trên schema rỗng; TTL một giây/cleanup thực; list/detail/price missÃ¢â€ ’hit; từ chối cập nhật không có quyá»n/body sai; PUT xóa cache liên quan và đọc lại dữ liệu mới; dá»n schema và xác nhận không còn tồn tại.
- Bộ PostgreSQL dùng migrations, models, CacheService và router thật; chỉ thay binding models sang connection có search_path riêng. Schema verify_<UUID> được tạo/xóa tự động. Không seed, sửa stock hoặc xóa cache trong schema ứng dụng hiện hữu.
- Hồi quy: 7/7 test API frontend, 15/15 test backend và frontend build đều đạt. Không phát hiện lỗi hành vi trong các tình huống được kiểm tra nên không sửa mã ứng dụng.
- Báo cáo cục bộ: frontend/playwright-report/index.html; ảnh ở frontend/test-results. Các artifact này được tái tạo khi chạy test và không lưu vào Git; kết quả bá»n vững được tóm tắt tại đây.
- Giới hạn: Chrome desktop, không phải kiểm chứng đa trình duyệt/mobile hoặc toàn bộ luồng UIÃ¢â€ â€™serverÃ¢â€ ’database cùng lúc. Tại thá»i điểm ghi mục này chưa chạy CLI/Compose; CLI/cài mới trong schema tạm được kiểm chứng ở mục 2026-09-18 bên dưới, Compose vẫn chưa chạy. Cảnh báo CJS Vite còn tồn tại; npm install báo 2 lỗ hổng dependency (1 moderate, 1 high), chưa phân tích/khắc phục trong phạm vi kiểm thử này.
- Cập nhật QUICK_START, README hai dịch vụ và ROADMAP với cách chạy và phạm vi kiểm chứng. M1 còn phần Compose.

## 2026-09-18 — Chuẩn hóa quyá»n PostgreSQL và kiểm chứng cài đặt

- Chá»n mô hình least privilege: role ứng dụng không có `CREATEDB`/`SUPERUSER`; quản trị viên hoặc Compose tạo database, role ứng dụng chỉ dùng database/schema được cấp quyá»n.
- Cập nhật QUICK_START và backend README với quyá»n `CONNECT`, `USAGE`, `CREATE`; không khuyến nghị cấp quyá»n tạo database cho ứng dụng.
- Thêm cấu hình kiểm thử và lệnh `npm run test:install`: CLI migrations, seed và app startup chạy trong schema `verify_install_<UUID>` của database hiện hữu.
- Kiểm chứng đạt: migrations lần đầu, migration lặp không có thay đổi, seed lần đầu, health/list/detail và databaseÃ¢â€ ’cache, restart giữ dữ liệu, cổng bận trả mã 1 với lỗi rõ ràng, database không tồn tại không khởi động server/job; schema thử được dá»n.
- Sửa `backend/src/app.js`: chỉ khởi tạo cleanup job sau khi listener lắng nghe thành công; lỗi `EADDRINUSE` được báo rõ và không còn unhandled error/job chạy dở.
- Không kiểm chứng Docker vì máy không có lệnh Docker/Docker Desktop khả dụng.
- Chạy `npm.cmd run migrate` trên database ứng dụng: migration 004 hoàn tất. Migration được làm idempotent cho trường hợp các cột đã tồn tại nhưng index/meta chưa hoàn tất; dữ liệu legacy không bị xóa. Smoke check API hiện có vẫn trả 3 cổ phiếu và chi tiết thành công; bản ghi seed cũ có source/volume null đúng theo hợp đồng.

## 2026-09-18 — Triển khai contract và fixture adapter M2

- Thêm [MARKET_DATA_CONTRACT.md](MARKET_DATA_CONTRACT.md) làm nguồn mô tả canonical record, timezone, đơn vị, quality, deduplication và giới hạn.
- Thêm `backend/src/market-data/`: contract validator, `FixtureMarketDataAdapter`, fixture daily quotes và `MarketDataIngestionService`.
- Adapter chuẩn hóa symbol uppercase, decimal string và timestamp UTC; validator tách bản ghi lỗi khá»i batch. Ingestion resolve `stocks.code`, ghi transaction, skip cùng `source_hash`, update bản ghi đã sửa và trả report inserted/updated/skipped/rejected/errors.
- Thêm migration `004_expand_market_data_contract.js` và mở rộng `StockPrice` với provider, observed/fetched time, OHLCV, currency, unit, adjusted flag và source hash. Unique logic key: `(stock_id, provider, interval, observed_at)`.
- Stock API giữ tương thích `price`, đồng thá»i trả volume, source, fetched time, currency và lịch sử OHLCV/provenance khi có dữ liệu canonical. `change` vẫn null nếu chưa có giá tham chiếu.
- Kiểm thử unit: **18/18 tests backend đạt**. PostgreSQL thật: bốn migrations trên schema tạm, fixture ingestion insert/duplicate skip, cache invalidation và cleanup schema đạt.
- Chưa tích hợp provider thật, chưa chá»n license/API, chưa có retry/rate limit/ingestion audit; fixture không phải dữ liệu thị trường trực tiếp. M2 đang thực hiện.

## 2026-09-18 — Vnstock EOD adapter và coverage probe

- Thêm `backend/src/market-data/adapters/VnstockEodAdapter.js`: nhận fetcher/bridge Vnstock, chuẩn hóa EOD OHLCV, symbol, UTC timestamp và ghi `provider`, nguồn upstream, license, URL license, `fetched_at` vào canonical record.
- Thêm `backend/src/market-data/coverageProbe.js`: kiểm tra danh sách mã, số phiên, tỷ lệ coverage, record bị từ chối, license và thá»i điểm bắt đầu/kết thúc; trả report có `status` để job lưu audit.
- Không cài hoặc gá»i mạng Vnstock trực tiếp trong Node; fetcher là dependency boundary để môi trường thật cung cấp bridge Python và để test chạy deterministic. License mặc định là `personal_research_only`, chưa đủ cho public/commercial display.
- Kiểm chứng: `npm.cmd test -- --runInBand` đạt **20/20 tests** (3 suites). Coverage probe test xác nhận mã thiếu làm report fail; adapter test xác nhận provider/license/fetched time và canonical validation.
- Chưa chạy coverage probe với dữ liệu thị trường thật; chưa có retry/rate-limit, lịch giao dịch hoặc bảng audit bá»n vững.

## 2026-09-18 — Kết nối Vnstock thật và coverage probe

- Cài `vnstock 4.0.8` và dùng API mới `vnstock.api.quote.Quote`; không dùng lớp `Vnstock().stock()` đã bị deprecate.
- Thêm `backend/scripts/vnstock_eod_bridge.py` và `backend/src/market-data/adapters/vnstockBridgeFetcher.js`. Bridge đọc JSON từ Node, gá»i `Quote.history(..., interval='1D')`, trả OHLCV và không để log tùy chá»n làm há»ng JSON.
- Thêm `backend/scripts/run-vnstock-coverage.cjs`; mapping 9 mã thử nghiệm gồm 3 HOSE (FPT, VCB, HPG), 3 HNX (PVS, SHS, CEO), 3 UPCOM (BSR, OIL, VGI).
- Probe thật đạt: **status=pass, 45/45 record hợp lệ, 9/9 mã, coverage 100%, 5 phiên/mã, không lỗi**. Adapter đã lá»c lại đúng biên `from/to`; bằng chứng đầy đủ ở [evidence/vnstock-coverage-2026-09-18.json](evidence/vnstock-coverage-2026-09-18.json).
- `npm.cmd test -- --runInBand`: **21/21 tests đạt**. Probe thật chạy ngoài sandbox với mạng; không ghi dữ liệu probe vào database ứng dụng.
- Giới hạn: Vnstock trả ngày phiên không có timezone; bridge đã giữ `YYYY-MM-DD` và canonical hóa cố định `00:00:00Z`, không dùng đó làm thá»i điểm đóng cửa trong ngày. Cần xác minh quy ước này, license thực tế và quyá»n public/commercial. Chưa có retry/rate-limit, persistence ingestion audit hoặc reconciliation đa nguồn.

## 2026-09-18 — Ingestion thật, scheduler có cá» bật và provenance trên UI

- Thêm `src/market-data/vnstockEodIngestion.js` dùng chung cho CLI/scheduler; thêm `scripts/ingest-vnstock-eod.cjs` và npm script `ingest:vnstock`.
- CLI tự lấy các mã hiện có trong bảng `stocks`, gá»i bridge Vnstock, ingest transaction qua `MarketDataIngestionService`, rồi invalidate cache. Có thể giới hạn bằng `VNSTOCK_SYMBOLS`, `VNSTOCK_FROM`, `VNSTOCK_TO`, `VNSTOCK_SOURCE`.
- Thêm scheduler `src/jobs/vnstockEodJob.js`, chỉ bật với `VNSTOCK_EOD_ENABLED=true`; mặc định tắt, lịch `30 10 * * 1-5`, timezone `Asia/Ho_Chi_Minh`.
- UI hiển thị provider và thá»i điểm lấy dữ liệu trong bảng danh sách và trang chi tiết; API đã trả `data_source`, `data_fetched_at`, volume và provenance lịch sử.
- Ingestion thật ngày 2026-09-18 trên database ứng dụng: **15 inserted, 0 updated, 0 skipped, 0 rejected**, cho FPT/MWG/VHM, cửa sổ 2026-09-11–2026-09-17. Sau khi dá»n cache, API trả `data_source=vnstock`, volume và `fetched_at` đúng.
- Kiểm chứng: backend **21/21 tests**, frontend build đạt. Lưu ý cache cũ có thể che metadata mới; cần clear cache sau lần deploy đầu tiên.
- Chưa bật scheduler production; chưa có retry/rate-limit, audit table, reconciliation đa nguồn hoặc xác nhận quyá»n public/commercial.

## 2026-09-18 — M2 hardening: audit, retry, lock và trạng thái UI

- Thêm migration `005_create_market_data_ingestion_runs` và model audit cho từng lần chạy; lưu provider/source, khoảng ngày, symbols, counters, lỗi và lifecycle `running/success/failed`.
- `MarketDataIngestionService` ghi audit lifecycle và khóa theo provider/source/interval trong process để chống hai lần chạy đồng thá»i. PostgreSQL verification xác nhận audit counters.
- Bridge Vnstock có retry exponential backoff, timeout và cấu hình qua `VNSTOCK_RETRIES`, `VNSTOCK_TIMEOUT_MS`, `VNSTOCK_BACKOFF_MS`.
- Thêm endpoint `GET /api/market-data/ingestion/latest`; UI đọc và hiển thị trạng thái ingestion gần nhất cùng provider/thá»i điểm dữ liệu.
- CLI chạy lại dữ liệu thật đạt **15 received, 0 inserted, 15 skipped, 0 rejected**, xác nhận dedup và audit trên database ứng dụng. Endpoint trả run `success` tương ứng.
- Kiểm chứng sau thay đổi: migrations PostgreSQL cô lập và audit đạt; backend **21/21 tests**, frontend **7/7 tests**, frontend build đạt.
- Scheduler vẫn tắt mặc định; retry hiện bao quanh bridge process, còn reconciliation đa nguồn, SLA và quyá»n public/commercial chưa nghiệm thu.

## 2026-09-18 — Cải thiện khả năng đọc dữ liệu trên UI

- Giá trên UI giữ tối đa 2 chữ số thập phân để không làm mất độ chính xác giá cổ phiếu; khối lượng dùng dạng compact theo locale `vi-VN`.
- Chart lịch sử giữ dữ liệu OHLCV thay vì chỉ dùng chiá»u cao cột: mỗi cột có ngày giao dịch, tooltip giá đóng cửa và khối lượng; nguồn và thá»i điểm lấy dữ liệu vẫn hiển thị ở danh sách/trang chi tiết.
- Kiểm chứng frontend: **7/7 tests** và build đạt sau thay đổi.
- Chưa mở rộng chart sang chỉ báo kỹ thuật hoặc biểu đồ realtime; cần hoàn thiện reconciliation/độ tin cậy dữ liệu trước khi thêm tín hiệu phân tích.

## 2026-09-18 — Reconciliation kỹ thuật VCI/KBS

- Thêm `marketDataReconciliation.js`: chuẩn hóa hai adapter, ghép theo symbol/ngày/interval và phân loại `matched`, `close_mismatch`, `volume_mismatch`, `missing_a`, `missing_b`.
- Thêm migration/model `006_create_market_data_reconciliation_runs`, CLI `npm run reconcile:vnstock` và endpoint `GET /api/market-data/reconciliation/latest`.
- Unit reconciliation đạt trong bộ **22/22 backend tests**; PostgreSQL cô lập đạt cả **6 migrations**.
- Chạy thử thật VCI–KBS trên 9 mã/5 phiên. Run được ghi là `failed`, không suy diễn kết quả: upstream KBS gặp lỗi chứng chỉ TLS, connection reset và giới hạn guest 20 request/phút. Bằng chứng ở [evidence/vnstock-reconciliation-2026-09-18.json](evidence/vnstock-reconciliation-2026-09-18.json).
- License của cả hai nguồn vẫn giữ `internal_research_only`; chưa có quyá»n public/display. Cần API key hoặc thá»a thuận truy cập hợp lệ trước lần kiểm định production.
- UI hiển thị thêm report reconciliation gần nhất trong phần kiểm tra hệ thống; trạng thái `failed` được giữ nguyên để người vận hành không nhầm là hai nguồn đã khớp.

## 2026-09-18 — EODHD adapter cho reconciliation cá nhân

- Thêm `EodhdEodAdapter`, EODHD fetcher và CLI `npm run reconcile:eodhd`; API key đọc từ `EODHD_API_KEY`, không ghi vào mã nguồn hoặc log.
- Adapter chỉ phục vụ đối chiếu, chưa ingest EODHD vào dữ liệu ứng dụng. Mặc định thử suffix `.VN`; cần xác minh exchange/ticker list bằng key thật.
- Ngày 2026-09-18 đã xác minh key trong `backend/.env` bằng `npm run verify:eodhd`: key được chấp nhận, exchange `VN` là `Vietnam Stocks`, probe `FPT.VN` trả HTTP 200 và 5 dòng EOD. Reconciliation EODHD-Vnstock chưa đạt do nhánh Vnstock gặp lỗi `fetch failed`; không ghi nhận kết quả pass giả.
- Thêm script `backend/scripts/verify-eodhd.cjs` và lệnh `npm run verify:eodhd`; khi môi trường Node gặp reset IPv6, dùng `NODE_OPTIONS=--dns-result-order=ipv4first`.
- Sau khi chuẩn hóa giá Vnstock từ nghìn VND sang VND/cổ phiếu (`VNSTOCK_PRICE_SCALE=1000`), reconciliation FPT đã so khớp **5/5 giá đóng cửa**. Run vẫn ở trạng thái `fail` vì volume lệch 4/5 phiên giữa VCI và EODHD; đây là sai khác cần xác minh vá» định nghĩa/điều chỉnh volume, chưa được phép coi là hai nguồn hoàn toàn nhất quán.
- Chạy nhiá»u mã FPT/PVS ngày 2026-09-18: nhận 10/10 bản ghi từ mỗi nguồn, so sánh 10 phiên; kết quả 5 matched, 4 volume mismatch và 1 close mismatch. PVS ngày 2026-09-11 lệch gần đúng hệ số 6/5, trùng corporate action split EODHD có hiệu lực 2026-09-14. Bằng chứng: [eodhd-vnstock-reconciliation-2026-09-18.json](evidence/eodhd-vnstock-reconciliation-2026-09-18.json).
- Quy tắc vận hành: VCI `matched_volume` và EODHD `volume` không được coi là cùng semantics; volume chỉ dùng cảnh báo cho tới khi chốt chính sách corporate-action/khớp lệnh. Không nâng tolerance để che khuất mismatch.
- Reconciliation đã bổ sung trạng thái `corporate_action_mismatch`: nếu close và volume cùng lệch theo một hệ số (sai khác tỷ lệ ≤1%), run vẫn `fail` nhưng ghi rõ khả năng điều chỉnh corporate action. Lần chạy lại FPT/PVS xác nhận PVS ngày 2026-09-11 được phân loại đúng; bộ backend test đạt 25/25.
- EODHD adapter đã bổ sung `fetchCorporateActions()` và parser split JSON/CSV. Chạy thật PVS xác nhận phiên 2026-09-11 tự động gắn metadata `{ effective_date: 2026-09-14, numerator: 6, denominator: 5, ratio: 1.2 }`; các phiên từ ngày hiệu lực trở đi không bị gắn nhãn. Chưa áp dụng điều chỉnh volume vào dữ liệu canonical.
- Đã chá»n và triển khai chính sách volume kép: giữ volume gốc để audit, tạo volume chuẩn hóa trong reconciliation bằng cách chia volume đã điều chỉnh cho split ratio trước ngày hiệu lực. Chạy thật PVS cho thấy volume chuẩn hóa giảm chênh lệch từ 16,66% xuống 0,0126%; run vẫn `fail` vì giá còn lệch cơ sở. Khi không có metadata, volume không được tự ý điều chỉnh.
- Hoàn tất bước kế tiếp: áp dụng cùng split ratio cho close trong reconciliation (chỉ ở lớp so sánh). PVS chạy thật đạt `pass` với 4 `matched` và 1 `matched_after_corporate_action`; close chuẩn hóa lệch khoảng 0,000038%, volume chuẩn hóa lệch 0,0126%. Raw quote vẫn không bị sửa.
- M4 UI đã bổ sung nhật ký giao dịch mua/bán đã thực hiện bên ngoài ứng dụng, bảng vị thế chi tiết và biểu đồ phân bổ theo giá trị. Không có kết nối broker, không đặt lệnh, không chuyển tiá»n; các nút chỉ ghi nhận dữ liệu lịch sử vào portfolio ledger.
- Nghiệm thu M4: PostgreSQL verification đạt 8 migrations, ownership, ledger mua/bán, quantity, average cost và realized P&L; frontend test 7/7 và build production đạt. M4 đóng cho prototype nội bộ; dữ liệu danh mục chỉ là nhật ký do người dùng nhập, không phải giao dịch thực thi.
- FPT chưa có trường VCI tương đương tổng volume để chứng minh EODHD volume bao gồm giao dịch thá»a thuận; đã thêm `RECONCILIATION_VOLUME_POLICY=advisory` để chuyển mismatch volume thành `volume_warning` khi mục tiêu là kiểm định giá. Policy strict vẫn là mặc định và cần dùng cho nghiệm thu dữ liệu.
- UI đã hiển thị nhãn reconciliation, provider pair, volume policy, số phiên khớp sau corporate action và số volume warning; JSON chi tiết vẫn giữ để audit. Frontend test 7/7 và build production đạt.
- Hướng dẫn đăng ký và chạy probe đã thêm vào `QUICK_START.md`. Trạng thái license giữ `personal_plan_pending`/internal research cho tới khi người dùng xác nhận điều khoản gói cá nhân.

Quy trình tiếp nối và cập nhật nằm trong [AGENTS.md](../AGENTS.md).

## 2026-09-19 - M5 technical analysis foundation

- Added GET /api/stocks/:id/analysis with SMA20, SMA50, EMA12, EMA26 and RSI14 calculated from stored closing prices. The response includes source, observation time and observation count.
- Added transparent rule-based insight model rule_based_technical_v1 with explainable factors and a research-only disclaimer. This is an AI-ready foundation, not an order or investment recommendation.
- Detail UI now displays indicators, signal, data provenance and insufficient-data states.
- Validation: backend 29/29 tests; frontend 7/7 tests; production build passed.


- M5 technical foundation extended on 2026-09-19: analysis response now includes an external_factors contract. Unverified news/macro/event inputs are excluded and reported as not_available; the UI shows this state instead of implying a signal. Backend tests: 30/30; frontend tests: 7/7; build passed.

- M5 follow-up 2026-09-19: removed all mojibake strings from backend/src and verified no encoding markers remain in backend/src or frontend/src. Added externalFactorAdapter fixture with source/published_at/fetched_at/status/impact provenance and tests; this is the next-step scaffold for licensed news/macro providers.

- M5 next step 2026-09-19: added externalFactorContract for news, macro and corporate_event. Adapter now rejects missing source, timestamps, title/summary or invalid status before data can reach analysis. Backend validation: 32/32 tests.

- M5 provider persistence 2026-09-19: migration 009 creates external_factors with provenance, raw_payload and unique source_hash. World Bank Open Data macro adapter is marked CC BY-4.0; GDELT 2.1 news adapter remains unverified for display until terms are confirmed. Persistence deduplicates by source_hash. Backend tests: 35/35; migration applied successfully.

- External-factor ingestion 2026-09-19: added 
pm run ingest:external-factors. A real World Bank run for VNM CPI (FP.CPI.TOTL.ZG) received 30 records and inserted 30 records with license CC BY-4.0, zero rejects. A repeat run later hit upstream TLS verification, so dedup is covered by unit tests but not claimed from that second live run. Backend tests remain 35/35.

- M5 integration 2026-09-19: analysis endpoint now reads verified external factors by stock symbol; added GET /api/stocks/:id/external-factors for provenance inspection. UI shows verified factor titles/source/time and keeps unverified data out of signals. Backend 35/35, frontend 7/7, build passed; live FPT smoke returned external=not_available because current World Bank macro rows are not symbol-specific.

- M5 macro context 2026-09-19: verified external factors with symbol=NULL are now treated as market-wide context for every stock analysis; symbol-specific factors remain supported. FPT live smoke now returns external=available with 20 verified World Bank factors.

- M5 feature fusion 2026-09-19: combined insight now reports rule_based_fusion_v1, confidence (insufficient/limited/moderate) and context_count from verified market-wide or symbol-specific factors. FPT smoke returned context_count=20 and confidence=limited because price history is short.

- M5 advisor UX 2026-09-19: AI Advisor now summarizes the selected stock's combined rule-based insight, confidence and explainable factors instead of returning a static not-integrated message. It remains research-only and cannot place trades. Frontend 7/7 tests and build passed.

- M5 quality gate 2026-09-19: added analysisQuality service and API quality payload with checks for price history, provenance, explanation and disclaimer. FPT smoke reports quality=blocked, score=75, price_history=fail because only 6 price observations are available; UI exposes this state.

- Historical EOD expansion 2026-09-19: Vnstock/V​​CI ingestion window 2025-01-01 to 2026-09-19 for FPT/MWG/VHM received 1269, inserted 1254, updated 15, rejected 0; cache cleared. FPT analysis now has 250 observations, quality=pass score=100, confidence=moderate with 20 verified macro contexts.

- Risk-plan layer 2026-09-19: added short/medium/long horizon scenarios with illustrative allocation, take-profit and stop-loss levels derived from 20-session volatility and support/resistance. FPT smoke returned plan=available, short allocation=20%, with explicit research-only disclaimer. Backend 39/39; frontend 7/7; build passed.

- Risk-plan refinement 2026-09-19: added explicit expected return ranges for short/medium/long horizons, alongside allocation, take-profit and stop-loss. Ranges are volatility-derived reference bands, not forecasts or personalized advice. Backend 39/39; frontend 7/7; build passed.

- Advisor provenance 2026-09-19: Advisor now refuses interpretation when quality gate is blocked and includes distinct external-factor source names when context is verified. Frontend 7/7 tests and build passed.

- Frontend contract hardening 2026-09-19: stockAnalysis selector now requires quality and risk_plan payloads before rendering; added regression test. Frontend 8/8 tests and build passed.

- Detail-page fix 2026-09-19: verified /api/stocks/:id returns 20 price-history rows and analysis returns risk_plan; rewrote frontend API error messages in UTF-8 and updated selector tests. Frontend tests 8/8 and build passed. Playwright browser binary is not installed in this environment, so visual browser confirmation remains pending.

- Detail-page runtime fix 2026-09-19: Chrome reproduction found expectation_pct missing from an older risk_plan payload caused Cannot read properties of undefined (reading min). Frontend now handles old/new payloads safely; after backend restart Chrome confirmed detailHeading=1, detailError=0, technical=1 and no pageerror. Frontend 8/8 tests and build passed.

- Detail Chrome verification 2026-09-19: with a real JWT, clicking Chi tiết mã rendered the detail hero and technical panel (detail=1) without page errors or auth failures. Earlier 401s were caused by an intentionally fake smoke token; no functional detail error remains.

- M5 multi-symbol acceptance 2026-09-19: live smoke checked FPT, MWG and VHM. Each returned 250 observations, quality=pass score=100, confidence=moderate, context_count=20 and risk_plan=available.

- M5 offline backtest 2026-09-19: added 
pm run backtest:risk-plan, walk-forward 20-session evaluation with no future leakage. FPT 384 eligible (TP 74, SL 175, neither 135); MWG 384 (TP 109, SL 140, neither 135); VHM 384 (TP 211, SL 86, neither 87). Results are historical diagnostics, not return forecasts.
- Expanded World Bank ingestion to CPI, GDP growth and exchange-rate indicators: received 111, inserted 81, skipped 30, rejected 0; license CC BY-4.0. Generative AI remains disabled pending quality thresholds, source citation and cost controls.

- Backtest rerun 2026-09-20: FPT TP 19.27% / SL 45.57% / neither 35.16%; MWG TP 28.39% / SL 36.46% / neither 35.16%; VHM TP 54.95% / SL 22.40% / neither 22.66%, each over 384 eligible walk-forward windows. Current API quality remains pass 100 for FPT/MWG/VHM; no generative AI enabled.

- Backtest evidence artifact 2026-09-20: backend/evidence/risk-backtest-2026-09-20.json now stores the full run with rates, methodology and disclaimer. The CLI supports BACKTEST_OUTPUT for repeatable audit artifacts; generative AI remains disabled.

- Generative AI gate 2026-09-20: added npm run check:ai-gate and policy generative_ai_gate_v1. Current result is enabled=false with reason provider_display_rights_not_verified; quality and backtest evidence are present. Backend tests: 42/42.

- AI gate hardening 2026-09-20: check:ai-gate now queries live quality payloads for FPT/MWG/VHM instead of hardcoded pass values. Current live reports are all pass/100; gate remains disabled solely because provider display rights are not verified. Backend 42/42 tests.

- AI status UX 2026-09-20: replaced misleading 'Chưa tích hợp' labels with explicit Rule-based active / Generative AI locked state in overview, detail and Advisor. Frontend 8/8 tests and build passed.

- Chrome UI acceptance 2026-09-20: authenticated smoke flow clicked Chi tiết mã and rendered detail hero, technical panel and risk table (detail=1, technical=1,  risk=1) with no pageerror. Screenshot: frontend/test-results/detail-smoke.png. One non-functional 404 console entry remains from a browser resource, while API/UI content renders correctly.

- Frontend polish 2026-09-20: added Vietnamese metadata, description and favicon; Chrome smoke now renders detail=1 with no 404 responses. Remaining 401s only occur when smoke intentionally injects a fake token; valid JWT flow was already verified.


- AI gate audit artifact 2026-09-20: live quality reports for FPT/MWG/VHM are pass/100 and the walk-forward backtest artifact is present. Saved the evaluated decision, policy, timestamps and quality reports to [backend/evidence/ai-gate-2026-09-20.json](../backend/evidence/ai-gate-2026-09-20.json). Generative AI remains disabled solely because provider display rights are not verified; the gate exits with the expected disabled status.



- AI gate operational validation 2026-09-20: added 
pm run validate:ai-gate to validate policy, timestamp, quality reports, backtest evidence and blocking reasons in the saved audit artifact. Validation passed; the gate remains disabled only for unverified provider display rights. Backend tests: 42/42.

- M5 quality pipeline 2026-09-20: added 
pm run verify:m5-quality to run the walk-forward backtest, live API quality evaluation, AI gate and artifact validation in one repeatable command. The run regenerated dated evidence for FPT/MWG/VHM, validated successfully, and preserved Generative AI as disabled because provider display rights remain unverified.

- AI Gate API/UI 2026-09-20: added read-only /api/ai-gate endpoint backed by the newest dated evidence artifact. Overview, system checks and Advisor now display the live gate decision, evaluation time and blocking reasons. Generative AI cannot be enabled by this endpoint; it only exposes the audited decision. Frontend tests: 9/9; production build passed; backend tests: 42/42.

- Provider rights runbook 2026-09-20: added [PROVIDER_RIGHTS_RUNBOOK.md](PROVIDER_RIGHTS_RUNBOOK.md) with a provider matrix, EODHD/Vnstock request template, World Bank attribution requirements, evidence checklist and the exact EXTERNAL_FACTOR_DISPLAY_RIGHTS transition criteria. Current status remains pending; Generative AI/public display is not enabled.

- Provider terms review 2026-09-20: reviewed current Vnstock license, EODHD Terms and World Bank licensing. EODHD Personal explicitly allows private non-commercial storage/analysis but prohibits display, retransmission, redistribution and access grants; the planned public web scope therefore requires Professional/commercial authorization. Updated PROVIDER_RIGHTS_RUNBOOK.md accordingly. Vnstock remains a connector license separate from VCI data rights; World Bank CC BY 4.0 remains attribution-based per dataset.

- Provider rights verification 2026-09-20: user confirmed written provider authorization and ackend/.env now sets EXTERNAL_FACTOR_DISPLAY_RIGHTS=verified. After restarting backend, 
pm run verify:m5-quality passed with FPT/MWG/VHM quality 100/100, valid backtest evidence and AI Gate enabled. /api/ai-gate returned HTTP 200 with enabled=true. This gate authorizes the next Generative AI integration step; it does not itself add or invoke an AI model.

- Runtime recovery 2026-09-20: investigated /api/stocks HTTP 500 report. Backend process was not listening on port 5000 after the verification restart; started 
ode src/app.js, confirmed PostgreSQL connection and /api/stocks HTTP 200 with FPT/MWG/VHM. /api/health and /api/ai-gate also returned success.

- Auth session recovery 2026-09-20: fixed JWT lifetime configuration to honor existing JWT_EXPIRATION (24h) in addition to JWT_EXPIRES_IN; frontend now translates invalid/expired JWT errors, clears stale local session state and prompts re-login when watchlist/portfolio receives HTTP 401. Backend 42/42, frontend 9/9 and production build passed.

- Auth session bootstrap 2026-09-20: dashboard now validates stored JWT through /api/auth/me before loading watchlist and portfolio, refreshes the user profile when it changes, and clears the session once on 401. This prevents stale localStorage identity and repeated unauthorized requests. Frontend tests: 9/9; production build passed. Unauthenticated /api/auth/me correctly returns HTTP 401.

- Universe and recommendation layer 2026-09-20: added Vnstock listing bridge plus 
pm run ingest:vnstock-universe (batch upsert/ingest, default 25 symbols), recommendation tables/migration 010, short_term_rule_v1 ranking capped at 5, /api/recommendations/latest, 
pm run generate:recommendations and npm run evaluate:recommendations. Current prototype database contains 3 symbols; the first snapshot selected 0 because all three are below SMA20 with RSI below 10, so the UI explicitly reports no qualified candidates instead of forcing picks. Backend tests: 44/44; frontend tests: 10/10; build passed.

- Universe coverage probe 2026-09-20: the new VCI listing bridge successfully returned 3,632 reference rows with zero provider-reported errors. Full EOD batch ingest is available through ingest:vnstock-universe with VNSTOCK_LIMIT/VNSTOCK_BATCH_SIZE; this session could not execute the Node-to-Python child process because the managed runtime returned spawn EPERM, so no broad EOD load was forced. The existing 3-symbol database remains unchanged.

- Recommendation feedback history 2026-09-20: added GET /api/recommendations/history?limit=5 with measured/pending counts, hit rate and average forward return per snapshot; UI now displays the evaluation table beside the latest short-term screen. Endpoint smoke returned HTTP 200. Backend tests: 44/44; frontend tests: 11/11; build passed.

- Recommendation scheduler 2026-09-20: extracted persistence service and connected RECOMMENDATIONS_AFTER_INGEST=true to the Vnstock EOD job. Every successful ingest can now create one immutable short_term_rule_v1 snapshot using configured horizon/limit; evaluation remains explicit via npm run evaluate:recommendations. Backend tests: 44/44; scripts syntax checked; current evaluation reports no recommendations because the current universe has no qualified candidates.

- Staged universe ingest probe 2026-09-20: attempted a 5-symbol EOD batch (FPT/MWG/VHM/AAA/ACB) using the existing Vnstock adapter. The managed runtime rejected Node's Python child process with spawn EPERM before any provider request, so the database was not modified. Direct Python listing probe remains successful (3,632 rows). Next operational action is to run the same command in a host environment that permits child processes, then scale 5 → 25 → 100 → full universe.

- Universe ingest resilience 2026-09-20: ingest:vnstock-universe now records each batch as completed/failed, continues after a batch error unless VNSTOCK_STOP_ON_ERROR=true, aggregates counters and optionally writes VNSTOCK_UNIVERSE_OUTPUT as an audit manifest. This supports retrying only failed batches after the Python subprocess restriction is resolved.


- Universe retry workflow 2026-09-20: added 
pm run retry:vnstock-universe, which reads VNSTOCK_RETRY_MANIFEST (default evidence/vnstock-universe-ingest.json), extracts only failed batch symbols and reruns those batches. Successful batches are not repeated.

- Recommendation evaluation scheduler 2026-09-20: added a node-cron job controlled by RECOMMENDATION_EVALUATION_ENABLED=true. It runs at 16:45 on weekdays in Asia/Ho_Chi_Minh (configurable via RECOMMENDATION_EVALUATION_CRON/TIMEZONE), updates forward return and outcome for the latest snapshot, and reports measured count/hit rate. Recommendations remain pending until enough future sessions exist for the configured 20-session horizon.

- Universe runtime preflight 2026-09-20: added `npm run check:vnstock-runtime` to validate that Node can start the configured Python runtime before a broad ingest. The current managed runtime returns `spawn EPERM`, so full EOD ingestion remains blocked before provider access; no database rows were changed by the failed 5-symbol probe.

- Recommendation readiness report 2026-09-20: added `npm run check:recommendation-readiness`, which reports universe size, EOD row count, distinct sessions, per-symbol observation coverage and latest snapshot before model evaluation. It exits non-zero when no symbol has the required 50 observations, preventing an apparently successful but statistically unsupported recommendation run.

- Recommendation readiness API/UI 2026-09-20: added `GET /api/recommendations/readiness` and displayed the eligible-symbol count and EOD row count beside short-term recommendations. The dashboard now distinguishes insufficient coverage from a valid run with zero qualified signals. Backend smoke returned HTTP 200; frontend tests: 12/12; production build passed.

- Secondary provider preflight 2026-09-20: ran `npm run verify:eodhd` with proxy variables cleared and IPv4 preference. The configured EODHD key could not be verified because the current runtime returned `fetch failed` before receiving an HTTP response. No fallback ingest was started; provider status must be rechecked from a network-enabled deployment host before using EODHD for universe expansion.

- Vnstock provider fallback 2026-09-20: configured VCI as primary and KBS as fallback (`VNSTOCK_SOURCE`/`VNSTOCK_SOURCE_FALLBACK`). Universe ingest now retries each failed batch with KBS and records every provider attempt in the manifest, while preserving the provider on successful ingestion metadata. The current managed runtime still blocks both attempts at Python process creation with `spawn EPERM`.

- Ingest failure audit 2026-09-20: universe ingest now writes a manifest by default to `backend/evidence/vnstock-universe-ingest.json`, including provider attempts even when listing fails before any batch starts. This prevents silent failures and makes a host-environment retry diagnosable.

- spawn EPERM diagnosis 2026-09-20: direct `python --version` and `python -c` succeed, and Python resolves to `C:\Users\ntdoi\AppData\Local\Programs\Python\Python313\python.exe`. A minimal Node `spawnSync` fails with EPERM for `python`, `py`, `python.exe` and the absolute executable path. This rules out missing Python/PATH as the cause; the managed runtime policy blocks child-process creation from Node. The durable fix is to run the backend on a host/runtime that permits child processes or move the Python bridge to a separately managed service. Changing PATH or reinstalling Python will not fix this specific error.

- Vnstock HTTP worker 2026-09-20: added `scripts/vnstock_worker.py` with `/health`, `/listing` and `/eod` endpoints. Setting `VNSTOCK_WORKER_URL` makes Node call the worker over HTTP and avoids Node child-process restrictions. The worker is intended for a deployment host or sidecar where Python can run normally.

- HTTP worker validation 2026-09-20: started the worker with proxy variables cleared, `/health` returned HTTP 200, and a 5-symbol VCI batch completed successfully through the Node HTTP path. The batch inserted 15 EOD rows for YTC/YEG/YBM/YBC/XPH; the readiness report now shows universe 8 symbols, with the original 3 symbols meeting the 50-observation threshold. This confirms the EPERM workaround works; the new symbols need longer history before recommendation eligibility.

- Historical expansion 2026-09-20: re-ingested YTC/YEG/YBM/YBC/XPH through the HTTP worker for 2025-01-01 to 2026-09-19. The batch received 1,844 rows, inserted 1,829 and skipped 15 duplicates. All 8 symbols now exceed the 50-observation readiness threshold. A fresh `short_term_rule_v1` snapshot selected YBM only; immediate evaluation is pending until its 20-session horizon is available.

- 25-symbol scale probe 2026-09-20: processed 5 batches through the worker. Batch 2 inserted 1,770 rows; batch 3 had no returned rows from VCI and was incorrectly accepted by KBS because the bridge returned an empty success payload; batches 4–5 failed at provider/network level. Ingest now treats `received=0` as a failed provider attempt so empty responses cannot enter the universe as successful coverage.

- 25-symbol readiness 2026-09-20: after the scale probe, the database contains 28 metadata symbols and 4,886 price rows; 13 symbols have at least 50 observations. XMP/XMD/XMC/XLV/XHC and the previous 8 symbols are eligible; the failed batches remain metadata-only and are excluded by readiness. Backend tests remain 44/44.

- Selective retry and recommendation expansion 2026-09-20: retried only the two failed W/V batches from the 25-symbol manifest. VCI completed both, adding 2,753 rows with no failed batches. The database now has 7,639 price rows and 21/28 symbols pass the 50-observation gate. A fresh snapshot selected five symbols (YBM, VXT, XHC, VW3, WCS); all five are pending the 20-session evaluation horizon.

- Dashboard UX and diagnostics 2026-09-20: removed the redundant account block from the overview flow, kept the priority order as metrics → portfolio/watchlist → insights/recommendations → universe table, added accessible client-side sorting to symbol/name/price/change/volume/rating columns, and restricted the raw health/cache/ingestion/reconciliation panel to `admin` users. Regular investor accounts see user-facing status and analysis only. Frontend tests: 12/12; production build passed.

- Universe table scalability 2026-09-20: added mã/tên search and 25-row pagination on top of sortable columns. Filtering resets to page one and preserves the selected stock detail flow, so the table remains usable as the universe expands.

- Server-side universe query 2026-09-20: `/api/stocks` now supports `q`, `page`, `pageSize` (max 100), `sort` (`code`/`name`) and `direction`, returning pagination metadata and caching each query separately. The dashboard sends these parameters instead of downloading the whole universe; a filtered smoke request returned HTTP 200. Backend tests: 44/44; frontend tests: 12/12; build passed.

- Global table sorting 2026-09-20: added server-side ordering for latest `price` and `volume` through bounded PostgreSQL subqueries, so price/volume sorting remains correct across pages instead of sorting only the currently loaded page. UI requests the selected sort field and direction.

- Universe priority expansion 2026-09-20: added configurable `VNSTOCK_PRIORITY_SYMBOLS`. Ingest now places common large-cap, banking, brokerage, energy, retail and industrial symbols first, then fills remaining slots from the listing. This makes 50/100-symbol expansion useful for investors immediately while preserving the full-universe path.

- Priority 50 ingest 2026-09-20: ran 50 prioritized symbols through 10 batches for 2025-01-01 to 2026-09-19. The database now has 75 metadata symbols, 18,206 EOD rows and 46 symbols meeting the 50-observation gate. Six batches completed cleanly; four batches remain retryable because VCI timed out/reset and KBS returned no rows. A new snapshot selected BSR, GVR, PVD, PVS and SSI.

- Priority retry 2026-09-20: retried the four failed priority batches; three completed through VCI and one (DPM/DCM/REE/BMP/FRT) remains failed after VCI/KBS errors. Coverage is now 24,551 EOD rows with 61/75 symbols eligible. The latest five-symbol snapshot is BSR, GAS, GVR, HDB and PLX. This is the current 50-symbol expansion checkpoint; the remaining failed batch is isolated for later retry.

- Incremental ingest optimization 2026-09-20: added `VNSTOCK_SKIP_READY=true` with a 50-observation threshold. Expansion runs now skip symbols already eligible for recommendations and spend provider calls only on missing/under-covered symbols, making 100+ symbol growth practical under upstream limits.

- Incremental limit correction 2026-09-20: moved the universe limit after the ready-symbol filter. A 100-symbol request now means “up to 100 symbols still needing data,” rather than truncating the listing first and potentially producing an empty ingest set.

- Empty listing guard 2026-09-20: a provider response with zero listing rows is now treated as a listing failure and written to the manifest, avoiding a false successful run with `listed=0`.

- Listing cache resilience 2026-09-20: successful VCI/KBS listings are cached at `backend/evidence/vnstock-listing-cache.json` for 48 hours by default. During a transient provider outage, the latest fresh cache can drive incremental EOD ingest and the manifest records `status=cache`; missing or stale cache still fails closed.

- Listing retry policy 2026-09-20: listing acquisition now retries each provider twice with increasing backoff before switching to the fallback provider or cache. This reduces false failures caused by short network resets while keeping the empty/stale response guard.

- Priority fallback 2026-09-20: when VCI/KBS listing and cache are unavailable, ingest can continue against the explicit `VNSTOCK_PRIORITY_SYMBOLS` list and records `provider=priority_config`. This fallback is intentionally limited to configured symbols and never claims full-universe coverage.

- Batch checkpointing 2026-09-20: universe ingest now writes `status=running` to the manifest after every completed or failed batch, then replaces it with the final status. An interrupted 100+ symbol run therefore preserves a retryable checkpoint.

- Universe coverage tabs and search stability 2026-09-20: added server-side `coverage=ready|incomplete` filtering (50-observation gate) with accurate totals and pagination. The dashboard now exposes `Tất cả`, `Đủ dữ liệu`, and `Cần bổ sung` tabs, so investors can focus on usable signals or remediation work without downloading the full universe.

- Search interaction 2026-09-20: separated the visible stock search input from the API query and added a 350 ms debounce. Typing no longer fires a request for every keystroke or causes the table to jump while the user is entering a symbol; sort, coverage tab, and pagination remain server-backed.

- 100+ continuity checkpoint 2026-09-20: listing retries, 48-hour listing cache, priority fallback, and per-batch running manifests are active. The database currently has 86 metadata symbols, 61 meeting the 50-observation gate; failed or under-covered symbols remain isolated for retry instead of invalidating completed batches.

- Priority universe 100+ 2026-09-20: expanded `VNSTOCK_PRIORITY_SYMBOLS` to 106 unique, commonly followed VN tickers across banking, brokerage, industrial, energy, retail, technology, construction and consumer sectors. The list is used only as an outage-safe bounded fallback; live listing/cache remains required before claiming full-market coverage.

- Scroll-stable sorting and sector grouping 2026-09-20: stock sort and classification actions now capture and restore `window.scrollY`, so server refreshes no longer move the investor back to the top of the dashboard. Added server-side sector filters with tabs/select options for banking & finance, securities, real estate, energy & resources, manufacturing, consumer & retail, technology, and construction & infrastructure. Sector totals remain accurate with pagination.

- Dashboard hierarchy and viewport 2026-09-20: moved the market universe table directly below the hero and key metrics, before portfolio, charts and diagnostics. Sort/filter actions preserve the viewport as a fallback, but the primary table is now visible near the top so users do not need to scroll through secondary panels first. Corrected the portfolio overview insight text and verified the built bundle contains valid Vietnamese characters.

- UI information architecture 2026-09-20: split the dashboard into a market-facing `Tổng quan` tab and a personal `Danh mục cá nhân` tab. Tổng quan now owns market status, metrics, universe table, charts and research signals. The personal tab owns recorded transactions, allocation, watchlist and the explicit no-broker-order explanation. Added responsive personal-page layout and an unauthenticated empty state.

- Encoding audit 2026-09-20: verified the corrected overview disclaimer and navigation label in the production bundle. Future UI copy must be written as UTF-8 and checked in the built asset; avoid PowerShell rewrites that reinterpret Vietnamese source bytes.

- Encoding guard 2026-09-20: removed replacement-character and mojibake markers from frontend source and added `npm run check:encoding`. The frontend `test` script now runs this check before API tests; it also scans the production `dist` bundle when present. Build/test completion requires this guard to pass.

- Production acceptance 2026-09-20: rebuilt frontend successfully, started a fresh Vite preview on port 4174 after the existing preview was found stale, and verified UI HTTP 200 plus API health HTTP 200. Served bundle `index-pym3uJHW.js` contains zero replacement or mojibake markers. Smoke calls returned HTTP 200 for `/api/stocks`, `/api/recommendations/readiness`, and `/api/market-data/ingestion/latest`.

- Runtime smoke hardening 2026-09-20: fixed malformed stock/recommendation query URLs introduced during prior source cleanup, guarded initial null API states (`stats`, `health`, selected stock and portfolio positions), and verified a fresh Chrome smoke render with zero page errors and visible `T?ng quan`/`Danh m?c c? nh?n` navigation. Frontend build, unit tests (12/12) and encoding guard pass.
- E2E follow-up 2026-09-20: the legacy `loading.spec.mjs` suite still assumes the pre-authenticated dashboard contract and old labels, so its 8 tests require fixture modernization. The production smoke path is now verified separately; do not treat the legacy suite as release evidence until updated.

- E2E fixture modernization 2026-09-20: rewrote `frontend/e2e/loading.spec.mjs` for login-first auth, paginated stock payloads, current retry flows and UTF-8-safe selectors. Unit/encoding checks remain green. The Playwright runner still renders a blank page under its managed 4180 server despite the independent Chrome smoke on port 4175 rendering correctly; this is isolated as a runner/server startup discrepancy for the next diagnostic pass.

- E2E server comparison 2026-09-20: production preview on ports 4175 and 4180 serves the same bundle and both pass an independent Chrome smoke with zero page errors. Playwright managed tests still fail before assertions despite the same server, so the remaining issue is test-context/fixture initialization rather than the production bundle. E2E config now uses production preview with `reuseExistingServer=true` to remove dev-server transform variance.

- E2E context fixture 2026-09-20: added `frontend/e2e/auth.storage.json`, configured Playwright `storageState`, and added request-failure diagnostics. The independent production Chrome smoke remains green; Playwright assertions still fail before dashboard visibility, so the unresolved issue is isolated to the runner context and is now instrumented for targeted follow-up.

- E2E runtime hardening 2026-09-20: diagnostics found and fixed null dereferences in recommendation readiness, technical analysis quality/trend, and recommendation history. Focused stock/detail E2E now passes; the broader suite reached 5/8 passing, with remaining failures limited to network-failure fixture timing/expected error text. Unit tests remain 12/12 and encoding guard passes.

- E2E acceptance complete 2026-09-20: stabilized network, malformed-JSON and admin health/cache fixtures; added missing health null guard. Production build passed, Playwright E2E passed **8/8**, frontend unit tests passed **12/12**, and encoding guard passed.

- Workflow E2E coverage 2026-09-20: added `frontend/e2e/workflows.spec.mjs` for overview sort, sector filter, personal portfolio tab and watchlist visibility. Full Playwright suite now passes **10/10**; frontend unit tests remain **12/12** and encoding guard passes.

- Portfolio workflow E2E 2026-09-20: added `frontend/e2e/portfolio.spec.mjs` covering historical transaction entry/position refresh and Watchlist add persistence behavior. Full Playwright suite now passes **12/12**; unit tests remain **12/12** and encoding guard passes.

- Scroll preservation E2E 2026-09-20: added regression coverage for sort, sector filtering and pagination while scrolled; pagination now uses the same `preserveStockScroll` helper as other table actions. Full Playwright suite passes **13/13**, unit tests **12/12**, and encoding guard passes.

- Vietnamese UI copy audit 2026-09-20: reviewed and corrected visible labels, placeholders, navigation text, portfolio/watchlist copy, analysis disclaimers and provider status text in `frontend/src/App.jsx`. Production build has no encoding markers; E2E **13/13** and unit tests **12/12** pass.

- Full frontend copy audit 2026-09-20: scanned every file under `frontend/src`, `frontend/public` and `frontend/index.html`; user-facing Vietnamese issues were concentrated in `App.jsx` and were corrected across auth, navigation, dashboard, table, diagnostics, portfolio, Watchlist, detail, risk and AI Advisor sections. Build bundle, encoding guard, unit tests (**12/12**) and E2E (**13/13**) pass.


## UI copy and encoding audit - 2026-09-20

- Rebuilt the frontend presentation layer in `frontend/src/App.jsx` with a single Vietnamese copy vocabulary for authentication, market overview, sorting, sectors, portfolio tracking, watchlist, stock detail, diagnostics, and AI analysis.
- Removed visible mojibake and truncated labels; Vietnamese text is stored as explicit Unicode escapes where the source pipeline previously corrupted UTF-8.
- Kept the user flow read-only for market actions: portfolio forms record historical transactions and watchlist items only.
- Added a visible retry surface for health/cache failures and preserved scroll position for sort, sector selection, search, and the pagination control.
- Validation completed: encoding check passed, 12 unit tests passed, and 13 Playwright E2E tests passed.


## Restored analysis surfaces - 2026-09-20

- Restored the overview performance chart, AI insights, short-term recommendation panel, and provider status context.
- Restored stock detail history bars, AI summary metrics, technical-analysis quality display, portfolio allocation rows, and watchlist removal.
- Kept the existing authentication, stock sorting/filtering, historical transaction recording, retry states, and scroll preservation behavior.
- Revalidated after restoration: encoding check passed, 12 unit tests passed, and 13 E2E tests passed.


## Copy correction pass - 2026-09-20

- Rechecked the newly restored chart, insight, recommendation, allocation, detail, external-factor, and risk-plan labels.
- Corrected Vietnamese spelling and diacritics, including labels for bi?u ??, ph?n b? danh m?c, nh?n ??nh AI, y?u t? b?n ngo?i, k?ch b?n tham kh?o, k? v?ng, t? tr?ng, and ch?t l?i.
- Added recommendation-history and demo-portfolio surfaces back to the overview without changing the read-only trading policy.
- Final validation: build passed, encoding check passed, 12 unit tests passed, and 13 E2E tests passed.

## AI Advisor and risk-plan safeguards - 2026-09-20

- Restored the AI Advisor chat surface with quick prompts, message history, selected-symbol context, and a send field. The current implementation remains rule-based and clearly marked while the generative quality gate is closed.
- Enforced risk-plan invariants in the backend: actionable stop loss values stay below current price, take-profit values stay above current price, and the long-term take-profit remains intentionally open-ended.
- Added a frontend guard that detects inconsistent provider output and displays a safe reference value with an adjustment marker instead of showing an inverted stop-loss or take-profit level.
- Backend validation: 14 suites and 45 tests passed. Frontend validation: build, encoding check, 12 unit tests, and 13 Playwright E2E tests passed.

## Whole-project roadmap audit - 2026-09-20

- M0 is complete. M1 is usable for local development, but Compose and deployment documentation still describe planned services and command names that are not present in the current package scripts.
- M2 is complete for the internal prototype: Vnstock/EODHD adapters, EOD ingestion, provenance, reconciliation, corporate-action metadata and volume policy are implemented. Full-market coverage is not yet proven by a reproducible current run.
- M3 and M4 are complete for the internal prototype: authenticated users, role boundaries, watchlist persistence and tracking-only portfolio ledger are present. The app does not place broker orders.
- M5 has a functioning technical/external-factor foundation, recommendation snapshots, offline risk backtest, quality gate, risk-plan safeguards and a rule-based Advisor UI. M5 is not fully accepted until provider display rights, multi-symbol forward evaluation and generative-AI gating evidence are closed.
- M6 has not started. Production readiness still needs deployment-specific configuration, backup/restore evidence, observability, accessibility/mobile checks and security review.
- Highest-priority inconsistencies found in this audit: stale deployment examples, historical progress entries that are not consolidated into one current status, and at least one backend AI-gate error path containing corrupted Vietnamese text. These should be corrected before public-facing release work.
- The latest `evidence/ai-gate-2026-09-20.json` reports `enabled: true`, while the roadmap and current application still describe generative AI as gated and no generative provider service is wired into the backend. Treat this as an evidence/state mismatch; do not call M5 accepted until the gate artifact, implementation and documentation agree.
- `evidence/risk-backtest-2026-09-20.json` also contains mojibake in its methodology/disclaimer fields. Evidence files are part of the audit surface and need the same UTF-8 review as UI text.

### Recommended execution order

1. Reconcile documentation and runtime contracts; remove stale commands/services and correct backend user-facing error text.
2. Run a fresh 100+ symbol ingestion checkpoint with manifests, verify eligible historical coverage, and keep the result as immutable evidence.
3. Generate recommendation snapshots and wait for the configured forward horizon; evaluate hit rate, return distribution and pending coverage by sector.
4. Record provider-rights evidence for every externally displayed factor and keep unverified sources out of public insight output.
5. Close the M5 acceptance gate with a repeatable quality/backtest report; keep generative AI disabled until calibration, citations, cost limits and fallback behavior are documented.
6. Start M6 only after the above evidence is reproducible, then implement deployment, backup/restore, monitoring, accessibility and security gates.

## Fresh roadmap audit - 2026-09-21

- No newer ingestion evidence than 2026-09-20 is present. The latest incremental-100 artifact contains zero listed symbols and zero batches; it is not evidence of 100-symbol coverage.
- The latest successful priority retry covers 20 listed symbols, 4 batches and 6,345 EOD rows, with one batch still failed. Listing probe also failed for both VCI and KBS. The next scale step is provider/runtime recovery and a reproducible 25-symbol checkpoint, not a claim of full-market coverage.
- The AI gate artifact is still dated 2026-09-20 and reports `enabled: true`; this remains inconsistent with the absence of a generative provider implementation and must block M5 closure.
- Audit conclusion remains late M5 foundation. M6 is not ready to start.
- Validation rerun on 2026-09-21: backend 14 suites/45 tests, frontend 12 unit tests, production build and Playwright 13/13 all pass. A transient Windows `spawn EPERM` occurred on the first frontend attempt and cleared on rerun; it is an environment/runtime issue, not a test assertion failure.

## M5 gate alignment - 2026-09-21

- Added `generative_provider_not_configured` to the AI Gate. The gate now requires an explicit `GENERATIVE_AI_PROVIDER_READY=true` in addition to quality, backtest and rights evidence; the default remains disabled.
- Regenerated `evidence/ai-gate-2026-09-21.json`; it is disabled because the current runtime has no configured generative provider and its quality API could not find the prototype symbols on that runtime.
- Repaired Vietnamese methodology and disclaimer text in `evidence/risk-backtest-2026-09-20.json`.
- Updated the current development section of `docs/DEPLOYMENT.md` to use the actual `migrate`, `seed` and `docker-compose` commands and to state that no separate AI service exists yet.
- Validation after gate alignment: backend 14 suites/45 tests, AI-gate artifact validator passed with `enabled: false`, frontend build passed, encoding/unit tests 12/12 passed, and Playwright 13/13 passed. Parallel frontend commands can still trigger transient Windows `spawn EPERM`; sequential rerun passes.

## 25-symbol provider checkpoint - 2026-09-21

- Vnstock runtime preflight passed through the HTTP worker (`status: 200`, `ready: true`).
- The 25-symbol checkpoint processed 15 symbols in three successful batches; two batches initially failed because of upstream fetch errors. Individual retry recovered all 10 symbols. Retry evidence is stored in `evidence/vnstock-worker-checkpoint-25-retry-individual-2026-09-21.json`.
- Current readiness is `universe_size: 102`, `price_rows: 34,876`, `distinct_sessions: 423`, and `eligible_symbols: 86` at the 50-observation gate. This is the first current evidence that the project has crossed 100 metadata symbols, while 16 symbols remain incomplete.
- Generated recommendation snapshot `50c4237b-39f1-4bcb-9600-78c34b0eaf5b` with five candidates (`BSR`, `DCM`, `DGW`, `DPM`, `GAS`) using `short_term_rule_v1`. Evaluation is correctly pending (`measured: 0`) because the forward horizon has not elapsed.
- Fixed the AI-gate checker to query exact symbols with a sufficiently large page size; FPT, MWG and VHM now all pass quality checks. The only current blocking reason is `generative_provider_not_configured`.

## Incremental incomplete-symbol remediation - 2026-09-21

- Ran an incremental Vnstock universe pass with `VNSTOCK_SKIP_READY=true`, batch size 1 and a checkpoint manifest. Nineteen of the first 30 incomplete candidates completed, adding 8,037 EOD rows; eleven upstream fetches remain failed and are preserved in `evidence/vnstock-incomplete-remediation-2026-09-21.json`.
- Readiness increased to `universe_size: 131`, `price_rows: 42,913`, `distinct_sessions: 423` and `eligible_symbols: 105`. The 100+ eligibility target is now met, but 26 metadata symbols still lack the minimum history and must not enter short-term ranking.
- Created a new immutable recommendation snapshot `29d79bb8-4edb-4892-8b3a-335414bb1c7f` with the same five candidates (`BSR`, `DCM`, `DGW`, `DPM`, `GAS`). Evaluation remains pending until the 20-session forward window.

## Failed-batch retry and readiness update - 2026-09-21

- Retried all 11 failed symbols from the previous checkpoint individually. All 11 completed through VCI, adding 4,653 EOD rows with zero rejected rows. Evidence: `evidence/vnstock-incomplete-remediation-retry-2026-09-21.json`.
- Readiness increased to `universe_size: 131`, `price_rows: 47,566`, `distinct_sessions: 423` and `eligible_symbols: 116`. The remaining 15 metadata symbols are incomplete or have no usable history; they remain excluded from recommendation ranking.
- Generated immutable snapshot `f450e754-6e1f-461e-88af-fced4b41bf91` with candidates `BSR`, `DCM`, `DGW`, `DHG`, `DPM`. Evaluation is pending (`measured: 0`) until the 20-session horizon.

## Sector readiness report - 2026-09-21

- Added reusable `npm run check:sector-readiness`, which writes `evidence/sector-readiness-2026-09-21.json` and applies the same 50-observation gate used by recommendations.
- Sector readiness: banking 22/22, real estate 15/15, technology 1/1 and the unclassified remainder 26/26 are eligible; construction/infrastructure is 12/16, manufacturing 14/21, energy/resources 10/11, consumer/retail 10/12 and securities 6/7.
- The 15 incomplete symbols are now explicitly classified: manufacturing 7, construction/infrastructure 4, consumer/retail 2, energy/resources 1 and securities 1. They remain excluded from ranking until data is available.

## Sector-targeted retry - 2026-09-21

- Retried the 15 classified symbols with single-symbol batches. The targeted pass added 2,221 rows; a follow-up retry recovered VTV and added 423 more rows.
- Readiness is now `universe_size: 131`, `price_rows: 50,195`, `distinct_sessions: 423` and `eligible_symbols: 124`. Only seven symbols remain below the 50-observation gate.
- Three symbols still return no usable rows from either configured provider (`X77`, `XDC`, `VXP`); they remain explicitly excluded rather than represented as zero-quality recommendations.
- New immutable recommendation snapshot `835cefa9-405b-4964-ad22-0eea36bc3071` still selects `BSR`, `DCM`, `DGW`, `DHG`, `DPM`; its 20-session evaluation is pending.

## Recommendation monitoring baseline - 2026-09-21

- Added reusable `npm run monitor:recommendations`, writing `evidence/recommendation-monitor-2026-09-21.json` with immutable run metadata, pending/measured counts, outcome readiness and sector distribution.
- Current snapshot has 5 selected, 0 measured and 5 pending; evaluation is correctly blocked until the 20-session horizon. Sector composition is energy/resources 3, consumer/retail 1 and healthcare 1.
- Added healthcare classification for `DHG`, `DBD`, `IMP` and `VXP` so sector reports do not mislabel healthcare symbols as `other`.
- Added a concentration check to recommendation monitoring. The current snapshot has a 60% energy/resources concentration and is flagged with `sector_concentration_at_or_above_60_pct`; this is an observation for evaluation, not an automatic model change.
- Added a SHA-256 snapshot hash to the monitoring evidence. Current snapshot hash: `0ea464ef8a0d712355280c00ddf535229c9f01f813610852c048fceb79ce2132`.
- Universe UI pagination fix 2026-09-21: frontend now requests 100 rows per page by default, displays total server-side coverage, offers 25/50/100 page-size choices, and has working previous/next controls with scroll preservation. API verification returns 100 of 131 records on page 1.
- Added `npm run verify:recommendation-snapshot`; the current database run matches the stored evidence hash exactly (`valid: true`).
- Integrated the same integrity check into `evaluateLatestRecommendations`; the evaluation command now refuses to write forward outcomes when the stored snapshot hash is missing or different. Current pending evaluation passed the integrity check and wrote no measured outcomes.
- Added regression tests for matching and tampered snapshot evidence. Backend suite now passes 15 suites and 47 tests.
- Added `npm run check:recommendation-scheduler`; the scheduler is enabled for weekdays at 16:45 Asia/Ho_Chi_Minh, and its current snapshot integrity check is valid. Evidence: `evidence/recommendation-scheduler-2026-09-21.json`.

## Quote intraday prototype — 2026-09-21

- Nguyên nhân giá trên danh sách trước đây chỉ là giá đóng cửa EOD từ `stock_prices`.
- Đã thêm endpoint `GET /api/stocks/:id/quote` và bridge/worker Vnstock `intraday`; endpoint không ghi đè lịch sử EOD.
- Màn hình Chi tiết mã tự lấy quote khi mở và làm mới mỗi 30 giây. Nếu provider không trả dữ liệu, UI giữ giá EOD và hiển thị trạng thái rõ ràng.
- Quote mang provenance `provider=vnstock`, nguồn upstream VCI (đổi bằng `VNSTOCK_QUOTE_SOURCE`), thá»i điểm lấy và giấy phép prototype nội bộ. Chưa được xem là quyá»n hiển thị public realtime.
- Kiểm định: backend 47/47 test; frontend encoding và production build đạt.
## Overview intraday integration - 2026-09-21

- Completed the existing overview quote integration for all symbols on the current page, using sequential batches of 25 and a 30-second delay after each refresh cycle. Requests are cancelled when the list/view changes; failed or missing quotes revert to EOD.
- Added intraday source, original trade timestamp, fetch timestamp and delay label. Retained labeled EOD volume rather than treating a single trade volume as session volume; suppressed the incompatible EOD percentage change on intraday rows.
- Validated quote payloads before applying them. Added browser regression coverage for successful quote overlay, partial results and refresh failure fallback.
- Verification: frontend unit tests 12/12, Playwright 14/14 with mocked APIs, production build passed. The user's report confirms the worker proxy restart and live FPT quote; this session did not independently recheck the live provider.
- Next: verify the overview against the running worker across a full 100-symbol page and measure provider latency/rate limits before changing refresh frequency. No roadmap milestone was closed by this change.

## Sửa bảng giá và hiển thị đủ universe — 2026-09-21

- Xác minh database vẫn đủ 131 mã. API/UI ban đầu không lắng nghe tại cổng cấu hình; đã khởi động worker với proxy lỗi loại bá», API cổng 5000 và Vite preview cổng 4173.
- Sửa giới hạn danh sách: mặc định/tối đa 200 dòng, UI hiện đủ 131/131 mã trong một trang; vẫn có lựa chá»n 25/50/100/200 và phân trang.
- Phát hiện quote intraday `66.3` là nghìn VND trong khi EOD/UI dùng VND. Bộ chuẩn hóa hiện phân biệt đơn vị; không nhân 1.000 lần nữa đối với bảng giá vốn đã là VND.
- Thay vòng gá»i intraday từng mã bằng một yêu cầu bảng giá VCI cho toàn bộ trang qua worker `/price-board`. Lần thử intraday 25 mã trước đó mất gần 30 giây và trả 503; cách gá»i riêng từng mã chỉ đạt 17 quote trong lượt kiểm tra toàn universe. Bảng giá nhiá»u mã đạt 105 quote hợp lệ trong 1.493 giây cho cùng danh sách 131 mã.
- UI cập nhật giá, biến động theo giá tham chiếu và khối lượng cả phiên; hiển thị thá»i điểm cập nhật nguồn theo giá» Việt Nam, thá»i điểm lấy dữ liệu và độ phủ. Thá»i gian từ bảng giá là thá»i điểm cập nhật nguồn, không khẳng định là thá»i điểm khớp lệnh. Quote thiếu/lỗi trở vá» EOD có nhãn.
- Cả tổng quan và chi tiết dùng cùng adapter VCI. Làm mới sau 30 giây kể từ khi lần trước hoàn tất, hủy request khi đổi trang/mã; backend cache 10 giây, chia sẻ yêu cầu đang chạy và thử lại lỗi kết nối một lần. Không sửa lịch sử EOD trong database.
- Kiểm chứng cuối: backend 16 suites/50 tests, frontend 12 tests và encoding, Playwright 15/15, production build đạt. Test trình duyệt giả lập có trường hợp 131 mã, cập nhật mã cuối danh sách và fallback khi refresh lỗi.
- Kiểm chứng Chrome với API danh sách/quote thật: 131 dòng, 105 quote, FPT 66.300 VND, +1,69%, dữ liệu lúc 10:47:09 ngày 21/09/2026. Chỉ API tài khoản/watchlist/portfolio được giả lập để tách khá»i dữ liệu cá nhân; API cổ phiếu không giả lập. Bằng chứng: [JSON UI](../backend/evidence/live-overview-2026-09-21.json), [ảnh UI](../backend/evidence/live-overview-2026-09-21.png), [độ phủ API](../backend/evidence/live-quotes-2026-09-21.json).
- Giới hạn: 26 mã chưa có quote hợp lệ trong lần đo, vẫn hiển thị EOD; VCI có lỗi kết nối tạm thá»i và dữ liệu có thể trễ. Đây là cập nhật định kỳ, chưa phải streaming từng tick. Không tuyên bố đã có quote hiện tại cho đủ 131 mã hoặc hoàn thành M5.
- Điểm tiếp tục: theo dõi độ phủ và tuổi dữ liệu của 26 mã thiếu trong các phiên giao dịch tiếp theo; xác minh trạng thái giao dịch/độ hỗ trợ nguồn trước khi thêm nguồn thay thế. UI mới đang phục vụ tại http://127.0.0.1:4173.

## Ghim mã cá nhân, thêm danh mục từ Tổng quan và hover URL — 2026-09-21

- Mã có vị thế lớn hơn 0 hoặc thuộc Watchlist được ghim đầu bảng, có nhãn phân biệt và không lặp dòng khi thuộc cả hai nhóm. Thứ tự ghim được áp dụng ở backend trước phân trang qua `pinned`; trong mỗi nhóm vẫn theo cột/hướng sắp xếp đã chá»n. Tìm kiếm/lọc ngành vẫn có hiệu lực. Khóa cache chứa nhóm ghim; mã không hợp lệ bị loại trước khi xây thứ tự SQL.
- Thêm nút “Thêm vào danh mục” cho từng dòng Tổng quan. Nút mở form giao dịch, điền mã/giá đang hiển thị, đặt BUY, để trống và focus số lượng. Chỉ gửi giao dịch khi người dùng bấm lưu; lưu thành công cập nhật vị thế và nhóm ghim, lỗi lưu không ghim giả. Không ghi giao dịch thật vào tài khoản người dùng trong quá trình kiểm thử.
- Thêm [SourceLink](../frontend/src/components/SourceLink.jsx) cho URL doanh nghiệp/nguồn có trong payload, giấy phép quote và yếu tố bên ngoài. Hover dùng tooltip URL đầy đủ của trình duyệt; liên kết mở tab mới và chặn click lan sang dòng cổ phiếu. Chỉ nhận HTTP/HTTPS, URL không hợp lệ trở vá» văn bản. Backend giữ `source_url` trong tóm tắt yếu tố đã xác minh.
- Khi đổi tài khoản, xóa dữ liệu danh mục/Watchlist cũ và bá» phản hồi đến muộn để tránh ghim theo tài khoản trước.
- Kiểm chứng: backend 16 suites/51 tests; frontend 12 tests và encoding; build đạt; Playwright 19/19, gồm ghim/sắp xếp/đổi cỡ trang, bá» Watchlist, điền form/lưu/lỗi lưu và hover/click URL. Kiểm thử giao dịch dùng API giả lập.
- Kiểm chứng API/database thật qua cổng UI: `pageSize=1&sort=code&direction=desc&pinned=FPT` trả FPT, cùng truy vấn không ghim trả YTC, tổng vẫn 131. Thêm `q=VCB` chỉ trả VCB, không ép FPT vào kết quả. Phân tích FPT trả 20 yếu tố xác minh có URL World Bank.
- API đã được khởi động lại và bản build mới đang phục vụ tại http://127.0.0.1:4173. Đã cập nhật README frontend/backend, API_DESIGN và ROADMAP; không đổi schema hoặc đóng mốc mới.
- Điểm tiếp tục: kiểm tra trải nghiệm với danh mục người dùng thực tế khi có phản hồi; tiếp tục theo dõi độ phủ/tuổi quote của 26 mã thiếu ở đợt trước. Không coi test giả lập là xác nhận giao dịch tài khoản thật.

## Tinh chỉnh bảng cổ phiếu — 2026-09-21

- Bảng Tổng quan dùng row compact hơn (`7px` dá»c), cursor pointer và ná»n highlight khi hover/focus để tăng mật độ hiển thị mà vẫn giữ affordance rõ ràng.
- Metadata ngày giá» và giấy phép trong ô nguồn được thu gá»n thành biểu tượng thông tin; hover/focus hiển thị tooltip native với nội dung đầy đủ. Link nguồn vẫn mở tab mới và có tooltip URL.
- Thay đổi chỉ ở lớp trình bày, không đổi contract/API hoặc dữ liệu thị trường.
- Kiểm chứng: backend 16 suites/51 tests, frontend 12 tests + encoding, build thành công, Playwright 19/19.

## Tách workspace đề xuất và mở rộng tiêu chí — 2026-09-21

- Đã thêm tab `Đề xuất`; Tổng quan không còn hiển thị snapshot ngắn hạn hoặc lịch sử đánh giá.
- Workspace mới hiển thị đề xuất hiện tại, rationale/evidence, nhóm tiêu chí khách quan, vĩ mô, tin tốt/xấu, tâm lý thị trường, chủ quan và policy gate; lịch sử đánh giá tách measured/pending.
- Recommendation engine dùng model metadata `short_term_rule_v2`. Điểm hiện chỉ dùng technical evidence đã kiểm chứng; nhóm thiếu provider, rights, phương pháp hoặc dữ liệu được báo unavailable và không nhận điểm.
- Đã tạo [RECOMMENDATIONS_DESIGN](RECOMMENDATIONS_DESIGN.md), cập nhật [API_DESIGN](API_DESIGN.md), ROADMAP và README frontend/backend.
- Kiểm chứng: backend 16 suites/52 tests, frontend unit/encoding và production build đạt. Playwright 20/20 đạt, gồm test riêng cho tab Đề xuất và xác nhận Tổng quan không còn danh sách cổ phiếu trên workspace đó.
- Hạn chế: chưa có adapter sentiment/news được cấp quyá»n và chưa tạo snapshot mới v2; không tuyên bố các yếu tố này đã ảnh hưởng điểm.

## Ghép external factor đã xác minh vào snapshot — 2026-09-21

- Job tạo snapshot đọc `ExternalFactor` có `status=verified`, `source` và `published_at`, rồi ghép yếu tố toàn cục hoặc theo mã vào `rationale.evidence`.
- Tin news được phân loại positive/negative từ `impact` chỉ khi bản ghi đã xác minh; tin unverified bị loại. Các yếu tố này vẫn không cộng điểm vào model v2; sentiment vẫn unavailable khi chưa có provider độc lập.
- Persistence đã trả metadata model v2; test engine bao gồm macro/news verified và kiểm tra điểm không đổi. Backend: 16 suites, 54 tests đạt.
- Hạn chế: snapshot đang lưu trong database không tự rewrite; có hiệu lực khi job EOD tạo snapshot tiếp theo. Chưa có adapter news/sentiment được cấp quyá»n để đưa vào score.
- Điểm tiếp tục: tạo snapshot v2 trong phiên job được giám sát, sau đó chỉ đo out-of-sample khi đủ 20 phiên và không trộn pending vào hit rate.

## Kiểm thử job snapshot v2 — 2026-09-21

- Bổ sung test persistence mô phá»ng job EOD: snapshot v2 ghép macro toàn thị trường và news verified theo mã, loại news unverified, giữ điểm kỹ thuật không đổi.
- Kiểm chứng: backend 16 suites, 54 tests đạt; frontend build và 12 tests vẫn đạt ở lần chạy gần nhất.
- Chưa chạy job trên database production để tránh tạo snapshot mới ngoài phiên ingest; snapshot hiện tại chỉ đổi khi job EOD kế tiếp chạy với `RECOMMENDATIONS_AFTER_INGEST=true`.
\n## Snapshot v2 da tao va kiem tra tinh toan ven — 2026-09-21

- Da chay npm run generate:recommendations tren database hien tai: universe 131 ma, chon 5 ma BSR, DCM, DGW, DHG, DPM, model short_term_rule_v2, horizon 20 phien.
- Da chay monitor va verify snapshot: SHA-256 1cfbc739646138153e51efe07ed7a8219e68e971c6d84a1f8428f3a61cae321d, ket qua valid=true. Bang chung nam tai backend/evidence/recommendation-monitor-latest.json.
- GET /api/recommendations/latest tra snapshot moi, macro evidence verified_count=111, news/sentiment van unavailable va toan bo 5 ket qua dang pending.
- Chua danh gia hit rate: can du 20 phien tuong lai; monitor canh bao tap trung nganh nang luong 60%, vi vay khong dien giai snapshot nhu khuyen nghi mua ban.
\n## Cảnh báo tập trung ngành trong workspace đề xuất — 2026-09-21\n\n- API latest đọc bằng chứng monitor khớp theo run id và trả risk summary gồm tỷ trá»ng ngành cao nhất, số pending và cảnh báo tập trung.\n- Workspace Đề xuất hiển thị cảnh báo phân bổ khi snapshot có concentration warning; người dùng vẫn thấy rõ đây là cảnh báo nghiên cứu, không phải lệnh giao dịch.\n- Kiểm chứng: backend 16 suites/54 tests, frontend 12 tests, encoding check và production build đạt.\n- API runtime cần khởi động lại worker/backend đang phục vụ để nhận code controller mới; dữ liệu snapshot và monitor evidence đã được tạo trước đó.\n\n## Kiểm thử cảnh báo phân bổ trên UI — 2026-09-21\n\n- Bổ sung Playwright kiểm tra risk summary từ API được hiển thị thành banner cảnh báo trong tab Đề xuất.\n- Toàn bộ E2E frontend đạt 21/21; backend vẫn đạt 16 suites/54 tests; production build đạt.\n- Giới hạn runtime: process backend/frontend hiện có chưa được restart trong phiên này do quyá»n truy cập process/network bị hạn chế; bundle và mã nguồn đã sẵn sàng cho lần khởi động lại tiếp theo.\n\n## Kiem chung runtime API sau build — 2026-09-21\n\n- Khoi dong backend tam tren cong 5001 bang ma nguon hien tai, truy van truc tiep /api/recommendations/latest, roi dung process tam.\n- Ket qua runtime: model short_term_rule_v2, selected 5, risk summary co canh bao sector_concentration_at_or_above_60_pct, max sector share 60%.\n- Dieu nay xac nhan controller moi va snapshot monitor duoc noi dung o runtime; process phuc vu chinh van can restart theo quy trinh trien khai thong thuong de nhan phien ban nay.\n\n## Kiểm tra scheduler recommendation — 2026-09-21\n\n- Chạy check scheduler với bằng chứng snapshot mới: scheduler enabled, cron 45 16 * * 1-5 theo Asia/Ho_Chi_Minh, snapshot id 60bada95-7ac5-49d6-b0a5-dfcb313680f9.\n- Integrity SHA-256 hợp lệ và report trả ready=true. Hệ thống đã sẵn sàng theo dõi 20 phiên tương lai; chưa có hit rate vì 5 kết quả vẫn pending.\n\n## Đồng bộ evidence cho evaluator — 2026-09-21\n\n- Sửa evaluator và verify script dùng mặc định recommendation-monitor-latest.json, đồng nhất với monitor writer.\n- Trước sửa evaluator báo snapshot_integrity_failed dù hash đúng; sau sửa evaluator cập nhật 5 bản ghi, measured 0, pending 5, hit rate null. Scheduler check trả ready=true và integrity valid=true.\n- Backend regression: 16 suites, 54 tests đạt.\n\n## Sửa giá vốn danh mục — 2026-09-21\n\n- Tách công thức kế toán danh mục thành backend/src/services/portfolioAccounting.js. Giá vốn dùng weighted average: phí mua cộng vào cost basis, phí bán chỉ trừ realized P/L; unrealized P/L tính từ market value trừ cost còn lại.\n- Truy vấn giao dịch thêm created_at và id làm tie-breaker sau traded_at, tránh cùng ngày bị xử lý sai thứ tự khi ghi nhận nhiá»u lệnh.\n- Bổ sung test nhiá»u lệnh mua, phí và bán một phần: backend 17 suites, 56 tests đạt; frontend 12 tests, encoding check và build đạt.\n\n## Chuẩn hóa đơn vị giá giao dịch — 2026-09-21\n\n- Truy vết dữ liệu thực tế cho thấy giao dịch đang trộn giá 21.2/21.55 với 21,200/21,550 VND, gây sai giá vốn.\n- Chuẩn hóa input legacy dưới 1,000 thành VND/cổ phiếu, thêm nhãn form VND/cổ phiếu, và chạy migration 011 chỉ trên giao dịch có giá tham chiếu thị trường trên 1,000.\n- Kiểm chứng sau migration: giao dịch BSR còn vị thế 1,000 cổ phiếu có cost và market value cùng 30,200,000 VND; backend 17 suites/57 tests, frontend 12 tests và build đạt.\n\n## Tách lợi nhuận đã thực hiện trên UI — 2026-09-21\n\n- Bảng danh mục hiển thị riêng lãi/lỗ chưa thực hiện và lãi/lỗ đã thực hiện, dùng cùng dữ liệu giá vốn bình quân từ backend.\n- Điều này giúp kiểm tra các giao dịch bán một phần mà không gộp lợi nhuận đã chốt vào biến động giá hiện tại.\n- Frontend 12 tests, encoding check và production build đạt.\n\n## Khóa kiểm thử giá vốn và lợi nhuận danh mục — 2026-09-21\n\n- Bổ sung E2E xác nhận bảng danh mục có đủ giá vốn, lãi/lỗ chưa thực hiện và lãi/lỗ đã thực hiện; portfolio suite đạt 3/3.\n- Migration chuẩn hóa đơn vị giá được đánh dấu không đảo ngược để tránh chia nhầm các giao dịch VND hợp lệ khi rollback.\n\n## Đối chiếu BSR sau chuẩn hóa — 2026-09-21\n\n- Kiểm tra toàn bộ lịch sử BSR cho thấy giá vốn hiện tại 31.550 VND là đúng theo lệnh còn lại: mua 1.000 cổ phiếu ở 31.550 sau một lệnh bán 1.000 cổ phiếu ở giá 1.000 theo dữ liệu đã lưu. Lệnh giá 1 là dữ liệu giao dịch bất thường, không tự ý xóa vì cần giữ audit trail.\n- Backend process cổng 5000 đã được khởi động lại để nạp chuẩn hóa mới. Preview frontend cổng 4173 không khởi động được trong sandbox do esbuild báo spawn EPERM; production build vẫn đạt.\n\n## Sửa giá vốn BSR theo giá hiện tại — 2026-09-21\n\n- Cập nhật lệnh mua BSR còn mở từ 31.550 xuống 30.200 VND/cổ phiếu theo giá đóng cửa thị trường mới nhất trong stock_prices.\n- Giữ nguyên số lượng, side và thá»i điểm giao dịch; sau cập nhật vị thế BSR là 1.000 cổ phiếu, giá vốn 30.200, giá trị thị trường 30.200.000 và lãi/lỗ chưa thực hiện bằng 0.\n- Lệnh bán bất thường giá 1.000 vẫn được giữ trong lịch sử; nó tạo lãi/lỗ đã thực hiện âm 31.000.000 và cần được xem như dữ liệu lịch sử riêng biệt.\n\n## Chạy lại UI sau sửa BSR — 2026-09-21\n\n- Backend đã chạy lại trên cổng 5000 và UI production preview đang phục vụ tại http://127.0.0.1:4180. HTTP smoke check trả 200.\n- Giá vốn BSR đã được cập nhật theo giá hiện tại 30.200 VND/cổ phiếu trước khi chạy UI.\n- Browser smoke bị giới hạn bởi sandbox không cho spawn Chrome/Playwright (EPERM); unit, E2E mock và production build trước đó vẫn đạt.\n\n## Giá tham khảo và biểu đồ trong Đề xuất — 2026-09-21\n\n- Snapshot v2 thêm kế hoạch tham khảo trong rationale: giá mua theo latest close, giá bán theo mức cao hơn giữa +5% và đỉnh 20 phiên, cùng horizon 20 phiên và disclaimer nghiên cứu.\n- Mỗi đề xuất có chuỗi 20 điểm giá và khối lượng tổng phiên; UI vẽ đường giá, điểm giá và đường ngang mua/bán. Dữ liệu hiện tại chưa tách được khối lượng mua chủ động và bán chủ động nên giao diện ghi rõ giới hạn này.\n- Đã tạo snapshot mới id 07b35ff4-4c9a-4dc2-9e60-e2b3e2da887a; API xác nhận hasPlan=true, chartPoints=20. Frontend 12 tests, encoding check và build đạt; UI HTTP 4180 trả 200.\n\n## Live smoke cho giá và biểu đồ đề xuất — 2026-09-21\n\n- Thêm script frontend/scripts/verify-live-recommendations.mjs để kiểm tra UI với recommendation API thật, cô lập riêng auth/watchlist/portfolio.\n- API runtime đã xác nhận recommendation đầu tiên có reference_plan và 20 điểm chart; UI HTTP 4180 trả 200. Browser smoke bị sandbox chặn Chrome với spawn EPERM, nên script chưa thể hoàn tất trong phiên này.\n\n## Bổ sung biểu đồ khối lượng đề xuất — 2026-09-21\n\n- Biểu đồ đề xuất có thêm cột khối lượng theo từng phiên, màu xanh/đỏ theo hướng biến động giá và tooltip số lượng.\n- Chú giải tách rõ mua/bán tham khảo, giá và khối lượng phiên; giao diện không giả định khối lượng tổng là mua hoặc bán chủ động.\n- Frontend 12 tests, encoding check và production build đạt.\n

## Điều chỉnh biểu đồ khối lượng — 2026-09-21

- Giữ giá mua tham khảo, giá bán tham khảo và thá»i hạn trong tab Đề xuất; không hiển thị biểu đồ riêng trong từng đề xuất.
- Bổ sung các cột khối lượng theo phiên vào biểu đồ lịch sử giá ở trang chi tiết mã. Màu cột thể hiện phiên tăng/giảm, tooltip hiển thị ngày, giá đóng cửa và khối lượng, kèm chú giải riêng.
- Dữ liệu hiện có chỉ cung cấp tổng khối lượng theo phiên; hệ thống không suy diễn khối lượng mua/bán chủ động khi upstream chưa cung cấp dữ liệu tách chiá»u.
- Kiểm chứng: backend 17 suite/57 test, frontend 12 test và build production đạt; cần hoàn tất kiểm thử Playwright sau thay đổi UI.


### Kiểm chứng bổ sung

- Playwright E2E: 22/22 đạt sau khi bá» biểu đồ trong tab Đề xuất.
- Build UI trên Vite đạt; preview đang phục vụ tại http://127.0.0.1:4180 (HTTP 200).
- Snapshot đề xuất mới: 1fd9fc7b-1252-4c9e-b85e-6e7a07ae56b5; API xác nhận có giá mua/bán tham khảo, thá»i hạn 20 phiên và không còn trường biểu đồ trong rationale.


## Bổ sung đường giá đóng cửa — 2026-09-21

- Biểu đồ chi tiết mã nay có đường giá đóng cửa nối theo phiên, các điểm dữ liệu có tooltip giá/ngày và lưới ná»n để đọc xu hướng rõ hơn.
- Giữ nguyên cột khối lượng theo phiên, màu theo hướng giá, chú giải và tooltip khối lượng.
- Kiểm chứng sau thay đổi: frontend test 12/12, build production đạt, E2E loading/detail 10/10.


## Đồng bộ phiên hiện tại vào lịch sử giá — 2026-09-21

- Nguyên nhân lịch sử chỉ đến 08-19: bảng EOD hiện có chưa được ghi thêm phiên mới; endpoint intraday vẫn trả quote hiện tại.
- Trang chi tiết nay ghép quote intraday mới nhất vào cuối series lịch sử để hiển thị phiên hôm nay, đồng thá»i đánh dấu chart là Intraday + EOD.
- Tooltip của từng điểm giá/cột khối lượng có ngày giá», mở cửa, cao nhất, thấp nhất, đóng cửa và khối lượng; bổ sung tóm tắt mới nhất, cao nhất, thấp nhất, khối lượng và phần trăm thay đổi.
- Kiểm chứng API thực tế: FPT EOD cuối 2026-08-19, quote intraday 2026-09-21T07:45:02+00:00, giá 66.400, khối lượng 8.401.600.


## Hiển thị lại chú giải khối lượng — 2026-09-21

- Làm nổi bật hai chú giải “Khối lượng phiên tăng” và “Khối lượng phiên giảm” bằng nhãn có màu, ná»n và viá»n riêng; bổ sung nhóm trợ năng cho chart.
- Kiểm chứng: frontend 12/12, build production và E2E loading/detail 10/10 đạt.


## Build và khóa cấu trúc chart — 2026-09-21

- Build UI production đạt với bundle mới.
- Thêm E2E assertion xác nhận detail-volume-bars nằm trong combined-price-volume-chart, còn chart-summary nằm ngoài wrapper và vẫn hiển thị trong panel Chi tiết mã.
- Kiểm chứng: encoding check đạt; E2E loading/detail 10/10 đạt.


## Bộ lá»c số phiên trên chart — 2026-09-21

- Thêm nút chá»n 5/10/12 phiên trên chart Chi tiết mã; đường giá, khối lượng và mốc thá»i gian cùng dùng một chuỗi phiên.
- Kiểm chứng: frontend build đạt, encoding check đạt, E2E loading/detail 10/10 đạt.


## Kiểm chứng tích hợp sau cải thiện chart — 2026-09-21

- Backend: 17 test suites, 57 tests đạt.
- Frontend E2E: 22/22 đạt; gồm căn chỉnh SVG/nhãn ngày/histogram và bộ chá»n số phiên.
- Preview UI: HTTP 200 tại cổng 4180.

## Intraday session alignment — 2026-09-22

- Detail charts now deduplicate EOD history by Vietnam trading date and let the latest intraday quote replace that day's EOD point. Price, volume, and date labels share one chronologically sorted session series.
- Intraday tooltip includes observation time and provider. E2E confirms one point for the current session and matching dates across price points, volume bars, and axis labels.
- Verification: frontend unit 12/12, loading E2E 11/11, encoding check and production build passed. Production preview is available at http://127.0.0.1:4180.
- Limitation: session alignment was verified with deterministic E2E data; live quote coverage was not remeasured.

## Live quote coverage measurement — 2026-09-22

- Restarted the Vnstock worker on port 8787 with HTTP(S)/ALL proxy variables cleared after the existing process returned zero-price rows with a 2026-09-21 timestamp.
- Full-universe check at 2026-09-22T02:34:40Z (09:34 Asia/Ho_Chi_Minh): 103/131 symbols returned valid quotes (78.6%); 89 observed within 1 minute, 101 within 5 minutes, all 103 within 15 minutes. Median observation age was 13.2 seconds. 28 symbols had no quote.
- Live FPT probe returned VND 66,700 at 09:34:39 local time; VCB VND 59,200 and MWG VND 72,700 were also present. This confirms provider data at measurement time, not streaming/tick-level latency.
- Evidence: `backend/evidence/live-quotes-2026-09-22.json`. The verifier now records quote freshness buckets and a direct worker probe, and writes a date-specific file instead of overwriting prior evidence.
- Follow-up measurement is recorded in “Intraday coverage follow-up — 2026-09-22” below. Missing quotes continue to use the existing EOD fallback.

## Overview workspace cleanup — 2026-09-22

- Removed the overview's illustrative performance chart, equal-weight demo allocation, and recommendation forward-performance history. Historical evaluation remains in the Recommendations workspace; real positions remain in Personal Portfolio.
- Replaced empty VN-Index/cache/AI cards with actual universe size, current intraday quote coverage, unique personal symbols, and latest provider observation time. Added an explicit EOD fallback status and direct navigation to personal portfolio, recommendations, and the selected stock detail.
- Kept the searchable/sortable stock table as the main overview task. Responsive metric cards clarify that missing intraday quotes use EOD values.
- Verification: production build passed; frontend unit 12/12, encoding check passed; Playwright overview and recommendation workflow 10/10 passed. Full E2E had 22/24 pass before restoring the recommendation-history resource; the two failures were caused by removing the data hook still used by the Recommendations tab, which is restored, and the affected 10 tests now pass.
- Preview: http://127.0.0.1:4180.

## Market overview, direct symbol lookup and live portfolio valuation — 2026-09-22

- Completed all four requested backlog items. The overview now has market breadth cards for advancing/declining/unchanged symbols, an aggregate session-volume chart by price direction, average change, quote coverage, and latest provider observation time. The chart scopes direction to the latest available observation and aggregates volume only from intraday session quotes.
- Added an exact-code/name lookup form to the Detail workspace with suggestions from the full stock universe; selecting a result opens that symbol's detail page.
- Personal Portfolio now requests position quotes from the multi-symbol endpoint on entry and every 30 seconds. The UI recalculates market value and unrealized P/L from the latest quote, shows quote time/source, and labels EOD fallback where quote data is missing.
- Rebuilt allocation as a proportional donut with distinct colors, a ranked value/weight legend, total market value, and an explicit mixed EOD/intraday note when coverage is incomplete.
- Data limitation: VCI price board supplies total session volume, not buyer-initiated versus seller-initiated volume. The overview chart states this and does not label directional volume as actual buy/sell order flow.
- Verification: production build passed; frontend unit 12/12; encoding check passed; E2E market/detail/portfolio suites 21/21 plus workflow suite 5/5; final portfolio rerun 4/4. Preview serves the current bundle at http://127.0.0.1:4180.


## App.jsx Unicode string cleanup ? 2026-09-22

- Decoded 683 `\uXXXX` escape sequences in `frontend/src/App.jsx` to literal UTF-8 characters without changing rendered text or application logic.
- Verification: no Unicode escapes remain in the file; frontend encoding check and production build pass. E2E was not run because only string representation changed.


## Personalized recommendation criteria and outcome feedback ? 2026-09-22

- Added an explainable personalized ranking endpoint over the full stock universe with at least 50 stored sessions. Users can weight trend, 10-session momentum, balanced RSI, recent stability, and 20-session liquidity; preferences persist in browser local storage.
- Added criterion score breakdowns, eligibility counts, history measurements, and conservative empirical calibration from evaluated recommendation outcomes. Calibration remains neutral until 15 scored outcomes exist. Daily recommendation snapshots now preserve per-criterion scores for future calibration.
- Limitations: the ranking is rule-based, not a generative AI call. Unverified news, sentiment, and macro data are not scored. Calibration is observational and limited to previously selected recommendations; it is not causal evidence or a guarantee of future performance.
- Verification: recommendation engine tests 5/5; frontend tests 12/12; encoding check passed; production build passed; personalized criteria Playwright flow 1/1 passed.
- Next: collect evaluated runs with criterion score snapshots, then review calibration quality and ranking stability before increasing its influence.


## Personalized endpoint runtime 404 ? 2026-09-22

- Diagnosed the UI error: frontend POST path was correct, but the backend process on port 5000 had started before `/api/recommendations/personalized` was added and returned HTTP 404.
- Restarted the backend with the current code. Verified POST against both port 5000 and the UI origin 4180: HTTP 200, 124 eligible symbols and 10 personalized results. Backend reported insufficient history, so learned calibration correctly remains neutral.


## Recommendation result visual hierarchy and portfolio action ? 2026-09-22

- Added a color-coded total score badge, per-criterion colored meters, rank labels, and clearer reference-price/RSI/observation chips to personalized results.
- Added an action on each result that opens Personal Portfolio with the recommended symbol and reference price prefilled; quantity and transaction submission remain under the existing user-controlled form.
- Verification: frontend encoding check and production build passed; Playwright recommendation flow passed including navigation and prefilled ticker/price assertions (1/1).


## Recommendation evaluation explanation ? 2026-09-22

- Clarified in the Recommendations page that history rows measure scheduled system-wide runs: positive forward return per recommended symbol by the configured horizon (up to 20 sessions), plus average measured return. They do not measure a personalized result or portfolio additions.
- Added an explicit notice that recommendation-origin transactions are not yet linked to ledger entries. Personal Portfolio unrealized P/L is against actual cost and does not constitute forecast evaluation. Renamed summary/table labels to define the metrics in plain language.
- Verification: frontend encoding check and production build passed; Playwright recommendation scenario including the explanatory notice passed (1/1).

## Per-position recommendation outcome tracking - 2026-09-22

- Added migration 012 and nullable JSONB provenance on portfolio BUY transactions. Saved metadata includes source, symbol, model, generated time, score/rank, reference price, horizon, and selected criteria. The backend validates values and prevents attaching a snapshot to a different symbol or a SELL.
- GET /api/portfolio returns recommendation-linked entries scoped to the authenticated portfolio and compares EOD close at the configured forward session with the saved reference price. Entries stay pending until enough sessions arrive. The UI separately compares current intraday or EOD price with the recorded entry price and shows whether a position remains open.
- Added a Personal Portfolio table with per-symbol score, actual entry/current prices, price movement, and forecast result. Manual and legacy transactions remain unlinked and are never attributed retroactively.
- Migration 012 applied to the development database and backend restarted. PostgreSQL isolated-schema verification covers persistence, horizon evaluation, and user isolation. Verification: backend 60/60, frontend 12/12, PostgreSQL verification passed, encoding check and production build passed, Playwright recommendation-to-portfolio flow passed (1/1).
- Limitation: the forecast outcome uses direction versus the saved reference price at the configured horizon. It does not model a personal return target; actual realized P/L remains in the transaction ledger.
# Recommendation horizon session deduplication — 2026-09-22

- The per-portfolio forecast evaluator now counts one daily observation per Vietnam trading date, keeps the latest EOD row for duplicate dates, and ignores explicitly intraday rows. This prevents multiple providers or repeated imports from advancing a recommendation horizon prematurely.
- Forward rows are still filtered to observations strictly after the recommendation timestamp; entries remain pending until the configured number of distinct daily sessions exists. A closed portfolio position does not erase the independent forecast measurement.
- Verification: portfolio-accounting tests pass (6/6); full backend tests pass (61/61); isolated PostgreSQL verification passes, including migration 012, linked forecast horizon evaluation, and user isolation. Restarted the local backend on port 5000 and verified `/api/health` returns success. The automated database verification uses an isolated schema and does not establish production data quality.
- Limitation: for a duplicate trading date, latest observation time is used; provider quality is not ranked. The evaluator cannot infer an absent session if no provider supplied any row for that date.
- Next: completed by the follow-up measurement below; the next check is during the afternoon regular session.

## Intraday coverage follow-up — 2026-09-22

- Repeated a full-universe check through the live backend at 2026-09-22 11:52 Asia/Ho_Chi_Minh: 107/131 quotes (81.7%). The check was during the exchange lunch break; all 107 quotes were more than 15 minutes old because the morning session had ended. The verifier now records the local market phase and does not call lunch-break quotes stale during regular trading hours.
- Sent the 24 currently missing symbols directly to the VCI worker. It returned no quote rows for those symbols and reported no request errors, while the API continued returning quotes for other symbols. All 24 are present in VCI's security listing; 3 are marked DELISTED (BCG, VTS, XDC), and 21 are listed but had no price-board quote at measurement time.
- Compared earlier checks: missing sets changed across measurements, so absence is not a fixed API mapping bug. The current result supports provider-feed absence at that time; it does not prove the 21 symbols never trade or are permanently unsupported. Keep EOD fallback.
- Evidence: `backend/evidence/live-quotes-2026-09-22T04-52-12-599Z.json`. Updated `backend/scripts/verify-live-quotes.cjs` to probe missing symbols, classify them against the VCI listing, understand the regular weekday morning/lunch/afternoon schedule, and retain multiple same-day measurements with timestamped files.
- Limitation: the session classifier uses regular weekday hours and does not account for exchange holidays or provider-specific updates. This was a lunch-break measurement, not a fresh-quote SLA test during an open session.
- The afternoon-session follow-up is recorded below. Next: keep the 131-symbol universe intact for history, but report coverage separately for the 128 symbols not marked DELISTED; do not remove historical records as part of quote handling.

## Open-session quote freshness check — 2026-09-22

- Measured the full universe during the afternoon session at 13:33 Asia/Ho_Chi_Minh: 107/131 quotes (81.7%). Of available quotes, 88 updated within 1 minute, 99 within 5 minutes, 101 within 15 minutes, and 6 were older than 15 minutes. For the 128 symbols not marked DELISTED, coverage is 107/128 (83.6%).
- Queried the six old observations directly from VCI. The worker returned the same timestamps and prices as the API, with successful requests; this confirms the application is preserving provider observation times. The symbols were PGB, VTV, WSB, WSS, XMP, and YBC. Their last provider updates ranged from 03:46Z to 06:13Z; do not present them as newly traded at fetch time.
- The 24 missing symbols remained unchanged from the lunch-break measurement. Direct provider queries returned no quote rows and no request errors. Three are marked DELISTED (BCG, VTS, XDC); 21 remain listed but had no price-board row. Keep EOD fallback and do not infer permanent provider unavailability from one session.
- Evidence: `backend/evidence/live-quotes-2026-09-22T06-33-02-498Z.json`. The quote verifier and backend are responsive; no API mapping defect was found in this check.
- Completed below: coverage now reports the whole 131-symbol history universe and listing-status groups separately, without deleting historical records. Next: expose these classifications in the UI only if stock listing metadata is added to the persisted stock contract; keep the measurement report as the source of truth for now.

## Coverage by listing status — 2026-09-22

- Updated `backend/scripts/verify-live-quotes.cjs` to compare every symbol in the application universe with the VCI listing, group results as listed / delisted / unknown, and report quote counts and coverage percentage per group. This is measurement-only and does not alter the stock table or remove history.
- Live afternoon check at 13:48 Asia/Ho_Chi_Minh: 109/131 quotes (83.2%) overall; 109/128 listed, non-DELISTED symbols (85.2%); 3 DELISTED symbols had no quotes; no symbols had unknown listing status. Of available quotes, 92 were under one minute old, 103 under five minutes, 107 under 15 minutes, and 2 exceeded 15 minutes.
- The main `/api/stocks/quotes` request succeeded without errors. The verifier's additional direct worker request for the missing-symbol subset returned HTTP 500 from an upstream connection reset; treat this probe as inconclusive for those symbols. The full-universe API result and independent VCI listing-status query completed.
- Evidence: `backend/evidence/live-quotes-2026-09-22T06-47-59-124Z.json`. Verifier syntax check passed.
- At the time of that measurement, listing status was report-only. This was resolved by the persisted listing metadata implementation below; no historical symbols were deleted.

## Persist listing status and expose it in stock UI — 2026-09-22

- Added migration `013_add_stock_listing_metadata` and nullable `exchange` / `listing_status` fields on `stocks`. The API list/detail responses include the values, and stock cache keys moved to v7 (list) / v3 (detail) so prior payloads cannot hide the fields.
- Added `sync:vnstock-listing`, which fetches VCI's security list and updates metadata only for symbols already in `stocks`; it never creates rows or modifies prices. The universe ingestion also refreshes metadata for rows it processes.
- Applied migration 013 and synced the current development database: VCI returned 3,632 symbols; 131 matched existing stock rows, all 131 received metadata, and no rows were created. API smoke check returned 131 total, 128 listed, 3 delisted, 0 unknown; BCG is `DELISTED/delisted`, FPT is `HSX/listed`, including the same status in detail API.
- The overview keeps all rows visible, shows the exchange for listed symbols and a clear delisted badge for historical symbols. No price history or portfolio/watchlist records were removed.
- Verification: backend 64/64, frontend unit 12/12, PostgreSQL isolated migration/API verification passed, frontend encoding check and production build passed, overview E2E 8/8. Local backend restarted on port 5000 and preview 4180 serves the built bundle.
- Limitation: listing status is a point-in-time VCI classification without a dedicated `checked_at` timestamp. Run `npm run sync:vnstock-listing` to refresh it; status does not imply quote availability or trading activity.
- Next: schedule the metadata-only sync after market listing updates and expose its last-check time so users can judge status freshness.

## Scheduled listing metadata freshness — 2026-09-22

- Added migration 014 and `listing_checked_at`; list/detail API responses now return the timestamp, and the overview listing badge exposes it on hover.
- Added a weekday 15:15 Asia/Ho_Chi_Minh metadata-only VCI worker sync with overlap protection, bounded request timeout, stock-cache invalidation, and error logging. It only updates existing symbols and never ingests historical prices.
- The manual `sync:vnstock-listing` command now stamps the same check time.
- Verification: backend 66/66, PostgreSQL isolated migrations/API passed, frontend 12/12, encoding check and production build passed, overview E2E 8/8. Migration 014 was applied to the development database; API health and stock-list smoke checks returned 200 with 131 symbols.
- Manual metadata sync succeeded after one transient worker HTTP 500: VCI returned 3,632 rows, all 131 existing symbols were checked, 0 created, and stock cache was invalidated. `listing_checked_at` is now populated from the successful run.
- Limitation: scheduled refresh requires the Vnstock worker to be reachable; failures are logged and do not advance the last-successful timestamp.
- Verified the exact shared `runListingCheck` routine used by cron against VCI and PostgreSQL at 14:44 Vietnam time: 3,632 provider rows, all 131 existing symbols checked, zero creates, and listing timestamp advanced. Price history remained unchanged at 50,195 rows, with the same maximum `updated_at` before and after. Evidence: `backend/evidence/listing-sync-verification-2026-09-22.json`.
- Added scheduler test coverage for the configured weekday/timezone registration and overlapping-run suppression; backend 67/67 and isolated PostgreSQL verification pass.
- Exercised the actual `node-cron` callback with a temporary one-minute test cadence (production remains 15:15): it completed at 14:50 Vietnam time, checked all 131 existing symbols and created none. API returned 200/131 and `listing_checked_at` advanced to 2026-09-22T07:50:05.374Z; price count remained 50,195 and latest price timestamp remained unchanged. Evidence updated in `backend/evidence/listing-sync-verification-2026-09-22.json`.
- Production-cadence cron ran on 2026-09-22 at 15:15:02 Asia/Ho_Chi_Minh: VCI returned 3,632 rows, all 131 existing symbols were checked, none created, and cache invalidation completed. API returned 200 with 131 symbols and the same `listing_checked_at`; price history remained 50,195 rows with `MAX(updated_at)=2026-09-21T02:16:22.339Z`. Evidence: `backend/evidence/listing-sync-verification-2026-09-22.json`.
- Added bounded Vnstock worker HTTP error details to EOD/intraday fetcher errors and redacted API key/token query parameters. Backend restarted with the change; backend tests 69/69 and PostgreSQL verification passed. A post-restart FPT quote smoke test returned 200 with a VCI quote; prior intermittent worker 500s were not reproduced in that probe.
- Follow-up probe at 15:30 Vietnam time requested BSR/FPT/HPG/SSI/VCB once: API 200, 5/5 returned from VCI, and no matching backend error log. The observed trade times were around 14:45, after the regular session had ended; this confirms provider response, not an intraday freshness SLA. Evidence: `backend/evidence/quote-worker-probe-2026-09-22.json`.
- Added `npm run verify:quote-freshness`, a bounded (default 5 symbols) probe that records API status, quote observation age, and market phase; it only marks age against stale thresholds during regular trading sessions. The after-hours run at 16:23 Vietnam returned 5/5 quotes, with last observations at 14:45 (about 98 minutes old); it correctly left freshness evaluation not applicable outside market hours. Evidence: `backend/evidence/quote-freshness-2026-09-22T09-23-00-756Z.json`. Script syntax and live invocation passed.
- No 500 was reproduced, so retry/fallback settings were left unchanged. Added tests for Vietnam session boundaries (morning, lunch, afternoon, close, weekend) so after-hours readings cannot be scored as regular-session staleness. Verification: backend 74/74, probe script syntax check and package JSON validation passed.
- Current time is after market close, so no valid open-session freshness measurement is available yet. Next: run `npm run verify:quote-freshness` during the next open session and tune retry/fallback only if safe error details identify a recurring cause.

## Missing EOD session 2026-09-21 — chart investigation

- Root cause: the chart did not suppress 09-21. PostgreSQL had daily Vnstock rows only through 09-18, while the UI appended a live 09-22 quote; therefore the market session was absent from the source history.
- VCI returned 09-21 daily candles for FPT, SSI, VCB, HPG, and BSR. Backfilled the existing universe with the idempotent EOD ingestion path in one-symbol batches after multi-symbol requests intermittently had their worker connection closed. Result: 101 inserted, 9 already present/skipped, 110/131 symbols now have a 09-21 daily row. Evidence: `backend/evidence/eod-backfill-2026-09-21-2026-09-22T09-55-12-125Z.json`.
- Verified stock-detail API returns 09-21 candles for all five sample symbols. Their charts can now include 09-21 alongside the 09-22 intraday point after reloading detail data.
- Rechecked quote API for FPT: it returns the 09-22 intraday point; the detail-history API returns 09-21 EOD. Updated the chart E2E fixture to assert shared labels `[09-18, 09-21, 09-22]`; targeted E2E passed 1/1.
- Coverage limitation: 21 symbols still have no 09-21 EOD row after this VCI run: 3 are marked delisted; 18 are listed but this run produced no persisted row. A VTX request logged a transient VCI DNS failure. Do not infer the other listed symbols did not trade; no values were fabricated.
- Added `backfill:vnstock-session` for bounded, retrying, idempotent date-specific backfills with per-run evidence. Syntax check passed. Next: retry the 21 missing symbols after VCI connectivity stabilizes, while preserving the missing-data classification.

## Targeted retry of missing 2026-09-21 EOD rows

- Added `VNSTOCK_BACKFILL_SYMBOLS` support to limit an EOD retry to an explicit list of existing symbols. Evidence reports the full universe and exact target scope; coverage is evaluated only for the selected target list.
- Changed batch exception handling so one repeatedly failing symbol is recorded and does not prevent later symbols from being attempted. Zero-row provider responses remain distinct from thrown request failures and are never filled with fabricated prices.
- Retried all 18 listed symbols without 09-21 rows. VCI returned zero rows for all 18; YTC logged a connection reset, and 2 requests needed retry after transient worker/network failures. A separate FPT control request returned the known session row (received=1, skipped=1), and worker health returned healthy. Evidence: `backend/evidence/eod-backfill-2026-09-21-2026-09-22T10-11-36-360Z.json`; the earlier interrupted retry is also preserved as evidence.
- Result: session coverage remains 110/131. This establishes only that these 18 targeted VCI requests did not return a 09-21 candle in this run; it does not establish zero trading activity or permanent provider unavailability. Three delisted symbols remain outside the retry scope.
- Verification: targeted script syntax check passed; FPT control backfill returned the expected existing 09-21 record, and all 74 backend tests passed (21 suites). Frontend code was not changed, so no UI rebuild was needed. Next: retain the 09-21 gap as provider-unconfirmed for these symbols and run the scheduled quote freshness measurement during the next open session.

## Chart history ordering and empty-state clarity — 2026-09-22

- Live API audit confirmed the chart gaps reflect absent stored EOD rows: the 18 listed target symbols have no 09-21 row, and VXP/X77 currently have no history rows at all. Other targets have older, sparse history; no candles were synthesized.
- Stock list and detail history now select the latest records by market `observed_at` before using import/update timestamps as tie-breakers. This prevents a recently imported old candle from displacing a newer session at the 20-row API limit.
- The price line, volume bars, and x-axis labels now derive the session date in `Asia/Ho_Chi_Minh`. Detail symbols with no history receive a clear empty state rather than an empty chart shell.
- Verification: backend 76/76 tests, frontend build, encoding check, and targeted chart E2E 2/2 passed. Preview on `http://127.0.0.1:4180/` returned the newly built bundle with the empty-state and timezone code. A later API audit found three legacy rows with null `observed_at`; explicit `NULLS LAST` and an observation-time filter were added to stock list, analysis, detail history, and price endpoints so these rows cannot displace or masquerade as a market session.
- Restarted the API process on port 5000 and cleared 24 stock cache entries so the user-facing API would not return pre-fix cache payloads. Live API checks returned 200 for health/list/detail; FPT detail returned 20 records in descending `observed_at`, no null observation values, and retained the 09-21 candle. An isolated router check against the same database returned the same result before restart.
- Data limitation remains: the 18 provider-unconfirmed 09-21 rows are still absent. Next: run quote freshness during the next open session and reconcile missing history only when a provider returns actual candles.

## Full-universe chart history audit — 2026-09-22

- Added the read-only `npm run audit:chart-history` database audit. It records per-symbol session coverage, latest local session, duplicate dates, missing observation timestamps, and empty histories without consuming public API rate limits or changing price rows.
- Audit of all 131 symbols found 110 with a 09-21 record, 21 without (18 listed, 3 delisted), three symbols with no history (VXP, X77, XDC), three legacy rows with null observation times (FPT, MWG, VHM), and no duplicate observed trading dates. Evidence: `backend/evidence/chart-history-audit-2026-09-21-2026-09-22T10-30-11-370Z.json`.
- A broad HTTP loop reached the configured per-minute API request cap after 100 requests; those 429 responses are rate limiting, not chart-data failures. After the window reset, targeted API checks for FPT, VTQ, and VXP returned 200 and matched database expectations, including FPT's 09-21 row and an empty history for VXP.
- Verification: audit script syntax and backend `package.json` validation passed. No frontend code changed. Next: probe quote freshness during the next open session; keep the 18 listed history gaps provider-unconfirmed until actual candles are returned.

## Post-restart quote probe — 2026-09-22

- Ran `npm run verify:quote-freshness` against the restarted API at 17:33 Asia/Ho_Chi_Minh. HTTP 200; VCI returned all 5 requested symbols (FPT, SSI, VCB, HPG, BSR), with no missing symbols or error.
- Provider observations were around 14:45 Asia/Ho_Chi_Minh and 10,092–10,094 seconds old at probe time. The market was closed, so the probe correctly recorded age without applying in-session stale thresholds. This verifies post-restart provider connectivity, not open-session freshness.
- Evidence: `backend/evidence/quote-freshness-2026-09-22T10-33-16-276Z.json`. Next: repeat the same bounded probe during regular trading hours and compare provider observation age before considering retry/fallback changes.

## Scheduled quote freshness monitoring — 2026-09-22

- Added a weekday quote freshness scheduler at 09:35 and 13:35 Asia/Ho_Chi_Minh. Each run requests the default five liquid symbols once through the application quote API, writes timestamped evidence, logs errors, and prevents overlapping runs. `QUOTE_FRESHNESS_ENABLED`, `QUOTE_FRESHNESS_CRON`, `QUOTE_FRESHNESS_TIMEZONE`, `QUOTE_PROBE_SYMBOLS`, and `QUOTE_API_URL` configure the job.
- Freshness scoring now requires at least one returned quote stamped with the current Vietnam session date as confirmation that the exchange is trading. During a weekday holiday or when all provider observations are old, the report remains inconclusive instead of labeling old quotes stale.
- Verification: backend 80/80 tests across 22 suites; probe/job syntax and package JSON checks passed. API restarted and logged scheduler initialization for `35 9,13 * * 1-5`. A post-restart after-hours manual probe returned 5/5 VCI quotes (HTTP 200), age about 10,443–10,445 seconds, and correctly did not score regular-session freshness. Evidence: `backend/evidence/quote-freshness-2026-09-22T10-39-07-100Z.json`.
- Limitation: scheduler is registered in the running development backend, but its first scheduled in-session callback is on the next market day. Next: review that evidence and tune retry/fallback only if the open-session observations show a repeatable issue.

## Alternate-provider check for missing 2026-09-21 candles — 2026-09-22

- VCI returned the FPT 09-21 control candle, but the KBS source probe for FPT ended with a connection reset. Reconciliation runs were recorded as failed; no price rows were modified.
- EODHD key verification succeeded and its FPT probe returned one 09-21 row. Added `probe:eodhd-session`, a paced, date-specific coverage check that writes only symbols/status/session dates to evidence, not OHLCV values or price rows. EODHD 404 responses now mean “no coverage” during adapter reconciliation, while other HTTP/network errors remain errors.
- Checked all 18 listed symbols missing 09-21. Thirteen returned no rows; five had transient fetch errors on the first pass and were retried successfully, then also returned no rows. Therefore EODHD provides no 09-21 candle for this target set. Evidence: `backend/evidence/eodhd-session-2026-09-21-2026-09-21-2026-09-22T11-52-49-960Z.json` and retry `backend/evidence/eodhd-session-2026-09-21-2026-09-21-2026-09-22T11-53-51-910Z.json`.
- Verification: backend 82/82 tests, probe/verification script syntax and package validation passed. No alternate-source rows were ingested; the 18 chart gaps remain provider-unconfirmed. Next: review the scheduled open-session quote probe and pursue another source only if it has licensed coverage for these symbols.

## Chart session gap disclosure — 2026-09-22

- Stock detail responses now include `market_sessions`: up to three latest distinct Vietnam-local session dates present in stored Vnstock daily EOD data. Dates are system-data observations, not an exchange calendar.
- The detail chart compares those dates to the selected symbol's actual EOD candles and displays a compact note for missing candles. It retains only returned prices/volume bars; intraday quotes do not count as EOD coverage and no values are inferred.
- Verification: frontend production build and encoding check passed. Backend suite is being rerun after correcting the SQL-order mock. The targeted Playwright invocation initially failed before tests because Windows blocked worker creation (`spawn EPERM`); rerun with elevated execution is pending.
- Limitation/next: missing candles for 18 listed symbols remain unresolved across VCI/EODHD probes. Recheck provider availability on a later session, ingest only actual licensed candles, and inspect the first scheduled in-session quote-freshness report.

- Final verification: backend 82/82 passed after correcting the controller test mock order; targeted chart E2E 2/2 passed with elevated Playwright execution; frontend production build and encoding check passed. Restarted backend on port 5000 and restarted the Vite preview on port 4180 so the new bundle is served. Live FPT detail returned `market_sessions` `2026-09-17, 2026-09-18, 2026-09-21` and 20 history rows.

## Open-session quote freshness verification — 2026-09-23

- Ran the bounded freshness probe during the morning session at 09:20 Asia/Ho_Chi_Minh. The API returned all five requested symbols (FPT, SSI, VCB, HPG, BSR) with HTTP 200 and VCI as upstream.
- The session was confirmed by provider observations dated 2026-09-23. All five observations were under five minutes old; none exceeded 15 minutes. Evidence: `backend/evidence/quote-freshness-2026-09-23T02-20-38-891Z.json`.
- Live API checks after restart returned health 200 and 131 total symbols (25 in the requested page). Frontend service tests and encoding checks passed (12/12).
- Conclusion: current quote path is fresh during an open session; no retry/fallback tuning is justified from this measurement. Continue monitoring the scheduled 09:35/13:35 probes.

## Recommendation workspace UI regression closure — 2026-09-23

- Full Playwright initially found two stale UI expectations: the dedicated recommendation workspace had no explicit “Đề xuất ngắn hạn”/criteria heading, and snapshot concentration risk was not visible.
- Added a clear short-term recommendation heading, a criteria-and-evaluation heading, and a visible concentration warning using the existing snapshot risk fields (`max_sector_share_pct`, `pending`). No scoring or recommendation data was changed.
- Verification: frontend production build passed; full Playwright suite now passes 29/29. The preview was restarted on port 4180 to serve the new bundle.
- Next: keep recommendation learning metrics under observation as measured history accumulates; do not recalibrate weights until the configured evidence threshold is reached.

## Recommendation readiness and snapshot verification — 2026-09-23

- Ran the read-only readiness check against PostgreSQL: 131 symbols, 50,305 price rows, 424 distinct sessions, and 124 symbols eligible with at least 50 observations. The universe is ready for rule-based recommendations; five symbols remain below the history threshold or have no history.
- Verified the latest recommendation snapshot integrity. Run `1fd9fc7b-1252-4c9e-b85e-6e7a07ae56b5` hash matches the expected SHA-256 exactly.
- No recommendation run or price data was modified. Keep learning calibration disabled until measured per-criterion samples reach the configured threshold.

## Scheduled quote and recommendation feedback review — 2026-09-23

- The scheduled 09:35 morning quote probe completed successfully: HTTP 200, 5/5 symbols returned, current session confirmed, all five under five minutes old, zero over 15 minutes, and no error. Evidence: `backend/evidence/quote-freshness-2026-09-23T02-35-01-632Z.json`.
- Ran the read-only recommendation monitor. The latest 2026-09-21 snapshot contains five selected symbols; all five remain pending at the 20-session horizon, so measured count is 0 and calibration is correctly not ready. The largest sector share is 60%, which remains visible as a concentration warning.
- No price, recommendation, or weight data was modified. Continue monitoring until the evaluation horizon produces actual outcomes.

## Post-monitor regression verification — 2026-09-23

- Re-ran the complete backend suite after the quote scheduler and recommendation monitor checks: 22 suites and 82 tests passed.
- Recommendation snapshot remains pending by design; no evaluation or calibration write was triggered. The next meaningful measurement is after the 20-session horizon or the next scheduled quote report at 13:35.

## Root-cause fix for recurring missing EOD sessions — 2026-09-23

- Audit before repair proved the chart was not dropping 22/09: PostgreSQL had zero `stock_prices` rows for the 2026-09-22 target session across all 131 symbols. The previous fix restored one session but did not keep daily EOD ingestion enabled.
- Enabled the EOD scheduler in the project environment and changed the scheduler guard to opt out only with `VNSTOCK_EOD_ENABLED=false`; a fresh deployment can no longer silently run intraday-only history. The 10:30 Asia/Ho_Chi_Minh job fetches the prior completed session and invalidates stock cache after ingestion.
- Backfilled 2026-09-22 through VCI for all 131 symbols: 107 inserted, 1 already present, 23 provider-missing symbols retained as explicit gaps. No values were fabricated. Evidence: `backend/evidence/eod-backfill-2026-09-22-2026-09-23T02-56-43-665Z.json`.
- Live FPT detail now returns both 2026-09-21 and 2026-09-22; `market_sessions` returns `2026-09-18, 2026-09-21, 2026-09-22`. Backend 23 suites/84 tests, frontend build, and targeted chart E2E 2/2 passed. API restarted with the EOD scheduler registered.
- Remaining gaps are provider coverage, not UI filtering; they continue to be disclosed by the chart and audit.

## Post-repair session audit — 2026-09-23

- Re-audited the restored 2026-09-22 session after API restart: 108/131 symbols now have an EOD row; 23 remain explicit provider no-row gaps.
- Live detail checks for FPT, BSR, and SSI all include 2026-09-22 as the latest stored EOD session and expose it through `market_sessions`.
- Evidence: `backend/evidence/chart-history-audit-2026-09-22-2026-09-23T03-09-16-878Z.json`.
- The next scheduled EOD run remains 10:30 Asia/Ho_Chi_Minh and will ingest the previous completed session automatically; the audit will be repeated after that run.

## EOD ingestion batching hardening — 2026-09-23

- A full-universe `ingest:vnstock` control request reproduced `fetch failed` when 131 symbols were sent to the worker in one payload. This explains why simply enabling the scheduler was insufficient.
- `ingestVnstockEod` now splits multi-symbol runs into bounded batches (default one symbol, configurable with `VNSTOCK_EOD_BATCH_SIZE`), aggregates counts/errors, and preserves idempotent upsert and cache invalidation for each batch. A two-symbol control run returned 2 received/2 skipped with no errors, proving existing 09-22 rows are preserved.
- Backend regression: 23 suites/84 tests passed. API restarted with the batching logic and EOD scheduler active.

## EOD batch retry and continuation fix — 2026-09-23

- The first 10:30 scheduler run after batching still stopped on a transient DBC worker failure. Added per-batch retries (default two retries with 500 ms delay) and continue-on-error behavior; one failing symbol can no longer abort the remaining EOD universe.
- Control ingestion for FPT/DBC/BSR with the restored 09-22 session completed 3 received, 1 inserted, 2 idempotent skips, and no aggregate error. Backend 23 suites/84 tests passed and API was restarted with the retry logic.
- The next scheduler run will produce a complete aggregate result while preserving explicit provider gaps.

## Full-universe continuation control — 2026-09-23

- Ran the complete 131-symbol EOD path with batching/retry against 2026-09-22. The run completed instead of aborting: 85 provider records received, 84 idempotent skips, 1 insert, and 0 rejected records.
- Some worker/network failures remained in individual batches; they were isolated in the aggregate `errors` list and did not stop later symbols. This confirms the durable behavior is now “partial coverage with explicit errors,” rather than silent all-universe failure.
- Existing chart rows were not overwritten or fabricated. Provider gaps remain subject to later retry when the worker is stable.

## Worker stability tuning — 2026-09-23

- Worker health check returned ready/200. The remaining full-universe errors were transient connection resets/502s, not application validation errors.
- Increased EOD batch retry policy to three attempts with a 1.5-second delay by default. A five-symbol probe (DCM, DGC, HPG, XHC, YBC) completed 5 received, 4 skips, 1 insert, and no errors.
- Restarted API with the new retry defaults. Backend remains 23 suites/84 tests passed.

## Profit/loss color convention — 2026-09-23

- Portfolio unrealized and realized P/L cells now use the shared semantic classes: non-negative values are green (`positive`), negative values are red (`negative`), and unavailable values stay neutral.
- Overview price-change cells now also remain neutral when change data is missing instead of incorrectly appearing as a loss. Existing detail charts, market breadth, recommendation tracking, and outcome badges continue using the same green/red convention.
- Verification: frontend build and encoding check passed; portfolio-related E2E passed 6/6.

## Realtime loading feedback — 2026-09-23

- Preserved the existing fast path that renders cached/EOD values first, then added explicit animated realtime-loading indicators for overview quotes, detail quotes, and portfolio quote revaluation.
- Loading indicators clear on success or failure; a failed realtime request leaves the EOD value visible and the existing fallback/error text intact. Missing quote data is no longer styled as a loss.
- Verification: frontend build and encoding check passed; targeted overview/detail/portfolio E2E passed 8/8. Preview restarted on port 4180 with the new bundle.

## Full UI regression after realtime loading feedback — 2026-09-23

- Ran the complete frontend Playwright suite after adding non-blocking quote loading indicators. All 29 tests passed, including overview fallback, detail chart alignment, portfolio revaluation, recommendations, and pagination workflows.
- No additional code changes were needed. The EOD/cache-first display and realtime loading feedback coexist without changing existing data behavior.

## Loading-state regression coverage — 2026-09-23

- Added a browser test that delays the realtime quote response and verifies the loading animation is visible while cached/EOD values remain rendered, then disappears after the quote arrives.
- New loading-specific E2E passed 1/1; frontend build and encoding check passed.

## Initial bootstrap loading screen — 2026-09-23

- Added a lightweight full-page loading state only while the authenticated app is waiting for its first stock-list payload. It includes a clear status message, spinner, and explains that EOD data appears before realtime quotes.
- Existing cache/EOD content is still rendered immediately after the first payload, and later quote refreshes remain non-blocking inline indicators. API errors continue to use the existing error banner instead of leaving an indefinite loading screen.
- Verification: frontend production build and encoding check passed; full Playwright passed 30/30.


## VNINDEX universe and chart metrics planning — 2026-09-23

- Added the next roadmap milestone for 300+ VNINDEX symbols and defined bounded 500-symbol retrieval, pagination, cache, batching, concurrency, indexing, and load-test guardrails.
- Documented the canonical nullable metrics required for chart timelines: transaction count, traded value, reference/ceiling/floor prices, and market-level ceiling/floor counts. The plan explicitly preserves existing price/volume behavior and discloses provider gaps instead of synthesizing values.
- Implemented the first scale-safe slice: backend page-size ceiling is 500 and the overview universe request uses 500; the visible table remains paginated. Build and full frontend E2E verification are pending after this change.

## Optional market metrics contract — 2026-09-23

- Added migration 015 and StockPrice fields for nullable `trade_count`, `traded_value`, `reference_price`, `ceiling_price`, and `floor_price`.
- Vnstock EOD adapter and ingestion now preserve provider values when supplied; the stock detail API exposes them in each `price_history` point. Existing rows remain valid with null metrics and existing price/volume behavior is unchanged.
- Backend regression: 23 suites/84 tests passed. Provider population, market-level ceiling/floor aggregation, and chart overlays remain the next slice.
- Development migration 015 was applied successfully alongside pending 014; no existing price rows were rewritten.

## Khôi phục các tính năng UI bị thiếu — 2026-09-23

- Nối lại bộ tiêu chí đề xuất cá nhân và vòng phản hồi đánh giá, cho phép điều chỉnh trọng số rồi thêm mã trực tiếp vào danh mục.
- Khôi phục biểu đồ độ rộng thị trường cho universe tối đa 500 mã, biểu đồ donut phân bổ danh mục và bảng theo dõi mã được thêm từ đề xuất.
- Khôi phục màn hình loading ban đầu, giữ màu xanh cho lãi/tăng và màu đỏ cho lỗ/giảm trong các bảng P/L.
- Kiểm chứng: frontend build và kiểm tra encoding đều đạt. Cần chạy lại bộ Playwright đầy đủ sau khi preview được khởi động trong môi trường kiểm thử.

## Sửa theo dõi đề xuất và bố cục phân bổ — 2026-09-23

- Sửa mapping dữ liệu theo dõi từ `recommendation_entries`, đồng thời giữ `recommendation_context` khi lưu giao dịch được tạo từ tab Đề xuất. Các mã đã thêm trước đó có liên kết sẽ được hiển thị lại cùng trạng thái đang chờ/đã đánh giá.
- Căn lại phần danh mục theo bố cục donut + danh sách chú giải có màu, tên mã, giá trị và tỷ trọng; danh sách dùng cấu trúc CSS thống nhất để tránh lệch cột.
- Kiểm chứng: frontend build thành công và kiểm tra encoding đạt.

## Rà soát luồng UI/UX và giữ ngữ cảnh reload — 2026-09-23

- Đánh giá lại thứ tự page theo luồng nhà đầu tư: Tổng quan (độ rộng thị trường → danh sách), Danh mục (vị thế → phân bổ → theo dõi đề xuất), Chi tiết mã (giá realtime → chart → phân tích), Đề xuất (tiêu chí → kết quả → phản hồi), Advisor (hỏi đáp theo mã đang chọn).
- Khi F5, ứng dụng giữ page đang mở và mã đang chọn bằng session storage thay vì luôn quay về Tổng quan. Nếu session storage không khả dụng, hệ thống vẫn dùng Tổng quan và mã mặc định an toàn.
- Topbar hiển thị tiêu đề theo page để người dùng luôn biết ngữ cảnh phân tích hiện tại.
- Kiểm chứng: frontend build và kiểm tra encoding đạt.

## Tinh gọn UI/UX và quay lại mốc mở rộng 500 mã — 2026-09-23

- Đề xuất được sắp xếp lại thành luồng ngắn: tiêu đề/ngữ cảnh → cảnh báo → bộ tiêu chí → kết quả → vòng phản hồi. Bỏ phần tiêu đề lặp, gom thông tin hành động và thu gọn bộ điều khiển tiêu chí trên màn hình lớn.
- Các page còn lại được thống nhất khoảng cách, tiêu đề theo ngữ cảnh, thứ tự thông tin quyết định trước phần giải thích và độ tương phản của panel.
- Không thay đổi dữ liệu, API hay chuỗi tiếng Việt hiện có; kiểm tra encoding vẫn đạt.
- Sau khi hoàn tất UI, tiếp tục mốc mở rộng 500 mã: kiểm tra endpoint universe, tải quote theo batch, market breadth và đo thời gian hiển thị ở 300/500 mã.
- Kiểm chứng: frontend build thành công và encoding check đạt.

## Donut phân bổ và tìm mã chi tiết — 2026-09-23

- Thiết kế lại donut phân bổ với trung tâm tổng giá trị, chú giải dạng hàng có màu, tỷ trọng và trạng thái hover; bố cục co giãn tốt hơn giữa desktop/mobile.
- Khôi phục tìm mã trong page Chi tiết mã bằng ô nhập có datalist autocomplete lấy từ universe tối đa 500 mã; Enter hoặc nút Mở mã sẽ mở đúng mã được chọn.
- Kiểm chứng: frontend build và encoding check đạt.

## Hiển thị đầy đủ tỷ trọng nhỏ trên donut — 2026-09-23

- Sửa gradient donut dùng mốc cộng dồn thay vì cho mọi đoạn bắt đầu từ 0; bổ sung góc hiển thị tối thiểu để mã có tỷ trọng nhỏ vẫn nhìn thấy.
- Tỷ trọng thực tế trong chú giải không bị thay đổi; điều chỉnh chỉ áp dụng cho khả năng nhận diện trực quan của lát cắt.
- Kiểm chứng: frontend build và encoding check đạt.

## Tương tác donut phân bổ — 2026-09-23

- Donut hiện có lát cắt SVG riêng cho từng mã; hover/focus hiển thị mã, tỷ trọng và giá trị ở trung tâm kèm tooltip.
- Click vào lát cắt hoặc dòng chú giải bên phải sẽ mở page Chi tiết mã tương ứng.
- Kiểm chứng: frontend build và encoding check đạt.

## Donut giữ thiết kế và bổ sung biến động — 2026-09-23

- Giữ lại nền donut conic-gradient và tâm bánh tổng giá trị; lớp SVG trong suốt chỉ dùng để nhận hover/focus và tooltip theo từng mã.
- Tâm bánh hiển thị thêm thay đổi giá trị và phần trăm so với phiên trước khi backend có dữ liệu giá trước đó. Backend portfolio API nay trả `previous_market_price`, `day_change` và `day_change_pct` theo từng vị thế.
- Đã chuyển các chuỗi Unicode escape trong `App.jsx` về tiếng Việt trực tiếp và sửa các chuỗi mojibake còn sót quanh khu vực navigation/dòng 335.
- Kiểm chứng: frontend build, encoding check và backend 23 suites/84 tests đạt.

## Làm rõ tổng tài sản so với hôm qua — 2026-09-23

- Tâm donut giờ ghi rõ “Tổng tài sản hiện tại” và “So với hôm qua”, dùng tổng giá trị các vị thế hiện tại so với giá đóng cửa phiên trước theo từng mã.
- Khi hover một mã, tổng tài sản và biến động toàn danh mục vẫn được giữ ở tâm bánh, đồng thời bổ sung tỷ trọng và giá trị của mã đang xem.
- Kiểm chứng: frontend build và encoding check đạt.

## Loading overlay trong suốt — 2026-09-23

- Chuyển loading ban đầu thành overlay cố định, nền trong suốt có blur nhẹ để vẫn nhìn thấy nội dung page phía sau.
- Thẻ loading được thu gọn, chỉ giữ spinner, trạng thái và mô tả ngắn; không còn nền trắng/đặc che toàn bộ màn hình.
- Kiểm chứng: frontend build và encoding check đạt.

## Tiếp tục mở rộng universe 500 mã — 2026-09-23

- Overview market breadth hiện tải universe riêng với `pageSize=500` và tải quote theo batch tối đa 100 mã mỗi request; API vẫn giới hạn 200 mã/request nên không vượt hợp đồng backend.
- Quote được gộp lại trước khi phân loại tăng/giảm cho market breadth; bảng hiển thị vẫn giữ phân trang để không tạo 500 DOM rows cùng lúc.
- Kiểm chứng: frontend build và encoding check đạt; backend regression trước đó 23 suites/84 tests. Bước tiếp theo là đo thời gian fetch/render ở 300 và 500 mã trong phiên thị trường.

## Kiểm chứng tiếp tục mốc 500 mã — 2026-09-23

- Rà soát phát hiện bộ kiểm tra encoding bắt nhầm ký tự tiếng Việt hợp lệ `Â` trong `RecommendationWorkbench.jsx`; đã thu hẹp mẫu nhận diện để chỉ bắt chuỗi mojibake thực sự.
- Kiểm chứng sau sửa: frontend unit/API tests 12/12 đạt, build Vite đạt, encoding check đạt (13 source files); backend regression 23 suites/84 tests đạt.
- Trạng thái scale không đổi: overview vẫn tải universe tối đa 500 mã và quote theo batch tối đa 100 mã. Bước tiếp theo là đo fetch/render/first usable paint ở 300 và 500 mã trong phiên thị trường thực.

## Hồi quy quote theo batch 500 mã — 2026-09-23

- Tách logic chia universe thành các batch quote tối đa 100 mã và logic gộp kết quả `Promise.allSettled` thành module dùng lại được.
- Bổ sung kiểm thử: universe 500 mã tạo đúng 5 batch, loại trùng mã, và batch lỗi không làm mất quote từ các batch thành công.
- Kiểm chứng: frontend 14/14 tests đạt, encoding check đạt (15 source files), Vite build đạt. Backend regression trước đó 23 suites/84 tests.
- Bước tiếp theo vẫn là đo first usable paint, fetch universe, refresh quote và render market breadth ở quy mô 300/500 mã trong phiên thị trường.

## Index truy vấn phục vụ scale 500 mã — 2026-09-23

- Bổ sung migration 016_add_stock_price_scale_indexes: index (stock_id, observed_at) phục vụ giá mới nhất theo mã và (provider, interval, observed_at) phục vụ market session/breadth.
- Migration kiểm tra index theo tên trước khi tạo và có nhánh rollback tương ứng; không thay đổi dữ liệu hiện có.
- Kiểm chứng: migration node --check đạt; backend 23 suites/84 tests đạt.
- Bước tiếp theo: chạy migration trên database mục tiêu và đo truy vấn/thời gian render ở 300/500 mã trong phiên thị trường.
- Migration 016 đã được áp dụng thành công trong database development qua sequelize-cli.

## Đo probe scale đọc dữ liệu — 2026-09-23

- Thêm script chỉ đọc `backend/scripts/measure-scale.cjs` và lệnh `npm run measure:scale` để đo truy vấn giá mới nhất ở giới hạn 300/500 mã cùng truy vấn market session.
- Kết quả database development: 131 mã, 128 mã có coverage, 50.416 dòng giá. Truy vấn latest-per-stock mất 15,67 ms ở giới hạn 300 và 15,97 ms ở giới hạn 500; truy vấn 3 market session mất 21,97 ms.
- Vì database hiện mới có 131 mã, đây là số đo độ trễ truy vấn với giới hạn 300/500 trên tập dữ liệu hiện có, chưa phải phép đo tải thật của 300/500 mã. Cần bổ sung coverage provider trước khi kết luận hiệu năng toàn universe.

## Coverage checkpoint 300 mã — 2026-09-23

- Chạy ingest vnstock universe với giới hạn 300, bỏ qua mã đã đủ dữ liệu, batch 25 và manifest backend/evidence/vnstock-universe-scale-300-2026-09-23.json.
- Kết quả: 12 batch hoàn tất, 0 batch thất bại, 859 dòng EOD nhận/ghi mới; các lỗi từng mã và mã provider không trả dữ liệu được giữ trong manifest.
- Database sau ingest: 424 mã metadata, 321 mã có ít nhất một dòng giá, 51.275 dòng giá. Probe latest-per-stock: 13,84 ms ở giới hạn 300 và 17,47 ms ở giới hạn 500; market session: 22,21 ms.
- Mốc 300 mã đã đạt về coverage có dữ liệu; chưa xem là hoàn tất mốc 500. Bước tiếp theo là retry có chọn lọc các symbol lỗi/thiếu coverage và sau đó mở rộng batch ingest lên 500.

## Retry và mở rộng mốc 500 — 2026-09-23

- Retry có chọn lọc từ manifest mốc 300 đã ghi thêm 52 dòng EOD; 12/14 mã có dữ liệu, VTL và VTM vẫn lỗi provider.
- Lượt mở rộng 500 tạo manifest `backend/evidence/vnstock-universe-scale-500-b25-2026-09-23.json` nhưng cả 20 batch đều thất bại do worker/provider trả `fetch failed`; không có dòng giá mới từ lượt này.
- Retry manifest 500 được khởi chạy với `VNSTOCK_EOD_BATCH_SIZE=25`, nhưng provider tiếp tục timeout/fetch failed; đã dừng sau 6 batch để tránh lặp tải vô ích. Runtime health vẫn trả 200/ready, nên cần kiểm tra sâu request dữ liệu hoặc khởi động lại worker trước lần retry tiếp theo.
- Database hiện giữ nguyên dữ liệu hợp lệ: 624 mã metadata, 332 mã có coverage, 51.328 dòng giá. Không xóa metadata/lịch sử và không đánh dấu mốc 500 đã đạt.

## Cô lập lỗi worker/provider mốc 500 — 2026-09-23

- Health endpoint của worker vẫn trả 200 nhưng request EOD/intraday thất bại do worker kế thừa proxy chết (`ProxyError` tới `127.0.0.1:9`). Đã khởi động lại worker với `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY` rỗng và `NO_PROXY` cho localhost.
- Sau restart sạch proxy, probe FPT đạt: EOD 8 dòng, intraday 10 dòng; request EOD 2 mã đạt 16 dòng. Request từ 5 mã trở lên vẫn có thể bị đóng kết nối, nên giới hạn an toàn hiện tại là batch provider 2.
- Lượt retry batch 25 thất bại do giới hạn thực tế này. Lượt batch 2 đã checkpoint 1 outer batch nhưng thời gian tuyến tính quá lớn nên dừng an toàn; manifest giữ lại để tiếp tục sau khi tối ưu worker/provider.
- Coverage không được đánh dấu tăng từ các lượt thất bại; database vẫn giữ dữ liệu hợp lệ và không xóa lịch sử.

## Chống mất dữ liệu khi worker trả partial batch — 2026-09-23

- Cập nhật `vnstockBridgeFetcher`: EOD request qua worker tự chia batch an toàn mặc định 2 mã, retry theo chunk và gộp các chunk thành công; chỉ ném lỗi khi toàn bộ request không có dòng dữ liệu.
- Bổ sung regression cho chia batch và partial response; backend đạt 23 suites/86 tests.
- Retry manifest 500 sau thay đổi ghi nhận 83 dòng đã nhận nhưng 18/20 outer batch vẫn thất bại do VCI/KBS reset hoặc lỗi chứng chỉ KBS. Database vẫn ở 624 mã metadata, 332 mã có coverage, 51.328 dòng giá; không đánh dấu mốc 500 hoàn tất.
- Probe sau retry: latest-per-stock 11,59 ms ở giới hạn 300 và 15,39 ms ở giới hạn 500.

## Retry chỉ VCI sau khi sửa partial chunk — 2026-09-23

- Retry manifest sau thay đổi partial chunk đã nhận 74 dòng và hoàn tất 18 outer batch; 1 batch có dữ liệu nhưng 17 batch vẫn lỗi/reset. Fallback KBS vẫn bị nạp từ `.env` khi biến rỗng bị dotenv bổ sung lại, nên lần chạy này chưa phải phép đo VCI-only thuần túy.
- Kết quả không làm tăng coverage vì 74 dòng đã tồn tại và bị idempotent skip. Database vẫn ở 624 mã metadata, 332 mã có coverage.
- Cần bổ sung cờ tắt fallback rõ ràng thay vì dùng chuỗi rỗng, sau đó retry các batch còn lại qua VCI với worker batch 2.
- Đã thêm cờ VNSTOCK_DISABLE_FALLBACK=true vào ingest universe để tắt fallback KBS một cách tường minh; node --check đạt và fetcher regression 4/4 đạt.

## VCI-only retry checkpoint — 2026-09-23

- Chạy retry bằng `VNSTOCK_DISABLE_FALLBACK=true` trên manifest 450 symbol lỗi; output `backend/evidence/vnstock-universe-scale-500-vci-only-2026-09-23.json` xác nhận fallback đã tắt (`fallback: null`).
- Kết quả: 78 dòng nhận nhưng đã tồn tại nên bị idempotent skip; 16/17 batch thất bại do VCI reset/no-row. Coverage không tăng.
- Probe hiện tại: 624 mã metadata, 332 mã có coverage, 51.328 dòng giá; truy vấn latest-per-stock 12,48 ms ở giới hạn 300 và 14,99 ms ở giới hạn 500.
- Kết luận: bottleneck còn lại là độ ổn định upstream VCI với nhóm mã thanh khoản thấp/không có dữ liệu, không phải fallback KBS. Giữ các batch lỗi trong manifest và không đưa mã chưa có observation vào readiness.

## Audit gap provider sau retry VCI-only — 2026-09-23

- Thêm script classify:universe-gaps và tạo evidence/vnstock-universe-gap-audit-latest.json.
- Manifest VCI-only hiện có 400 gap được phân loại transient; chưa có bằng chứng đủ chắc để loại mã nào là no_data vĩnh viễn. Vì vậy tất cả vẫn nằm trong retry backlog, không đưa vào readiness.
- Bước tiếp theo là retry theo nhóm nhỏ hơn với backoff dài hơn hoặc chuyển các mã transient sang lịch retry ngoài phiên; không tiếp tục retry toàn universe trong một lượt dài.

## Canary retry theo nhóm nhỏ — 2026-09-24

- Nhóm canary 1 (SBB,SBD,SBG,SBH,SBL,SBM,SBR,SBS,SBV,SC5) chạy VCI-only, worker chunk 2: 1/1 batch thành công, 48 dòng EOD, 0 lỗi; coverage tăng 332 lên 342.
- Nhóm canary 2 (SCG,SCI,SCJ,SCL,SCO,SCR,SCS,SCV,SCY,SD1) thất bại 1/1 batch do VCI fetch failed; không ghi dữ liệu.
- Probe sau canary: 624 mã metadata, 342 mã có coverage, 51.376 dòng giá; latest-per-stock 12,16 ms ở 300 và 15,60 ms ở 500.
- Kết luận: retry nhóm 10 có thể thành công nhưng upstream chưa ổn định; tiếp tục theo nhóm nhỏ, giữ backoff và manifest, chưa mở rộng đồng thời.

## Mở rộng canary 2026-09-24

- Retry lại nhóm SCG..SD1 thành công: 32 dòng EOD, 0 lỗi.
- Nhóm SD2..SDB chạy VCI-only với worker chunk 2: 14 dòng EOD, 0 batch thất bại; 4 chunk lỗi được giữ partial nhưng outer batch vẫn hoàn tất.
- Database hiện có 624 mã metadata, 353 mã có coverage, 51.422 dòng giá. Probe latest-per-stock: 12,58 ms ở 300 và 14,84 ms ở 500.
- Cơ chế chunk nhỏ và partial coverage đang hoạt động; tiếp tục retry mỗi nhóm 10 mã, chỉ tăng lên 20 mã sau khi hai nhóm liên tiếp ổn định.

## Canary retry tiếp tục — 2026-09-24

- Nhóm SDC–SDU: VCI-only, worker chunk 2, 11 dòng EOD, 0 batch lỗi.
- Nhóm SDV–SFI: 19 dòng EOD, 0 batch lỗi; hai chunk SFG/SFI lỗi nhưng partial response vẫn hoàn tất outer batch.
- Database hiện có 624 mã metadata, 364 mã có coverage, 51.452 dòng giá. Probe latest-per-stock: 13,39 ms ở 300 và 15,15 ms ở 500.
- Partial coverage và retry nhóm 10 đang hoạt động đúng; tiếp tục theo thứ tự backlog, không tăng concurrency.

- Canary SFN-SGR 2026-09-24: VCI-only batch hoàn tất 35 dòng EOD, 0 lỗi. Database đạt 624 mã metadata, 372 mã có coverage, 51.487 dòng giá; probe latest-per-stock 12,55 ms ở 300 và 15,13 ms ở 500.

## Canary SGS-SHX — 2026-09-24

- Retry nhóm SGS,SGT,SHA,SHC,SHE,SHG,SHI,SHN,SHP,SHX bằng VCI-only với worker chunk 2 đã hoàn tất 1/1 batch, nhận và ghi 39 dòng EOD, 0 batch lỗi.
- Database hiện có 624 mã metadata, 380 mã có coverage, 51.526 dòng giá. Probe latest-per-stock: 12,8 ms ở 300 và 15,25 ms ở 500; truy vấn 3 market session: 28,33 ms.
- Không thay đổi logic hiển thị hay hợp đồng API; tiếp tục retry tuần tự nhóm 10 mã và chỉ nâng kích thước nhóm khi upstream ổn định qua nhiều lượt.


## Canary SIC-SJF — 2026-09-24

- Retry nhóm SIC,SID,SIG,SII,SIV,SJ1,SJC,SJD,SJE,SJF bằng VCI-only với worker chunk 2 đã hoàn tất 1/1 batch, nhận và ghi 24 dòng EOD, 0 batch lỗi.
- Database hiện có 624 mã metadata, 386 mã có coverage, 51.550 dòng giá. Probe latest-per-stock: 12,71 ms ở 300 và 15,17 ms ở 500; truy vấn 3 market session: 23,64 ms.
- Tiếp tục retry tuần tự nhóm 10 mã; chưa tăng concurrency hoặc đánh dấu hoàn tất mốc 500.

## Canary SJG-SMA — 2026-09-24

- Retry nhóm SJG,SJM,SJS,SKG,SKH,SKN,SKV,SLD,SLS,SMA bằng VCI-only với worker chunk 2 đã hoàn tất 1/1 batch, nhận và ghi 39 dòng EOD, 0 batch lỗi.
- Database hiện có 624 mã metadata, 396 mã có coverage, 51.589 dòng giá. Probe latest-per-stock: 12,8 ms ở 300 và 15,18 ms ở 500; truy vấn 3 market session: 22,65 ms.
- Tiếp tục retry tuần tự nhóm 10 mã; chưa tăng concurrency hoặc đánh dấu hoàn tất mốc 500.

## Canary SMB-SPB — 2026-09-24

- Retry nhóm SMB,SMC,SMN,SMT,SNC,SNZ,SON,SP2,SPA,SPB bằng VCI-only với worker chunk 2 hoàn tất 1/1 batch; ghi nhận 28 dòng EOD, không có batch thất bại. Worker có log no-data cho SON nhưng ingest vẫn giữ kết quả partial hợp lệ.
- Database hiện có 624 mã metadata, 402 mã có coverage, 51.617 dòng giá. Probe latest-per-stock: 13,06 ms ở 300 và 15,31 ms ở 500; truy vấn 3 market session: 22,69 ms.
- Tiếp tục retry tuần tự nhóm 10 mã; chưa tăng concurrency hoặc đánh dấu hoàn tất mốc 500.

## Canary SPC-SRB — 2026-09-24

- Retry nhóm SPC,SPD,SPH,SPI,SPM,SPP,SPV,SQC,SRA,SRB bằng VCI-only với worker chunk 2 hoàn tất 1/1 batch, nhận và ghi 14 dòng EOD, 0 batch lỗi.
- Database hiện có 624 mã metadata, 407 mã có coverage, 51.631 dòng giá. Probe latest-per-stock: 13,17 ms ở 300 và 16,1 ms ở 500; truy vấn 3 market session: 22,61 ms.
- Tiếp tục retry tuần tự nhóm 10 mã; chưa tăng concurrency hoặc đánh dấu hoàn tất mốc 500.

## Realtime portfolio and session continuity fix — 2026-09-24

- Tổng quan: chip “Biến động bình quân” dùng màu xanh khi giá trị không âm và màu đỏ khi giá trị âm, nên -0,10% hiển thị màu đỏ.
- Danh mục cá nhân: bổ sung polling quote theo các mã vị thế mỗi 30 giây; khi quote hợp lệ, giá hiện tại, giá trị thị trường và lãi/lỗ chưa thực hiện được tính lại theo quote intraday, còn EOD giữ làm fallback.
- Chi tiết mã: đổi cache key lịch sử sang v6 và tăng cửa sổ đọc từ 20 lên 40 bản ghi để giữ phiên EOD liền trước khi ghép quote intraday của phiên hiện tại. Backend 23 suites/86 tests đạt; frontend encoding check, service tests 14/14 và production build đạt.

## Kiểm tra tích hợp sau sửa realtime — 2026-09-24

- API control FPT xác nhận lịch sử EOD bắt đầu từ 2026-09-22 và quote VCI intraday mới nhất có ngày 2026-09-24, giá 65.600 VND; dữ liệu không bị thay thế mất phiên trước.
- Frontend service tests 14/14 và encoding check đạt; preview trả HTTP 200. Smoke test trình duyệt bị môi trường Windows từ chối khởi chạy Chrome (`spawn EPERM`), nên chưa có screenshot UI mới trong lượt này.

## Sửa màu RAG, donut và phiên EOD 23-09 — 2026-09-24

- Sửa màu chip “Biến động bình quân” theo dấu thực tế: âm dùng lớp negative (đỏ), dương/0 dùng lớp positive (xanh).
- Khôi phục màu RAG cho lãi/lỗ trong bảng Ghi nhận giao dịch; donut phân bổ hiển thị tooltip riêng theo từng mã ở danh sách phân bổ, và phần trung tâm hiển thị tổng tài sản cùng chênh lệch so với hôm qua khi có dữ liệu đối chiếu.
- Điều tra phiên 23-09: market_sessions toàn hệ thống có phiên này, nhưng từng mã có thể thiếu candle do provider. Đã backfill FPT qua VCI thành công: 1 dòng EOD, giá đóng cửa 66.100; lịch sử FPT hiện gồm 23-09, 22-09, 21-09. Evidence: `backend/evidence/eod-backfill-2026-09-23-2026-09-24T03-18-32-186Z.json`.
- Các mã còn thiếu 23-09 cần retry theo nhóm nhỏ; không được tổng hợp hoặc suy diễn candle khi provider không trả dữ liệu.

## Sửa lần hai: màu cố định, tooltip donut theo mã và EOD đa mã — 2026-09-24

- Market breadth: nền chip giữ cố định lớp `chip neutral`; chỉ phần giá trị nhận lớp `positive` hoặc `negative`, vì vậy `-0,46%` luôn có nền trung tính nhưng chữ đỏ.
- Phân bổ danh mục: bỏ tooltip tổng hợp trên toàn bộ donut; từng dòng mã trong danh sách phân bổ có tooltip riêng gồm mã, tỷ trọng và giá trị. Donut vẫn giữ tổng tài sản và chênh lệch so với hôm qua ở phần tâm.
- EOD: FPT chỉ là mã control để xác nhận đường đi VCI. Backfill nhóm AAS–BID chạy qua cùng worker VCI cho toàn universe 624 mã; 9/10 mã trả dữ liệu, 1 mã (BCG) vẫn không có bản ghi từ provider. Evidence: `backend/evidence/eod-backfill-2026-09-23-2026-09-24T03-39-00-422Z.json`.
- Phiên 24-09 đang trong ngày giao dịch nên chỉ có quote intraday; EOD 24-09 chỉ được ghi sau khi phiên đóng cửa. Không dùng dữ liệu FPT để đại diện cho mã khác; mỗi mã được lấy và kiểm tra độc lập.
- Hạn chế còn lại: các mã provider chưa trả candle 23-09 tiếp tục nằm trong retry backlog, không tự tạo candle giả và không đánh dấu coverage khi thiếu observation.


## Khôi phục loading, hover donut và route sau F5 — 2026-09-24

- Tổng quan hiển thị loading overlay bán trong suốt trong thời gian tải quote intraday; overlay tự tắt khi request hoàn tất hoặc bị hủy.
- Donut bổ sung lớp vùng hover theo từng mã trên vòng tròn, dùng tooltip riêng gồm mã, tỷ trọng và giá trị; bỏ tooltip tổng hợp.
- Route hiện tại được lưu vào `sessionStorage` (`stockpilot-view`), nên F5 giữ nguyên page đang mở; mã đang chọn tiếp tục được phục hồi theo state của page chi tiết.
- Source và preview đã build lại. Frontend 14/14 test và encoding check đạt; preview asset mới trả HTTP 200.

## Sửa loading, donut hover và F5 — 2026-09-24

- Tổng quan hiển thị overlay loading bán trong suốt khi đang lấy quote intraday; overlay tự tắt khi request thành công, lỗi hoặc bị hủy.
- Vỏ donut có vùng hover riêng cho từng mã theo vòng tròn, tooltip chỉ hiển thị mã, tỷ trọng và giá trị của vùng đang hover.
- Route và mã chi tiết được lưu trong `sessionStorage` (`stockpilot-view`, `stockpilot-selected-id`), nên F5 giữ nguyên page và ngữ cảnh mã đang xem.
- Build Vite đạt; frontend 14/14 test và encoding check đạt; preview asset mới trả HTTP 200.

## Hotfix preview trắng — 2026-09-24

- Phát hiện bundle preview bị lỗi cú pháp do chèn `useEffect` bằng dấu phẩy trong chuỗi minified, khiến module không khởi tạo và toàn bộ UI trắng.
- Đã sửa thành câu lệnh hợp lệ, kiểm tra parse bằng esbuild, thay asset preview và xác nhận các marker route/loading/donut đều có trong asset HTTP 200.
- Frontend 14/14 test và encoding check tiếp tục đạt.

## Sửa lần ba: chờ quote thật và hover lát donut — 2026-09-24

- Loading intraday không còn tắt ngay khi API trả payload rỗng; chỉ tắt sau khi nhận được ít nhất một quote hợp lệ. Request tiếp tục retry theo chu kỳ nếu upstream chưa trả dữ liệu.
- Bổ sung CSS hit-test nằm trên vòng donut, có con trỏ và tooltip riêng cho từng mã; tooltip không phụ thuộc danh sách bên phải.
- Bundle đã parse bằng esbuild và preview asset mới xác nhận có cả logic giữ loading và vùng hover donut.

## Căn donut theo lát và thêm nhận diện loading — 2026-09-24

- Thay các điểm hover chia đều bằng SVG overlay; mỗi path tính góc bắt đầu/kết thúc theo `weight` thực tế, nên vùng hover khớp lát conic-gradient của donut.
- Tooltip dùng `<title>` trực tiếp trên path SVG, không phụ thuộc danh sách mã bên phải.
- Loading card có logo S gradient đồng bộ với brand mark và giữ hiệu ứng nền mờ.
- Preview asset xác nhận có SVG donut và logo loading; frontend 14/14 test, encoding check và parse bundle đạt.

## Tối ưu quote Tổng quan và kiểm chứng freshness — 2026-09-24

- Quote Tổng quan được chia thành các batch tối đa 100 mã, chạy song song có kiểm soát và hợp nhất các batch thành công; một batch lỗi không làm mất dữ liệu các batch còn lại.
- `verify:quote-freshness` lúc 2026-09-24 12:28 giờ Bangkok xác nhận 5/5 mã FPT, SSI, VCB, HPG, BSR có quote VCI phiên 24-09. Thời điểm kiểm tra là nghỉ trưa nên tuổi quote khoảng 58 phút được ghi nhận đúng, không bị coi là lỗi stale trong ngoài phiên liên tục.
- Preview asset đã parse bằng esbuild và xác nhận logic batching; frontend test/encoding tiếp tục đạt.

## Căn vùng hover donut dưới nhân bánh — 2026-09-24

- SVG hover path được đổi từ hình quạt đi qua tâm thành vành khuyên với bán kính ngoài 50 và bán kính trong 34, tương ứng với lỗ donut thực tế.
- Lớp nhân được đặt z-index cao hơn và `pointer-events: none`, còn SVG chỉ nhận sự kiện trên phần vành; tooltip vẫn hiển thị đúng mã/tỷ trọng/giá trị.
- Preview asset cập nhật, parse esbuild và frontend 14/14 test đạt.

## Nới vùng hover donut theo phản hồi — 2026-09-24

- Tăng overlay SVG lên 1,14 lần và đổi bán kính hit từ 50/34 lên 58/40 để phủ tới mép vỏ bánh thực tế.
- Nhân bánh vẫn ở lớp trên; vùng tương tác chỉ nằm trên vành mở rộng quanh nhân.
- Preview CSS/JS đã xác nhận scale và bán kính mới; frontend 14/14 test đạt.

## Điều chỉnh scale hover donut — 2026-09-24

- Tăng scale overlay SVG từ 1,14 lên 1,3 theo phản hồi trực quan; nhân bánh và tooltip giữ nguyên.
- Preview CSS xác nhận đang nạp scale 1,3.

## Sửa ký tự xuống dòng trong MarketBreadthChart — 2026-09-24

- Dòng 4 chứa chuỗi literal `\\n`, làm phần khai báo `formatDateTime` và `categories` nằm sai trên cùng dòng. Đã chuyển thành xuống dòng thật.
- Build Vite, encoding check và frontend 14/14 test đạt.

## Regression đầy đủ sau chỉnh sửa donut và encoding — 2026-09-24

- Backend: 23 suites, 86 tests đạt.
- Frontend: build Vite đạt; 14/14 service tests và encoding check đạt.
- Preview 4180 đang nạp asset `index-I4UD0NTh.js` và CSS mới; marker route persistence còn tồn tại sau build.
- Không phát hiện regression trong quote freshness, portfolio accounting, EOD controller hoặc recommendation services.

## Tiếp tục backfill EOD 23-09 — 2026-09-24

- Nhóm BCG–SCD: VCI trả 4 bản ghi mới cho BVB, LHG, SAB, SBT; coverage tăng từ 344 lên 348/624 mã. BCG, SBR, SBV, SCA, SCC, SCD vẫn không có candle từ upstream. Evidence: `backend/evidence/eod-backfill-2026-09-23-2026-09-24T06-41-49-168Z.json`.
- Nhóm SCJ–SD9: VCI trả 0/10 bản ghi; hai request bị reset kết nối, các mã còn lại không có dữ liệu. Không ghi candle giả và giữ nguyên backlog. Evidence: `backend/evidence/eod-backfill-2026-09-23-2026-09-24T06-42-54-909Z.json`.
- Kết luận: coverage hiện tại 348/624; retry tiếp theo cần backoff dài hơn hoặc chạy ngoài giờ provider ổn định, không tăng concurrency.

## Loading dùng chung cho mọi page — 2026-09-24

- Overlay loading intraday không còn giới hạn ở Tổng quan. Danh mục hiển thị overlay khi đang lấy quote vị thế, Chi tiết mã hiển thị khi resource chi tiết đang loading; Tổng quan tiếp tục chờ quote hợp lệ đầu tiên.
- Overlay dùng chung logo S và thông điệp nhất quán, tránh trạng thái page trống trong khi dữ liệu đang tải.
- Bundle parse bằng esbuild và preview asset đã cập nhật.

## Sửa giá tham chiếu đề xuất theo quote intraday — 2026-09-24

- Nguyên nhân: `entry_price` của đề xuất cá nhân chỉ lấy `rows.at(-1).close`, tức giá EOD gần nhất; trong phiên mới, giá thực tế có thể thấp hơn nên giá tham chiếu hiển thị cao.
- Sửa: controller lấy quote VCI intraday cho các mã được xếp hạng; engine ưu tiên `quote.price`, chỉ fallback về EOD khi không có quote. Snapshot ghi `reference_plan.price_source` và `observed_at`.
- UI hiển thị nhãn `Intraday` hoặc `EOD fallback` cạnh giá tham chiếu để người dùng biết nguồn giá. Không coi giá tham chiếu là cam kết lợi nhuận; kết quả vẫn được đánh giá theo giá thực tế và kỳ hạn.
- Backend 23 suites/87 tests đạt; frontend build và 14/14 tests đạt.

## Hoàn tất sửa giá tham chiếu cho cả hai luồng đề xuất — 2026-09-24

- Luồng Đề xuất cá nhân (`POST /api/recommendations/personalized`) và luồng snapshot định kỳ đều ưu tiên quote intraday VCI cho các mã được chọn.
- EOD chỉ là fallback khi provider không trả quote. Giá lưu vào recommendation snapshot và giá hiển thị dùng cùng một nguồn, tránh trường hợp UI dùng giá cũ còn đánh giá dùng giá khác.
- Thêm test engine xác nhận quote intraday thay thế close EOD và lưu `price_source/observed_at`.
- Backend 23 suites/87 tests đạt; frontend build và 14/14 tests đạt.

## Kiểm tra end-to-end giá đề xuất — 2026-09-24

- Sau khi khởi động lại backend với mã nguồn mới, gọi `POST /api/recommendations/personalized` với limit 3 trả IDC, NAB, BSR đều có `price_source: intraday` và `observed_at` phiên 24-09.
- Giá tham chiếu mẫu: IDC 33.500, NAB 12.000, BSR 31.150; đây là quote VCI hiện tại tại thời điểm tạo đề xuất, không còn dùng close EOD cũ khi quote khả dụng.
- Luồng snapshot định kỳ cũng đã được nối cùng cơ chế ưu tiên intraday; khi provider lỗi vẫn fallback EOD có gắn nguồn.

## Hiển thị nguồn giá tham chiếu trên UI — 2026-09-24

- Bổ sung nhãn `Intraday` hoặc `EOD fallback` ngay cạnh giá tham chiếu trong danh sách Đề xuất.
- Kiểm tra asset preview xác nhận nhãn đã được biên dịch và nạp; frontend 14/14 tests đạt.

## Smoke test API giá tham chiếu — 2026-09-24

- Gọi trực tiếp `POST /api/recommendations/personalized` với limit 2 trả HTTP 200.
- Cả hai kết quả đều có `price_source: intraday`, giá tham chiếu lần lượt 30.450 và 33.500, cùng timestamp phiên 24-09.
- Controller không làm mất metadata nguồn/ thời điểm do engine tạo ra.

## Làm tròn lịch sử đề xuất và loading page Đề xuất — 2026-09-24

- Cột “Sinh lời TB các mã” trong Lịch sử các đợt đề xuất chung dùng `toFixed(2)`, ví dụ `1.1741%` hiển thị `1.17%`.
- Loading overlay dùng chung được kích hoạt thêm cho page Đề xuất khi resource đề xuất/lịch sử đang tải; không hiển thị trạng thái hoàn tất EOD trong lúc request intraday liên quan còn pending.
- Preview asset xác nhận logic làm tròn và overlay; frontend 14/14 tests đạt.

## Kiểm tra UI live — 2026-09-24

- Smoke script đã được chạy nhưng môi trường hiện không có preview server 4173; khởi động Vite preview bị Windows `spawn EPERM` khi Vite bundling config.
- Preview 4180 vẫn trả asset HTTP 200 và marker loading/rounding đúng; kiểm thử tự động frontend 14/14 đạt.
- Cần chạy lại smoke screenshot khi môi trường cho phép khởi động Chrome/Vite preview 4173.

## Loading overlay cho toàn bộ page — 2026-09-24

- Chuẩn hóa điều kiện loading cho Tổng quan, Đề xuất, Danh mục cá nhân và Chi tiết mã.
- Danh mục chờ quote vị thế; Chi tiết chờ resource mã; Đề xuất chờ snapshot/lịch sử; Tổng quan chờ quote intraday đầu tiên.
- Source App và preview bundle đã build lại; frontend 14/14 tests và encoding check đạt.

## Khôi phục bundle đầy đủ và sửa overlay an toàn — 2026-09-24

- Không chạy lại Vite build từ source rút gọn vì sẽ ghi đè bundle đầy đủ và làm mất page Đề xuất.
- Giữ nguyên bundle đầy đủ đang phục vụ, bổ sung thời gian hiển thị tối thiểu 350ms cho request quote intraday của Tổng quan; các route Danh mục, Chi tiết mã và Đề xuất vẫn giữ nguyên.
- Bundle đã được parse bằng esbuild và kiểm tra asset live tại `http://127.0.0.1:4180/`: có token recommendation và logic 350ms.
- Rủi ro còn lại: source và bundle đầy đủ chưa đồng bộ hoàn toàn; mọi thay đổi tiếp theo phải kiểm tra route Đề xuất trước khi build phát hành.

## Kiểm tra toàn vẹn bundle trước phát hành — 2026-09-24

- Thêm `frontend/scripts/check-bundle-integrity.mjs` và lệnh `npm run check:bundle`.
- Kiểm tra tự động asset được `dist/index.html` tham chiếu phải còn page Đề xuất, loading overlay và thời gian hiển thị tối thiểu 350ms.
- Kiểm tra đã đạt trên asset `index-DO9E2zle.js`; frontend encoding check và 14/14 test cũng đạt.

## Safe build có rollback — 2026-09-24

- Đổi `npm run build` sang wrapper `scripts/safe-build.mjs`; Vite được chạy qua `build:raw`, sau đó kiểm tra toàn vẹn bundle.
- Nếu build hoặc kiểm tra thất bại, bản `dist` trước đó được tự động khôi phục. Lần chạy thử đã bị từ chối và khôi phục thành công; asset live vẫn đạt `npm run check:bundle`.
- Frontend test và encoding check tiếp tục đạt 14/14.

## Rà soát đồng bộ source và bundle — 2026-09-24

- Rà soát `frontend/src`: các component Đề xuất vẫn tồn tại nhưng `App.jsx` hiện là bản rút gọn và chưa lắp đầy đủ workbench/tracking vào luồng điều hướng.
- Không tìm thấy bản source đầy đủ thứ hai trong workspace để khôi phục an toàn; không tự động thay thế `App.jsx` bằng mã suy đoán.
- Giữ bundle đầy đủ đang chạy làm artifact ổn định, đồng thời safe build bảo vệ khỏi việc phát hành bản source rút gọn.

## Lệnh xác minh phát hành thống nhất — 2026-09-24

- Thêm `npm run verify:release`, kết hợp encoding check, 14 test frontend và kiểm tra toàn vẹn bundle.
- Chạy thành công ngoài sandbox; asset `index-DO9E2zle.js` vẫn giữ page Đề xuất và loading overlay.

## Sửa điều kiện render loading overlay — 2026-09-24

- Phát hiện biểu thức JSX thiếu ngoặc: các nhánh Tổng quan, Danh mục và Chi tiết chỉ trả về boolean, còn component overlay chỉ được nối với nhánh Đề xuất do thứ tự ưu tiên của `||` và `&&`.
- Đã nhóm toàn bộ điều kiện trước `&&`, nên overlay được render đúng cho Tổng quan, Danh mục cá nhân, Chi tiết mã và Đề xuất.
- Bundle đã parse bằng esbuild; asset live và `npm run check:bundle` đạt.

## Giới hạn danh sách Tổng quan theo kiểu dashboard — 2026-09-24

- Dashboard Tổng quan khởi tạo với 40 mã thay vì tải 200 mã cùng lúc.
- Khi người dùng nhập từ khóa, request tìm kiếm mở rộng lên tối đa 200 kết quả; quote intraday được lấy theo tập kết quả đang hiển thị.
- Không thay đổi dữ liệu backend, trang Chi tiết, Danh mục cá nhân hoặc Đề xuất; kiểm tra bundle vẫn đạt.

## Ưu tiên mã phổ biến theo thanh khoản — 2026-09-24

- 40 mã ban đầu trên Tổng quan được sắp xếp theo khối lượng giao dịch giảm dần, giúp danh sách gần với nhóm mã phổ biến thay vì thứ tự alphabet.
- Khi tìm kiếm, kết quả vẫn mở rộng tối đa 200 mã và giữ sắp xếp theo thanh khoản để người dùng tìm nhanh mã đang được giao dịch nhiều.
- Bundle đã parse và asset live kiểm tra đạt; không thay đổi dữ liệu gốc hoặc các page khác.

## Tối ưu sort/filter và Chi tiết mã — 2026-09-24

- Loading overlay Tổng quan chỉ còn bật cho lần tải tập mặc định 40 mã; thao tác sort/filter không còn kích hoạt overlay intraday.
- Chi tiết mã dùng `selectedId` trực tiếp khi mã không nằm trong tập 40 mã, tránh rơi về mã đầu tiên hoặc thiếu dữ liệu.
- Bundle đã parse thành công và `npm run check:bundle` đạt.

## Quote intraday theo tập mã đang hiển thị — 2026-09-24

- Batch quote Tổng quan giờ lấy trực tiếp từ danh sách sau ghim, lọc và tìm kiếm (`ii`), thay vì tập phụ 40 mã sắp theo code.
- Mọi mã ghim đang hiển thị đều được đưa vào request intraday; khi tìm kiếm, mã trong kết quả cũng được cập nhật cùng cách.
- Bundle đã parse và asset live kiểm tra đạt.

## Đề xuất không phụ thuộc giới hạn 40 mã và Chi tiết chờ intraday — 2026-09-24

- Xác nhận giới hạn 40 mã chỉ áp dụng request danh sách/quote của Tổng quan; API Đề xuất vẫn chạy theo universe backend và không dùng `ii` của dashboard.
- Overlay Chi tiết mã giờ chờ cả resource chi tiết EOD (`Ue`) và quote intraday (`Ne`); chỉ bỏ qua quote khi API quote trả lỗi có thông báo (`Fd`).
- Bổ sung marker kiểm tra cho điều kiện này; bundle parse và `npm run check:bundle` đạt.

## Phân tách phạm vi UI và universe phân tích — 2026-09-24

- Xác nhận dashboard 40 mã là tối ưu hiển thị/quote theo tập đang xem; không dùng làm giới hạn cho universe của Đề xuất.
- Quote frontend tiếp tục dùng batch bounded và merge partial-success; mở rộng 300/500 mã ở backend vẫn là luồng riêng.
- Khi tiếp tục mở rộng coverage backend, không tăng page size Tổng quan theo coverage để tránh làm tăng thời gian phản hồi và hiển thị loading khi người dùng chỉ cần nhóm mã phổ biến.

## RAG cho chênh lệch tài sản trong donut — 2026-09-24

- Màu phần “So với hôm qua” trong nhân donut giờ được tính theo chênh lệch tài sản (`current - previous`), không lấy nhầm dấu của tổng tài sản.
- Tăng dùng màu xanh, giảm dùng màu đỏ, không có dữ liệu hoặc bằng 0 dùng màu trung tính; thêm class riêng `allocation-day-change` để kiểm soát bố cục mà không ảnh hưởng màu từng mã.
- Bundle đã parse và asset live kiểm tra đạt.

## Cải thiện bố cục nhân donut — 2026-09-24

- Tách nhãn “Tổng giá trị”, giá trị tài sản và dòng chênh lệch thành các class riêng để kiểm soát typography/khoảng cách.
- Dòng chênh lệch dùng bố cục nhỏ, căn giữa, hỗ trợ màu RAG và trạng thái trung tính khi thiếu dữ liệu.
- Cập nhật cả bundle preview và stylesheet nguồn; kiểm tra bundle đạt.

## RAG đồng nhất cho giá trị tài sản — 2026-09-24

- Giá trị tổng tài sản trong nhân donut giờ dùng cùng trạng thái RAG với dòng “So với hôm qua”.
- Chênh lệch dương áp dụng màu xanh, âm màu đỏ, bằng 0 hoặc thiếu giá tham chiếu dùng trung tính; không còn trường hợp giá trị tổng luôn mang màu mặc định.
- Bundle parse và asset live kiểm tra đạt.

## Sửa CSS ghi đè màu RAG trong donut — 2026-09-24

- Rule `.allocation-donut small/strong` có độ ưu tiên cao hơn `.negative/.positive`, khiến giá trị âm hiển thị trắng.
- Thêm selector cụ thể cho `allocation-day-change` và `allocation-total-value`; giá trị âm `-1.650.000 ₫ · -0.20%` giờ luôn dùng màu đỏ, giá trị dương dùng màu xanh.
- Asset CSS live đã xác nhận chứa cả hai rule màu RAG.

## Chỉ tô màu phần giá trị chênh lệch — 2026-09-24

- Tách số tiền và phần trăm thành `span` riêng trong dòng “So với hôm qua”.
- Nhãn “So với hôm qua:” giữ màu trắng; chỉ phần giá trị âm/dương nhận màu đỏ/xanh theo RAG.
- Bundle parse và CSS live đã cập nhật.

## Giữ tổng giá trị màu trắng — 2026-09-24

- Theo yêu cầu UI, số tổng tài sản trong nhân donut luôn giữ màu trắng.
- RAG chỉ áp dụng cho span giá trị chênh lệch tiền và phần trăm trong dòng “So với hôm qua”.
- Bundle đã parse và asset live kiểm tra đạt.

## Chi tiết mã: phân tích chuyên sâu và thêm danh mục — 2026-09-24

- Giữ phần phiên/biểu đồ tải theo luồng hiện có; thêm nút `Phân tích chuyên sâu` để người dùng chủ động gọi lại analysis endpoint và xem insight, chỉ báo, chất lượng, yếu tố bên ngoài và kịch bản rủi ro.
- Thêm nút `Thêm vào danh mục` trên hero Chi tiết mã; nút điền mã và giá intraday hiện tại vào form ghi nhận giao dịch, fallback về EOD khi quote không khả dụng.
- Kiểm tra bundle bắt buộc hai control này và overlay Chi tiết chờ quote intraday; `npm run check:bundle` đạt.

## Làm rõ hành động trong Chi tiết mã — 2026-09-24

- Đưa hai nút vào khu vực hành động ngay dưới giá mã: `Phân tích chuyên sâu` gọi lại analysis endpoint; `Thêm vào danh mục` mở form với mã và giá hiện tại.
- Đổi tiêu đề kết quả thành `Phân tích chuyên sâu` để người dùng nhận biết phần nội dung do nút kích hoạt.
- Thêm bố cục responsive cho nhóm nút; bundle parse và kiểm tra toàn vẹn đạt.

## Phân tích đa tiêu chí và lời khuyên theo kỳ hạn — 2026-09-24

- API `/api/stocks/:id/analysis` bổ sung `evaluation_factors` cho kỳ vọng thị trường, báo cáo tài chính và tin họp cổ đông; yếu tố thiếu nguồn giữ trạng thái chưa xác minh.
- Bổ sung `horizon_advice` cho ngắn hạn, trung hạn và dài hạn; lời khuyên nêu rõ điều kiện dữ liệu và giới hạn tham khảo.
- Chi tiết mã hiển thị các tiêu chí và lời khuyên trong khối AI phân tích cùng Kịch bản tham khảo.
- Backend test kỹ thuật 5/5 đạt; bundle parse, kiểm tra frontend và asset live đạt.

## Smoke test phân tích mã — 2026-09-24

- Khởi động backend tạm trên port 5001 để kiểm tra API mới độc lập với process preview hiện tại.
- FPT trả HTTP 200, có đủ 3 tiêu chí đánh giá và 3 nhóm lời khuyên ngắn/trung/dài hạn; hai tiêu chí chưa có nguồn giữ trạng thái `not_available` thay vì suy diễn.
- Process kiểm tra đã dừng sau khi hoàn tất.

## Backend regression sau mở rộng phân tích — 2026-09-24

- Toàn bộ backend đạt 23 test suites và 88 tests.
- Controller phân tích, risk plan, external factors và các luồng recommendation không phát sinh hồi quy.

## Khóa schema phân tích ở frontend — 2026-09-24

- `stockAnalysis` giờ yêu cầu `evaluation_factors` và `horizon_advice` cùng các trường kỹ thuật/risk hiện có.
- Cập nhật test parser với schema mới; frontend encoding check và 14/14 test đạt.

## Phản hồi trực quan khi nhấn Phân tích chuyên sâu — 2026-09-24

- Thêm trạng thái `Đang phân tích`, `Đã phân tích` và thời điểm cập nhật vào khối AI phân tích.
- Người dùng có thể xác nhận lần nhấn đã gọi lại endpoint qua trạng thái và timestamp, kể cả khi kết quả mới giống lần trước.
- Bundle live kiểm tra đạt với marker `analysis-status-row`.

## Sửa mã hóa chuỗi trạng thái phân tích — 2026-09-24

- Các chuỗi mới như trạng thái phân tích và thời điểm cập nhật được chuyển sang Unicode escape trong bundle để không xuất hiện dạng `Cập nhật phân tích` hoặc `Ä...`.
- Bundle đã parse lại thành công và asset live đã cập nhật.

## Nhận định chuyên gia minh bạch và Ichimoku — 2026-09-24

- Phân tích mã bổ sung chỉ báo Ichimoku với Tenkan 9, Kijun 26 và Senkou B 52; UI hiển thị trạng thái giá so với mây cùng các giá trị Tenkan/Kijun.
- API trả thêm `expert_guidance` theo mô hình rule-based: lập trường hiện tại, điều kiện xác nhận, danh sách cần theo dõi, điều nên tránh, nhận định ngắn/trung/dài hạn và ghi chú rủi ro.
- Lời khuyên kết hợp SMA20/SMA50, EMA12/EMA26, RSI14, Ichimoku, thanh khoản, báo cáo tài chính và tin họp cổ đông. Dữ liệu tin tức/tài chính thiếu nguồn vẫn được ghi rõ, không suy diễn.
- Khối “Nhận định chuyên gia” được đặt trong phần AI phân tích của Chi tiết mã, cạnh các tiêu chí đánh giá, lời khuyên theo kỳ hạn và Kịch bản tham khảo.
- Kiểm chứng: backend 23 suites/89 tests đạt; frontend 14 tests và encoding check đạt; bundle integrity và esbuild parse đạt.
- Giới hạn: đây là phân tích rule-based phục vụ nghiên cứu, không phải dự báo chắc chắn hoặc khuyến nghị mua bán; các mốc giá cần được xác nhận bằng dữ liệu mới và khẩu vị rủi ro của người dùng.

## Ichimoku tham gia chấm điểm Đề xuất — 2026-09-24

- Rà soát xác nhận trước đây Ichimoku chỉ nằm trong `rationale.indicators` và phần Chi tiết mã, chưa ảnh hưởng điểm xếp hạng.
- Cập nhật `recommendationEngine`: Đề xuất ngắn hạn cộng/trừ điểm theo trạng thái giá trên/dưới mây; Đề xuất cá nhân dùng trạng thái mây để điều chỉnh điểm xu hướng (xác nhận đồng thuận SMA20 + Ichimoku được ưu tiên).
- Không mở thêm tiêu chí UI mới, giữ nguyên trọng số người dùng đang chọn; Ichimoku đóng vai trò lớp xác nhận kỹ thuật trong tiêu chí xu hướng.
- Bổ sung kiểm thử chứng minh mã trên mây được chấm cao hơn mã dưới mây; toàn bộ backend đạt 23 suites/90 tests.

## Bổ sung MACD và Bollinger vào Đề xuất — 2026-09-24

- Bổ sung MACD 12/26/9 để xác nhận động lượng và Bollinger Bands 20/2 để nhận biết vị trí giá/độ biến động.
- Hai chỉ báo được đưa vào `analysis.indicators`, khối Nhận định chuyên gia và logic xếp hạng Đề xuất; MACD suy yếu hoặc giá vượt dải trên làm giảm điểm, đồng thuận xu hướng SMA/Ichimoku/MACD được ưu tiên.
- Giữ nguyên cấu trúc tiêu chí người dùng và không để một chỉ báo đơn lẻ quyết định kết quả.
- Kiểm chứng: 23 suites, 90 tests backend đạt; bundle integrity đạt.

## Đồng bộ Chi tiết mã với Đề xuất — 2026-09-24

- Khối Phân tích chuyên sâu giờ có điểm kỹ thuật tổng hợp và bảng điểm thành phần cho SMA20, Ichimoku, MACD, RSI14 và Bollinger Bands.
- Mỗi điểm đi kèm diễn giải trạng thái, giúp người dùng kiểm tra vì sao tín hiệu tích cực/trung tính/thận trọng.
- Giữ cùng bộ chỉ báo với luồng Đề xuất; phần tiêu chí nền tảng, tin họp cổ đông, lời khuyên theo kỳ hạn và Kịch bản tham khảo vẫn hiển thị bên dưới.
- Kiểm chứng technical analysis 6/6, bundle integrity và esbuild parse đạt.

## Recommendation explainability follow-up — 2026-09-24

- Recommendation snapshots now persist `technical_score` and `technical_confirmation` for Ichimoku, MACD, and Bollinger alongside the existing indicators and user-selected score parts.
- This makes the recommendation result auditable against the same technical evidence shown in Chi tiết mã; intraday/EOD reference price metadata remains unchanged.
- Recommendation engine regression passed 7/7; continue with UI evidence display if a recommendation card does not yet surface the new confirmation fields.

## Hiển thị tín hiệu kỹ thuật ngay trên thẻ Đề xuất — 2026-09-24

- Thẻ mỗi mã trong tab Đề xuất giờ hiển thị điểm kỹ thuật tổng hợp và chip trạng thái Ichimoku, MACD, Bollinger.
- Chip dùng màu xanh/đỏ/trung tính theo trạng thái; RSI, giá tham chiếu intraday/EOD và số phiên vẫn giữ nguyên.
- Dữ liệu lấy từ `rationale.technical_score` và `rationale.technical_confirmation`, tránh tính lại khác với backend.
- Kiểm chứng: esbuild parse, bundle integrity, frontend encoding và 14/14 frontend tests đạt.

## Tương thích snapshot Đề xuất cũ — 2026-09-24

- Chip Ichimoku/MACD/Bollinger trên thẻ Đề xuất có fallback đọc từ `rationale.indicators` nếu snapshot cũ chưa có `technical_confirmation`.
- Snapshot mới vẫn ưu tiên trường xác nhận do backend tạo; dữ liệu lịch sử không bị hiển thị dấu “—” không cần thiết.
- Esbuild parse, bundle integrity, encoding check và 14/14 frontend tests đạt.

## Tinh gọn thẻ Đề xuất và giải thích chỉ báo — 2026-09-24

- Thẻ Đề xuất giữ lại điểm kỹ thuật, giá tham chiếu và các chip Ichimoku/MACD/Bollinger; phần chuỗi mô tả kỹ thuật dài và lặp lại disclaimer đã được loại khỏi dòng chính.
- Tooltip của từng chip giải thích ngắn gọn: Ichimoku dùng cho xu hướng/vị trí giá so với mây, MACD dùng cho động lượng/giao cắt, Bollinger dùng cho biến động/vùng giá quá xa trung bình.
- Các chip được tách thành một dòng phụ có đường phân cách, tự xuống dòng trên màn hình hẹp.
- Esbuild parse, bundle integrity, encoding check và 14/14 frontend tests đạt.

## Cân đối lại thẻ Đề xuất — 2026-09-24

- Sắp xếp lại vùng thông tin thành bốn ô chỉ số trên một hàng: giá tham chiếu, RSI, điểm kỹ thuật và số phiên quan sát.
- Các chip Ichimoku/MACD/Bollinger nằm thành hàng riêng phía dưới, cùng chiều rộng và căn giữa; màn hình hẹp tự chuyển sang hai cột.
- Giữ tooltip giải thích mô hình và không khôi phục chuỗi mô tả dài đã loại bỏ.
- Bundle integrity, encoding check và 14/14 frontend tests đạt.

## Việt hóa trạng thái tín hiệu trên thẻ Đề xuất — 2026-09-24

- Chip kỹ thuật hiển thị nhãn dễ đọc: `Trên mây/Dưới mây/Trong mây`, `Động lượng tăng/giảm`, `Vượt dải trên/Nửa trên dải`.
- Tooltip vẫn mô tả đầy đủ ý nghĩa Ichimoku, MACD và Bollinger; mã trạng thái nội bộ không còn lộ trong nội dung chính.
- Bundle parse, integrity, encoding check và 14/14 frontend tests đạt.

## Responsive acceptance cho thẻ Đề xuất — 2026-09-24

- Bổ sung giới hạn tràn chữ cho chip kỹ thuật và ô chỉ số; màn hình trung bình chuyển về hai cột, màn hình nhỏ giữ bố cục hai cột và hàng tín hiệu riêng.
- Kiểm tra tĩnh bằng esbuild, bundle integrity, encoding và 14/14 frontend tests đạt.
- Playwright recommendation E2E chưa chạy được trong môi trường hiện tại do Windows `spawn EPERM`; cần chạy lại khi runner cho phép tạo worker.

## Chú giải tín hiệu trên tab Đề xuất — 2026-09-24

- Thêm chú giải gọn ở đầu danh sách: xanh là tín hiệu tích cực/đồng thuận, trung tính là cần xác nhận thêm, đỏ là tín hiệu suy yếu.
- Chú giải dùng cùng màu chip trong từng thẻ, không thêm nội dung dài hoặc thay đổi điểm xếp hạng.
- Esbuild parse, bundle integrity, encoding check và 14/14 frontend tests đạt.

## Hiển thị chỉ số cụ thể trong Phân tích nâng cao — 2026-09-24

- Chi tiết mã hiển thị các giá trị SMA20/SMA50, EMA12/EMA26, RSI14, MACD line/histogram, biên Bollinger và Tenkan/Kijun Ichimoku.
- Mỗi ô có mô tả ngắn về vai trò chỉ báo; điểm tổng hợp, score breakdown, điều kiện xác nhận, yếu tố cần theo dõi và dự báo theo kỳ hạn vẫn giữ nguyên.
- Bố cục responsive: ba cột trên desktop, hai cột trên màn hình hẹp; giá trị dài được cắt gọn an toàn.
- Esbuild parse, bundle integrity, encoding check, frontend 14/14 và technical analysis 6/6 đạt.

## Đồng bộ preview Chi tiết mã — 2026-09-24

- Xác định nguyên nhân khối chỉ số không xuất hiện trên preview: backend process cũ chưa trả `expert_guidance`, nên điều kiện render của frontend không được kích hoạt.
- Khởi động lại backend port 5000 và preview port 4180; API kiểm tra mã BSR trả đủ `expert_guidance`, `technical_score`, `score_breakdown` và các chỉ báo.
- Asset live trên 4180 xác nhận có `advanced-indicator-grid` và `expert-guidance-panel`.

## Hiển thị rõ trạng thái Phân tích nâng cao — 2026-09-24

- Thêm dải trạng thái ngay dưới các nút trong hero Chi tiết mã: “Phân tích nâng cao đã sẵn sàng”, điểm kỹ thuật và lập trường hiện tại.
- Xác định backend process cũ không trả `expert_guidance`; đã khởi động lại backend và preview. API BSR kiểm tra thực tế trả đủ `expert_guidance` với technical score.
- Bundle parse, bundle integrity, frontend encoding và 14/14 tests đạt.

## Trạng thái rõ ràng khi Phân tích nâng cao chưa sẵn sàng — 2026-09-24

- Bổ sung empty/loading state trong panel Phân tích chuyên sâu: nêu rõ đang tải chỉ báo hoặc hướng dẫn nhấn nút khi chưa có kết quả.
- Tránh khoảng trống khiến người dùng tưởng tính năng không tồn tại; khi API trả kết quả, state tự được thay bằng điểm và các chỉ số cụ thể.
- Esbuild parse, bundle integrity, encoding check và 14/14 frontend tests đạt.

## Khóa hợp đồng Phân tích nâng cao — 2026-09-24

- Frontend `stockAnalysis` giờ yêu cầu `expert_guidance.score_breakdown`; API thiếu trường sẽ báo lỗi định dạng thay vì render panel trống.
- Cập nhật bundle live và test payload hợp lệ; điều này giúp phát hiện process backend cũ hoặc deployment thiếu phần phân tích ngay lập tức.
- Encoding check, 14/14 frontend tests, esbuild parse và bundle integrity đạt.

## Live release verification — 2026-09-24

- Asset preview 4180 trả HTTP 200 và chứa `advanced-indicator-grid`.
- API phân tích mã trả HTTP 200, `expert_guidance` và 5 mục `score_breakdown`.
- Backend đạt 23 suites/90 tests; frontend verify:release đạt 14 tests, encoding check và bundle integrity.

## Smoke check live Phân tích nâng cao — 2026-09-24

- Thêm `npm run verify:live-analysis` để kiểm tra preview, bundle markers, stock API và analysis API trong một lệnh.
- Smoke check xác nhận bundle có `expert-guidance-panel`, `advanced-indicator-grid`, empty state; API có Ichimoku/MACD/Bollinger và 5 score factors.
- Chạy thực tế đạt với preview 4180/backend 5000; frontend 14/14 tests và bundle integrity tiếp tục đạt.

## Lazy load Phân tích nâng cao — 2026-09-24

- Phân tích nâng cao không còn gọi tự động khi người dùng mở Chi tiết mã; chỉ gọi endpoint sau khi nhấn nút `Phân tích chuyên sâu`.
- Khi đã tải xong, kết quả và các chỉ số giữ nguyên trong mã đang xem; đổi mã sẽ xóa kết quả để tránh hiển thị nhầm dữ liệu.
- Empty/loading state vẫn hướng dẫn rõ hành động; không thay đổi luồng giá intraday, lịch sử hoặc biểu đồ.
- Bundle parse, live analysis smoke check, bundle integrity, encoding và 14/14 frontend tests đạt.

## Trạng thái nút Phân tích chuyên sâu — 2026-09-24

- Nút phản hồi theo lazy-load: `Phân tích chuyên sâu` trước khi chạy, `Đang phân tích...` trong lúc gọi API, `Cập nhật phân tích` khi đã có kết quả.
- Smoke check live bổ sung marker lazy-load để bảo đảm endpoint không bị gọi khi chỉ mở Chi tiết mã.
- Verify release, esbuild parse và live analysis verification đạt.

## UI Phân tích nâng cao — 2026-09-24

- Thiết kế lại khối phân tích theo dạng dashboard: dải màu nhận diện, tiêu đề và điểm tổng hợp rõ, thẻ chỉ số đồng nhất, nhóm Cần theo dõi/Nên tránh tách nền, nhóm dự báo theo kỳ hạn và disclaimer nhẹ hơn.
- Thêm hover nhẹ cho thẻ chỉ số, màu sắc giữ ngữ nghĩa xanh/trung tính/đỏ; responsive chuyển về hai cột dưới 900px.
- Verify release và live analysis smoke check đạt.

## Thước đo điểm kỹ thuật — 2026-09-24

- Thêm thanh đo trực quan cạnh điểm tổng hợp trong tiêu đề Phân tích nâng cao, dùng dải đỏ/vàng/xanh để định vị vùng điểm thấp/trung bình/cao.
- Giá trị số `/100` vẫn là nguồn chính; thanh chỉ hỗ trợ quét nhanh, không thay đổi điểm hoặc logic đề xuất.
- Verify release và live analysis smoke check đạt.

## Việt hóa kỳ hạn dự báo — 2026-09-24

- Thay khóa nội bộ `short_term`, `medium_term`, `long_term` bằng nhãn hiển thị `Ngắn hạn`, `Trung hạn`, `Dài hạn`.
- Bổ sung thời gian: `1–20 phiên (~1 tháng)`, `1–6 tháng`, `Trên 6 tháng`.
- API `horizon_advice` cũng trả trường `window`; khóa nội bộ vẫn giữ để tương thích dữ liệu và frontend.
- Verify release và technical analysis 6/6 đạt.

## Ngữ cảnh dữ liệu trong Phân tích nâng cao — 2026-09-24

- Thêm dải ngữ cảnh hiển thị số phiên dùng để phân tích, thời điểm dữ liệu cuối và điểm chất lượng `/100`.
- Người dùng có thể phân biệt nhận định dựa trên dữ liệu đủ/thiếu và thời điểm cập nhật trước khi xem dự báo theo kỳ hạn.
- Verify release, live analysis smoke check và bundle parse đạt.

## Việt hóa tóm tắt tín hiệu Chi tiết mã — 2026-09-24

- Dòng tóm tắt trong Phân tích nâng cao giờ hiển thị `Trên mây/Dưới mây/Trong mây`, `Tăng/Giảm/Trung tính` và các vùng Bollinger bằng tiếng Việt.
- Mã trạng thái nội bộ chỉ còn dùng cho logic màu/điểm; các giá trị chi tiết vẫn nằm trong thẻ chỉ số.
- Verify release và live analysis smoke check đạt.

## Sắp xếp Kịch bản và khôi phục phân tích sau F5 — 2026-09-24

- Đưa `Kịch bản tham khảo` lên trước `Yếu tố bên ngoài` trong phần Phân tích nâng cao để người dùng thấy hành động/kỳ hạn trước, sau đó mới xem bằng chứng tin tức.
- Lưu cờ đã yêu cầu phân tích theo mã trong `sessionStorage`; F5 cùng mã sẽ tự tải lại phân tích, còn đổi mã không dùng nhầm kết quả cũ.
- Phân tích vẫn lazy-load và chỉ gọi endpoint khi người dùng đã từng nhấn nút cho mã đó.
- Verify release, live analysis smoke check và bundle parse đạt.

## Smoke check thứ tự và khôi phục Phân tích — 2026-09-24

- `verify:live-analysis` giờ xác nhận cả marker `analysis-requested:` để bảo đảm F5 khôi phục đúng mã đã phân tích.
- Smoke check xác nhận thứ tự `Kịch bản tham khảo` đứng trước `Yếu tố bên ngoài` trong bundle live.
- Live smoke check và verify release đạt.

## Cache Phân tích nâng cao — 2026-09-24

- Endpoint `/api/stocks/:id/analysis` giờ lưu kết quả vào `system_cache` trong 5 phút, khóa theo mã, phiên EOD cuối và số lượng phiên.
- F5 sau khi người dùng đã yêu cầu phân tích có thể dùng kết quả cache nhanh hơn; khi có phiên giá mới, khóa cache thay đổi và hệ thống tính lại.
- Backend đã khởi động lại để áp dụng thay đổi; API live trả đủ 5 score factors.
- Backend regression 23 suites/90 tests đạt.

## Xác nhận cache live Phân tích — 2026-09-24

- Smoke check gọi API phân tích hai lần; lần thứ hai trả `source: cache` và vẫn có `expert_guidance`.
- Controller/cache service tests đạt 18/18; live analysis verification đạt với 5 score factors.

## Hồi quy sau cache Phân tích — 2026-09-24

- Backend full regression: 23 suites/90 tests đạt.
- Frontend verify release: 14 tests, encoding và bundle integrity đạt.
- Live analysis smoke check xác nhận asset, API và cache response.
- Không phát hiện hồi quy ở recommendation, quote, portfolio hoặc technical analysis.

## Cập nhật phân tích bỏ qua cache — 2026-09-24

- Nút `Cập nhật phân tích` gửi `?refresh=1`; backend bỏ qua cache một lần, tính lại dữ liệu và ghi cache mới.
- F5 vẫn dùng cache theo phiên EOD để tải nhanh; cập nhật chủ động luôn lấy dữ liệu mới.
- Live smoke check xác nhận lần thường trả `cache`, lần refresh trả `database`; controller 8/8 và verify release đạt.

## Post-rollback verification — 2026-09-24

- Confirmed the live bundle no longer includes the source badge from the reverted session.
- Refreshed analysis output no longer includes the temporary analysis_source field.
- Frontend release verification passed: encoding, 14 service tests, and bundle integrity.
- Backend regression passed: 23 test suites and 90 tests.
- Next step: continue the EOD coverage backlog in bounded symbol batches and classify provider gaps before widening scope.

## Hover cho nút Đề xuất — 2026-09-24

- Thêm hiệu ứng nâng nhẹ, shadow, đổi nền và viền cho `Khôi phục mặc định` và `Tạo đề xuất cá nhân`.
- Bổ sung focus-visible, trạng thái disabled và transition dùng chung để hỗ trợ bàn phím và tránh cảm giác giật.
- Safe build giữ nguyên dist hiện tại; CSS live đã được cập nhật và kiểm tra encoding, bundle integrity, live analysis.

## Kiểm tra UX nút Đề xuất — 2026-09-24

- E2E recommendation criteria đạt; luồng tạo đề xuất và hiển thị kết quả không bị ảnh hưởng.
- Bổ sung `prefers-reduced-motion` để người dùng hạn chế chuyển động không bị hiệu ứng nâng/shadow gây khó chịu.
- Encoding và bundle integrity đạt.

## Kiểm tra độ tươi quote và backlog EOD — 2026-09-24

- `verify:quote-freshness` đạt với 5 mã kiểm soát FPT, SSI, VCB, HPG và BSR; HTTP 200, không thiếu mã.
- Phiên 2026-09-24 đã được xác nhận; thời điểm kiểm tra ngoài giờ giao dịch nên hệ thống chỉ ghi nhận tuổi dữ liệu, không kết luận stale.
- Quote hiện lấy từ VCI và có `observed_at`/`fetched_at`; tiếp tục giữ nguyên logic phân biệt ngoài giờ và trong giờ.
- Bằng chứng được lưu trong `backend/evidence/quote-freshness-2026-09-24T16-24-03-035Z.json`.

## Retry backlog EOD — 2026-09-24

- Phân loại gap trước retry ghi nhận 400 mã ở trạng thái `transient`; chưa có mã bị phân loại `no_data`.
- Retry đã chạy theo manifest nhóm 25 mã còn lỗi. Provider VCI trả 60 bản ghi và cập nhật 60 bản ghi trong nhóm này.
- Hai mã vẫn lỗi kết nối trong lần retry: `VLA`, `VKP`. Các mã còn lại trong nhóm cần tiếp tục đối chiếu vì có thể trả rỗng hoặc đã có dữ liệu cũ.
- Manifest retry lưu tại `backend/evidence/vnstock-universe-ingest.json`; chưa đánh dấu hoàn tất độ phủ 500 mã.

## Controlled EOD retry attempt — 2026-09-24

- Tạo manifest riêng cho nhóm 25 mã đầu tiên trong audit gap và khởi chạy retry qua VCI.
- Không ghi nhận thêm coverage mới từ artifact chuẩn vì job dùng chung file `vnstock-universe-ingest.json` và kết quả hiện tại vẫn thuộc nhóm retry trước (`VMG`–`VIG`). Không suy diễn nhóm mới đã thành công.
- Giữ nguyên backlog 400 mã transient; cần tách output theo run/batch trước khi tiếp tục retry để tránh ghi đè bằng chứng.

## Tách bằng chứng retry EOD — 2026-09-24

- Sửa `ingest-vnstock-universe.cjs`: khi chạy với `VNSTOCK_RETRY_MANIFEST`, output mặc định được tạo riêng theo timestamp; vẫn cho phép chỉ định `VNSTOCK_UNIVERSE_OUTPUT`.
- Retry không còn ghi đè `vnstock-universe-ingest.json` của lần chạy trước.
- Kiểm tra cú pháp script đạt. Batch thử nghiệm bị dừng do upstream không phản hồi ổn định và không tạo artifact mới; không tính thêm coverage.

## Sửa mã hóa tài liệu và tối ưu tải Tổng quan — 2026-09-24

- Đã phục hồi mã hóa UTF-8 cho `docs/PROJECT_STATUS.md`; các tiêu đề và nội dung tiếng Việt chính đã hiển thị đúng Unicode.
- Phạm vi quote intraday trên Tổng quan được giới hạn theo 40 mã đầu tiên đã sắp xếp (bao gồm mã ghim), thay vì gửi đồng thời toàn bộ danh sách.
- Cách này giảm số batch quote ban đầu và giữ các mã quan trọng ở trạng thái ưu tiên; danh sách cổ phiếu vẫn giữ nguyên.
- Kiểm tra encoding, bundle integrity và live analysis đạt.

## Xác minh tối ưu tải Tổng quan — 2026-09-25

- Bundle live xác nhận Tổng quan chỉ tạo quote intraday cho 40 mã đầu tiên sau khi ghim/sắp xếp; giảm số batch request ban đầu.
- Frontend verify release đạt: encoding, 14 bài kiểm thử dịch vụ và bundle integrity.
- Live quote probe với preview `4180` trả HTTP thành công trong khoảng 8,8 giây; 123/200 mã có quote từ dữ liệu hiện có, ngoài giờ giao dịch nên không đánh dấu stale.
- Provider probe VCI phản hồi nhưng chỉ trả 1 bản ghi cho nhóm mã thiếu; các mã thiếu vẫn cần xử lý trong backlog EOD/provider, không phải lỗi UI.
- Bằng chứng: `backend/evidence/live-quotes-2026-09-24T17-02-02-902Z.json`.

## Chặn tương tác khi loading — 2026-09-25

- Loading overlay trên Tổng quan, Danh mục và các trạng thái chờ dữ liệu giờ nhận tương tác chuột, chặn thao tác với nội dung phía sau và hiển thị con trỏ chờ.
- Rút gọn thông báo thành `Đang cập nhật Intraday...`.
- Encoding, bundle integrity và live analysis verification đạt.

## Khóa cuộn khi loading overlay — 2026-09-25

- Bổ sung `body:has(.loading-overlay) { overflow: hidden; overscroll-behavior: none; }` để không thể cuộn trang khi đang chờ dữ liệu.
- Overlay cũng có `overscroll-behavior: none`, `pointer-events: auto` và con trỏ chờ.
- Encoding, bundle integrity và live analysis verification đạt.

## Sửa gốc lỗi mất phiên liền kề trên Chi tiết mã — 2026-09-25

- Nguyên nhân: endpoint chi tiết lấy chung các bản ghi EOD và intraday trong cùng `limit 40`; các bản ghi intraday mới chiếm quota khiến phiên EOD liền kề bị loại. Payload cũng không truyền `interval`, nên chart không thể phân biệt chắc chắn.
- Khắc phục: endpoint `/api/stocks/:id` chỉ lấy tối đa 60 bản ghi `interval = '1d'`, lọc EOD lần nữa trước khi tạo `price_history`, truyền rõ `interval`, và đổi cache key từ `v6` sang `v7` để loại cache lịch sử cũ.
- Kiểm chứng live FPT: 60/60 bản ghi là EOD; phiên gần nhất 23-09 và phiên liền kề 22-09 đều có mặt. Intraday hiện tại vẫn được chart ghép riêng.
- Controller tests đạt 8/8.

## Khắc phục thiếu phiên liền kề 24-09-2026 — 2026-09-25

- Audit trước khi sửa xác nhận dữ liệu EOD ngày 24-09 chỉ có `0/624` mã; vì vậy lỗi không chỉ nằm ở biểu đồ. Kết luận trước đó rằng phiên đã được khắc phục là chưa đúng.
- Worker VCI trả được dữ liệu 24-09 khi gọi trực tiếp. Đã nạp lại FPT và nhóm mã ưu tiên bằng retry từng mã; FPT hiện có thứ tự phiên `24-09 → 23-09 → 22-09 → 21-09` trên API chi tiết.
- Bổ sung fallback trong `vnstockEodIngestion`: nếu worker trả response từng phần, các mã vắng mặt trong batch sẽ được retry riêng và ghi nhận lỗi cụ thể; không còn coi batch thiếu mã là thành công hoàn toàn.
- Sửa invalidation cache detail để xóa các generation `v7/v6/v5/v4` sau khi upsert EOD.
- Kiểm chứng hiện tại: `105/106` mã ưu tiên có EOD 24-09; `BCG` vẫn thiếu do upstream không trả phiên (bản ghi gần nhất 08-10-2025). Audit toàn universe sau lần chạy retry đạt `60/624`, nên chưa đánh dấu toàn bộ universe đã đủ dữ liệu.
- Kiểm thử: controller và worker adapter `12/12` pass. Hạn chế còn lại là upstream giới hạn/từ chối một số mã; cần job retry theo mã cho universe đầy đủ.

Điểm tiếp tục: đưa fallback retry vào job định kỳ với backoff/rate limit và lưu báo cáo coverage theo từng phiên; chỉ hiển thị phiên khi có bản ghi EOD hợp lệ, không suy diễn từ phiên trước.

## Sửa giá hiện tại Danh mục cá nhân — 2026-09-25

- API `/api/portfolio` trước đây chỉ lấy `StockPrice` EOD để tính `market_price`, nên bảng Danh mục vẫn hiển thị giá phiên trước.
- Đã tích hợp quote VCI intraday trực tiếp vào portfolio controller; vị thế và `recommendation_entries` có `current_quote`, `price_source=intraday|eod`, và lãi/lỗ được tính lại theo giá intraday khi quote hợp lệ.
- Quote loader hỗ trợ chọn mode; Danh mục dùng mode `intraday`, tránh phụ thuộc endpoint price-board đang không ổn định.
- Kiểm thử quote loader và portfolio accounting: `9/9` pass. Nếu upstream không trả quote, hệ thống vẫn fallback EOD và đánh dấu rõ `price_source=eod`.

## Tiếp tục xử lý backlog EOD theo phiên — 2026-09-25

- Ưu tiên hiện tại là độ phủ EOD, chưa phải mở rộng UI. Số liệu cũ 60/624 hoặc 105/106 là các lần kiểm tra khác thời điểm/phạm vi, không phải hiện trạng toàn universe.
- Sửa `audit-chart-history.cjs` để chỉ tính `provider=vnstock`, `interval=1d`; intraday không còn được tính thành EOD của phiên.
- Audit database thực lúc 04:10 UTC: phiên 24-09 đạt **327/624**, thiếu 297 mã. Evidence: `backend/evidence/chart-history-audit-2026-09-24-2026-09-25T04-10-32-374Z.json`. Lần đọc kế tiếp bằng helper coverage đạt **329/624**, thiếu 295 mã; database tiếp tục thay đổi trong lúc backend hiện hữu chạy. Phiên này không chạy backfill nên không quy số tăng này cho bản sửa.
- Job định kỳ đã bổ sung kiểm tra coverage lưu trong database, retry một lượt các mã thiếu đúng phiên, lưu evidence theo timestamp và chặn chạy chồng trong cùng process. Thứ Hai nhắm phiên thứ Sáu; ngày nghỉ lễ chưa có calendar nên giữ gap chưa xác minh.
- Ingestion thêm khoảng nghỉ giữa batch (mặc định 1 giây), exponential backoff cho lỗi request (tối đa 30 giây) và khoảng nghỉ trước fallback từng mã.
- Kiểm chứng: backend **23 suites / 92 tests đạt**, gồm retry đúng phiên, evidence khi lỗi và chặn overlap. Helper coverage chạy thành công với PostgreSQL thật; kiểm thử scheduler dùng mock, chưa chứng minh scheduler mới chạy đủ universe.
- Chưa restart backend PID 22488 để tránh ngắt ingestion hiện hữu; mã scheduler mới sẽ áp dụng khi backend khởi động lại. Không thay frontend, không migration, không xóa dữ liệu.
- Điểm tiếp tục: sau khi ingestion hiện tại kết thúc, khởi động lại backend và kiểm tra artifact `eod-scheduled-*` ở lượt cron kế tiếp; audit cùng phiên và phân loại các mã thiếu bằng bằng chứng provider. Mốc 500 mã vẫn mở. Không tăng concurrency trước khi provider ổn định.

## Kiểm chứng build UI và scheduler thực tế — 2026-09-25

- Phát hiện blocker tái tạo UI: `frontend/src/App.jsx` hiện là bản thiếu nhiều chức năng so với `dist/assets/index-DO9E2zle.js` đang phục vụ. Workspace không có Git/bản source đầy đủ tìm thấy; `tmp-app-recovery.txt` cũng chỉ chứa bản nguồn rút gọn. Cần khôi phục nguồn tương ứng trước khi build release mới.
- Sửa `safe-build.mjs` để gọi npm CLI qua Node trên Windows thay vì spawn trực tiếp npm.cmd; bổ sung log lỗi spawn. Vite biên dịch được nhưng integrity gate từ chối bundle thiếu 8 tiêu chí, rồi tự khôi phục dist cũ. **Không ghi nhận build mới thành công**. Một số tiêu chí gate còn phụ thuộc tên biến minified; cần thay bằng kiểm thử hành vi khi khôi phục nguồn, không bỏ gate để phát hành bản thiếu tính năng.
- Preview bản dist cũ chạy tại http://127.0.0.1:4180. Verify release đạt 14 tests dịch vụ, encoding, bundle integrity; live analysis đạt 5 score factors. Các kết quả này không chứng minh mã nguồn hiện tại tái tạo được UI.
- Backend đã restart để nạp scheduler mới. Thêm `task.runOnce()` và `scripts/verify-eod-scheduler.cjs` để chạy cùng callback định kỳ với phạm vi 1–10 mã; script không tạo recommendation và trả exit 1 khi coverage chưa đủ.
- Lượt callback thực với FPT/SBD/SBL/BCG: nhận 17 dòng, insert 1 dòng SBD, skip 16; coverage đúng phiên 24-09 là 2/4, BCG/SBL vẫn thiếu sau retry. Evidence: `backend/evidence/eod-scheduled-2026-09-24-2026-09-25T04-15-33-411Z.json`.
- Audit toàn database sau kiểm chứng: **341/624** mã có EOD 24-09, còn **283** mã thiếu. Evidence: `backend/evidence/chart-history-audit-2026-09-24-2026-09-25T04-16-14-952Z.json`. Không quy toàn bộ mức tăng so với 329 cho canary: lượt canary chỉ insert 1 dòng.
- Lượt kiểm chứng tiếp theo xác nhận script trả exit 1 và vẫn lưu evidence khi worker fetch failed; coverage 2/4 không bị biến thành thành công. Evidence: `backend/evidence/eod-scheduled-2026-09-24-2026-09-25T04-31-01-841Z.json`.
- Backend regression sau thay đổi: **23 suites / 92 tests đạt**. Canary xác nhận callback/ingestion/audit thật; chưa xác nhận full-universe cron mới chạy hoàn tất.
- Điểm tiếp tục ưu tiên: khôi phục nguồn UI đầy đủ và sửa loading overlay không kết thúc khi quote rỗng/lỗi (đã tái hiện trong E2E); sau đó build và kiểm thử lại. EOD tiếp tục retry nhỏ có báo cáo, giữ mốc 500 mở và không suy diễn no-row thành không giao dịch.

- Kiểm chứng CLI cuối: mã UNKNOWN bị từ chối trước ingestion; control FPT trả exit 0, 6/6 dòng idempotent skip, coverage 1/1 và evidence `backend/evidence/eod-scheduled-2026-09-24-2026-09-25T04-34-44-061Z.json`. Trường hợp thiếu coverage đã trả exit 1 ở lượt 4 mã. Backend PID 21288 và preview đều trả HTTP 200 sau khi nạp bản cuối.
- Kết quả E2E chọn lọc trên dist cũ: **1/9 đạt, 8/9 lỗi**. Bảy kịch bản bị loading overlay chặn click khi quote rỗng/không hợp lệ; một kịch bản ghim/sắp xếp kỳ vọng FPT nhưng nhận ZZZ. Test định giá lại danh mục bằng quote intraday đạt. API trong E2E là fixture, không phải xác nhận lỗi provider thật. Báo cáo: `frontend/playwright-report/index.html`; lỗi này chặn nghiệm thu UI dù smoke test và marker gate đạt.

## Hoàn tất sửa intraday ba trang và khôi phục build — 2026-09-25

- Yêu cầu: Tổng quan loading liên tục, Danh mục thường rỗng và Chi tiết thường fallback EOD đến khi reload nhiều lần.
- Nguyên nhân đã xác minh: overlay cũ chỉ tắt khi nhận quote không rỗng; request không có deadline; frontend xóa quote sau lỗi; Promise.all ghép Watchlist/Danh mục làm mất kết quả thành công khi tài nguyên kia lỗi. Backend dùng price-board cho Tổng quan/Chi tiết nhưng intraday riêng cho Danh mục, cache theo nhóm request nên không chia sẻ được quote giữa trang. Khôi phục selectedId còn ép UUID thành Number.
- Đã khôi phục phần ứng dụng/CSS từ asset đang phục vụ về source, loại React/vendor khỏi phần khôi phục và dùng package imports chuẩn. Source cũ được giữ trong `frontend/recovery/`; nguồn gốc/hash ở `frontend/recovery/README.md`. Đây là mã ứng dụng đã định dạng từ bản biên dịch, không phải JSX gốc; tên biến cũ còn tồn tại. Blocker không thể build UI ở mục trước đã được xử lý. Không cần chờ người dùng cung cấp backup để tiếp tục tác vụ này.
- `useLiveQuotes` dùng chung cho ba trang: chỉ polling trang mở, không chồng request, chu kỳ 30 giây sau khi kết thúc, deadline 12 giây, hủy khi chuyển mã/trang. Overlay chỉ chờ request đầu, luôn kết thúc cả khi quote rỗng/lỗi/timeout. Giữ quote từng mã tối đa 90 giây qua lỗi/response một phần, không gia hạn khi timestamp fetch không đổi; hết hạn dùng EOD. Thông báo phân biệt quote cũ và fallback.
- Danh mục/Watchlist tải độc lập; lỗi tải vị thế có thông báo/nút thử lại, không giả thành danh mục rỗng. UUID Chi tiết giữ nguyên khi reload. Đã loại request danh sách 40 mã thừa không dùng trong render.
- Backend `liveQuoteService` chia sẻ cache/pending theo mã cho hai quote endpoints và portfolio; tối đa 3 request worker đồng thời, timeout worker 6 giây, cooldown lỗi 5 giây, TTL 10 giây, giữ cache lỗi tạm tối đa 90 giây trong cùng phiên Việt Nam. Endpoint quote chờ tối đa 8 giây, portfolio chờ quote tối đa 1,5 giây để trả vị thế đã lưu. Dữ liệu thiếu vẫn rõ ràng; EOD không bị thay thế trong database.
- Backend đã restart PID 28440; UI build mới `index-CDOEjAof.js` phục vụ tại http://127.0.0.1:4180. Build, encoding, bundle integrity và live analysis 5 score factors đạt. Gate bundle bỏ tên biến minified giả, dùng marker chức năng và E2E cho hành vi.
- Kiểm chứng cuối: backend **25 suites / 98 tests**, frontend service **14/14**, Playwright Chrome **36/36** đạt. E2E dùng fixture, bao gồm empty/timeout/partial intraday, giữ rồi hết hạn quote, retry Chi tiết không reload, UUID, Watchlist lỗi không mất danh mục, portfolio lỗi có retry; các luồng charts/recommendation/transactions/pinning cũng đạt. Fixture cũ được cập nhật cho sort volume mặc định, 40 mã ban đầu và phân tích theo yêu cầu; khôi phục hiển thị cảnh báo concentration có sẵn trong snapshot.
- Live API: FPT/SSI/VCB trả đủ 3 quote; `/api/stocks/...FPT.../quote` HTTP 200 khoảng 4 ms nhờ cache chung, request nhóm lặp khoảng 2 ms. Lượt nhóm đầu khoảng 6,05 giây và có thể dùng cache còn hạn, không phải xác nhận provider luôn đáp ứng đủ/nhanh. Evidence: `backend/evidence/intraday-pages-2026-09-25T05-16-11-197Z.json`. Không kiểm chứng tài khoản/danh mục thật của người dùng; phần đó dùng controller test và E2E fixture.
- Hạn chế: upstream vẫn có lúc timeout/no-row, UI sẽ fallback có nhãn và tự retry; không cam kết mọi mã đều có intraday. Quote cache trong process, mất khi restart. Mốc EOD 500 mã chưa đóng; số audit gần nhất vẫn 341/624 cho phiên 24-09, chưa audit lại trong phần sửa intraday.
- Điểm tiếp tục: theo dõi evidence intraday trong giờ giao dịch với universe 40 mã; nếu upstream tiếp tục thiếu, phân loại gap theo mã và thời điểm. Tiếp tục backlog EOD từ audit theo phiên, không sửa dist trực tiếp. Nợ kỹ thuật: tách/đặt lại tên rõ ràng cho App.jsx khôi phục khi có phạm vi refactor riêng.

## Khắc phục lần 2: worker reset khi request đồng thời — 2026-09-25

- Hiện tượng mới: sau khi restart, cả ba page vẫn có lúc không thấy intraday dù API HTTP 200. Điều tra cho thấy có nhiều worker Python trùng/treo trên cổng 8787; worker đơn lẻ trả FPT 100 dòng nhưng request đồng thời FPT/SSI/VCB bị reset hoặc đóng socket. VCI cũng có lỗi upstream từng mã; KBS fallback không phải lúc nào có dữ liệu.
- Đã dọn các worker trùng, khởi động một worker sạch, thêm fallback Python bridge khi worker HTTP lỗi và tuần tự hóa request worker (`concurrency: 1`). Service không còn chờ toàn bộ nhóm: trả partial quote ngay khi một mã hoàn tất, các mã còn lại tiếp tục xử lý/polling.
- Giảm timeout từng mã: worker 3,5 giây, bridge 2,5 giây; frontend retry sau 5 giây khi response partial/lỗi, đầy đủ thì 30 giây. Quote vẫn dùng cache 10 giây và giữ stale tối đa 90 giây trong phiên.
- Sửa UI: nhãn Intraday dựa trên `interval=intraday`/quote thực, không phụ thuộc `volume_type=session` (worker intraday thường trả `volume_type=trade`). Vì vậy quote intraday thật không còn bị hiển thị thành EOD.
- Kiểm chứng cuối: endpoint nhóm trả partial 1 mã trong khoảng 0,7 giây và request kế tiếp trả 3/3 từ cache trong 1 ms; endpoint Chi tiết HTTP 200. Evidence `backend/evidence/intraday-pages-2026-09-25T05-47-48-438Z.json`. Worker trực tiếp VCI FPT/SSI có lúc trả 100 dòng; provider vẫn có thể reset từng mã.
- Backend regression **25 suites / 98 tests**; E2E intraday/partial/timeout/retry **4/4**; frontend build `index-C7i3z1N2.js` và bundle gate đạt trước thay đổi timeout cuối (thay đổi cuối chỉ backend timeout). Preview đã restart tại 4180; backend PID 31692.
- Hạn chế: không thể bảo đảm mọi mã có intraday khi VCI reset/no-row; UI giữ quote theo mã và fallback rõ ràng thay vì chặn toàn trang. Không tạo giá giả và không biến EOD thành intraday.

## Circuit breaker và health probe cho provider intraday — 2026-09-25

- Bổ sung circuit breaker trong `liveQuoteService`: sau 3 lỗi liên tiếp, service tạm ngừng gọi provider trong 30 giây, tiếp tục trả cache intraday còn hạn và tự mở lại ở lượt sau. Thành công sẽ reset bộ đếm lỗi liên tiếp.
- Bổ sung `GET /api/stocks/quotes/status` để UI/monitoring đọc trạng thái `ready`, `degraded` hoặc `circuit_open`, cùng thời điểm thành công/thất bại gần nhất, lỗi gần nhất, số queue/cache/pending và thời điểm circuit tự mở lại.
- Script `backend/scripts/verify-intraday-pages.cjs` đã probe status ở đầu/cuối cùng các endpoint Tổng quan và Chi tiết, để bằng chứng phân biệt lỗi UI với provider đang suy giảm.
- Kiểm chứng: backend **25 suites / 99 tests** pass, gồm test circuit breaker; chưa chạy lại live probe sau khi restart service.
- Hạn chế: circuit và cache nằm trong process, mất khi backend restart; endpoint status phản ánh process hiện tại, không thay thế audit coverage EOD.

Điểm tiếp tục: restart backend, chạy `verify-intraday-pages.cjs`, kiểm tra status cùng partial quote trong giờ giao dịch; nếu circuit mở lặp lại, phân loại theo log worker/VCI trước khi điều chỉnh timeout hoặc concurrency.

### Kiểm chứng sau restart

- Đã restart backend và chạy probe thật lúc `2026-09-25T06:01Z`: status đầu `ready`, nhóm quote HTTP 200 trả partial `1/3` trong 5,1 giây, Chi tiết mã HTTP 200 trong 227 ms; request lặp lại vẫn HTTP 200 và trả partial `1/3`.
- Status cuối chuyển sang `circuit_open` với `last_error=fetch failed`, xác nhận circuit breaker đang ghi nhận provider lỗi thay vì để request treo vô hạn. Evidence: `backend/evidence/intraday-pages-2026-09-25T06-01-02-644Z.json`.
- Phát hiện và sửa lỗi circuit bị kéo dài bởi các job đã xếp hàng: lỗi nội bộ `intraday provider circuit open` không còn tính là lỗi provider mới và không gia hạn cooldown.

## Hiển thị trạng thái provider trên ba trang — 2026-09-25

- `useLiveQuotes` giờ lấy đồng thời quote và `/api/stocks/quotes/status`, giữ status cùng dữ liệu quote cho Overview, Portfolio và Detail.
- Overview hiển thị khi provider suy giảm hoặc circuit mở; Portfolio ghi rõ trạng thái trong footnote định giá; Detail hiển thị cảnh báo ngay cạnh quote gần nhất. Các cảnh báo không chặn thao tác và không xóa cache/EOD.
- Build frontend mới `index-CLamESDQ.js` được safe-build chấp nhận; encoding và frontend service tests **14/14** pass.
- Preview đã chạy lại tại `http://127.0.0.1:4180`; backend health vẫn được dùng làm nguồn trạng thái runtime.
- E2E chọn lọc sau khi nối health status: **4/4** pass (empty intraday, Detail retry, partial quote, Portfolio error/retry).

## Tối ưu refresh Tổng quan theo batch — 2026-09-25

- Nguyên nhân 11/40 chậm: request Tổng quan bị tách thành 40 job worker tuần tự; khi một mã timeout, các lượt refresh tiếp theo phải chờ queue cũ.
- `liveQuoteService.load` giờ dùng một request provider cho danh sách lớn hơn 5 mã, ghi ngay mọi dòng trả về vào cache và giữ partial result; Danh mục/Chi tiết vẫn dùng per-symbol queue để retry độc lập.
- Bổ sung test xác nhận universe dùng một request và giữ đủ partial rows. Backend targeted tests **13/13** pass.
- Sau restart, probe batch hiện đang gặp `fetch failed` từ worker/VCI và circuit mở đúng cách; đây là lỗi upstream runtime, không phải timeout UI. Cần chạy lại probe khi worker ổn định để đo tỷ lệ 40 mã.
- Backend regression sau thay đổi: **25 suites / 100 tests** pass.

## Khôi phục kết nối worker — 2026-09-25

- Xác định nguyên nhân `fetch failed`: môi trường đang ép `HTTP_PROXY/HTTPS_PROXY/ALL_PROXY=http://127.0.0.1:9`, proxy chết khiến VCI fail trước khi vnstock gửi request.
- `vnstock_worker.py` và `vnstock_intraday_bridge.py` giờ tự loại bỏ đúng placeholder proxy localhost:9, nhưng vẫn tôn trọng proxy hợp lệ khác.
- Khởi động lại worker sạch; health HTTP 200 và gọi trực tiếp FPT trả **100 rows**. Probe backend sau restart: nhóm FPT/SSI/VCB HTTP 200, lượt đầu trả partial `1/3` trong 637 ms, lượt lặp trả `3/3` trong 2 ms; Chi tiết HTTP 200 trong 3,4 giây. Evidence: `backend/evidence/intraday-pages-2026-09-25T06-57-54-817Z.json`.
- Probe universe 40 mã sau đó vẫn chỉ trả partial do provider xử lý từng mã chậm/reset; circuit breaker tiếp tục ghi nhận trạng thái này. Không đánh dấu 40/40 khi upstream chưa trả đủ.

## Batch price-board cho Overview — 2026-09-25

- Worker Intraday giờ dùng một lần gọi `price_board` cho request lớn hơn 5 mã; Chi tiết/Danh mục vẫn dùng `Quote.intraday` per-symbol. Cách này tránh vòng lặp 40 mã tuần tự trong worker.
- Kiểm chứng trực tiếp worker với 40 mã: **40 rows / 0 errors trong 810 ms**.
- Kiểm chứng backend sau restart: lượt đầu **10/40 trong 2,0 giây**, lượt tiếp theo **30/40 trong 781 ms**, health `ready`, `failures=0`; các lượt sau tiếp tục hợp nhất cache theo mã.
- Giá board vẫn được chuẩn hóa thành `interval=intraday`, có `reference_price` để tính biến động; không dùng để thay thế EOD chart.

## Nghiệm thu refresh Tổng quan — 2026-09-25

- Full Playwright: **36/36 pass**, gồm kịch bản giá Tổng quan đổi từ `66.300` sang `66.500` sau polling mà không reload.
- Probe live universe sau restart backend: 3 vòng HTTP 200 trong khoảng 544–677 ms, mỗi vòng hợp nhất `30` mã duy nhất từ request 40 dòng (request có mã trùng), health `ready`. Evidence: `backend/evidence/overview-refresh-2026-09-25T07-11-52-196Z.json`.
- Kết luận: pipeline UI đã có kiểm chứng cập nhật giá/biến động; các mã không có dữ liệu vẫn tiếp tục retry và giữ fallback rõ ràng.

## Cải thiện trình bày Tổng quan — 2026-09-25

- Nguồn dữ liệu được gom vào một thanh chú thích cố định phía trên bảng; cột nguồn không còn lặp chip/license/thời gian trên từng hàng. Khối lượng dùng icon `i` có tooltip giải thích Intraday/EOD.
- Cột Đánh giá bổ sung nhãn theo biến động (`Tăng tích cực`, `Đi ngang`, `Áp lực giảm`), mô tả ngắn và nút `Phân tích chuyên sâu` điều hướng sang Chi tiết mã.
- Nút thêm danh mục chuyển thành nút `+` có tooltip/aria-label, giữ nguyên thao tác click và không làm click lan lên hàng.
- Build frontend `index-C0gNH39k.js` và bundle integrity đạt; frontend service tests **14/14**, E2E nhóm Tổng quan **9/9** pass.

## Cân đối lại UI Tổng quan — 2026-09-25

- Bảng được cố định chiều rộng cột theo nội dung, căn phải giá/biến động/khối lượng, tăng khoảng thở cho cột Đánh giá và giữ cuộn ngang có chủ đích trên màn hình hẹp.
- Thanh nguồn dùng nền nhẹ, icon trợ giúp và nút giấy phép đồng nhất; badge đánh giá và nút `+` được thu gọn để hàng không bị cao/loãng.
- Build mới `index-DtxpVCVl.js` và CSS `index-RaIhxfWJ.css` được chấp nhận; E2E Tổng quan **9/9** pass.

## Tinh chỉnh nút và nội dung Đánh giá — 2026-09-25

- Nút thêm danh mục dài hơn, có icon dấu cộng trong khung chuyên dụng và nhãn `Thêm`, vẫn giữ tooltip tên đầy đủ khi hover.
- `Phân tích chuyên sâu` dùng kiểu button trực quan, không còn giống liên kết văn bản.
- Giữ các nhãn `Tăng tích cực`, `Đi ngang`, `Áp lực giảm`; thay nhận định chung bằng hướng dẫn ngắn: kiểm tra kháng cự, hỗ trợ hoặc chờ xác nhận xu hướng.
- Build mới `index-By0lcbVI.js`/`index-BCkCWUdf.css`, frontend tests **14/14**, E2E Tổng quan **9/9** pass.

## Sidebar co giãn và bảng Tổng quan compact — 2026-09-25

- Thanh điều hướng có nút thu hẹp/mở rộng, ghi nhớ lựa chọn trong session; desktop chuyển từ 260px xuống 76px, mobile giữ layout ngang đầy đủ.
- Cột `Mã` được ghim khi cuộn ngang; các cột giá, biến động và khối lượng căn phải; row giảm padding/line-height để hiển thị nhiều mã hơn.
- Build mới `index-CFYHoGEv.js`/`index-CFlIddZS.css`, frontend tests **14/14**, E2E Tổng quan **9/9** pass.

## Ghim tiêu đề và icon sidebar khi thu gọn — 2026-09-25

- Hàng tiêu đề bảng Tổng quan (`Mã`, `Tên`, `Giá`, `Biến động`, `Khối lượng`, `Đánh giá`) được `position: sticky` theo chiều cuộn dọc; cột `Mã` tiếp tục ghim theo chiều ngang.
- Sidebar khi thu gọn hiển thị icon riêng cho từng page (`Tổng quan`, `Danh mục`, `Chi tiết`, `Đề xuất`, `AI Advisor`); nhãn đầy đủ vẫn có qua `title`/hover và aria-label.
- Build mới `index-xETPcXaH.js`/`index-CtxOb9cn.css`, E2E Tổng quan **9/9** pass.

## Khóa kiểm thử sidebar và header sticky — 2026-09-25

- Bổ sung regression E2E xác nhận sidebar thu gọn còn icon có aria-label, mở rộng trở lại, hàng tiêu đề bảng và cột Mã đều giữ `position: sticky`.
- Test mới pass: **1/1**; các kiểm thử Tổng quan trước đó vẫn giữ **9/9**.

## Căn chỉnh tiêu đề bảng Tổng quan — 2026-09-25

- Tiêu đề `Tên`, `Giá`, `Biến động` được giữ một dòng, căn theo đúng cột dữ liệu và không bị cắt khi bảng cuộn ngang.
- Build mới `index-BIq4ZqJW.js`/`index-Dry_0eLT.css` và bundle integrity đạt.

## Bù mã intraday bị thiếu trong batch — 2026-09-25

- Xác minh trực tiếp worker: VIC trả dữ liệu intraday hợp lệ; lỗi nằm ở các lượt backend nhận HTTP 500/timeout từ worker nên một mã bị rỗng dù provider có dữ liệu.
- `fetchIntraday` giờ tự retry riêng mã đơn sau lỗi tạm thời và gọi bù tối đa 8 mã bị thiếu sau phản hồi batch, giữ nguyên các dòng đã thành công. Điều này giúp Tổng quan không phải chờ reload để VIC xuất hiện và Chi tiết mã có cơ hội phục hồi trong cùng lượt.
- Backend regression: **25 suites / 100 tests** pass. Kiểm chứng runtime sau restart: 3 lượt VIC đều trả `interval=intraday`, batch 6 mã trả đủ `6/6` gồm VIC; endpoint Chi tiết VIC trả HTTP 200 với `interval=intraday`.
- Điểm tiếp tục: theo dõi health/evidence trong phiên giao dịch; nếu provider tiếp tục reset diện rộng cần tách retry budget theo nhóm mã thay vì tăng timeout toàn hệ thống.

## Kiểm tra toàn bộ mã và retry price-board — 2026-09-25

- Probe 40 mã trên Tổng quan cho thấy worker trả đủ 40 row; chỉ 17 row có giá/thời điểm intraday hợp lệ. 23 mã còn lại trả giá 0 hoặc không có thời điểm giao dịch, thuộc nhóm thanh khoản thấp/không có giao dịch phiên hiện tại; chúng được loại khỏi quote intraday để giữ EOD fallback, không đánh dấu giả là intraday.
- Probe 200 mã ghi nhận 137 quote hợp lệ ngoài giờ giao dịch; các mã thiếu được ghi nhận trong evidence để phân biệt thiếu dữ liệu thật với lỗi upstream.
- Tối ưu `vnstock_price_board.py`: retry tối đa 3 lần với backoff ngắn khi VCI reset kết nối. Lớp Node tiếp tục retry riêng mã đơn và bù phần thiếu của batch.
- Backend regression sau thay đổi: **25 suites / 100 tests** pass. Evidence: `backend/evidence/overview-refresh-2026-09-25T08-55-01-594Z.json`, `backend/evidence/live-quotes-2026-09-25T08-55-44-940Z.json`.
- Điểm tiếp tục: trong giờ giao dịch cần theo dõi riêng các mã có giá 0 ở price-board; chỉ thêm fallback nguồn khác nếu mã đó có giao dịch hợp lệ nhưng VCI vẫn trả rỗng.

## Ghim layout khi cuộn Tổng quan — 2026-09-25

- Sidebar trái chuyển thành `position: sticky`, giữ nguyên vị trí khi cuộn dọc và vẫn hỗ trợ thu gọn/mở rộng.
- Bảng Tổng quan không tạo thanh cuộn ngang hiển thị; bảng co theo vùng nội dung, ngăn tràn ngang toàn trang. Cột `Mã` tiếp tục sticky theo trục ngang nếu trình duyệt/thiết bị phát sinh overflow.
- Header các cột và ô `Mã` dùng nền/z-index riêng để không bị nội dung xuyên qua khi cuộn dọc hoặc ngang.
- Build frontend thành công (`index-CitTp9us.js`, `index-OHbZgkIw.css`); E2E kiểm tra sidebar/header/cột ghim **1/1**, nhóm Overview **10/10** pass.

## Khóa tràn ngang Sidebar — 2026-09-25

- Sidebar sticky được khóa `overflow-x: hidden`; nav item không thể tạo thanh cuộn ngang khi thu gọn/mở rộng.
- Trên mobile, nav chuyển sang wrap thay vì thanh cuộn ngang.
- Build frontend mới `index-68Ke-kxI.js`/`index-uqcI6CMU.css`; E2E sidebar **1/1 pass**.

## Sửa sticky Sidebar theo scroll container — 2026-09-25

- Đổi shell chính từ `overflow-x: hidden` sang `overflow-x: clip` để không tạo scroll container cạnh tranh với `position: sticky` của Sidebar.
- Bổ sung E2E cuộn trang thật 640px và xác nhận bounding rect Sidebar vẫn ở `top=0`.
- Build frontend `index-sj_Kv_J4.js`/`index-HT9wFq0g.css`; test Sidebar **1/1 pass**.

## Nâng cấp icon Sidebar — 2026-09-25

- Thay ký tự Unicode rời rạc bằng bộ icon SVG nét đồng nhất cho Tổng quan, Danh mục cá nhân, Chi tiết mã, Đề xuất và AI Advisor.
- Icon có kích thước cố định, màu theo trạng thái active, tương phản tốt khi Sidebar thu gọn; tooltip/aria-label tên page vẫn giữ nguyên.
- Build frontend `index-Cf4-A4xG.js`/`index-D0ZkSwZ8.css`; E2E Sidebar **1/1 pass**.

## Bỏ ghim cột Mã trong Danh sách cổ phiếu — 2026-09-25

- Cột `Mã` không còn sticky theo chiều ngang; chỉ hàng tiêu đề vẫn sticky theo chiều dọc.
- Build frontend `index-J_YtPby0.js`/`index-Bqj4KHh6.css`; E2E Sidebar/header **1/1 pass**.

## Đồng bộ màu mã, icon và ô tìm kiếm — 2026-09-25

- Mã cổ phiếu dùng cùng màu chữ với dữ liệu bảng, không còn nổi màu riêng khi hover.
- Icon SVG Sidebar được căn giữa tuyệt đối trong vùng hover khi thu gọn; trạng thái mở rộng vẫn giữ căn chỉnh theo nhãn.
- Search box được đồng bộ nền/viền/focus ring với app, bổ sung icon tìm kiếm và placeholder dễ đọc.
- Build frontend `index-zos8ugzB.js`/`index-KFhdpkQe.css`; E2E Sidebar **1/1 pass**.

## Sửa nút Thêm tràn khỏi bảng — 2026-09-25

- Tăng cột thao tác lên 8%, giảm cột Đánh giá còn 22%; nút `Thêm` co theo chiều rộng ô và không vượt khỏi data table.
- Nhãn nút có ellipsis khi vùng hẹp, icon vẫn giữ căn giữa.
- Build frontend `index-CWrXUS2c.js`/`index-CTuB1BgO.css`; nhóm Overview E2E **10/10 pass**.

## Lưu và tải lại đề xuất cá nhân — 2026-09-25

- Mỗi lần tạo đề xuất cá nhân thành công, frontend lưu một snapshot bất biến gồm thời điểm, bộ tiêu chí và kết quả xếp hạng vào localStorage (tối đa 20 bản gần nhất).
- Workspace hiển thị danh sách `Đề xuất đã tạo` với đúng ba thao tác: tạo mới từ form, `Load` để xem lại snapshot, và `Xóa`; không có thao tác sửa snapshot.
- Khi Load, bộ tiêu chí và kết quả được khôi phục cùng nhau; xóa cập nhật ngay danh sách lưu trữ.
- Frontend encoding/unit tests **14/14** pass; build thành công `index-CXjdpdWt.js`/`index-CY01ENob.css`. E2E recommendations chưa chạy được trong lượt này do Playwright worker gặp `spawn EPERM`; các nhóm E2E trước đó vẫn đã pass.

## Khóa kiểm thử kho đề xuất — 2026-09-25

- Bổ sung E2E cho luồng snapshot đề xuất: sau khi tạo kiểm tra có bản lưu, `Load` khôi phục trọng số, `Xóa` loại bản lưu khỏi danh sách.
- Build và frontend unit/encoding tests vẫn pass; Playwright targeted chưa chạy được trong lượt này do worker gặp `spawn EPERM` từ môi trường.

## Hiển thị kho đề xuất trên workspace thực tế — 2026-09-25

- Xác minh `App.jsx` đang dùng workspace nhúng `Fp`, không dùng component RecommendationWorkbench riêng; đã nối tính năng snapshot vào workspace thực tế.
- Khu vực `Đề xuất đã tạo` giờ xuất hiện ngay dưới form Tạo đề xuất với số lượng lưu, thời điểm, tiêu chí, số mã và nút `Load`/`Xóa`.
- Khi tạo thành công, snapshot được lưu và hiển thị ngay; Load khôi phục trọng số và kết quả.
- Build frontend thành công: `index-jexEwLTv.js`; bundle integrity pass.

## Tinh chỉnh UI kho đề xuất — 2026-09-25

- Đưa kho snapshot vào cùng thanh thao tác với form: select `Đề xuất đã lưu`, nút `Load`, nút `Xóa` và trạng thái disabled khi chưa có bản lưu.
- Ẩn danh sách lặp bên dưới để workspace tập trung vào form và kết quả; snapshot vẫn giữ bất biến trong localStorage.
- Select hiển thị thời điểm tạo và số mã, tự chọn snapshot mới nhất sau khi tạo.
- Build frontend `index-BzyhAdMI.js`/`index-BQtXC8Zz.css`; frontend tests **14/14** pass.

## Đồng bộ snapshot đề xuất lên database — 2026-09-25

- Thêm model/migration `SavedRecommendation` và bảng `saved_recommendation_snapshots`, lưu theo `user_id`, gồm criteria, result và created_at.
- Thêm API xác thực: `GET /api/recommendations/saved`, `POST /api/recommendations/saved`, `DELETE /api/recommendations/saved/:id`; không có API sửa snapshot.
- Frontend workspace thực tế tải snapshot từ server khi đăng nhập, lưu/xóa qua API; localStorage chỉ còn fallback khi server tạm thời không sẵn sàng.
- Migration đã chạy thành công ở development. Backend **25 suites / 100 tests**, frontend **14/14 tests**, build frontend `index-pmo8xC-e.js` pass.
- Kiểm chứng bảo mật: endpoint saved không token trả HTTP 401.

## Kiểm thử persistence và quyền sở hữu snapshot — 2026-09-25

- Bổ sung `recommendationController.test.js`: endpoint saved bắt buộc JWT, list/create/delete đều scope theo `req.user.sub`, không thể xóa snapshot của tài khoản khác.
- Targeted backend controller test: **2/2 pass**. Migration 017 đã chạy trước đó; runtime backend đang chạy sau khi nạp route mới.

## Regression phát hành persistence — 2026-09-25

- Full backend regression sau khi thêm API snapshot: **26 suites / 102 tests pass**.
- Frontend encoding/unit tests: **14/14 pass**; safe build và bundle integrity pass (`index-pmo8xC-e.js`).
- `sequelize-cli db:migrate:status` xác nhận migrations 001–017 đều `up`, gồm `017_create_saved_recommendations.js`.
- Runtime smoke: `/api/recommendations/saved` không có token trả HTTP 401 như yêu cầu.
- Một lệnh kiểm tra nhầm `npm run migrate:status` không tồn tại; đã dùng đúng `npx sequelize-cli db:migrate:status` và xác nhận thành công.

## E2E persistence database — 2026-09-25

- Đã thử chạy E2E nhóm `recommendation criteria` sau khi chuyển saved proposal lên API/database; Playwright vẫn bị môi trường Windows trả `spawn EPERM` trước khi khởi chạy worker, kể cả sau khi dọn các process preview cũ.
- Regression backend/frontend và build đã pass ở lượt trước; cần chạy lại E2E khi runner cho phép spawn worker để xác nhận UI qua API saved trực tiếp.

## Smoke test API saved proposal runtime — 2026-09-25

- Bổ sung `backend/scripts/verify-saved-recommendations.cjs`: đăng ký user tạm, POST snapshot, GET xác nhận snapshot xuất hiện, DELETE xác nhận HTTP 204, rồi xóa user test.
- Smoke runtime pass: snapshot `3b8beb73-7163-49f4-b4ad-1e047b6461b3` tạo thành công, list có 1 bản, xóa thành công; dữ liệu test đã được dọn.
- Bằng chứng này không phụ thuộc Playwright/browser worker đang bị `spawn EPERM`.

## Đồng bộ snapshot local cũ lên database — 2026-09-25

- Khi đăng nhập, frontend tải snapshot từ API rồi phát hiện các bản cũ chỉ có ở localStorage và POST từng bản lên database tối đa 20 bản.
- Sau khi đồng bộ, danh sách server trở thành nguồn chính và localStorage được cập nhật bằng ID server, tránh upload lặp ở các phiên sau.
- Nếu API tạm thời lỗi, vẫn giữ fallback local để không làm mất trải nghiệm.
- Frontend tests **14/14** pass; build `index-B7hZPHN4.js` và bundle integrity pass; API ownership test **2/2** pass.

## Đồng bộ fallback sau khi tạo snapshot — 2026-09-25

- Khi POST snapshot thành công, frontend ghi ngay bản ghi có ID database vào localStorage; fallback offline không còn bỏ sót bản đề xuất mới nhất.
- Frontend tests **14/14** pass; build `index-C88eVQSz.js` và bundle integrity pass.

## Mở rộng bộ lọc nhóm ngành Tổng quan — 2026-09-25

- Backend hiện có 8 nhóm ngành mã hóa; frontend trước đây chỉ hiển thị 4 nhóm. Đã bổ sung `Tài nguyên & năng lượng`, `Sản xuất công nghiệp`, `Tiêu dùng & bán lẻ`, `Xây dựng & hạ tầng` vào select.
- Giữ nguyên sector key/API hiện hữu, không thay đổi dữ liệu hoặc logic lọc; test UI chỉ mở rộng số option từ 5 lên 9.
- Frontend tests **14/14** pass; build `index-BpXS9PJ0.js` và bundle integrity pass.

## Mo rong do phu nhom nganh va bo loc Khac — 2026-09-25

- Mo rong select tren trang Tong quan tu 4 nhom len 8 nhom da ma hoa: ngan hang/tai chinh, chung khoan, bat dong san, tai nguyen/nang luong, san xuat cong nghiep, tieu dung/ban le, cong nghe, xay dung/ha tang; them lua chon `Khac / chua phan loai`.
- Bo sung backend filter `sector=other` bang tap ma da phan loai (`NOT IN`), khong thay doi cac key/API sector hien huu. Runtime `GET /api/stocks?pageSize=500&sector=other&sort=code` tra ve 500 dong tren trang dau va pagination total 527.
- Do lieu DB hien tai co tong 624 ma, trong do nhieu ban ghi chua co metadata `industry`; do do khong tu suy dien nganh tu ten ma va ten cong ty, tranh phan loai sai. So lieu pageSize=500 cho thay cac nhom da ma hoa moi chi phu mot phan tap ma (banking_finance 21, construction_infrastructure 12, consumer_retail 7, energy_resources 10, manufacturing 14, real_estate 15, securities 10, technology 2; `other` 409 tren trang dau).
- Kiem chung: backend full regression **26 suites / 102 tests pass**; frontend **14/14 tests pass**, build frontend thanh cong. Playwright E2E tiep tuc bi gioi han boi `spawn EPERM` cua moi truong Windows.
- Buoc tiep theo hop ly: nap bo sung industry metadata tu listing provider vao bang Stock, sau do thu hep tap `other` theo du lieu thuc te ma van giu fallback an toan.

## Phan loai nganh theo metadata provider — 2026-09-25

- Them `backend/src/services/sectorClassifier.js` de nhan dien sector tu truong `industry` ro rang cua provider; ten doanh nghiep khong duoc dung lam heuristic.
- Stock controller van uu tien danh sach ma da xac dinh; neu ma chua co trong danh sach nhung co `industry` hop le, sector response va bo loc tuong ung se nhan dien them. `other` van la fallback an toan cho du lieu thieu metadata.
- Them unit test cho nhan dien nhom nganh va kiem tra regression stock controller.
- Runtime sau khi restart: technology 2 ma / total 2; other 500 dong trang dau / total 527. Provider listing hien van tra nhieu dong `industry=null`, nen chua the tuyen bo da phu day du universe.
- Backend full regression **27 suites / 103 tests pass**. Buoc tiep theo la chay listing sync khi provider tra metadata nganh khong rong va do lai phan bo sector.

## Kiem tra nguon metadata nganh — 2026-09-25

- Da doi chieu truc tiep worker listing voi cac source `vci`, `kbs`, `tcbs`, `mas`.
- `vci` tra 3.635 dong nhung **0 dong co industry**; `kbs` tra 0 dong; `tcbs` va `mas` loi HTTP 500 trong moi truong hien tai.
- Khong tu dong doi source hoac suy dien nganh tu ten doanh nghiep. Cach an toan hien tai la giu 8 nhom ma chac chan, phan loai theo industry khi provider bo sung metadata, va de phan con lai o `Khac`.
- Khong co thay doi code sau dot audit; he thong dang chay voi bo phan loai metadata da kiem thu. Buoc tiep theo la theo doi listing sync dinh ky va chi backfill khi co industry khong rong.

## Chuan hoa trung lap ma nganh — 2026-09-25

- Audit bo `SECTOR_CODES` phat hien `DBC` bi xuat hien dong thoi trong `manufacturing` va `consumer_retail`, trong khi ham phan loai uu tien nhom manufacturing. Da loai `DBC` khoi manufacturing de bo loc va nhan sector thong nhat.
- Khong thay doi API key hay giao dien; cac ma con lai giu nguyen nhom hien co.
- Targeted backend tests: **9/9 pass**.

## Tach danh muc sector va khoa kiem thu uniqueness — 2026-09-25

- Dua `SECTOR_CODES`, `SECTOR_LABELS`, tap ma da phan loai va ham tra sector vao `backend/src/services/sectorCatalog.js`; controller dung chung catalog thay vi khai bao cuc bo.
- Them test bat buoc moi ma chi xuat hien mot nhom, moi nhom co nhan hien thi, va `DBC` thuoc `consumer_retail`.
- Backend da restart voi catalog moi; full regression **28 suites / 104 tests pass**.
- Buoc nay khong mo rong du lieu provider, nhung ngan loi phan loai trung lap khi bo sung ma nganh tiep theo.

## API catalog dong bo bo loc nganh — 2026-09-25

- Them `GET /api/stocks/sectors`, tra ve danh sach sector tu catalog backend va fallback `other`; frontend co the dung cung mot nguon khi cap nhat option, tranh lech key/label.
- Them regression test cho endpoint catalog va giu route truoc `/:id` de khong xung dot voi chi tiet ma.
- Runtime endpoint tra 8 nhom chuan va fallback `Khac / chua phan loai`.
- Backend full regression **28 suites / 105 tests pass**.

## Kiem chung catalog sector va khoi phuc build frontend — 2026-09-25

- Backend catalog endpoint `GET /api/stocks/sectors` da co regression test va runtime response hop le.
- Thu nghiem noi select frontend vao endpoint phat hien source App da la ban compiled recovery; thao tac encoding tam thoi lam mat file, da khoi phuc tu shipped asset va xac nhan build an toan tro lai. Khong de lai thay doi tam thoi tren recovery script.
- Frontend encoding/unit tests **14/14 pass**; safe build va bundle integrity pass (`index-1DqUKLem.js`).
- Viec noi select frontend vao endpoint duoc de lai lam buoc UI rieng sau khi chot duong source JSX on dinh; hien tai select fallback hien huu van hoat dong.

## Khoi phuc UI sau su co preview — 2026-09-25

- Kiem tra cho thay preview port 4180 phuc vu asset moi va Playwright smoke chay thanh cong: 131 dong, FPT co Intraday; coverage runtime 105/131.
- Port 4173 dang khong co listener va Vite bi `spawn EPERM` khi nap config; da khoi dong preview thay the tai `http://127.0.0.1:4174/`, HTTP 200 va asset JS HTTP 200.
- Frontend encoding/unit tests **14/14 pass**, safe build va bundle integrity pass.

## Xac nhan endpoint UI sau loi port 4173 — 2026-09-25

- Da thu khoi dong lai ca preview va dev server tren `4173`; Vite deu gap `spawn EPERM` khi nap `vite.config.js`, khong phai loi bundle.
- Preview `4174` van dang chay on dinh, trang va asset JS tra HTTP 200; preview `4180` da duoc smoke test bang Chrome thanh cong.
- Giu server thay the `4174` de UI tiep tuc truy cap trong moi truong hien tai; khong sua vite config de tranh che dau loi spawn he thong.

## Phat hanh UI va API smoke — 2026-09-25

- Backend health: `success=true`; sector catalog runtime: 8 nhom.
- Preview UI `4174`: HTTP 200, co root mount va asset `index-1DqUKLem.js`.
- Chrome smoke tren preview thay the: 131 dong, FPT co nhan Intraday, coverage 105/131; cac ma thieu quote van hien EOD fallback theo thiet ke.
- Port `4173` tiep tuc bi Windows `spawn EPERM`; port `4174` la endpoint review dang hoat dong.

## Static UI fallback cho port 4173 — 2026-09-25

- Da xac minh port `4173` thuc su DOWN, trong khi `4174/4180` chi la cac preview thay the khong dung voi URL workflow cua nguoi dung.
- Them `frontend/scripts/serve-dist.cjs` va npm script `start:static`: phuc vu dist, SPA fallback va proxy `/api` sang backend 5000, khong phu thuoc Vite/esbuild.
- Khoi dong thanh cong `http://127.0.0.1:4173/`; UI HTTP 200, `/api/health` qua proxy tra `success=true`, asset `index-1DqUKLem.js` tai duoc.
- Chrome smoke tren dung port 4173 da chay thanh cong; khong con phu thuoc loi Vite `spawn EPERM` de mo UI.

## Sua loi runtime JSX gay trang trang — 2026-09-25

- Browser console da cung cap loi cu the: `Uncaught TypeError: s.jsx is not a function`.
- Nguyen nhan la alias `s` cua JSX runtime bi shadow boi bien cuc bo trong bundle recovered. Da patch asset dang phuc vu, doi cac call `s.jsx/s.jsxs` sang alias React JSX runtime khong bi shadow; node syntax check pass.
- Static UI server da khoi dong lai tai `4173`; UI HTML, asset JS va API proxy deu HTTP 200.
- Luu y: Vite dang bi `spawn EPERM`, nen patch runtime hien tai ap dung cho dist dang phuc vu; can chot lai source JSX va chay safe build khi moi truong cho phep.

## Sua alias runtime tai source — 2026-09-25

- Da sua `D.useState/D.useEffect` con sot trong `frontend/src/App.jsx` ve alias React `I.*`; source khong con `D.*`, `i.jsx` hay `s.jsx`.
- Dist dang phuc vu van giu shim JSX da kiem chung de UI khong crash trong khi Vite bi Windows `spawn EPERM`.
- Static server 4173 da khoi dong lai; `check:encoding` con bao source recovered co mojibake, can dot chuan hoa UTF-8 khi build tool hoat dong.

## Rollback ve moc truoc recovery frontend — 2026-09-25

- Theo yeu cau rollback, da khoi phuc `frontend/src/App.jsx` va `frontend/src/styles.css` tu ban backup truoc recovery (`frontend/recovery/*.before-recovery.txt`).
- Da go bo static server tam thoi, fallback boot inline va npm script `start:static`.
- Khong tiep tuc patch JSX alias/dist. Vite build chua chay duoc do Windows `spawn EPERM`; dist chua duoc tao lai tu source rollback.

## Phuc hoi ve moc API catalog — 2026-09-25

- Da dua code ve moc `API catalog dong bo bo loc nganh`: giu `sectorCatalog`, `GET /api/stocks/sectors`, bo loc metadata va test catalog/controller.
- Da go bo cac thay doi sau moc nay: static UI server, fallback boot, cac shim JSX va patch dist tam thoi.
- Frontend source dung ban backup truoc recovery de tranh tiep tuc su co bundle; backend catalog runtime van tra 8 nhom va fallback.
- Targeted backend tests **10/10 pass**; endpoint runtime dang hoat dong.

## Sua proxy dang nhap POST tren static UI - 2026-09-25

- Nguyen nhan loi dang nhap HTTP 404: proxy frontend/scripts/serve-dist.cjs da forward moi request /api/* thanh GET, lam mat method va body cua POST /api/auth/login.
- Da sua proxy de giu nguyen method, body va cac header authorization, content-type, accept; static UI dang chay tai http://127.0.0.1:4173/.
- Kiem chung runtime: POST /api/auth/login voi tai khoan gia tra 401 va thong diep backend; GET /api/health tra 200; GET /api/stocks/sectors tra 8 nhom; root va asset JS tra 200.
- Vite van chua build duoc do Windows spawn EPERM; static dist la fallback van hanh hien tai. Chuoi tieng Viet trong dist cu van can chuan hoa khi chot lai source JSX va build duoc.

## Sua mojibake trong bundle dang phuc vu - 2026-09-25

- Da tao backup `.pre-encoding-repair` truoc khi sua va chuan hoa cac chuoi UTF-8 bi doc sai trong dist JS; node syntax check van pass.
- Kiem chung bundle tai port 4173 tra HTTP 200 va chua chuoi tieng Viet da sua; backend login tra thong diep UTF-8 dung.
- Mot so chuoi cu trong bundle van thieu ky tu do du lieu recovered da mat byte; can build lai tu source JSX UTF-8 khi Vite khong con loi spawn EPERM de chuan hoa toan bo giao dien.
- Da thay truc tiep thong diep fallback 404 trong bundle thanh `Không tìm thấy dữ liệu được yêu cầu.` de khong hien thi mojibake cho loi API nay.

## Chuan hoa tieng Viet frontend - 2026-09-25

- Nguyen nhan phan lon mojibake: dist JS cu duoc tao tu source recovered da sai encoding, khong phai loi API. Da bundle lai truc tiep tu `frontend/src/main.jsx` bang esbuild voi source JSX hien tai, tao `dist/assets/index-sourcefix.js` va `index-sourcefix.css`.
- Da cap nhat `dist/index.html` dung bundle moi, loai fallback HTML va cac thong diep mojibake cu; cac chuoi login, loi API, danh muc, phan tich va nhan du lieu lay tu source UTF-8.
- Da loai cac file tam `.try` va backup encoding khoi thu muc source de tranh bi quet nham trong lan kiem tra sau.
- Kiem chung: `npm test` frontend **14/14 pass**, encoding check pass; node syntax check bundle pass; root, JS, CSS tai `4173` deu HTTP 200 va bundle khong con chuoi `Khng tm`.
- Vite van gap Windows `spawn EPERM`, nen esbuild la cach tao dist truc tiep hien tai; static server 4173 dang phuc vu bundle moi.

## Khoi phuc bundle day du tinh nang sau chuan hoa tieng Viet - 2026-09-25

- Phat hien bundle `index-sourcefix` duoc tao tu source rollback, nen lam mat cac tinh nang moi nhu recommendation workbench, expert guidance, analysis status, Ichimoku va loading overlay.
- Da tro lai bundle feature-rich `index-CJ9TdbTJ.js` va CSS tu moc recovery co day du marker tinh nang; giu cac sua runtime JSX va proxy API.
- Da chuan hoa cac chuoi tieng Viet hien thi trong bundle nay theo bo tu vung an toan, khong thay doi logic; bundle khong con cac marker mojibake chinh (`Khng`, `Dữ liu`, `phn tch`, `Cha c`).
- Kiem chung: `check:bundle` pass, node syntax check pass, feature markers `recommendation-workbench`, `expert-guidance-panel`, `ichimoku` con day du; UI root/assets HTTP 200 va login proxy tra 401 dung.

## Rasoat chuoi tieng Viet bo sung trong bundle feature-rich - 2026-09-25

- Quet cac string literal dang hien thi trong bundle active va phat hien nhieu cum mat dau/mat chu: thong bao quote, de xuat, lich su, danh muc, sidebar, bieu do va chi tiet ma.
- Da sua theo 201 cum tu/chuoi hien thi cu the, bao gom `Không`, `Dữ liệu`, `Phân tích`, `Đề xuất`, `Đang`, `Chưa`, `Nguồn`, `Khối lượng`, `Danh mục`, `Tỷ trọng`, `Intraday` va cac thong bao loi.
- Khong thay doi logic; `node --check` va `check:bundle` pass. Bundle runtime tai 4173 tra HTTP 200, van con cac marker recommendation workbench/expert guidance/Ichimoku va khong con marker mojibake chinh.

## Tiep tuc lam sach tieng Viet hien thi - 2026-09-25

- Quet lai cac string literal sau dot sua truoc; da xu ly them cac cum con sot trong quote status, phan bo, bieu do, ket qua danh gia va sidebar.
- Sua cac chuoi nhu `Phản hồi máy chủ`, `Bộ giá hiện tại`, `Đứng giá`, `Độ rộng thị trường`, `MACD`, `Lịch sử giá`, `Mở rộng thanh điều hướng`, `Đang cập nhật intraday` va cac thong bao danh muc/phan tich.
- Kiem chung bundle HTTP 200, `node --check` pass, `check:bundle` pass; marker `Khng`, `Dữ liu`, `phn tch`, `Cha c`, `yu cu` bang 0 trong asset dang phuc vu.

## Quet toan bo chuoi hien thi lan cuoi - 2026-09-25

- Da quet ca string literal va template literal trong bundle, phat hien cac chuoi con sot o phan RSI, form tao de xuat, ket qua giao dich, bieu do, vai tro tai khoan, placeholder va nut them ma.
- Da sua them: `RSI can bang`, `Ban muon uu tien dieu gi?`, `De xuat da tao`, `Vuot/Duoi dai`, `Lich su gia`, `Tao tai khoan`, `Quan tri vien`, `Nha dau tu`, `Them ma`, `Ngoc chieu`, `Nhap cau hoi AI` va cac chuoi dong co bien.
- Kiem chung asset runtime HTTP 200; bad marker `Khng|Du lieu|phn tch|Cha c|yu cu|Thm m|Ngoc chieu|phin` bang 0; `node --check` va `check:bundle` pass.

## Sua chuoi Unicode escape hien thi literal - 2026-09-25

- Phat hien `frontend/src/App.jsx` chua 252 chuoi `\\uXXXX` do recovery ghi nham escape vao text; mot so thong diep co the hien nguyen dang `M\\u1ee9c t\\u0103ng gi\\u1ea3m`.
- Da giai ma toan bo escape Unicode cua source ve ky tu UTF-8 that va lam sach mojibake trong App.jsx; khong con `\\u` literal trong frontend source, encoding check pass.
- Bundle feature-rich dang phuc vu khong co escape UI literal; cac `\\u` con lai chi nam trong regex Unicode cua React runtime.
- Kiem chung bundle active van giu feature markers, `node --check` va `check:bundle` pass.

## Sua escape Unicode trong App.jsx line 68 - 2026-09-25

- Dòng render dashboard chứa 156 escape `\\uXXXX` literal, trong đó có `M\\u1ee9c t\\u0103ng gi\\u1ea3m`; khi xem source/build recovery có thể hiện nguyên mã escape.
- Đã giải mã toàn bộ escape Unicode trong `frontend/src/App.jsx` về ký tự tiếng Việt thật; dòng 68 hiện chứa trực tiếp `Mức tăng giảm` và không còn escape Unicode.
- Encoding check pass; bundle thử nghiệm từ source bằng esbuild và node syntax check pass. Bundle feature-rich đang phục vụ không bị thay thế.

## Sua tieng Viet E2E workflows - 2026-09-25

- Da sua cac chuoi mojibake trong `frontend/e2e/workflows.spec.mjs`: `Tổng quan`, `Đề xuất`, `Đề xuất theo tiêu chí của bạn`, `Bạn muốn ưu tiên điều gì?`, `Danh sách cổ phiếu`.
- Khong con marker mojibake hoac escape Unicode trong file.
- `node --check` pass; Playwright list test nhan dien du 6 test trong file.

## Rasoat toan bo text bundle index-CJ9TdbTJ - 2026-09-25

- Da quet string literal va template literal trong bundle feature-rich, sua cac cum con loi: `Vong phan hoi`, `Hit rate TB cac dot`, `Ngay de xuat`, `Tai khoan`, `San xuat cong nghiep`, `Loai giao dich`, `Gia tham chieu`, `Tren/Duoi may`, `Tang`, `Bien dong binh quan`, `Nguon chua xac nhan` va cac chuoi RSI/bieu do.
- Da sua ca text dong trong template literal va label giao dich con sot; khong thay doi logic/runtime.
- Kiem chung: `node --check` pass, `check:bundle` pass, marker feature recommendation workbench va expert guidance van con day du; bundle dang phuc vu tiep tuc giu nguyen.

## Kiem chung chong hoi quy bundle UI - 2026-09-25

- Buoc tiep theo da thuc hien: kiem chung bundle feature-rich sau cac dot sua tieng Viet, thay vi build lai tu source rollback lam mat tinh nang.
- Frontend service tests **14/14 pass**; encoding check pass tren 18 source files; `check:bundle` pass; node syntax check `index-CJ9TdbTJ.js` pass.
- Bundle van co cac marker Recommendation Workbench va Expert Guidance; khong thay doi asset runtime trong dot kiem chung.
- Build reproducibility van la backlog rieng: source `App.jsx` rollback chua dong bo hoan toan voi bundle feature-rich; khong dung safe build de thay the asset dang phuc vu cho den khi source parity duoc phuc hoi.

## Chuan hoa encoding component source truoc source parity - 2026-09-25

- Tiep tuc buoc phuc hoi build reproducible: da lam sach mojibake va escape Unicode trong `RecommendationWorkbench.jsx`, `RecommendationTracking.jsx` va `MarketBreadthChart.jsx`.
- Source component hien dung chuoi UTF-8 that (vi du `Xu huong gia`, `Gia tham chieu`, `Khong co ban de xuat`), khong con chuoi `Ã`, `Â`, `â€”` trong cac file nay.
- Kiem chung encoding check pass; esbuild tao bundle kiem tra tu `src/main.jsx` thanh cong va node syntax check pass. Bundle feature-rich dang phuc vu khong bi thay the.
- Source `App.jsx` van can tiep tuc ghep workspace de xuat vao nhung component nay; chua coi source parity hoan tat.

## Khoi phuc source navigation De xuat - 2026-09-26

- Da ghep `RecommendationWorkbench` vao `frontend/src/App.jsx`, them muc `De xuat` tren sidebar va ket noi du lieu de xuat moi nhat cung lich su.
- Nut them vao danh muc tu workspace de xuat da duoc noi voi form ghi nhan giao dich trong Danh muc ca nhan.
- Kiem chung source bang encoding check, esbuild parity bundle va `node --check`; bundle feature-rich dang phuc vu van duoc giu nguyen.
- Con backlog parity: dong bo day du phan chi tiet/phan tich va `RecommendationTracking` vao source truoc khi thay the dist dang chay.

## Ket noi theo doi de xuat voi Danh muc - 2026-09-26

- Da them `RecommendationTracking` vao trang Danh muc, doc `recommendation_entries` tu API portfolio de hien thi gia vao, gia hien tai va ket qua du bao.
- Khi bam Them vao danh muc, `recommendation_context` duoc giu trong form giao dich va gui cung giao dich BUY; giao dich thu cong van giu gia tri null.
- Source parity esbuild co marker tracking/context, node syntax check pass; frontend service tests **14/14 pass** va Playwright liet ke du 6 workflow.
- Bundle feature-rich dang phuc vu khong bi thay the; can browser-run voi build source sau khi hoan tat parity cac phan detail/analysis con thieu.

## Sua lich EOD va xac minh phien 25-09 - 2026-09-26

- Xac minh live: ngay 26-09-2026 la thu Bay, API intraday tra 0 quote cho FPT/VIC/VCB theo dung trang thai khong co phien giao dich.
- Phat hien scheduler EOD cu chay 10:30 va luon nham ngay hom qua, nen sau thu Sau chi con 24-09. Da doi lich mac dinh sang 16:30 Asia/Ho_Chi_Minh va chon ngay giao dich da ket thuc; cuoi tuan lui ve thu Sau.
- Backfill canary phien 25-09 thanh cong cho FPT, VIC, VCB, SSI, MWG; API FPT hien co `price_updated_at=2026-09-25` va market sessions den 25-09.
- Test scheduler backend pass 4/4. Toan universe van can retry co kiem soat vi upstream co reset ket noi; khong danh dong canary voi coverage day du.

## Lich phien cuoi tuan va ngay nghi le - 2026-09-26

- Da bo sung `completedSessionDate`: tu dong lui qua thu Bay/Chu Nhat va cac ngay trong `VNSTOCK_HOLIDAYS` (danh sach `YYYY-MM-DD` ngan cach bang dau phay).
- Scheduler mac dinh chay 16:30 Asia/Ho_Chi_Minh, sau khi thi truong dong; ngay nghi le khong bi gan nham thanh phien dang co.
- Da them test cho Chu Nhat va ngay nghi le cau hinh; scheduler test pass **5/5**.
- Da restart backend de nap logic moi. Provider outage van duoc ghi la coverage gap rieng, khong bi che thanh ngay nghi le.

## Xac minh HPG EOD tren cac luong - 2026-09-26

- HPG ban dau van tra EOD 24-09 (`20.800`) do chua nam trong nhom backfill canary, du database da co session 25-09 cho mot so ma khac.
- Da backfill rieng HPG cho 25-09 thanh cong; API danh sach va detail hien tra `20.650`, `price_updated_at=2026-09-25`, detail history dat 25-09 o dong moi nhat.
- Quote intraday HPG tra rong ngay 26-09 vi la thu Bay; day la trang thai ngoai phien, khong ghi de EOD bang gia khong xac dinh.
- Live UI verifier timeout khi cho intraday ngoai phien; can chay lai trong phien giao dich. Khong xem timeout nay la bang chung API EOD sai.

## Audit va retry EOD toan universe - 2026-09-26

- Audit phien 25-09 tren 624 ma cho thay chi 20 ma co du lieu truoc khi backfill; 531 ma listed thieu phien, 73 ma delisted duoc loai khoi muc tieu.
- Backfill batch 10 + retry provider da ghi them 71 ma; nhom kiem chung 6 ma voi fallback moi deu thanh cong. Luot batch 3 toan phan bi dung sau nhieu timeout/reset upstream; audit sau do con 348 ma listed thieu.
- Da sua `scripts/backfill-vnstock-session.cjs`: batch partial/failed bay gio tach symbol thieu va retry rieng, khong con coi partial response la thanh cong hoan toan. Evidence moi duoc ghi theo tung luot de tiep tuc an toan.
- Coverage toan universe van chua dong; nguyen nhan con lai la upstream VCI reset/timeout voi nhieu ma thanh khoan thap. Cac ma co du lieu moi se hien EOD dung 25-09; ma chua co van phai hien ro ngay cap nhat cu va tiep tuc retry.

## Retry VPB EOD - 2026-09-26

- VPB duoc xac minh thieu phien 25-09 va dang tra EOD 24-09 (`22.100`).
- Retry rieng VPB thanh cong, them record phien 25-09; API hien tra gia `23.000`, `price_updated_at=2026-09-25`.
- Cache stock da duoc invalidation boi backfill, nen Tong quan/Chi tiet va fallback Danh muc doc cung gia EOD moi.

## Quality gate tu dong cho EOD/intraday - 2026-09-26

- Da doi chieu mo hinh broker: tach realtime quote, EOD snapshot, timestamp/session va trang thai provider; SSI iData/FC cung phan tach intraday/EOD va co realtime streaming.
- Da them `GET /api/stocks/data-quality?session=YYYY-MM-DD`: tra coverage listed, danh sach ma missing, `ready` va health provider, khong cache. API live hien bao phien 25-09: 551 listed, 204 covered, 347 missing.
- Quality gate khong con phu thuoc vao viec nguoi dung nhin thay mot ma sai roi bao lai; monitor/UI co the doc mot nguon trang thai tap trung va chan viec coi snapshot chua du la day du.
- Backend regression pass **106/106**; node syntax stock controller pass. Coverage du lieu van dang retry do upstream VCI reset/timeout, va `ready=false` duoc giu cho den khi audit dat du.

## Tu phuc hoi EOD sau quality gate - 2026-09-26

- Scheduler EOD nay tu dong lap toi da `VNSTOCK_EOD_GAP_RETRIES` pass (mac dinh 2) tren danh sach ma con thieu cua cung phien, sau moi pass audit lai coverage.
- Neu VCI van timeout/reset, evidence giu `remaining` va quality endpoint tiep tuc `ready=false`; khong hien thi coverage ao.
- Test scheduler pass **6/6**; backend da restart voi logic retry pass moi.

## Hien thi quality gate tren UI - 2026-09-26

- Source frontend da doc `/api/stocks/data-quality` va hien banner tren Tong quan: phien EOD, so ma covered/listed va so ma dang cho retry.
- Banner phan biet `Dữ liệu EOD đã đủ` va `Dữ liệu EOD chưa đủ`, de nguoi dung khong nham snapshot stale la gia moi.
- Source parity esbuild pass; frontend service tests **14/14 pass**; encoding check pass. Bundle feature-rich dang phuc vu chua thay the vi source parity tong the van dang tiep tuc.

## Dua quality gate vao bundle dang phuc vu - 2026-09-26

- Da them `dist/assets/quality-overlay.js` vao `dist/index.html`; overlay doc quality endpoint va hien banner tren hero Tong quan cua bundle feature-rich dang chay.
- Overlay tu refresh moi 60 giay, khong thay doi bundle React chính; neu provider con gap, nguoi dung thay ro phien EOD va so ma missing.
- Kiem chung `node --check` pass; index va asset overlay tai HTTP 200 tren port 4173.

## On dinh quality overlay runtime - 2026-09-26

- Da sua MutationObserver cua quality overlay de chi fetch khi banner chua ton tai; tranh vong lap tu viec observer tu bat mutation do chinh banner cap nhat.
- Refresh dinh ky 60 giay van duoc giu; node syntax check pass.

## Browser regression quality overlay - 2026-09-26

- Da chay browser regression cho Tong quan va sidebar tren bundle dang phuc vu: **2/2 pass**.
- Overlay runtime syntax check pass; browser smoke script rieng bi Windows spawn EPERM khi launch Chrome, nhung E2E workflow chinh chay duoc trong quyen elevated.

## Tu sua phien EOD truoc do - 2026-09-26

- Scheduler da them previous-session repair: sau khi xu ly phien hien tai, tu tim phien EOD gan nhat da luu va retry cac ma missing cua phien do.
- Co che nay bao phu cuoi tuan/ngay nghi/provider outage khi phien moi chua co record, tranh gap cu bi bo quen den khi nguoi dung bao lai.
- Test scheduler pass **6/6**; backend da restart voi logic moi.

## Quality banner tren moi page - 2026-09-26

- Overlay runtime da chuyen anchor tu hero Tong quan sang topbar cap ung dung; Tong quan, Chi tiet ma va Danh muc deu nhan cung mot quality status.
- Browser regression Overview/sidebar **2/2 pass**; node syntax check overlay pass.

## E2E quality banner tren ba page - 2026-09-26

- Da them workflow E2E mock quality endpoint va kiem tra banner giu nguyen khi chuyen Tong quan -> Danh muc -> Chi tiet ma.
- Test quality banner pass **1/1**; lan dau fail do assertion dung dang `25-09` thay vi ISO `2026-09-25`, da chuan hoa assertion theo payload API.

## Xac minh retry EOD va dong bo UI - 2026-09-26

- Endpoint `/api/stocks/data-quality` hien dang tra ve phien `2026-09-25`: **204/551**, con **347** ma thieu. Provider intraday dang `ready`, khong co job retry EOD dang chay lien tuc tai thoi diem kiem tra.
- Retry EOD hien la co che theo lich (`30 16 * * 1-5` Asia/Ho_Chi_Minh), moi luot co mac dinh 2 pass retry symbol missing; evidence scheduler luu `last_run_at`, so pass va so ma con lai trong `eod_retry` de khong nham voi retry dang chay.
- Quality overlay tren bundle dang phuc vu van poll 60 giay. Khi `session/covered/missing` thay doi, overlay phat event va reload mot lan de ca Tong quan, Danh muc va Chi tiet ma refetch EOD; source App cung lang nghe event, retry danh sach/chi tiet/analysis va nap lai portfolio.
- Da chay `node --check` cho controller va overlay; test controller + scheduler pass **15/15**. Coverage van chua du do VCI reset/timeout, can tiep tuc retry/backfill khi provider on dinh.

## Retry gap EOD dinh ky trong cung ngay - 2026-09-26

- Scheduler EOD van chay luc `16:30`, dong thoi co them gap-retry cron `*/15 17-19 * * 1-5` de chi lay lai cac ma con thieu, khong lap lai toan bo universe.
- Gap retry dung cung lock voi ingest chinh, co evidence rieng `eod-retry-*.json`, va API quality tra them runtime `running/phase/started_at/finished_at/last_error`.
- Overlay hien thi "Dang retry provider" khi runtime dang chay; neu khong chay, hien lich retry thay vi ghi nham rang dang cho retry lien tuc.
- Test controller + scheduler pass **16/16**; node syntax check pass. Chua co luot retry thuc te moi sau khi restart vi hom nay la thu Bay; can xac minh trong phien giao dich tiep theo.

## Backfill phien 2026-09-25 dang chay - 2026-09-26

- Da khoi dong backfill co kiem soat cho danh sach missing hien tai, batch 3, moi batch co toi da 3 lan va fallback retry tung ma.
- Coverage da tang tu **204/551** len **210/551** trong luc job dang chay; provider co luc reset ket noi nen van can giu lai danh sach failure de retry tiep.
- Khong coi coverage hien tai la da hoan tat; can doi evidence `eod-backfill-2026-09-25-*.json` va audit lai endpoint quality sau khi job ket thuc.

## Phan luong backfill theo circuit provider - 2026-09-26

- Dot lon da dung khi VCI circuit mo (`5 consecutive failures`), tranh tiep tuc tao them timeout/reset.
- Sau khi circuit reset, canary 5 ma da chay thanh cong (provider ready, khong co failure moi); coverage tai thoi diem nay **211/551**.
- Dang chay canary tiep 20 ma voi batch 2; chi mo rong toan bo 340 ma neu canary khong mo circuit lai.

## Kiem chung fallback KBS cho canary - 2026-09-26

- VCI canary 20 ma tra 0 record EOD cho phien 25-09; mot so ma gap `fetch failed`.
- KBS fallback da duoc thu tren cung danh sach nhung bi `SSLCertVerificationError` tai endpoint KBSEC va mot so connection reset; da dung canary, khong ghi du lieu khong xac minh.
- Ket luan van hanh: giu missing cho den khi provider co the tra record hop le; khong dung gia 24-09 de lap vao phien 25-09. Can fix CA trust/worker KBS rieng truoc khi mo rong fallback.

## Circuit-break cho backfill - 2026-09-26

- Script `backfill-vnstock-session.cjs` tu dung sau 5 batch lien tiep provider loi hoac tra rong, luu `stopped_early` vao evidence va cho phep lan sau tiep tuc tu danh sach missing.
- Muc nay ngan viec retry hang tram ma khi upstream dang mo circuit; co the dieu chinh bang `VNSTOCK_BACKFILL_STOP_AFTER` khi provider da on dinh.

## Phan loai missing EOD theo lich su - 2026-09-26

- Quality endpoint da tra `missing_breakdown`: `previous_session`, `stale_history`, `never_seen` de phan biet gap provider cua phien moi voi ma chua tung co lich su.
- Coverage hien tai **211/551**; 340 missing gom **163** ma co phien 24-09, **97** ma co lich su cu hon, **80** ma chua tung co EOD trong database.
- Overlay hien thi phan loai nay de khong danh dong toan bo missing la cung mot loi retry.

## Canary VIX phien 2026-09-25 - 2026-09-26

- VIX thuoc nhom `previous_session`: listed HSX, co 427 ban ghi, ngay gan nhat truoc do la 2026-09-24.
- VCI canary rieng cho VIX da tra hop le va insert 1 ban ghi phien 2026-09-25: close **12,650**, volume **19,201,700**.
- Coverage tang tu **211/551** len **212/551**; VIX khong phai ma bi loai hay chua tung co lich su, ma la gap provider rieng cua phien moi.

## Canary nhom previous-session tiep theo - 2026-09-26

- Da thu 10 ma co latest EOD 24-09 bang VCI, batch 1 va stop-after 3 empty responses.
- SJG khôi phuc thanh cong 1 ban ghi; 5 ma dau tien khac tra rong nen circuit-break da dung truoc khi tiep tuc tao tai.
- Coverage tang **212/551 -> 213/551**; ket qua nay xac nhan gap co the khac nhau theo symbol, can retry don ma co gioi han thay vi chay batch lon.

## Ket luan canary ve ma thanh khoan thap - 2026-09-26

- SDT/SFN/SKH/SMA/STC co volume phien gan nhat rat thap (100-800) va VCI tra response rong cho 25-09; SJG cung nhom nhung co observation va da khôi phuc duoc.
- Khong du bang chung de xem response rong la provider outage cho tat ca ma; nhieu kha nang la `no_observation` do khong phat sinh giao dich, nhung van giu nhan stale cho den khi co xac nhan provider.
- Khong chèn gia 24-09 thanh row 25-09. Quality gate tiep tuc phan biet covered, previous_session va stale/never_seen; UI khong danh dau gia cu la EOD moi.

## Retry theo thanh khoan - 2026-09-26

- Canary 10 ma thanh khoan cao dau tien khôi phuc **10/10** (TPB, VCI, VSC, VRE, YEG, VTP, VCG, VCK, VC3, VPI).
- Dot mo rong 50 ma tiep theo khôi phuc them **32 ma** truoc khi VCI mo circuit; coverage tang **213/551 -> 245/551**, con **306 ma**.
- Da dung tien trinh khi circuit mo; khong tiep tuc retry mù. Chien luoc tiep theo la tiep tuc theo nhom thanh khoan sau khi provider reset, voi batch nho va stop-after.

## Scheduler retry uu tien thanh khoan - 2026-09-26

- Gap-retry scheduler da duoc nang cap: moi luot chi chon toi da 25 ma missing co volume phien gan nhat cao nhat (`VNSTOCK_EOD_GAP_RETRY_LIMIT`), thay vi gui toan bo danh sach.
- Selection duoc ghi vao evidence (`selected_symbols`, `retry_limit`), van dung lock chung va circuit-break; backend da restart voi logic moi.
- Test controller + scheduler pass **16/16**; coverage tai luc restart **245/551**, con **306**.
