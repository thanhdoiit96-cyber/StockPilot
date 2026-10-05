# Thiết kế hardening phiên xác thực

> Trạng thái: cookie mode đã triển khai end-to-end cho browser: backend opt-in qua header versioned và frontend cookie-first, refresh mutex, CSRF và multi-tab signal không secret. Bearer/localStorage parser chỉ còn compatibility window cho client/session cũ; xem [Backend README](../backend/README.md), [Frontend README](../frontend/README.md) và [PROJECT_STATUS](PROJECT_STATUS.md).

Production guard đã được triển khai: JWT secret yếu/mặc định và CORS origin rỗng, wildcard, không exact hoặc không HTTPS làm startup thất bại. Credential CORS chỉ bật khi có allowlist cụ thể.

## Mục tiêu và phạm vi

Loại access token khỏi JavaScript/browser storage trước public deployment, hỗ trợ hết hạn và thu hồi phiên có kiểm soát, giữ hành vi logout/401/nhiều tab hiện có, và chặn CSRF cho request thay đổi dữ liệu. Thiết kế này không bao gồm quên mật khẩu, OAuth, MFA hoặc delivery provider.

Ứng dụng browser production nên đi cùng origin qua reverse proxy (`/api`), tránh phụ thuộc third-party cookie. Cross-origin development chỉ được phép với origin allowlist cụ thể và credential; không kết hợp `Access-Control-Allow-Credentials: true` với wildcard.

## Quyết định contract

### Cookie

| Cookie | Thuộc tính | Mục đích |
| --- | --- | --- |
| `__Host-sp_access` | `HttpOnly; Secure; SameSite=Lax; Path=/`, tối đa 15 phút | JWT access ngắn hạn, chứa `sub`, `sid`, `role`, `iat`, `exp`; không chứa dữ liệu nhạy cảm khác |
| `__Host-sp_refresh` | `HttpOnly; Secure; SameSite=Lax; Path=/`, tối đa 7 ngày | Token ngẫu nhiên 256 bit để rotation; database chỉ lưu SHA-256 hash |
| `sp_csrf` | `Secure; SameSite=Lax; Path=/`, không `HttpOnly`, cùng tuổi phiên | Giá trị ngẫu nhiên cho double-submit; frontend gửi lại qua `X-CSRF-Token` |

Prefix `__Host-` yêu cầu HTTPS, không có `Domain` và `Path=/`. Local HTTP development dùng tên `sp_access_dev`/`sp_refresh_dev`, chỉ khi `NODE_ENV != production`; production phải fail startup nếu cookie không thể đặt `Secure` hoặc secret còn giá trị development.

### Session lưu phía server

Migration mới tạo bảng `auth_sessions`:

| Trường | Contract |
| --- | --- |
| `id` | UUID primary key; đưa vào claim `sid` |
| `user_id` | FK `users.id`, cascade khi xóa user |
| `refresh_token_hash` | SHA-256, unique; không lưu token thô |
| `csrf_token_hash` | SHA-256 của cookie CSRF hiện hành |
| `expires_at` | hard expiry 7 ngày |
| `idle_expires_at` | idle expiry, mặc định 24 giờ và không vượt hard expiry |
| `last_used_at` | cập nhật khi refresh thành công, không cập nhật ở mọi API request |
| `revoked_at`, `revoke_reason` | thu hồi idempotent; reason enum giới hạn |
| `created_at`, `updated_at` | audit timestamps |

Index bắt buộc: unique `refresh_token_hash`, `(user_id, revoked_at)`, `expires_at`, `idle_expires_at`. Không lưu IP thô. Nếu cần điều tra vận hành sau này, chỉ thêm user-agent/IP prefix đã hash với retention riêng.

### Endpoint

- `POST /api/auth/login` và `/register`: xác thực như hiện tại, tạo session, đặt ba cookie, trả `{ success: true, user }`; không trả token trong JSON ở cookie mode.
- `GET /api/auth/me`: chấp nhận access cookie; trả identity từ database. Không tự refresh ngầm.
- `POST /api/auth/refresh`: yêu cầu refresh cookie và CSRF header hợp lệ, khóa row session, rotate refresh + CSRF atomically, đặt access cookie mới. Refresh token cũ chỉ dùng một lần; replay thu hồi session và trả `401 AUTH_REFRESH_REPLAYED`.
- `POST /api/auth/logout`: yêu cầu CSRF, thu hồi session nếu còn tồn tại, xóa cả ba cookie với đúng thuộc tính/path; luôn idempotent `204`.
- `POST /api/auth/logout-all`: yêu cầu access cookie + CSRF, thu hồi mọi session của user trừ/bao gồm phiên hiện tại theo payload enum đã validate. Chưa cần UI ở lát cắt đầu.

Mọi lỗi auth dùng shape ổn định `{ success: false, code, message }`. `401` dành cho thiếu/hết hạn/thu hồi credential; `403 CSRF_INVALID` dành cho cookie-authenticated mutation thiếu hoặc sai CSRF. Không ghi cookie/token/header CSRF vào log.

### Xác thực và CSRF

`requireAuth` đọc access cookie trước. Trong cửa sổ migration, Bearer hợp lệ vẫn được nhận và gắn `req.authMode = 'bearer'`; cookie gắn `req.authMode = 'cookie'`. Claim `sid` của cookie phải trỏ tới session chưa revoke và chưa hard-expire. Có thể cache positive session lookup rất ngắn, nhưng logout/replay phải invalidation ngay.

Middleware CSRF chạy sau authentication cho `POST/PUT/PATCH/DELETE` khi `authMode === 'cookie'`:

1. Đọc `sp_csrf` và `X-CSRF-Token`.
2. So sánh constant-time hai giá trị.
3. Hash và so sánh constant-time với `csrf_token_hash` của session.
4. Từ chối trước controller nếu thiếu hoặc sai.

Bearer clients không dùng cookie và không chịu double-submit trong giai đoạn tương thích. Endpoint login/register không có session trước đó, nên dựa vào `SameSite=Lax`, JSON content type, origin allowlist và rate limit; chúng không dùng CSRF token. Refresh/logout bắt buộc CSRF.

## Frontend và nhiều tab

- `fetch`/`requestJson` dùng `credentials: 'same-origin'` (hoặc `include` chỉ trong cấu hình cross-origin development) và không nhận tham số token.
- Sau login/register, React chỉ giữ `{ user }`; không ghi credential vào `localStorage`.
- Bootstrap gọi `/api/auth/me`. Nếu access hết hạn, client được phép gọi `/api/auth/refresh` đúng một lần có mutex, rồi retry request gốc đúng một lần. Không refresh vòng lặp và không retry mutation khi chưa biết server đã xử lý hay chưa.
- Đọc `sp_csrf` ngay trước mỗi mutation và gửi `X-CSRF-Token`. Giá trị CSRF không phải credential đăng nhập nhưng không được log hoặc persist sang storage khác.
- Đồng bộ tab bằng `BroadcastChannel('stockpilot-auth')`, fallback storage event chỉ chứa `{ type, at, nonce }`, tuyệt đối không chứa token/user. `logout`, `session-expired` và `identity-changed` buộc tab nhận chạy lại `/auth/me` hoặc dọn private state.
- UI giữ nguyên gate hiện tại: chưa xác minh `/auth/me` thì không mount dashboard; 401 dọn Watchlist/Danh mục/Advisor/Đề xuất khỏi state.

## Kế hoạch migration không gián đoạn

1. **Backend kép:** thêm bảng/session service/cookie parser/CSRF và test; login chỉ phát cookie khi request gửi `X-Auth-Mode: cookie-v1`, còn response Bearer cũ vẫn giữ cho client hiện tại. `requireAuth` nhận cả hai mode.
2. **Frontend cookie:** chuyển request layer và auth state sang cookie mode, giữ E2E cho bootstrap, 401, logout và thay identity nhiều tab. Trong pha này local token cũ chỉ dùng để đổi sang cookie qua endpoint exchange một lần hoặc buộc đăng nhập lại; lựa chọn mặc định an toàn là buộc đăng nhập lại và xóa `market-auth`.
3. **Mặc định cookie:** login/register không còn trả Bearer cho browser. Theo dõi tỷ lệ `authMode`; tài liệu hóa Bearer chỉ cho client API nếu thực sự có consumer.
4. **Đóng legacy:** sau một release window đã định, bỏ browser Bearer/localStorage, endpoint exchange và code parse auth object cũ. Nếu không có API client được hỗ trợ, bỏ Bearer hoàn toàn.

Không chuyển JWT hiện hữu vào cookie như một bước trung gian: token cũ không có `sid`, không revoke được và sẽ kéo nguyên rủi ro lifecycle sang contract mới.

## Tiêu chí nghiệm thu

- Database migration up/down và session service có test rotation, expiry, revoke, replay, ownership và concurrent refresh.
- Cookie production có đúng `HttpOnly/Secure/SameSite/Path`, không có `Domain`; response/login body không chứa token.
- Mutation cookie thiếu/sai CSRF trả 403; mutation hợp lệ qua; Bearer compatibility không vô tình đọc cookie.
- Logout thu hồi server-side trước khi xóa cookie; access token còn hạn không dùng được sau revoke.
- Hai refresh đồng thời: đúng một request thành công, request còn lại kích hoạt replay policy xác định; không tạo hai refresh token hợp lệ.
- Frontend không còn credential trong local/session storage, source log hoặc error payload; reload, hết access token, 401, logout và đổi phiên nhiều tab đều có E2E.
- CORS credential chỉ cho origin allowlist; kiểm thử Origin không hợp lệ, JSON-only và rate limit login/refresh.
- Rollback ứng dụng không rollback/xóa bảng session hay dữ liệu; có feature flag để tạm dùng Bearer trong cửa sổ migration.

## Thứ tự triển khai đề xuất

Lát cắt đầu là backend session foundation: migration `019`, model/service thuần, cookie helpers, dual-mode `requireAuth` và test controller/middleware; chưa đổi frontend. Lát cắt thứ hai thêm refresh/logout/CSRF. Lát cắt thứ ba chuyển frontend và E2E, sau đó mới đặt cookie mode làm mặc định.
