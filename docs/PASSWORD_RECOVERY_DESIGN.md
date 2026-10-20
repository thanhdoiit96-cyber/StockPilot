# Khôi phục mật khẩu — thiết kế triển khai

> Trạng thái: đề xuất đã được rà soát theo code hiện có; chưa có API, migration, UI hoặc email delivery. Không bật chức năng trước khi chọn provider, xác minh domain gửi và có môi trường mailbox test.

## Mục tiêu và giới hạn

Người dùng quên mật khẩu cần đặt mật khẩu mới qua một liên kết dùng một lần, mà không làm lộ tài khoản có tồn tại hay token trong log/browser storage. Sau khi đổi thành công, mọi session hiện có phải bị thu hồi như luồng đổi mật khẩu đang đăng nhập (`POST /api/auth/password`).

V1 chỉ dùng email đã lưu của tài khoản. Nó không cho đổi email, không tự đăng nhập bằng link, không gửi mật khẩu và không hỗ trợ OAuth/MFA. Nếu delivery chưa cấu hình, UI phải công bố rõ là tính năng chưa khả dụng, không giả lập gửi thư.

## Quyết định sản phẩm

| Vấn đề | Phương án chọn | Lý do |
| --- | --- | --- |
| Lộ tài khoản | `POST /api/auth/password-recovery/request` luôn trả `202` cùng thông điệp | Tránh email enumeration; audit nội bộ không trả về browser |
| Token | 32 byte ngẫu nhiên, URL-safe; chỉ lưu SHA-256 hash | Không lưu credential dùng được trong database/log |
| Một lần và expiry | Hết hạn sau 30 phút; `consumed_at` hoặc `revoked_at`; request mới thu hồi token active cũ | Chặn replay và giới hạn cửa sổ rủi ro |
| Đổi mật khẩu | POST riêng, lock token + user trong một transaction, bcrypt cost 12, tăng `password_version`, revoke sessions | Khớp chính sách và behavior `/auth/password` hiện có |
| Delivery | Adapter `sendPasswordRecovery({ to, resetUrl, locale })` | Tách provider; controller không biết SMTP/API key |

Giải pháp đơn giản hơn là token JWT tự chứa trong link. Nó không có thu hồi từng token, khó audit và không bảo đảm một lần. Giải pháp mở rộng với MFA/recovery codes chưa có nhu cầu đã xác minh nên không nằm trong v1.

## Schema và API đề xuất

Migration mới tạo `password_recovery_tokens`:

| Trường | Contract |
| --- | --- |
| `id` | UUID primary key |
| `user_id` | FK `users.id`, cascade delete |
| `token_hash` | SHA-256 hex, unique |
| `expires_at`, `consumed_at`, `revoked_at` | trạng thái vòng đời, không xóa token để giữ audit tối thiểu |
| `request_ip_hash?` | hash có salt triển khai, chỉ khi retention được chốt |
| `created_at` | audit timestamp |

Index bắt buộc: unique `token_hash`, `(user_id, consumed_at, revoked_at)`, `expires_at`. Không lưu token thô, URL đầy đủ, user-agent/IP thô hay mật khẩu.

- `POST /api/auth/password-recovery/request` nhận `{ email }`; normalize email như login, rate limit theo IP và email hash, trả `202` bất kể account/delivery.
- `POST /api/auth/password-recovery/confirm` nhận `{ token, new_password }`; token chỉ có trong body, kiểm tra 12–72 byte cho mật khẩu, trả mã lỗi chung khi token không hợp lệ/hết hạn/đã dùng.
- Cả hai endpoint public không dùng cookie session và phải giới hạn JSON payload/Origin tương tự login. Confirm không retry tự động ở frontend.

Link email dùng fragment: `https://app.example/reset-password#token=...`. Frontend đọc fragment, gửi POST qua same-origin `/api`, rồi dùng `history.replaceState` xóa fragment. GET link không thay đổi server state.

## Luồng và trải nghiệm

1. Form chỉ có email, mô tả trung lập và cooldown hiển thị theo phản hồi `202`.
2. Server tạo token và gọi adapter sau khi transaction commit. Delivery failure được audit; browser vẫn nhận response trung lập.
3. Màn hình link kiểm tra token có mặt, hiển thị form mật khẩu mới và trạng thái loading/error/success. Thành công xóa fragment, thông báo tất cả phiên đã đăng xuất, đưa người dùng về login.
4. Loading, unavailable, expired và network error có hành động rõ ràng; form dùng label, focus lỗi, `aria-live` và hoạt động bàn phím/mobile.

Không prefetch link hoặc render token ra DOM/log analytics. Email template không chứa dữ liệu danh mục hay thông tin tài chính.

## Bảo mật, vận hành và nghiệm thu

Rate limit đề xuất: 3 request/email/giờ, 10 request/IP/giờ, cooldown 60 giây; giá trị cuối cùng chỉ được chốt sau khi có provider quota. Audit event chỉ lưu loại sự kiện, token record id và outcome; retention phải được chốt trước migration.

Triển khai theo thứ tự: (1) chốt provider, sender domain, reset URL allowlist và mailbox test; (2) migration/model/service token cùng unit test expiry/replay/race; (3) adapter và controller rate limit; (4) UI/E2E; (5) mailbox và rollback drill. Delivery adapter lỗi, token replay, hai confirm đồng thời, account không tồn tại, quota, session revoke và không lộ token trong logs là các test bắt buộc.

Chưa triển khai vì dự án chưa có email adapter, sender domain hay môi trường mailbox test. Thiết kế này không phải API/schema đang chạy.
