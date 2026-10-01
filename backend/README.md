# Backend: tham chiếu mã hiện tại

Hướng dẫn cài đặt, khởi chạy và kiểm tra nằm ở [QUICK_START](../QUICK_START.md). Tiến độ và công việc tiếp theo nằm ở [PROJECT_STATUS](../docs/PROJECT_STATUS.md) và [ROADMAP](../docs/ROADMAP.md).

## Thành phần

| Mã nguồn | Trách nhiệm |
| --- | --- |
| [src/app.js](src/app.js) | Khởi tạo Express, middleware, kết nối database, cache và routes; lắng nghe PORT, mặc định 5000 |
| [src/models/index.js](src/models/index.js) | Nạp models và thiết lập associations trên Sequelize instance của models |
| [src/controllers/stockController.js](src/controllers/stockController.js) | Router nhận cacheService qua factory; query models và kiểm tra dữ liệu cập nhật bằng Joi |
| [src/services/cacheService.js](src/services/cacheService.js) | Cache JSONB trong PostgreSQL |
| [src/jobs/cacheCleanupJob.js](src/jobs/cacheCleanupJob.js) | Dọn cache mỗi giờ ở phút 00 |
| [src/middleware/requireAdmin.js](src/middleware/requireAdmin.js) | Kiểm tra khóa quản trị |
| [src/migrations](src/migrations) | Schema migration; portfolio provenance ở 012, mã sàn/trạng thái niêm yết ở 013, thời điểm kiểm tra ở 014 |
| [src/seeders](src/seeders) | Dữ liệu minh họa với ID cố định |
| [.sequelizerc](.sequelizerc) | Đường dẫn cấu hình CLI, migrations và seeders |

app.js kiểm tra kết nối, tạo CacheService(sequelize), khởi tạo cleanup job, rồi mount stockController(cacheService) vào /api/stocks. Mã tích hợp đã có; không cần tạo lại app.js hoặc gọi sequelize.sync({ alter: true }). app.js và models hiện có Sequelize instance riêng.

## API đang triển khai

| Method | Đường dẫn | Hành vi |
| --- | --- | --- |
| GET | /api/health | success, message, timestamp; không kiểm tra lại database theo request |
| GET | /api/stocks | Danh sách cổ phiếu, sàn/trạng thái niêm yết, giá gần nhất, cache 5 phút |
| GET | /api/stocks/breadth/history | Chuỗi A/D EOD theo 1–60 session, tùy chọn sàn, cache 5 phút; trả continuity và không nội suy dữ liệu thiếu |
| GET | /api/stocks/:id | Chi tiết, sàn/trạng thái niêm yết và tối đa 20 giá, mới nhất trước; cache 5 phút |
| GET | /api/stocks/:id/price | Giá gần nhất; cache 1 phút |
| PUT | /api/stocks/:id | Cập nhật name/code/industry/market_cap, xóa cache liên quan; cần khóa quản trị |
| GET | /api/cache/stats | Trả trực tiếp totalEntries, expiredEntries, byType |
| GET | /api/stocks/cache/stats | Trả thống kê trong { success, data } |
| POST | /api/cache/clear | Xóa toàn bộ cache; cần khóa quản trị |
| POST | /api/stocks/cache/clear | Xóa toàn bộ cache; cần khóa quản trị |

GET dữ liệu cổ phiếu trả { success, data, source }; source là cache hoặc database. Không áp dụng định dạng này cho mọi endpoint. Cổ phiếu không tồn tại trả 404; lỗi query trả 500; body cập nhật không hợp lệ trả 400.

Stock list/detail include nullable `exchange`, `listing_status` (`listed`, `delisted`, or `unknown`), and `listing_checked_at`. Listing metadata comes from VCI. Delisted symbols remain searchable and retain their historical prices; status does not remove or mutate price history. Apply migrations 013 and 014 before using these fields. `npm run sync:vnstock-listing` refreshes listing metadata only for codes already present in `stocks`; it does not create symbols or ingest prices. The weekday metadata-only scheduler runs at 15:15 Asia/Ho_Chi_Minh by default; configure `VNSTOCK_LISTING_SYNC_ENABLED=false` to disable it or set `VNSTOCK_LISTING_SYNC_CRON` and `VNSTOCK_LISTING_SYNC_TIMEZONE` to customize it. The full universe ingestion also updates listing metadata for rows it processes.

Khóa quản trị dùng Authorization: Bearer <ADMIN_API_KEY>. Auth/JWT, watchlist, portfolio, recommendations và analysis có các router riêng; API cổ phiếu không đại diện cho toàn bộ API ứng dụng.

## Cache

- set(key, value, ttlMinutes = 5, cacheType = 'general') dùng TTL theo **phút**.
- get(key) trả JSONB hoặc null nếu thiếu/hết hạn/lỗi.
- delete(key), deleteByType(type), clearAll() truyền lỗi lên caller khi xóa thất bại.
- cleanupExpired() trả số bản ghi xóa, hoặc 0 khi lỗi.
- getStats() trả totalEntries, expiredEntries, byType; khi lỗi trả các giá trị rỗng và ghi log.
- Danh sách dùng cache key `v8:stocks:<filters>`; chi tiết `v4:stock:<id>`; giá `stock:price:<id>`.
- Sau PUT, controller xóa cache chi tiết/giá của cổ phiếu và cache loại stock.

Đọc/ghi cache có thể thất bại mà truy vấn dữ liệu vẫn trả về. Xóa cache có thể gây response lỗi sau khi database đã cập nhật; đây chưa phải thao tác nguyên tử. Chưa có đo hiệu năng hay kiểm chứng khôi phục để kết luận sẵn sàng production.

## Cấu hình và kiểm tra

Các biến được mã hiện tại đọc gồm NODE_ENV, PORT, DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD, CORS_ORIGIN, ADMIN_API_KEY, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS và LOG_LEVEL. Compose truyền một tập biến riêng được khai báo trong [docker-compose.yml](../docker-compose.yml).

Role ứng dụng chỉ cần `CONNECT` trên database và `USAGE, CREATE` trên schema dùng cho migrations. Không cấp `CREATEDB` hoặc `SUPERUSER`; việc tạo database thuộc tài khoản quản trị/hạ tầng. Bộ kiểm thử cài đặt dùng schema tạm trong database hiện hữu khi role không có quyền tạo database.

Hợp đồng và ingestion dữ liệu thị trường được mô tả tại [docs/MARKET_DATA_CONTRACT.md](../docs/MARKET_DATA_CONTRACT.md). Mã ở `src/market-data/` gồm fixture nội bộ và `VnstockEodAdapter`. Adapter Vnstock chỉ nhận `fetcher`/bridge do môi trường cung cấp; chưa tự gọi mạng và mặc định license là nghiên cứu cá nhân.

Ingestion thật chạy bằng `npm run ingest:vnstock` (hoặc `node scripts/ingest-vnstock-eod.cjs`). Lệnh đọc các mã trong bảng `stocks` nếu không đặt `VNSTOCK_SYMBOLS`, dùng `VNSTOCK_FROM`/`VNSTOCK_TO` nếu có, ghi qua `MarketDataIngestionService` và xóa cache cổ phiếu sau khi dữ liệu thay đổi. Scheduler trong `app.js` bật mặc định để không bỏ sót phiên EOD; đặt `VNSTOCK_EOD_ENABLED=false` để tắt rõ ràng. Cron mặc định là `30 10 * * 1-5` theo `Asia/Ho_Chi_Minh`.

Trạng thái lần chạy gần nhất có ở `GET /api/market-data/ingestion/latest`. Retry bridge dùng `VNSTOCK_RETRIES` (2), timeout `VNSTOCK_TIMEOUT_MS` (45000) và backoff `VNSTOCK_BACKOFF_MS` (500); mỗi provider/source/interval chỉ có một run active trong process.

Nếu worker Vnstock trả HTTP lỗi cho EOD/intraday, bridge giữ lại tối đa 400 ký tự mô tả upstream trong log để hỗ trợ chẩn đoán; query parameter chứa `api_key`, `token` hoặc `key` được che trước khi ghi log.

`npm run verify:quote-freshness` đo tuổi `observed_at` cho tối đa 30 mã (mặc định FPT/SSI/VCB/HPG/BSR) qua API ứng dụng và ghi JSON evidence. Chỉ áp ngưỡng stale khi đang trong phiên sáng/chiều theo giờ Việt Nam; ngoài giờ vẫn lưu tuổi quote nhưng không kết luận stale. Có thể đổi danh sách bằng `QUOTE_PROBE_SYMBOLS` và API bằng `QUOTE_API_URL`.

Backend tự chạy probe giới hạn 5 mã lúc 09:35 và 13:35 các ngày trong tuần theo `Asia/Ho_Chi_Minh`. Đổi lịch bằng `QUOTE_FRESHNESS_CRON`, múi giờ bằng `QUOTE_FRESHNESS_TIMEZONE`; đặt `QUOTE_FRESHNESS_ENABLED=false` để tắt. Job bỏ qua lượt chồng lấn. Nếu không quote nào mang ngày phiên Việt Nam hiện tại, kết quả được ghi là chưa đủ căn cứ (có thể ngày nghỉ hoặc nguồn cũ) và không gắn nhãn stale.

Để bổ sung phiên EOD bị thiếu, đặt `VNSTOCK_BACKFILL_DATE=YYYY-MM-DD` rồi chạy `npm run backfill:vnstock-session`; lệnh chỉ cập nhật các mã đã tồn tại, dùng khóa upsert idempotent, chạy lô 1–10 mã (mặc định 1 để giảm lỗi worker khi gọi liên tiếp) và ghi evidence. Mã không được provider trả về vẫn được liệt kê là thiếu; lệnh không tạo giá giả.

Đối chiếu hai nguồn chạy bằng `npm run reconcile:vnstock`; mặc định so sánh `vci` với `kbs` trên nhóm mã thử nghiệm. Kết quả được lưu vào `market_data_reconciliation_runs` và đọc qua `GET /api/market-data/reconciliation/latest`. Đây chỉ là kiểm tra nội bộ; chưa cấp quyền public dữ liệu.

Ứng viên thứ hai cho cá nhân là EODHD: đặt `EODHD_API_KEY` và `EODHD_SYMBOL_SUFFIX`, chạy `npm run verify:eodhd` để kiểm tra key/coverage rồi mới chạy `npm run reconcile:eodhd`. Adapter dùng EOD API, không ingest vào `stock_prices`; cần tuân thủ điều khoản personal-use. Không ghi API key vào Git hoặc log.

Template .env.example còn chứa biến dự kiến. DATABASE_URL không thay thế DB_*; CACHE_DEFAULT_TTL và CACHE_CLEANUP_INTERVAL_HOURS chưa điều khiển TTL/lịch cron trong mã. Khai báo khóa AI hoặc JWT không tự bật tính năng.

Helmet, CORS và rate limiting được gắn trong app.js; Winston ghi console. Chưa có cấu hình ghi file, audit request đầy đủ hay monitoring hiệu năng.

Test dùng mock nằm cạnh mã: [cacheService.test.js](src/services/cacheService.test.js) và [stockController.test.js](src/controllers/stockController.test.js).

[scripts/verify-postgres.cjs](scripts/verify-postgres.cjs) kiểm tra PostgreSQL thật trong schema ngẫu nhiên: chạy migrations, TTL/cleanup, cache miss/hit và invalidation sau PUT qua router với models/cache thật. Các connection của bài kiểm tra đặt search_path chỉ tới schema thử. Script không khởi động app.js hoặc cron và không kiểm chứng toàn bộ middleware/startup của server. Schema thử được xóa trong finally.

Xem lệnh kiểm tra trong QUICK_START và kết quả có ngày trong PROJECT_STATUS. Script lint tồn tại nhưng chưa có cấu hình ESLint trong workspace; chưa coi đây là kiểm tra đã đạt.

## Current quote endpoints

- `GET /api/stocks`: default page size is 200, maximum 500; pagination total is the database count.
- Stock list/detail responses carry `exchange`, `listing_status`, and `listing_checked_at` after migrations 013–014; the UI keeps delisted rows visible and shows the last metadata check on hover.
- `GET /api/stocks/quotes?symbols=FPT,VCB`: up to 200 symbols through the shared VCI intraday service. At most three one-symbol worker requests run concurrently; overlapping page requests share per-symbol work. Responses return available quotes within an 8-second wait budget while bounded pending work can populate the cache.
- `GET /api/stocks/data-quality?session=YYYY-MM-DD`: no-store quality gate for listed-symbol EOD coverage. It returns the selected/latest session, covered and missing counts, the missing symbol list, a `ready` flag, and live quote-provider health. Consumers must use this status before treating the EOD snapshot as complete.
- `GET /api/stocks/breadth/history?sessions=20&exchange=HSX`: cached EOD breadth history for 1–60 latest stored sessions. Each point contains advancing/declining/unchanged counts, A/D ratio, spread, coverage and directional volume. `traded_value` remains `null` unless the provider supplied observations. Consumers must inspect `continuity.status`; do not draw a connected timeline unless it is `continuous`.

## Personal portfolio and recommendation tracking

- `GET /api/portfolio` is user-scoped through JWT and returns positions, normalized `transactions`, plus `recommendation_entries` for BUY transactions explicitly added from a recommendation. Each ledger row includes symbol/name, side, numeric quantity/price/fees, timestamps, and `source=manual|recommendation`; the frontend can export these rows to CSV without a second request.
- `POST /api/portfolio/transactions` accepts optional `recommendation_context` for a BUY: source/model, generation time, score/rank, reference price, forecast horizon, and selected criterion weights. The context is validated and stored as JSONB; regular/manual transactions remain valid with a null context.
- `POST /api/portfolio/transactions/import` accepts at most 500 normalized rows and defaults to `dry_run=true`. Preview returns `valid`, `row_count`, and row/field errors without writing. Commit with `dry_run=false` repeats symbol, numeric, duplicate and chronological position validation inside one Sequelize transaction, locks the portfolio ledger, then performs one `bulkCreate`; any validation/database failure leaves the batch unwritten. Imported rows are manual transactions and never inherit recommendation provenance.
- `PUT /api/portfolio/transactions/:transactionId` edits side, quantity, price, fees and trade time without changing the stock or recommendation provenance. It locks the authenticated portfolio and complete ledger, validates the resulting chronological position timeline, and only then updates inside the same Sequelize transaction. A recommendation-linked row must remain a BUY.
- `DELETE /api/portfolio/transactions/:transactionId` requires `{ "confirmed": true }`. It performs the same authenticated lock and full remaining-timeline validation before deletion; removing an earlier BUY is rejected when a later SELL would exceed the historical position.
- Portfolio recommendation entries compare the recommendation reference price with the EOD close after the configured number of sessions. They stay pending until that horizon exists. The frontend separately compares current intraday/EOD price with the user's recorded transaction price.
- Migration `012_add_portfolio_recommendation_context` adds the nullable ledger field. Apply it with `npm.cmd run migrate`; rollback removes only that field. Existing transactions are not assigned recommendation provenance retroactively.
- `GET /api/stocks/:id/quote`: the same shared service for one stored stock; 503 if no valid quote is available. Portfolio valuation uses this same cache with a 1.5-second wait budget; ledger positions remain available with explicitly labeled EOD fallback.
- Intraday trade prices are normalized from thousands of VND to VND/share. Responses retain `volume_type=trade`, `observed_at`, and `fetched_at`; trade volume is not displayed as session volume. Reference-price change may be null.
- Fresh cache TTL is 10 seconds; cached quotes can survive transient errors for at most 90 seconds in the same Vietnam session, with `cached`/`stale` flags and unchanged timestamps. Worker calls time out after 6 seconds; failures have a 5-second cooldown. Responses disable browser caching. `REALTIME_QUOTES_ENABLED=false` disables both public quote endpoints.
- The intraday adapter uses VCI explicitly. EOD history is not modified by these quote requests.

### Personal overview ordering and source URLs

`GET /api/stocks?pinned=FPT,VCB` accepts a display preference of up to 200 unique uppercase alphanumeric symbols (maximum 10 characters each). Matching rows sort first, followed by the requested sort order and pagination. Search/sector/exchange filters still apply; supported exchange values are `HSX`, `HNX`, and `UPCOM`. Cache keys include the normalized pinned set and exchange; this parameter does not grant access to any user's portfolio or Watchlist. The frontend derives it from the authenticated user's positive positions and Watchlist.

`GET /api/stocks/:id/analysis` preserves `source_url` in each verified `external_factors.factors` entry so the UI can link back to the source. No schema migration is needed; the URL is already stored on external factors.

Recommendation snapshots use `short_term_rule_v2` metadata. `rationale.evidence` separates objective technical history, verified macro factors, verified positive/negative news, independently verified sentiment, user supplied subjective constraints and policy gates. Only technical evidence contributes to the current score; unavailable or unverified groups are retained as evidence state and excluded from scoring. The latest snapshot and forward evaluation are presented in the frontend's dedicated Recommendations tab.

Snapshot generation joins verified `ExternalFactor` rows by symbol (and global factors with no symbol), requiring source and publication time. Unverified news remains excluded; no sentiment score is inferred from headlines or database presence.

`npm run backfill:vnstock-session` backfills one Vietnam session date through the idempotent EOD ingestion path. Set `VNSTOCK_BACKFILL_DATE=YYYY-MM-DD`; optionally set `VNSTOCK_BACKFILL_SYMBOLS=FPT,SSI` to retry a specific existing-symbol subset. It writes timestamped evidence under `backend/evidence/`, checks missing coverage within the selected scope, retries transient exceptions, and continues after a symbol exhausts retries. A provider response with zero records is reported as missing coverage, not treated as proof the security did not trade.

`npm run audit:chart-history` performs a read-only database audit for chart history. `CHART_AUDIT_DATE=YYYY-MM-DD` selects the session to check (defaults to `2026-09-21`). The report records per-symbol history coverage, empty histories, duplicate local trading dates, and legacy rows without an observation timestamp. It writes timestamped evidence under `backend/evidence/` and does not call the rate-limited public API or alter market data.

`npm run probe:eodhd-session` checks date coverage from the configured EODHD account without writing price rows. Set `EODHD_FROM`, `EODHD_TO`, and `EODHD_PROBE_SYMBOLS` (maximum 30; requests are paced). It records returned session dates only, treats provider 404 as no coverage, and writes local evidence. This is a coverage probe, not permission to redistribute or ingest data; confirm the account's license terms before persisting EODHD prices.

## EOD session coverage and scheduled retry — 2026-09-25

The EOD scheduler audits persisted `vnstock` / `1d` rows for the target Vietnam session, then runs one additional ingestion pass for missing symbols for that exact date. Monday targets Friday; exchange holidays are not inferred and may remain unverified gaps. The existing daily cron is unchanged. Runs cannot overlap within the same server process; this is not a distributed lock.

The scheduler runs at `30 16 * * 1-5` in `Asia/Ho_Chi_Minh` by default, after the regular session closes. It rolls Saturday/Sunday and dates listed in `VNSTOCK_HOLIDAYS` (comma-separated `YYYY-MM-DD` values) back to the latest completed weekday. Configure the holiday list for each calendar year so Tet, Hung Kings Commemoration, and observed national holidays do not trigger a false current-session ingest. A provider outage remains an explicit coverage gap and is not silently treated as a holiday.

Sequential ingestion batches pause for `VNSTOCK_EOD_BATCH_DELAY_MS` (default 1000 ms). Exception retries use exponential backoff from `VNSTOCK_EOD_RETRY_DELAY_MS` (default 1500 ms), capped at 30 seconds. Partial-response fallback also waits before each symbol request. Scheduled evidence is written to `backend/evidence/eod-scheduled-<session>-<timestamp>.json`, including before/after coverage and missing symbols. Missing records are not proof of no trading. `audit:chart-history` now counts only Vnstock EOD, excluding intraday observations.

Restart the backend to load scheduler changes after any active ingestion completes. No schema migration is required.

The stopped task exposes an awaitable `runOnce()` for controlled verification using the same scheduled callback. The verification command described in QUICK_START returns exit code 1 when target-session coverage remains incomplete, even if all provider calls return HTTP success. Evidence records missing symbols explicitly.

`liveQuoteService` intentionally serializes Vnstock worker calls because the worker can reset concurrent intraday requests. It tries the HTTP worker, then the local Python bridge, then `VNSTOCK_SOURCE_FALLBACK` when configured. The API may return a partial map quickly; frontend retries missing symbols after 5 seconds. A valid intraday trade is identified by `interval=intraday`, even when `volume_type=trade`.

`GET /api/stocks/quotes/status` exposes the in-process provider health (`ready`, `degraded`, or `circuit_open`), recent provider timing/error, and queue/cache counts. After three consecutive fetch failures the shared quote service opens a 30-second circuit so Overview, Detail, and Portfolio do not keep piling requests onto a reset worker; successful quotes close the circuit again.
