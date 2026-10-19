# Triển khai Vercel: PostgreSQL, backend và frontend

Repository được triển khai thành hai Vercel Project dùng chung một Git repository:

- `stockpilot-api`: Root Directory `backend`.
- `stockpilot-web`: Root Directory `frontend`.
- PostgreSQL managed: Neon, Supabase hoặc provider PostgreSQL tương thích trong Vercel Marketplace.

Frontend giữ API cùng origin bằng rewrite `/api/*` sang backend. Đây là yêu cầu của browser cookie hiện tại (`HttpOnly`, `SameSite=Lax`, `credentials: same-origin`). Không đặt secret vào biến `VITE_*`; mọi biến đó được nhúng vào bundle công khai.

## 1. Chuẩn bị repository và domain

1. Push branch đã kiểm thử lên Git provider.
2. Chọn domain production ổn định của frontend, ví dụ `https://stockpilot.example.com` hoặc `https://stockpilot-web.vercel.app`.
3. Không dùng URL Preview động làm `CORS_ORIGIN` production. Backend chỉ nhận exact origin và production yêu cầu HTTPS.
4. Giữ `backend/.env`, `frontend/.env`, `.env.local`, `.env.production.local` và `.vercel/` ngoài Git. Chỉ commit `.env.example` chứa placeholder.

Kiểm tra trước khi push:

```powershell
git status --short
git ls-files | Select-String -Pattern '(^|/)\.env($|\.)'
git diff --check
```

Kết quả `git ls-files` chỉ nên có các template `.env.example`, không có file chứa secret.

## 2. Tạo PostgreSQL managed

1. Trong Vercel Dashboard, mở Marketplace và tạo PostgreSQL resource, hoặc tạo database trực tiếp tại Neon/Supabase.
2. Chọn region gần Vercel Function và người dùng chính; ưu tiên Singapore khi provider và gói hỗ trợ.
3. Tạo database/role ứng dụng riêng. Không cấp `SUPERUSER` hoặc `CREATEDB` cho role runtime.
4. Lấy connection string có TLS. Nếu provider cung cấp cả pooled và direct URL:
   - dùng pooled URL làm `DATABASE_URL` cho backend runtime;
   - dùng direct URL tạm thời khi chạy migration nếu pooler không hỗ trợ DDL/session cần thiết.
5. Không đưa URL thật vào file Git.

Quyền ban đầu cho role chạy migration:

```sql
GRANT CONNECT ON DATABASE stock_analysis_db TO stock_app;
GRANT USAGE, CREATE ON SCHEMA public TO stock_app;
```

Sau migrations có thể tách role migration và runtime chặt hơn. Trước khi thu hồi quyền, cần kiểm tra đủ CRUD và sequence cho toàn bộ bảng.

## 3. Tạo Vercel Project cho backend

1. Chọn **Add New > Project** và import repository.
2. Đặt Root Directory là `backend`.
3. Giữ framework là `Other`; `backend/vercel.json` route `/api/*` vào `api/index.js`.
4. Không đặt Build Command chạy migration. Migration trong build có thể chạy đồng thời trên Preview/Production.
5. Thêm biến trong **Settings > Environment Variables**.

Biến production bắt buộc:

| Biến | Giá trị |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | URL PostgreSQL runtime, ưu tiên pooled URL |
| `JWT_SECRET` | Chuỗi ngẫu nhiên tối thiểu 32 ký tự |
| `CORS_ORIGIN` | Exact HTTPS frontend origin, không có path/wildcard |
| `AUTH_ACCESS_EXPIRES_IN` | `15m` |
| `RATE_LIMIT_WINDOW_MS` | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | `100` hoặc mức đã đo |
| `LOG_LEVEL` | `info` |

Biến tùy chọn:

| Biến | Khi nào cần |
| --- | --- |
| `ADMIN_API_KEY` | Khi dùng endpoint vận hành yêu cầu admin key |
| `VNSTOCK_WORKER_URL` | Khi đã deploy Python worker ra dịch vụ luôn chạy riêng |
| `VNSTOCK_API_KEY`, `EODHD_API_KEY` | Khi entitlement/provider tương ứng được dùng và cho phép |
| `EXTERNAL_FACTOR_DISPLAY_RIGHTS` | Khi đã xác nhận quyền hiển thị dữ liệu ngoài |

Giữ scheduler tắt trên Vercel cho tới khi có endpoint Vercel Cron được bảo vệ và idempotent:

```dotenv
VNSTOCK_EOD_ENABLED=false
VNSTOCK_LISTING_SYNC_ENABLED=false
QUOTE_FRESHNESS_ENABLED=false
RECOMMENDATION_EVALUATION_ENABLED=false
RECOMMENDATION_LIFECYCLE_CHECK_ENABLED=false
FORECAST_LIVE_CYCLE_ENABLED=false
VNSTOCK_FOREIGN_FLOW_ENABLED=false
COMPANY_DATA_SYNC_ENABLED=false
```

`node-cron` chỉ được khởi tạo trong tiến trình local của code hiện tại; Vercel Function không phải tiến trình luôn chạy. Python Vnstock worker và evidence ghi trên filesystem cũng cần dịch vụ/storage riêng.

Deploy backend lần đầu. URL ví dụ:

```text
https://stockpilot-api.vercel.app
```

`/api/health` là passthrough nên không chứng minh database đã sẵn sàng. Sau migration phải kiểm tra thêm endpoint đọc database.

## 4. Chạy migrations an toàn

Chạy migration một lần từ máy quản trị hoặc CI job riêng, không chạy trong Vercel Build Command.

Cách không ghi production secret vào `.env` local:

```powershell
Set-Location .\backend
npx.cmd vercel link
npx.cmd vercel env ls production
npx.cmd vercel env run -e production -- npm.cmd run migrate
```

Nếu CLI/provider không hỗ trợ `env run`, đặt biến trong terminal tạm thời, chạy migration rồi xóa khỏi process:

```powershell
$env:DATABASE_URL = '<direct-production-url>'
$env:NODE_ENV = 'production'
npm.cmd run migrate
Remove-Item Env:DATABASE_URL
Remove-Item Env:NODE_ENV
```

Không chạy `npm run seed` trên production trừ khi database mới hoàn toàn và dữ liệu demo được chấp nhận. Seeder có ID cố định và có thể cập nhật ba bản ghi demo khi chạy lại.

Sau migration:

```powershell
Invoke-RestMethod 'https://stockpilot-api.vercel.app/api/health'
Invoke-RestMethod 'https://stockpilot-api.vercel.app/api/stocks?page=1&pageSize=1'
```

Kỳ vọng cả hai trả `success=true`; request stocks mới là bằng chứng backend đã qua database/cache initialization.

## 5. Cấu hình frontend proxy

Thay domain placeholder trong `frontend/vercel.json` bằng domain production thực của backend:

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://stockpilot-api.vercel.app/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

`VITE_API_BASE_URL` phải để trống hoặc không khai báo. Nếu đặt URL backend tuyệt đối, browser bỏ qua same-origin proxy và cookie đăng nhập hiện tại không hoạt động đúng.

Biến frontend production:

```dotenv
VITE_API_BASE_URL=
VITE_ENABLE_FORECAST_RESEARCH=false
VITE_ENABLE_FORECAST_LIVE=false
```

Hai forecast flag chỉ bật sau khi backend evidence/license gate tương ứng đạt. Các biến `VITE_*` không được chứa secret.

## 6. Tạo Vercel Project cho frontend

1. Import cùng repository thành Vercel Project thứ hai.
2. Đặt Root Directory là `frontend`.
3. Framework preset: Vite.
4. Build Command: `npm run build`.
5. Output Directory: `dist`.
6. Thêm ba biến frontend ở trên cho Production.
7. Deploy và gắn custom domain nếu có.
8. Quay lại backend, đặt `CORS_ORIGIN` đúng frontend production origin rồi redeploy backend. Env mới chỉ áp dụng cho deployment mới.

## 7. Preview deployments

URL Preview thay đổi theo deployment, trong khi backend production dùng exact CORS allowlist. Chọn một trong ba cách:

1. Chỉ kiểm thử auth đầy đủ trên production/staging domain ổn định.
2. Tạo backend Preview riêng và đặt `CORS_ORIGIN` theo branch/domain Preview ổn định.
3. Dùng custom environment/domain staging nếu gói Vercel hỗ trợ.

Không thêm wildcard vào `CORS_ORIGIN`; backend production chủ động từ chối wildcard khi cookie authentication được bật.

Preview database nên tách khỏi production, ít nhất bằng database/schema riêng để migration và dữ liệu test không chạm dữ liệu thật.

## 8. Kiểm tra sau deploy

1. Mở frontend bằng đúng HTTPS production domain.
2. DevTools > Network: `POST /api/auth/login` phải đi tới frontend origin, không phải URL backend trực tiếp.
3. Response login phải có access/refresh cookie `HttpOnly` và cookie CSRF; không log giá trị cookie.
4. Reload trang; `/api/auth/me` phải trả 200.
5. Kiểm tra stocks, watchlist, portfolio và logout.
6. Kiểm tra backend logs không có lỗi connection pool, CORS hoặc migration thiếu.
7. Kiểm tra secret không xuất hiện trong frontend bundle:

```powershell
Set-Location .\frontend
npm.cmd run build
rg -n "DATABASE_URL|JWT_SECRET|VNSTOCK_API_KEY|EODHD_API_KEY" dist
```

Lệnh `rg` không được trả giá trị secret thật trong `dist`.

## 9. Rollback và vận hành

- Code: dùng Vercel Instant Rollback hoặc redeploy commit trước.
- Database: migration độc lập với rollback code. Chỉ `migrate:undo` khi migration cụ thể đã được đánh giá backward compatibility và có backup.
- Env: cập nhật trong Dashboard rồi redeploy; deployment cũ không tự nhận giá trị mới.
- Rotate ngay `DATABASE_URL`, `JWT_SECRET` hoặc API key nếu từng commit/paste vào nơi không tin cậy. Xóa ở commit mới không loại secret khỏi lịch sử Git.
- Scheduler/data ingestion: triển khai worker và orchestration riêng trước khi bật; API web hoạt động không chứng minh pipeline dữ liệu production hoạt động.

## 10. Checklist nghiệm thu

- [ ] Hai Vercel Project dùng đúng Root Directory.
- [ ] PostgreSQL production và Preview tách biệt.
- [ ] Migrations production chạy đúng một lần ngoài build.
- [ ] Backend có `NODE_ENV=production`, secret mạnh và exact HTTPS `CORS_ORIGIN`.
- [ ] Frontend không có secret và không đặt API URL tuyệt đối.
- [ ] `frontend/vercel.json` trỏ đúng backend production.
- [ ] Login, reload session, CSRF mutation và logout hoạt động qua `/api` cùng origin.
- [ ] Database endpoint thật trả 200 sau migration.
- [ ] Scheduler/worker được giữ tắt hoặc đã chuyển sang hạ tầng phù hợp.
- [ ] Logs không lộ secret và rollback đã được thử ở Preview/staging.
