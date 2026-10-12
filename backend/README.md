# Backend: tham chiếu mã hiện tại

Hướng dẫn cài đặt, khởi chạy và kiểm tra nằm ở [QUICK_START](../QUICK_START.md). Tiến độ và công việc tiếp theo nằm ở [PROJECT_STATUS](../docs/PROJECT_STATUS.md) và [ROADMAP](../docs/ROADMAP.md).

## Thành phần

Hồ sơ: migration 026 bổ sung `full_name`, `phone`, `date_of_birth` nullable; migration 027 bổ sung `preferred_language` và `timezone` có default. `/api/auth/profile` PATCH chỉ cập nhật các field hồ sơ được gửi; null xóa field tùy chọn, email/role không chỉnh sửa. Các response auth user gồm trường mới. Validation/ownership và giới hạn tại [thiết kế hồ sơ](../docs/PERSONAL_PROFILE_DESIGN.md).

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
| GET | /api/stocks | Danh sách cổ phiếu, lọc sàn/ngành/trạng thái niêm yết, giá gần nhất, cache 5 phút |
| GET | /api/stocks/export.csv | CSV EOD read-only theo cùng q/sector/exchange/coverage/sort/direction/pinned, tối đa 2.000 dòng, không cache |
| GET | /api/stocks/breadth/history | Chuỗi A/D và volume breadth EOD theo 1–60 session, tùy chọn sàn/ngành, cache 5 phút; trả continuity và không nội suy dữ liệu thiếu |
| GET | /api/stocks/:id | Chi tiết, sàn/trạng thái niêm yết và tối đa 20 giá, mới nhất trước; cache 5 phút |
| GET | /api/stocks/:id/price | Giá gần nhất; cache 1 phút |
| PUT | /api/stocks/:id | Cập nhật name/code/industry/market_cap, xóa cache liên quan; cần khóa quản trị |
| GET | /api/cache/stats | Trả trực tiếp totalEntries, expiredEntries, byType |
| GET | /api/stocks/cache/stats | Trả thống kê trong { success, data } |
| POST | /api/cache/clear | Xóa toàn bộ cache; cần khóa quản trị |
| POST | /api/stocks/cache/clear | Xóa toàn bộ cache; cần khóa quản trị |

GET dữ liệu cổ phiếu trả { success, data, source }; source là cache hoặc database. Không áp dụng định dạng này cho mọi endpoint. Khi quote intraday không có, danh sách tính `change` từ giá tham chiếu do provider lưu hoặc hai phiên EOD gần nhất; nếu thiếu giá gốc thì giữ `null` thay vì suy diễn. Cổ phiếu không tồn tại trả 404; lỗi query trả 500; body cập nhật không hợp lệ trả 400.

`GET /api/stocks/export.csv` trả `text/csv; charset=utf-8` có BOM và chống formula injection. Query `columns=name,volume` chọn hai cột tùy chọn; Mã, Giá EOD và Nguồn dữ liệu luôn có. Response khai báo `X-Export-Count`, `X-Export-Limit=2000` và `X-Export-Truncated`; endpoint chỉ dùng giá EOD đã lưu, không gọi quote provider và không tải universe vào state frontend. Quyền tải/redistribute dữ liệu vẫn phải tuân theo license provider của môi trường triển khai.

Stock list/detail include nullable `exchange`, `listing_status` (`listed`, `delisted`, or `unknown`), and `listing_checked_at`. Listing metadata comes from VCI. Delisted symbols remain searchable and retain their historical prices; status does not remove or mutate price history. Apply migrations 013 and 014 before using these fields. `npm run sync:vnstock-listing` refreshes listing metadata only for codes already present in `stocks`; it does not create symbols or ingest prices. The weekday metadata-only scheduler runs at 15:15 Asia/Ho_Chi_Minh by default; configure `VNSTOCK_LISTING_SYNC_ENABLED=false` to disable it or set `VNSTOCK_LISTING_SYNC_CRON` and `VNSTOCK_LISTING_SYNC_TIMEZONE` to customize it. The full universe ingestion also updates listing metadata for rows it processes.

Khóa quản trị dùng Authorization: Bearer <ADMIN_API_KEY>. Auth/JWT, watchlist, portfolio, recommendations và analysis có các router riêng; API cổ phiếu không đại diện cho toàn bộ API ứng dụng.

Watchlist hỗ trợ `GET /api/watchlist`, `POST /api/watchlist`, `PATCH /api/watchlist/:symbol` và `DELETE /api/watchlist/:symbol`. `PATCH` chỉ cập nhật bản ghi thuộc authenticated user, nhận `status` trong `WATCHING | RESEARCHING | PAUSED` và `note` tối đa 280 ký tự; response gồm `metadata_updated_at` của lần sửa cuối. Đây là ghi chú/trạng thái cá nhân, không phải tín hiệu hay khuyến nghị đầu tư.

Auth runtime vẫn phát và chấp nhận Bearer JWT mặc định cho compatibility client. Browser frontend gửi `X-Auth-Mode: cookie-v1` khi login/register, nhận access/refresh HttpOnly cookie và CSRF cookie, không nhận token trong JSON. `POST /api/auth/refresh` rotation refresh + CSRF atomically; replay token liền trước thu hồi session. `POST /api/auth/logout` thu hồi server-side và xóa cookie, idempotent khi không có refresh cookie. Cookie-authenticated `POST/PUT/PATCH/DELETE` phải gửi `X-CSRF-Token` khớp cookie và hash session; Bearer compatibility không bị áp CSRF. Migrations 019–020 cung cấp session schema/rotation. Contract rollout nằm trong [AUTH_SESSION_DESIGN](../docs/AUTH_SESSION_DESIGN.md).

Khi `NODE_ENV=production`, backend từ chối khởi động nếu `JWT_SECRET` là giá trị mẫu/ngắn dưới 32 ký tự, `CORS_ORIGIN` rỗng/có wildcard/không phải exact HTTPS origin. Khi có allowlist, CORS bật credential và trả 403 cho browser origin ngoài danh sách; request server-side không có `Origin` vẫn được phép. Development không khai báo origin giữ wildcard nhưng không bật credential. `AUTH_ACCESS_EXPIRES_IN` điều khiển access cookie JWT, mặc định 15 phút.

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

Ingestion thật chạy bằng `npm run ingest:vnstock` (hoặc `node scripts/ingest-vnstock-eod.cjs`). Lệnh đọc các mã đang `listed` trong bảng `stocks` nếu không đặt `VNSTOCK_SYMBOLS`, dùng `VNSTOCK_FROM`/`VNSTOCK_TO` nếu có, ghi qua `MarketDataIngestionService` và xóa cache cổ phiếu sau khi dữ liệu thay đổi. Scheduler trong `app.js` bật mặc định để không bỏ sót phiên EOD; đặt `VNSTOCK_EOD_ENABLED=false` để tắt rõ ràng. Cron mặc định là `30 15 * * 1-5` theo `Asia/Ho_Chi_Minh`.

Trạng thái lần chạy gần nhất có ở `GET /api/market-data/ingestion/latest`. Retry bridge dùng `VNSTOCK_RETRIES` (2), timeout `VNSTOCK_TIMEOUT_MS` (45000) và backoff `VNSTOCK_BACKOFF_MS` (500); mỗi provider/source/interval chỉ có một run active trong process.

Nếu worker Vnstock trả HTTP lỗi cho EOD/intraday, bridge giữ lại tối đa 400 ký tự mô tả upstream trong log để hỗ trợ chẩn đoán; query parameter chứa `api_key`, `token` hoặc `key` được che trước khi ghi log.

Python worker dùng một semaphore chung cho listing, EOD, intraday và price board. `VNSTOCK_WORKER_MAX_CONCURRENCY` mặc định là 1 và bị chặn trong khoảng 1–4; tăng giá trị chỉ khi đã đo upstream ổn định. HTTP server vẫn nhận request đồng thời nhưng provider calls được xếp hàng qua gate này. Client ngắt kết nối không tạo traceback BrokenPipe/ConnectionAborted trong log; health trả `max_concurrency` đang cấu hình.

Compose build worker từ `Dockerfile.worker`, bind nội bộ `0.0.0.0:8787`, không publish cổng host và truyền `VNSTOCK_WORKER_URL=http://worker:8787` cho backend. Worker/backend/frontend/PostgreSQL có healthcheck và restart policy; EOD scheduler không tự bật chỉ vì worker tồn tại.

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

- `GET /api/stocks`: default page size is 200, maximum 500; pagination total is the database count. Query `listing_status=listed|delisted|unknown` giới hạn trạng thái niêm yết; cache key và pagination phản ánh giá trị đã chuẩn hóa.
- Stock list/detail responses carry `exchange`, `listing_status`, and `listing_checked_at` after migrations 013–014; the UI keeps delisted rows visible and shows the last metadata check on hover.
- `GET /api/stocks/quotes?symbols=FPT,VCB`: up to 200 symbols through the shared VCI intraday service. At most three one-symbol worker requests run concurrently; overlapping page requests share per-symbol work. Responses return available quotes within an 8-second wait budget while bounded pending work can populate the cache.
- `GET /api/stocks/data-quality?session=YYYY-MM-DD`: no-store quality gate for listed-symbol EOD coverage. It returns the selected/latest session, covered and missing counts, the missing symbol list, a `ready` flag, and live quote-provider health. Consumers must use this status before treating the EOD snapshot as complete.
- `GET /api/stocks/breadth/history?sessions=20&exchange=HSX&sector=technology`: cached EOD breadth history for 1–60 latest stored sessions. `exchange` và `sector` là tùy chọn; sector dùng cùng taxonomy với stock list, ưu tiên mã được phân loại tường minh rồi mới fallback theo industry. Universe chỉ gồm `listing_status=listed`; response lặp lại `exchange`, `sector` và `sector_label`. Each point contains advancing/declining/unchanged counts, A/D ratio, spread, coverage and volume grouped by the same price direction. Volume breadth includes observation count, total/directional/net volume, net percentage, volume A/D ratio, advancing-volume share and a measured `confirmation|positive_divergence|negative_divergence|neutral|unavailable` signal. Divergence compares symbol-count breadth with directional-volume breadth; it is not an index/benchmark comparison and not aggressor-side order flow. `traded_value` remains `null` unless the provider supplied observations. Consumers must inspect `continuity.status`; do not draw a connected timeline unless it is `continuous`.

## Personal portfolio and recommendation tracking

- `GET /api/portfolio` is user-scoped through JWT and returns currently open `positions`, fully sold `closed_positions`, `position_counts`, normalized `transactions`, plus `recommendation_entries` for BUY transactions explicitly added from a recommendation. Its snapshot `performance` uses `weighted_average_cost_basis_v1`: market value, open/disposed cost basis, realized/unrealized/total P&L, return on cost, price coverage and `empty|partial|complete`. Standardized TWR/MWR belongs to the history endpoint below. Closed positions are derived from the same ledger and expose realized P/L and the latest closing trade time; they do not fabricate current market value or unrealized P/L. Each ledger row includes symbol/name, side, numeric quantity/price/fees, timestamps, and `source=manual|recommendation`; the frontend can export these rows to CSV without a second request.
- Migration `024_create_portfolio_cash_flows` and `/api/portfolio/cash-flows` POST/PUT/DELETE manage external deposits and withdrawals within the authenticated portfolio. Amounts are positive and bounded; the type determines direction, future dates are rejected, notes are limited to 240 characters, and delete requires `{ "confirmed": true }`. `GET /api/portfolio` returns the normalized timeline and deposit/withdrawal/net totals separately from investment profit. These flows are recorded but are not yet applied to TWR/MWR.
- `GET /api/portfolio/performance/history?sessions=30` returns 2–260 stored Vietnam EOD sessions under `daily_close_twr_v1`. It rebuilds holdings, cost basis and cash from the authenticated ledger, treats external cash flows as beginning-of-session, requires an exact price for every held symbol, and withholds TWR for any partial session or negative reconstructed cash balance. It never calls a market-data provider. Confirmed supported portfolio events are applied at their payment/effective date before same-day trades.
- Migration `025_create_portfolio_events` adds the append-only foundation for cash/stock dividends, stock splits and rights issues. `GET/POST /api/portfolio/events` list and create user-scoped manual events; `/confirm`, `/cancel`, and `/correct` enforce lifecycle transitions. Manual input is always `PENDING/UNVERIFIED`; clients cannot claim provider provenance. Correction creates a pending replacement and supersedes the prior event atomically. Confirmed cash/stock dividends, whole-share splits and exercised rights are applied to daily valuation after reconciliation.
- Event creation and `GET /api/portfolio/events/:id/reconciliation` compare the recorded entitlement with holdings reconstructed through the end of `record_date` in `Asia/Ho_Chi_Minh`. Same-day trades are included. Confirmation returns 409 for a mismatch or impossible benefit amount. The response explicitly labels this `trade_date_end_of_day_proxy_v1` with `unverified_t_plus_settlement`; it is not proof of depository settlement. Reconciled events are still not applied to valuation until each event type has a tested accounting rule.
- `daily_close_twr_v1` applies confirmed cash dividend net amount to cash at the first stored session on or after `payment_date`. It exposes the amount as `dividend_income`, never `external_cash_flow`, so the return contributes to TWR. A due pending event or confirmed unsupported stock event makes subsequent points partial, records `unresolved_event_ids`, and withholds TWR.
- Confirmed stock dividends add exactly the reviewed `received_quantity`; confirmed splits multiply the held quantity by their ratio at `effective_date`, before same-day trades. Both preserve total cost basis and expose `stock_event_adjustments` with before/after quantity, cost basis and average cost. V1 accepts only whole-share results and never invents cash-in-lieu; a fractional result remains partial under `whole_share_only_v1_cash_in_lieu_not_inferred`.
- Confirmed rights issues apply only `exercised_quantity` at `effective_date`: cash decreases by `exercise_cash_amount`, while quantity and total cost basis increase by the confirmed exercised quantity and cash amount. The cash must equal `exercised_quantity × subscription_price` within VND rounding tolerance and is investment capital deployment, not an external cash flow. `exercised_quantity=0` is a valid no-op; the entitlement ratio never triggers automatic full exercise. Fractional exercised quantities remain unsupported in V1.
- The history response includes `mwr` under `xirr_actual_365_v1` with inception-to-terminal scope. Deposits are negative investor cash flows, withdrawals and terminal portfolio value are positive; investment events are represented only through terminal value. A rate is published only for exactly one root with a verified NPV residual. No-root, multiple-root, partial, insufficient-sign-change and post-terminal-flow cases return structured status/reason fields and a null `annualized_mwr_pct`; the API never selects an arbitrary root.
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

Snapshot generation joins verified `ExternalFactor` rows by symbol (and global factors with no symbol), requiring source and publication time. Snapshot evidence carries at most 10 unique citations only when `source_url` uses HTTP(S); each citation retains type, source, title and publication time. Unsafe/missing URLs and unverified rows are excluded. External citations remain context only and do not contribute to the technical score; no sentiment score is inferred from headlines or database presence.

## Advisor conversations

- `GET/POST /api/advisor/conversations` and `PUT/DELETE /api/advisor/conversations/:id` require JWT and scope every row by `user_id` from the token.
- A conversation stores a title, context `symbol|portfolio|market`, and at most 100 normalized user/AI messages. Citations accept only HTTP(S) URLs; clients cannot supply another user id.
- Retention keeps the 20 most recently updated conversations per user. Migration `018_create_advisor_conversations` creates the table and user/update-time index.

`npm run backfill:vnstock-session` backfills one Vietnam session date through the idempotent EOD ingestion path. Set `VNSTOCK_BACKFILL_DATE=YYYY-MM-DD`; optionally set `VNSTOCK_BACKFILL_SYMBOLS=FPT,SSI` to retry a specific existing-symbol subset. It writes timestamped evidence under `backend/evidence/`, checks missing coverage within the selected scope, retries transient exceptions, and continues after a symbol exhausts retries. A provider response with zero records is reported as missing coverage, not treated as proof the security did not trade.

`npm run audit:chart-history` performs a read-only database audit for chart history. `CHART_AUDIT_DATE=YYYY-MM-DD` selects the session to check (defaults to `2026-09-21`). The report records per-symbol history coverage, exchange/listing metadata, empty histories, a structured `never_seen_listed` group, duplicate local trading dates, and legacy rows without an observation timestamp. It writes timestamped evidence under `backend/evidence/` and does not call the rate-limited public API or alter market data.

`npm run probe:vnstock-history-gaps` performs a paced, read-only worker probe for a bounded symbol set. Set `VNSTOCK_PROBE_SYMBOLS`, with optional `VNSTOCK_PROBE_FROM`, `VNSTOCK_PROBE_TO`, and `VNSTOCK_PROBE_DELAY_MS` (default 750 ms). It compares current listing metadata, price-board trade/reference values, and the latest available EOD session, writes timestamped evidence, and never persists provider rows to PostgreSQL. The command is limited to 100 symbols and exits non-zero when any per-symbol request fails.

`npm run probe:eodhd-session` checks date coverage from the configured EODHD account without writing price rows. Set `EODHD_FROM`, `EODHD_TO`, and `EODHD_PROBE_SYMBOLS` (maximum 30; requests are paced). It records returned session dates only, treats provider 404 as no coverage, and writes local evidence. This is a coverage probe, not permission to redistribute or ingest data; confirm the account's license terms before persisting EODHD prices.

## EOD session coverage and scheduled retry — 2026-09-25

The EOD scheduler audits persisted `vnstock` / `1d` rows for the target Vietnam session, then runs one additional ingestion pass for missing symbols for that exact date. Monday targets Friday; exchange holidays are not inferred and may remain unverified gaps. The existing daily cron is unchanged. Runs cannot overlap within the same server process; this is not a distributed lock.

The scheduler runs at `30 15 * * 1-5` in `Asia/Ho_Chi_Minh` by default, 30 minutes after the regular session closes. Gap retries run every 15 minutes from 16:00 through 19:59 and fetch only missing symbols. It rolls Saturday/Sunday and dates listed in `VNSTOCK_HOLIDAYS` (comma-separated `YYYY-MM-DD` values) back to the latest completed weekday. Configure the holiday list for each calendar year so Tet, Hung Kings Commemoration, and observed national holidays do not trigger a false current-session ingest. A provider outage remains an explicit coverage gap and is not silently treated as a holiday.

Sequential ingestion batches pause for `VNSTOCK_EOD_BATCH_DELAY_MS` (default 1000 ms). Exception retries use exponential backoff from `VNSTOCK_EOD_RETRY_DELAY_MS` (default 1500 ms), capped at 30 seconds. Partial-response fallback also waits before each symbol request. Scheduled evidence is written to `backend/evidence/eod-scheduled-<session>-<timestamp>.json`, including before/after coverage and missing symbols. Missing records are not proof of no trading. `audit:chart-history` now counts only Vnstock EOD, excluding intraday observations.

Gap retries are fair across the current process lifetime: symbols with fewer attempts are selected first, while previous-session volume only orders symbols with the same attempt count. This prevents a repeatedly empty high-volume group from starving later missing symbols. Restarting the backend resets attempt counters but does not alter persisted prices or evidence.

Before applying that fair order, each gap retry makes a bounded, read-only VCI price-board probe (batches of at most 200, at most 600 missing symbols). A symbol is promoted only when price, accumulated volume, and source timestamp all prove trading in the target Vietnam session. The promoted symbol is still persisted exclusively through the EOD ingestion adapter; price-board rows are never converted into daily candles. A partial or total price-board failure is recorded in the retry evidence and falls back to the fair EOD order without failing the retry. Set `VNSTOCK_EOD_TRADE_PRIORITY=false` to disable this signal or `VNSTOCK_EOD_TRADE_PRIORITY_TIMEOUT_MS` to change its per-batch timeout (default 10000 ms, minimum 1000 ms).

Default EOD ingestion and coverage operate on rows whose `listing_status` is `listed`. Delisted or unknown rows remain in PostgreSQL for historical integrity but do not consume scheduled ingestion/retry capacity. An explicitly supplied symbol list remains explicit, which allows bounded diagnostics without silently rewriting operator intent.

Restart the backend to load scheduler changes after any active ingestion completes. No schema migration is required.

The stopped task exposes an awaitable `runOnce()` for controlled verification using the same scheduled callback. The verification command described in QUICK_START returns exit code 1 when target-session coverage remains incomplete, even if all provider calls return HTTP success. Evidence records missing symbols explicitly.

`liveQuoteService` intentionally serializes Vnstock worker calls because the worker can reset concurrent intraday requests. It tries the HTTP worker, then the local Python bridge, then `VNSTOCK_SOURCE_FALLBACK` when configured. The API may return a partial map quickly; frontend retries missing symbols after 5 seconds. A valid intraday trade is identified by `interval=intraday`, even when `volume_type=trade`.

`GET /api/stocks/quotes/status` exposes the in-process provider health (`ready`, `degraded`, or `circuit_open`), recent provider timing/error, and queue/cache counts. After three consecutive fetch failures the shared quote service opens a 30-second circuit so Overview, Detail, and Portfolio do not keep piling requests onto a reset worker; successful quotes close the circuit again.

`GET /api/stocks/data-quality` reads the newest valid evidence across both `eod-scheduled-*` and `eod-retry-*` artifacts for the requested session. The `eod_retry` block identifies the artifact, run mode, timestamp, recorded universe/coverage/remaining counts, completion state, and current in-process runtime. Corrupt or partially written evidence is ignored so an operational artifact cannot make the quality endpoint unavailable.

For gap-retry artifacts, `eod_retry` also exposes bounded operational counters: `last_run_requested`, `last_run_selected`, `last_run_selected_traded`, and `last_run_trade_priority` (`enabled`, probed/batch/failure/match counts, and `had_error`). Raw provider errors and the selected-symbol list are deliberately not returned by this public endpoint; use the local evidence artifact for diagnosis.
## Cập nhật tên hiển thị

Tên phiên: migration 023 thêm auth_sessions.label nullable. PATCH /api/auth/sessions/label nhận session_id UUID và label string/null, tối đa 80 ký tự sau trim, từ chối ký tự điều khiển; chuỗi trắng/null xóa nhãn. Yêu cầu cookie auth/CSRF, chỉ sửa phiên thuộc user còn hiệu lực, chưa revoke. Không có phiên hợp lệ trả 404. GET sessions trả thêm label, không đổi dữ liệu credential.

POST /api/auth/sessions/revoke nhận session_id UUID và thu hồi đúng một phiên thuộc user hiện tại. Yêu cầu cookie session và CSRF; không cho thu hồi current qua endpoint này (409, dùng logout). UUID sai trả 400; không có phiên sở hữu còn chưa revoke trả 404, không phân biệt phiên của user khác. Không sửa Bearer token.

Quản lý phiên: GET /api/auth/sessions trả data.sessions với id/current/created_at/last_used_at/expires_at (hạn sớm hơn giữa idle/hard expiry), has_more, next_cursor và can_revoke_others. Chỉ lấy session của user đang xác thực, còn hiệu lực và chưa revoke; mỗi trang tối đa 50 phiên khác cộng phiên hiện tại. Truyền next_cursor vào query cursor để lấy tiếp; cursor sai trả 400. Thứ tự created_at giảm dần rồi id tăng dần không bị thay đổi khi gia hạn phiên. Phiên hiện tại được trả trên mỗi trang; client gộp theo id. Không trả token/hash.

POST /api/auth/sessions/revoke-others yêu cầu cookie session và CSRF; revoke toàn bộ session chưa revoke của cùng user trừ phiên hiện tại, trả revoked_count. Legacy Bearer nhận 409 khi gọi mutation; các token Bearer khác không bị ảnh hưởng bởi thao tác này, dùng đổi mật khẩu để vô hiệu toàn bộ credential cũ.

Đổi mật khẩu: POST /api/auth/password nhận current_password/new_password, requireAuth và CSRF khi dùng cookie. Mật khẩu mới tối thiểu 12 ký tự, tối đa 72 byte và khác mật khẩu cũ; giới hạn 5 request/15 phút/user trong bộ nhớ process. Migration 022 bắt buộc trước khi chạy mã mới. Hash/version và thu hồi sessions được commit cùng transaction; Bearer kiểm tra password_version mỗi request. Các token legacy thiếu pv chỉ hợp lệ ở version 0. Production nhiều instance cần shared rate-limit store.

`PATCH /api/auth/profile` yêu cầu đăng nhập và CSRF cho cookie auth. Payload phải có `display_name`: chuỗi sau trim dài 1–120 ký tự hoặc `null` để xóa. Thiếu trường, số, boolean, object, array và chuỗi trống trả 400 mà không sửa hồ sơ. Chỉ tên hiển thị được cập nhật; email, role và trạng thái xác thực không nhận từ payload.
### Recommendation outcome horizon

Migration 032 adds nullable `recommendations.evaluation_evidence`. Newly measured outcomes persist `recommendation_evaluation_v1` with evaluator generation time, provider/interval/timezone, horizon, selected observed dates, entry/target price metadata, return and outcome. Price observations later than the evaluator cutoff are ignored. Reporting requires this evidence to match the persisted result and current compatible price window; missing/tampered evidence is `evaluation_evidence_invalid` and excluded from statistics. Legacy rows remain null and are not backfilled. The JSONB is versioned but not independently signed or append-only.

Migration 033 adds nullable, unique `recommendation_runs.generation_key` for new snapshot contracts (`as_of`, horizon, provider, model). It intentionally leaves legacy keys null because legacy contract duplicates exist. New generation writes run, rows and persisted snapshot hash in one transaction; a concurrent unique conflict returns the winning existing snapshot. Each outcome/evidence update is transactional and conditional on `outcome='pending'`, so reports count only rows claimed by that evaluator.

Migration 034 adds nullable `recommendation_runs.input_provenance`. Scheduled generation reads stocks, EOD prices and verified external factors inside one PostgreSQL `REPEATABLE READ` transaction and persists a compact `recommendation_input_v1` record (read time, isolation, EOD session, provider, source contract counts and verified-factor count). Scheduled snapshots use EOD references only; intraday references are ignored. Provenance does not retain price values, is not separately hashed/append-only, and cannot make upstream ingestion/provider reads transactional.

Migration 035 adds nullable `input_provenance_sha256`. New snapshots canonicalize and hash input provenance before sealing a v2 snapshot hash; verification requires both hashes to match. A missing/tampered provenance record fails closed as `input_provenance_integrity_failed`. Legacy runs remain unmodified. This is tamper detection within the row, not an independent signature or append-only audit ledger.

Migration 036 creates `recommendation_evaluation_events`: hashed, unique-per-recommendation evaluation events with a PostgreSQL trigger rejecting updates and deletes. The evaluator writes the outcome/evidence and `evaluation_recorded` event in one transaction only after claiming a pending row. `npm run verify:recommendation-ledger` is a development-only rollback smoke for the hash and immutable trigger. The ledger is database append-only, not externally signed or exported yet.

`GET /api/recommendations/history/:id/evaluation-ledger` is a read-only audit endpoint for one existing snapshot. It returns the stored event payload and SHA-256 alongside an independently recomputed integrity state (`verified` or `invalid`); an empty event list is valid for a snapshot that has not produced an evaluated outcome, while an unknown snapshot returns `recommendation_history_not_found` (404). It never creates, repairs, or backfills ledger events.

`GET /api/recommendations/lifecycle-readiness` is a public, read-only explanation of scheduled snapshot state. It returns the configured provider and one of `awaiting_eod`, `ready_to_generate`, `snapshot_missing_hash`, `snapshot_integrity_failed`, or `ready_to_evaluate`, with explicit generate/evaluate permissions. It only reads the newest EOD observation and the current-session contract run; it never starts a job or changes recommendation data.

`npm run audit:recommendation-ledger` takes one PostgreSQL `REPEATABLE READ`, `READ ONLY` snapshot and verifies every event payload hash plus agreement with the current recommendation outcome/evidence. It reports event/payload identifier mismatches and row drift without repairing anything. Exit 0 means no invalid events; exit 2 means audit findings; exit 1 is an execution failure. An empty ledger is a valid zero-event report, not evidence that outcomes were evaluated.

Run `npm run check:recommendation-lifecycle` before generation or lifecycle verification. It is read-only and reports whether the provider's latest EOD session matches the current Vietnam session, then whether the contract snapshot is absent, unsealed, integrity-failed or ready to evaluate. Only when it reports `ready_to_generate` should scheduled generation be attempted; only `ready_to_evaluate` permits the mutating lifecycle verifier.

`npm run check:recommendation-scheduler` is also read-only by default: it reports scheduler enablement, latest snapshot integrity and readiness without replacing an evidence artifact. Set `RECOMMENDATION_SCHEDULER_OUTPUT` to an explicit path only when an operator intentionally needs to retain a checkpoint; a non-ready report exits with code 2.

The backend additionally logs a read-only recommendation lifecycle checkpoint at `40 16 * * 1-5` Asia/Ho_Chi_Minh by default, five minutes before the evaluator. It uses the same bounded read as the lifecycle API/CLI and only reports the gate; set `RECOMMENDATION_LIFECYCLE_CHECK_ENABLED=false` to opt out, or override its cron/timezone with `RECOMMENDATION_LIFECYCLE_CHECK_CRON` and `RECOMMENDATION_LIFECYCLE_CHECK_TIMEZONE`. It never starts generation or evaluation.

Snapshot generation seals the reloaded PostgreSQL representation (including joined stock code), not the pre-insert payload or a spread Sequelize instance. `npm run verify:recommendation-hash` runs a development-only synthetic generation/round-trip/tamper check using real models and always rolls back its transaction. It does not retain fixture runs or backfill legacy hashes. A missing/incomplete reload leaves the run unsealed and fails; generation itself is not yet an atomic transaction.

History list, `/api/recommendations/history/:id`, model/sector summary and calibration apply the same read-time eligibility guard. Detail rows retain stored outcome/return and add `statistics_eligible`, `measurement_status` (`pending`, `excluded`, `eligible`), `exclusion_reasons` and, for measured rows, `observed_session_count`. `measured_count` now means eligible outcomes; `excluded_count` is separate from `pending_count`. Hit-rate, mean, distribution and calibration exclude ineligible rows; no eligible results means null rate/mean, not zero.

Eligibility requires a matching persisted snapshot hash (the development verification bypass is not accepted), N distinct Vietnam-local EOD dates from the run provider, compatible unadjusted VND/share positive prices, no conflicting duplicate closes, an exact Nth observed-date match to evaluated_at, and a matching four-decimal return and sign. Price reads are bounded by measured stock IDs and observation date range. This does not verify official calendar completeness or freeze evaluation evidence; historical database records are never rewritten. See [recommendations design](../docs/RECOMMENDATIONS_DESIGN.md).

Run `npm run audit:recommendation-prices` for a read-only development audit. It uses a consistent PostgreSQL read-only transaction and reports invalid dates/prices, duplicate groups within matching provenance, missing snapshot hashes and measured outcomes with fewer distinct observed dates than their horizon. Dates use Asia/Ho_Chi_Minh. This screening combines providers/intervals for horizon counts; it does not certify source compatibility, hash integrity or calendar coverage, and never repairs historical outcomes. It loads all price rows into memory; production-scale use has not been validated.

Evaluation and reporting share `observationWindow`: N distinct Asia/Ho_Chi_Minh dates strictly after `as_of`, from the run's provider and interval `1d`. Equivalent same-day duplicates count once, with the earliest timestamp used deterministically. All prices in the first N observed dates must be positive finite unadjusted VND/share; incompatible metadata or conflicting duplicates keep the outcome pending instead of skipping to later prices. Missing provider fails closed. Existing stored outcomes are not rewritten. This does not certify calendar completeness or enforce a current-time cutoff; versioned evaluation evidence and evaluation cutoff remain planned.
# Forecast data audit

CLI output includes a `summary` with research scope, origin/label exclusions, evaluated/unavailable folds, scored samples and invalidated outcomes per horizon. `market_accuracy_verified` remains false. End-to-end CLI tests (`npx jest src/services/forecastCli.test.js --runInBand`) spawn Node and use temporary synthetic artifacts, validating deterministic output and refusal of tampered payloads; an environment permitting child processes is required.

Artifact payload may include `reviewCutoff`, no earlier than any replay origin/evaluation cutoff. Replay retains original samples and emits `outcome_audits`; superseded or revoked evidence excludes the corresponding outcome from recalculated baselines. Default review time is the final evaluation cutoff. These are reviewed metrics, not historical as-issued metrics. Origin manifests track member history and the frozen calendar; horizon manifests track forward observations actually used. Unrelated symbols or observations outside that horizon do not invalidate its outcome. Later arrivals do not rewrite the frozen membership or first eligible label.

Research artifact import: `npm run report:forecast-research -- --input <artifact.json>`. Supply the `forecast_research_artifact_v1` envelope with payload and canonical SHA-256 generated by `artifactHash` in `forecastArtifact.js`; see the forecast design for fields. Input is read-only, limited to 16 MiB and bounded collections. Validation or file errors exit 2. Reports retain the artifact hash and synthetic flag; checksum integrity does not authenticate source evidence. The existing --fixture mode remains available.

`forecastEvidenceStore.js` provides an in-memory revision view for explicitly supplied `forecast_evidence_bundle_v1` bundles. Pass the store and `calendarKey` to `replayForecastDataset` to adapt evidence at each cutoff. Revocations remove later eligibility without falling back to superseded proofs; origin features remain frozen. Reports retain bundle hashes and selected revision IDs. This is not persistent storage or source authentication, and no live evidence repository is connected yet.

Run `npm run report:forecast-exclusions` for a read-only PostgreSQL scan through the evidence adapter (100,000-row cap, 30-second statement timeout). It prints counts and up to ten excluded examples. No attestation repository is connected yet: the report explicitly supplies no evidence and marks `evidence_source=not_configured`. Missing evidence does not imply incorrect prices. The adapter binds supplied attestations to row ID/provider/source hash and respects verification/publication cutoff times; it does not authenticate the upstream attestations. No training or database writes occur.

The research report also includes a frozen-at-fit persistence baseline: the latest eligible training outcome receives probability 0.8 and each other class 0.1 (fixed, uncalibrated convention). Both baselines use identical test rows. Comparisons report frequency minus persistence; negative metric deltas favor frequency. Per-fold persistence provenance records its source session, target session and label availability.

Run `npm run report:forecast-research -- --fixture` for the deterministic synthetic replay report (18 origins, horizons 1/5). It prints JSON with hashes, first-eligible labels, exclusions and frequency-baseline metrics; it makes no database/provider calls and writes no artifacts. The fixture uses an artificial calendar and must not be interpreted as market performance. The CLI deliberately requires --fixture; a live evidence adapter is not implemented yet.

Forecast folds require a timezone-qualified `fitCutoff` before the Vietnam-local test date. Training labels must carry `label_available_at` no later than that cutoff. The sample builder conservatively uses its evaluation timestamp for label availability; historical replay must therefore evaluate and retain labels at successive cutoffs rather than backdate results computed today.

Research services: `forecastDataset.js` builds normalized point-in-time sample inputs and forward labels; `forecastBaseline.js` evaluates fixed chronological folds with overlapping train outcomes purged. Its smoothed frequency baseline reports multiclass Brier and log loss with split manifests. These are in-process research functions, not public forecast endpoints. Tests use synthetic fixtures; live training remains gated by the data requirements in the forecast design.

Run `npm run audit:forecast-data` to inspect stored daily-price coverage, history depth, duplicate sessions, adjustment flags and supporting schema. The command uses a PostgreSQL REPEATABLE READ / READ ONLY transaction with a 30-second statement timeout and prints aggregate JSON to stdout. It does not call providers, train a model or modify data. `fetched_at` is ingestion time, not proof of historical publication time; observed session dates do not constitute an exchange calendar. See [forecast design](../docs/SHORT_TERM_FORECAST_DESIGN.md) for the research target and remaining data requirements.
## Forecast research preview

Run `npm run generate:forecast-preview` before using the development preview. It materializes `evidence/forecast-research-preview.json` outside the HTTP request path. `GET /api/forecast/research-preview?horizon=1|5` verifies the bounded artifact checksum and returns generated-at/freshness metadata with `Cache-Control: no-store`. It returns 404 in production or when `FORECAST_RESEARCH_PREVIEW=false`, and never represents a live forecast. Missing or invalid artifacts return 503 without exposing a local path. See `docs/SHORT_TERM_FORECAST_DESIGN.md` for the presentation contract.

`npm run dev` runs artifact generation automatically through `predev`. `npm run verify:forecast-preview` regenerates the artifact and fails unless checksum/schema/freshness and both horizons are valid. This verifies development research plumbing, not market accuracy.
`npm run report:forecast-regime-ranking` runs a read-only synthetic shadow comparison between `short_term_rule_v2` and the fixed regime overlay. It reports paired top-k forward return, positive rate, selection hash and a fail-closed coupling gate. It neither changes recommendation scores nor writes the database/UI.

The ranking fixture now has 45 comparable test origins across three disjoint 15-session folds, with a five-session purge between folds. It reports deterministic 95% hierarchical fold/session bootstrap intervals, turnover/concentration diagnostics, and net-return sensitivity at 0/10/25/50 bps. Costs use one-way bps multiplied by session turnover; initial formation is charged at 100% in every fold. The gate requires positive lower bounds for gross return, positive rate and net return at 25 bps, plus positive net delta in every fold. A synthetic pass only permits further validation and never enables UI coupling.

The materialized development artifact also contains immutable synthetic history for horizons 1 and 5. `GET /api/forecast/research-history?horizon=1|5` is development-only and returns as-issued probabilities, model/split/training hashes, measured or pending outcomes, multiclass Brier sum, log loss, accuracy diagnostics, fixed confidence bins and frequency/persistence baseline comparisons. Reliability bins below five samples are explicitly insufficient; the endpoint never claims calibration or market accuracy and is disabled in production with the same gate as research preview.
