# Chạy bản demo

Tài liệu này hướng dẫn chạy mã hiện có. Xem [README](README.md) để hiểu sản phẩm và [PROJECT_STATUS](docs/PROJECT_STATUS.md) để biết các kiểm tra đã thực sự chạy.

## Chọn môi trường

| Cách chạy | Điều kiện | Cấu hình |
| --- | --- | --- |
| Thủ công | Node.js/npm, PostgreSQL trên máy hoặc máy chủ truy cập được | backend/.env |
| Docker Compose | Docker và Compose hoạt động | .env ở thư mục gốc |

Dockerfile hiện dùng Node 22 và Compose dùng PostgreSQL 15. package.json backend khai báo tối thiểu Node 18/npm 9; đây là yêu cầu trong mã, không phải cam kết hỗ trợ mọi phiên bản. Các lệnh dưới dùng PowerShell, bắt đầu từ thư mục chứa dự án hiện tại. Dùng npm.cmd để tránh lỗi chặn npm.ps1.

## Chạy thủ công

### 1. Database

Nếu chưa có database, quản trị viên PostgreSQL tạo database một lần. Tài khoản ứng dụng trong `backend/.env` không cần và không nên có quyền `CREATEDB`:

~~~powershell
psql -h localhost -U postgres -c "CREATE DATABASE stock_analysis_db;"
~~~

Nếu đã có database, dùng database hiện hữu và cấu hình đúng quyền. Không chạy lại bước tạo. Schema ứng dụng được quản lý bằng migrations trong backend/src/migrations; không sao chép SQL thiết kế hay khởi tạo lại Sequelize.

Sau khi tạo database, quản trị viên cấp quyền tối thiểu cho role ứng dụng:

~~~sql
GRANT CONNECT ON DATABASE stock_analysis_db TO stock_app;
\c stock_analysis_db
GRANT USAGE, CREATE ON SCHEMA public TO stock_app;
~~~

Không cấp `SUPERUSER` hoặc `CREATEDB` chỉ để chạy migrations. Nếu cần extension, quản trị viên cài trước bằng role quản trị.

### 2. Backend

~~~powershell
Set-Location .\backend
npm.cmd ci
if (-not (Test-Path -LiteralPath .env)) { Copy-Item -LiteralPath .env.example -Destination .env }
~~~

Chỉnh backend/.env theo PostgreSQL của bạn:

~~~dotenv
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stock_analysis_db
DB_USER=postgres
DB_PASSWORD=<mat-khau-cua-ban>
# Vite dev mặc định là 5173; nếu chạy UI ở 4173, thay bằng http://localhost:4173.
CORS_ORIGIN=http://localhost:5173
ADMIN_API_KEY=
~~~

Thay placeholder mật khẩu bằng giá trị thật. Sau đó:

~~~powershell
npm.cmd run migrate
~~~

Chỉ trên database demo chưa nạp seed, chạy một lần:

~~~powershell
npm.cmd run seed
~~~

Seed dùng ID cố định; không chạy lặp trên dữ liệu đã seed. Khởi động backend:

~~~powershell
npm.cmd run dev
~~~

Migrations không tự chạy khi dùng npm start/npm run dev thủ công. Chạy các lệnh database từ thư mục backend để .sequelizerc và .env được đọc đúng.

### 2a. Ingest dữ liệu Vnstock EOD

Cài bridge Python một lần:

~~~powershell
python -m pip install -r requirements-vnstock.txt
~~~

Đặt biến môi trường cho lần ingest thử nghiệm rồi chạy từ thư mục backend:

~~~powershell
$env:VNSTOCK_PROJECT_DIR = Join-Path $PWD '.vnstock'
$env:VNSTOCK_FROM='2026-09-11'
$env:VNSTOCK_TO='2026-09-17'
npm.cmd run ingest:vnstock
~~~

Nếu không đặt `VNSTOCK_SYMBOLS`, lệnh dùng các mã hiện có trong bảng `stocks`. Lệnh ghi dữ liệu qua ingestion service và xóa cache cổ phiếu khi có thay đổi. Scheduler chỉ bật khi đặt `VNSTOCK_EOD_ENABLED=true`; lịch mặc định `30 10 * * 1-5` theo múi giờ `Asia/Ho_Chi_Minh`.

### 2b. Đăng ký EODHD để đối chiếu nội bộ

EODHD có gói cá nhân miễn phí giới hạn 20 request/ngày và lịch sử khoảng một năm. Đăng ký tại [EODHD Pricing](https://eodhd.com/pricing), xác nhận email, lấy API key trong tài khoản rồi thêm vào `backend/.env` (không commit file này):

~~~dotenv
EODHD_API_KEY=<api-key-cua-ban>
EODHD_SYMBOL_SUFFIX=.VN
~~~

Chạy thử đối chiếu nhỏ trước:

~~~powershell
$env:VNSTOCK_SYMBOLS='FPT,PVS,BSR'
$env:VNSTOCK_FROM='2026-09-11'
$env:VNSTOCK_TO='2026-09-17'
npm.cmd run reconcile:eodhd
~~~

Kiểm tra key và coverage mà không chạy reconciliation:

~~~powershell
$env:NODE_OPTIONS='--dns-result-order=ipv4first'
npm.cmd run verify:eodhd
~~~

`EODHD_SYMBOL_SUFFIX=.VN` đã được xác minh với exchange `VN` và probe `FPT.VN` (5 dòng EOD cho khoảng 2026-09-11 đến 2026-09-17 vào ngày 2026-09-18). Lệnh không ghi dữ liệu giá vào `stock_prices`, chỉ lưu report reconciliation nội bộ. Nếu Node gặp `ECONNRESET`, đặt `NODE_OPTIONS=--dns-result-order=ipv4first` như ví dụ trên.

Vnstock trả giá theo nghìn VND trong bridge hiện tại; các lệnh thật đã dùng `VNSTOCK_PRICE_SCALE=1000` (mặc định của ingestion/reconciliation) để đưa về `VND_PER_SHARE`. Volume giữa các provider có thể khác do cách điều chỉnh hoặc định nghĩa dữ liệu, nên cần xem report chi tiết trước khi kết luận pass.

### 3. Frontend

Trong terminal khác:

~~~powershell
Set-Location .\frontend
npm.cmd ci
npm.cmd run dev
~~~

Mở http://localhost:5173. Vite chuyển các request /api tới http://127.0.0.1:5000. Nếu backend đổi cổng, đặt API_PROXY_TARGET trong terminal frontend trước khi khởi động Vite:

~~~powershell
$env:API_PROXY_TARGET = 'http://localhost:5001'
npm.cmd run dev
~~~

## Chạy Docker Compose

Tại thư mục gốc:

~~~powershell
Set-Location .
if (-not (Test-Path -LiteralPath .env)) { Copy-Item -LiteralPath .env.example -Destination .env }
~~~

Đặt DB_PASSWORD riêng trong .env gốc; đặt ADMIN_API_KEY nếu cần quản trị. Compose hiện chỉ lấy hai biến này từ .env gốc; các biến khác của template không tự được truyền vào container.

~~~powershell
docker compose up --build -d
docker compose ps
docker compose logs backend
~~~

Đợi backend chạy migrations và bắt đầu lắng nghe. Với database demo chưa seed, chạy một lần:

~~~powershell
docker compose exec backend npm run seed
~~~

Mở http://localhost:5173. API ở http://localhost:5000/api/health.

Compose có bốn dịch vụ: postgres, worker Vnstock, backend và frontend. Worker chỉ mở cổng 8787 trong mạng Compose, giữ concurrency 1 và backend gọi qua `http://worker:8787`; scheduler EOD vẫn chỉ bật khi cấu hình rõ `VNSTOCK_EOD_ENABLED=true`. Database trong container tên stock_analyst, user stock_analyst_user; PostgreSQL không mở cổng ra máy host. Cấu hình này khác database thủ công và không cần chỉnh cho giống nhau.

Cả bốn dịch vụ có healthcheck và `restart: unless-stopped`; backend chờ PostgreSQL + worker healthy, frontend chờ backend healthy. `docker compose ps` phải hiển thị trạng thái healthy trước khi smoke UI/API. Đây là restart policy của Compose, không phải cam kết tự khởi động Docker Engine sau reboot.

Compose giới hạn log `json-file` mỗi service ở 10 MB × 3 file và đặt `stop_grace_period` riêng cho database/backend/worker/frontend. Đây là giới hạn local demo; môi trường production vẫn nên chuyển log sang driver/collector tập trung nếu có yêu cầu retention hoặc audit.

Dừng bằng docker compose stop; khởi động lại bằng docker compose up -d. Volume postgres_data giữ dữ liệu. Đổi DB_PASSWORD trong .env không tự đổi mật khẩu role trong volume đã tồn tại.

## Kiểm tra sau khi chạy

Trong terminal PowerShell mới:

~~~powershell
$health = Invoke-RestMethod 'http://localhost:5000/api/health'
$health
$first = Invoke-RestMethod 'http://localhost:5000/api/stocks'
$second = Invoke-RestMethod 'http://localhost:5000/api/stocks'
$second
if ($second.data.Count -gt 0) {
    Invoke-RestMethod ("http://localhost:5000/api/stocks/" + $second.data[0].id)
}
Invoke-RestMethod 'http://localhost:5000/api/cache/stats'
~~~

Kỳ vọng health.success là true, stocks.success là true, có cổ phiếu sau khi seed và request lặp có source là cache khi cache hoạt động. Request đầu có thể đã lấy cache. Thống kê dùng totalEntries, expiredEntries, byType.

Mở UI, chọn cổ phiếu và đối chiếu chi tiết với API. Health chỉ trả trạng thái server; thống kê cache có thể trả số 0 khi lỗi. Hai endpoint này riêng lẻ không đủ chứng minh database/cache hoạt động đúng: kiểm tra cả stocks, source và log.

Kiểm tra mã độc lập với server đang chạy:

~~~powershell
Set-Location .\backend
npm.cmd run verify:release
Set-Location .\frontend
npm.cmd test
npm.cmd run build
~~~

`verify:release` chạy ESLint, kiểm tra contract `.env.example`, rồi toàn bộ Jest backend tuần tự; không cần backend đang chạy. Chế độ tuần tự giữ lệnh dùng được trong môi trường không cho Jest tạo worker con. Nó không thay thế `test:postgres`, browser E2E, migration production hay kiểm chứng provider/worker thật. Test backend hiện có dùng mock cho database/cache trong các trường hợp liên quan; test frontend dùng fetch giả lập để kiểm tra xử lý lỗi và phản hồi đến sai thứ tự. Build không thay thế kiểm tra trình duyệt. Ghi ngày, môi trường, kết quả và hạn chế vào [PROJECT_STATUS](docs/PROJECT_STATUS.md) khi nghiệm thu.

## Kiểm thử trình duyệt và PostgreSQL

Tại frontend, sau khi cài dependencies bằng npm.cmd ci, máy cần có Google Chrome:

~~~powershell
Set-Location .\frontend
npm.cmd run test:e2e
~~~

Playwright tự chạy Vite trên 127.0.0.1:4180 và Chrome headless, rồi dừng khi xong. Cổng 4180 phải trống. API được giả lập để kiểm tra lỗi, retry và phản hồi chậm một cách lặp lại được; bộ này không gọi backend/database thật. Báo cáo tại frontend/playwright-report/index.html; ảnh và trace nằm trong frontend/test-results. Hai thư mục kết quả không đưa vào Git hoặc Docker build context.

Kiểm tra migrations, TTL và invalidation trên PostgreSQL thật:

~~~powershell
Set-Location .\backend
npm.cmd run test:postgres
~~~

Script đọc kết nối từ backend/.env. Tài khoản cần quyền tạo schema trong database đã cấu hình. Mỗi lần chạy tạo schema verify_<UUID> riêng, chạy ba migrations và khởi tạo models/router/cache thật vào schema đó. Khóa quản trị là khóa tạm trong tiến trình thử; không cần thay ADMIN_API_KEY hiện hữu.

Test chờ TTL một giây hết hạn, kiểm tra cleanup, cache hit/miss của danh sách/chi tiết/giá, cập nhật hợp lệ và từ chối cập nhật không có quyền/body sai. Cuối cùng chỉ xóa schema do chính lần chạy đó tạo và xác minh đã xóa. Không chạy seed hoặc xóa cache/dữ liệu của ứng dụng hiện hữu. Nếu tiến trình bị buộc dừng trước finally, schema thử có thể còn lại; xác minh đúng tên schema thử trước khi dọn thủ công.

## Quyền quản trị và dữ liệu

PUT /api/stocks/:id và các endpoint xóa cache yêu cầu Authorization: Bearer <ADMIN_API_KEY>. Đặt khóa ở backend/.env khi chạy thủ công hoặc .env gốc khi chạy Compose; để trống thì quyền quản trị bị vô hiệu hóa. Không đưa khóa vào frontend hay biến VITE_*.

Giá seed có đơn vị VND. API chi tiết trả tối đa 20 giá mới nhất; UI lấy 12 giá mới nhất và hiển thị theo thời gian tăng dần. Khi ingestion Vnstock đã chạy, UI hiển thị provider, volume và thời điểm lấy dữ liệu; AI và danh mục thật chưa được tích hợp.

## Xử lý lỗi

| Hiện tượng | Kiểm tra |
| --- | --- |
| Không kết nối PostgreSQL | Dịch vụ database, DB_HOST/DB_PORT, user/password và database đúng môi trường |
| Thiếu bảng | Chạy npm.cmd run migrate trong backend; Compose thì xem log migrations |
| Seed báo trùng ID | Dữ liệu có thể đã được nạp; kiểm tra dữ liệu trước khi làm tiếp |
| API trả danh sách rỗng | Kiểm tra đúng database và trạng thái seed |
| UI không gọi được API | Backend cổng 5000; API_PROXY_TARGET nếu đổi cổng; log Vite |
| Cổng 5000/5173 bận | Xác định tiến trình đang dùng; nếu đổi cổng, cập nhật proxy/CORS tương ứng |
| Không tìm thấy package | Chạy npm.cmd ci tại đúng thư mục dịch vụ |
| Compose báo sai mật khẩu sau khi đổi .env | Kiểm tra role trong database hiện hữu; không xóa volume để xử lý mặc định |
| Compose backend không healthy | Kiểm tra lần lượt `docker compose logs worker`, worker health, migrations và kết nối PostgreSQL; không tăng worker concurrency để che lỗi provider |

Lệnh npm start của frontend chạy Vite preview cho bản build, chưa phải cấu hình triển khai production. Hướng dẫn trên dùng Vite dev server.

### Bảng giá intraday trên UI

Sau khi sửa worker/API, khởi động lại cả hai tiến trình để nạp mã mới. Trên PowerShell, xóa proxy lỗi khỏi môi trường của worker trước khi chạy:

~~~powershell
$env:HTTP_PROXY = ''
$env:HTTPS_PROXY = ''
$env:ALL_PROXY = ''
$env:VNSTOCK_WORKER_MAX_CONCURRENCY = '1'
cd .\backend
python scripts/vnstock_worker.py
~~~

Giữ concurrency 1 mặc định vì worker phục vụ nhiều caller nhưng upstream VCI dễ reset khi có request đồng thời. Chỉ tăng tối đa 4 sau khi đã đo lỗi và latency trong phiên giao dịch.

Backend cần `VNSTOCK_WORKER_URL=http://127.0.0.1:8787`. Chạy backend bằng `npm.cmd start` trong terminal riêng. Build và phục vụ UI từ thư mục frontend:

~~~powershell
npm.cmd run build
npm.cmd run start -- --host 127.0.0.1 --port 4173 --strictPort
~~~

Mở http://127.0.0.1:4173. Trang mặc định hiển thị tối đa 200 mã, đủ cho 131 mã hiện tại. Bảng giá tự làm mới sau 30 giây kể từ khi lần lấy trước hoàn tất; mã không có quote hợp lệ hiển thị EOD. Nguồn có thể có độ trễ.

Kiểm chứng qua UI proxy: chạy `node scripts/verify-live-quotes.cjs` trong backend. Script lưu số mã, độ phủ quote, thời gian phản hồi và mã thiếu trong thư mục evidence.

### Kiểm chứng callback EOD trên nhóm nhỏ

Sau khi ingestion đang chạy đã kết thúc, kiểm chứng cùng callback với scheduler (ghi dữ liệu qua upsert thật):

```powershell
cd .\backend
$env:EOD_VERIFY_SYMBOLS='FPT,SBD,SBL,BCG'
node scripts/verify-eod-scheduler.cjs
```

Chỉ chấp nhận 1–10 mã đã có trong database. Script tắt lịch của chính nó, gọi callback một lần và không tạo recommendation. Exit 1 nghĩa là còn thiếu coverage hoặc có lỗi; đọc `evidence/eod-scheduled-*.json`. Không chạy đồng thời với ingestion khác; khóa chống overlap chỉ có hiệu lực trong một process.

### Kiểm tra intraday giữa Tổng quan và Chi tiết

Khi backend đang chạy, tại thư mục backend:

```powershell
node scripts/verify-intraday-pages.cjs
```

Script chỉ đọc API, kiểm tra nhóm FPT/SSI/VCB và quote Chi tiết FPT, lưu thời gian/HTTP/payload vào `evidence/intraday-pages-*.json`. Đọc `returned`, timestamp và cờ `cached`/`stale` để phân biệt quote mới, cache và response thiếu mã. Script không truy cập danh mục cá nhân hoặc ghi giao dịch. UI preview hiện tại ở http://127.0.0.1:4173; reload một lần để nạp bundle mới sau build.

### Kiểm tra daily valuation trên PostgreSQL development

Khi backend và Preview 4173 đang chạy, tại thư mục frontend:

```powershell
npm.cmd run verify:live:portfolio-performance
```

Script tạo hai tài khoản cookie-session cô lập, ghi rồi dọn một dòng tiền thử, kiểm tra 5 phiên định giá, TWR/MWR cash-only, NPV residual và ownership. Hai tài khoản test được giữ lại; credential chỉ tồn tại trong bộ nhớ process và không được ghi ra đĩa.

Kiểm tra lifecycle event ledger mới trên PostgreSQL development:

```powershell
cd .\frontend
npm.cmd run verify:live:portfolio-events
```

Script kiểm tra pending/manual enforcement, confirm, correction chain, cancel và ownership isolation. Hai tài khoản test cô lập được giữ để bảo toàn audit; credential không được ghi ra đĩa.

Kiểm tra tác động cổ tức tiền mặt, stock split và quyền mua lên valuation/TWR:

```powershell
npm.cmd run verify:live:portfolio-dividend
```

Script tạo ledger cô lập, xác nhận pending event khóa coverage/TWR, kiểm tra `dividend_income` được cộng vào cash trong khi `external_cash_flow` vẫn bằng 0, split giữ quantity/cost basis continuity, quyền mua 0 không tự thực hiện entitlement và quyền mua một phần cập nhật đúng quantity/cash/cost basis. Giao dịch và dòng tiền thử được dọn; account cùng cancelled event audit được giữ, không lưu credential.
### Tạo Forecast research preview (development)

Sau khi cài dependency backend, chạy trong thư mục `backend`:

```powershell
npm run generate:forecast-preview
```

Lệnh tạo `evidence/forecast-research-preview.json` từ fixture synthetic trước khi backend phục vụ endpoint. File không được commit. Khởi động lại backend sau khi cập nhật mã; Tổng quan sẽ hiển thị ngày tạo và cảnh báo nếu artifact quá 7 ngày. Đây không phải dữ liệu thị trường hay dự báo live.

`npm run dev` đã tự chạy bước generate. Để kiểm tra riêng artifact trước khi bàn giao, dùng `npm run verify:forecast-preview`.

### Checkpoint forecast sau EOD

Chỉ chạy sau khi provider đã công bố phiên mới hơn `as_of` của snapshot đang chờ. Trong `backend`:

```powershell
$env:NODE_ENV='development'
$env:FORECAST_LIVE_PREVIEW='true'
npm.cmd run cycle:forecast-live
```

Lệnh phát hành snapshot cho phiên mới trước, sau đó mới đánh giá snapshot cũ. Sau một phiên mới, horizon 1 phải chuyển sang `measured`; horizon 5 chỉ chuyển sau đủ năm phiên distinct. `target_session_not_observed` cùng `sessions_observed: 0` nghĩa là provider chưa có phiên tương lai, không phải yêu cầu tạo outcome thủ công. Kiểm tra contract UI đang đọc tại `http://localhost:4173/api/forecast/live-cohort?horizon=1&minimum_samples=20`. Không dùng `127.0.0.1` nếu auth/CORS development đang cấu hình cho `localhost`.

### Backfill dòng tiền khối ngoại (development, sponsor-only)

Sau khi tài khoản Vnstock đã có capability `foreign_flow` và quyền sử dụng phù hợp, cấu hình một nhóm tối đa 50 mã và cửa sổ tối đa 366 ngày:

```powershell
cd .\backend
npm.cmd run check:foreign-flow-entitlement
```

Chỉ tiếp tục khi preflight trả `status: eligible`. Community/no-package trả exit khác 0 và không in API key.

```powershell
cd .\backend
$env:VNSTOCK_FOREIGN_FLOW_ENABLED='true'
$env:VNSTOCK_FOREIGN_FLOW_SYMBOLS='FPT,HPG,VHM'
$env:VNSTOCK_FOREIGN_FLOW_FROM='2026-10-01'
$env:VNSTOCK_FOREIGN_FLOW_TO='2026-10-13'
npm.cmd run ingest:vnstock-foreign-flow
```

Luồng bình thường gọi endpoint `/foreign-flow` của worker, vì vậy phải restart worker sau khi cập nhật mã. Chỉ dùng `VNSTOCK_FOREIGN_FLOW_DIRECT=true` để chẩn đoán bridge một lần. Scheduler development chạy 17:00 ICT các ngày trong tuần khi flag được bật; production không khởi tạo job. Lỗi `foreign_flow capability is unavailable` nghĩa là entitlement/package setup chưa đáp ứng và không có dòng nào được ghi.

Sau backfill, chạy audit read-only:

```powershell
npm.cmd run audit:foreign-flow
```

Exit 0 chỉ khi coverage phiên mới nhất đạt ngưỡng mặc định 80%; `unavailable` hoặc `partial` trả exit khác 0 để automation không vô tình mở UI/scoring. Có thể chọn phiên bằng `FOREIGN_FLOW_AUDIT_DATE=YYYY-MM-DD`.

