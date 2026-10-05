# Thiết kế đề xuất — Personal details và xác thực email

> Đây là thiết kế đề xuất, chưa phải schema hoặc API runtime đã triển khai.

## Mục tiêu

Cho phép người dùng xem và cập nhật thông tin cá nhân cơ bản mà không làm suy yếu cookie session, CSRF hoặc ownership của tài khoản.

## Dữ liệu đề xuất

- `display_name`: chuỗi tùy chọn, giới hạn 120 ký tự.
- `email`: email đăng nhập hiện tại, chỉ đổi qua quy trình xác thực email mới.
- `email_verified_at`: timestamp nullable; `null` nghĩa là chưa xác thực.
- `phone`: tùy chọn, chỉ thêm khi có nhu cầu sản phẩm và chính sách bảo mật rõ ràng.
- `profile_updated_at`: timestamp audit server-side.

Không lưu token xác thực dạng plaintext; chỉ lưu hash, expiry, used-at và audit reason.

## API đề xuất

- `GET /api/auth/me`: trả `id`, `email`, `role`, `display_name`, `email_verified_at`.
- `PATCH /api/auth/profile`: cập nhật `display_name` và trường được phép; cookie auth + CSRF bắt buộc.
- `POST /api/auth/email-change`: tạo yêu cầu đổi email, yêu cầu mật khẩu/session hợp lệ và gửi verification challenge.
- `POST /api/auth/email-verify`: consume challenge một lần, hết hạn, idempotent.

Bearer compatibility chỉ giữ trong compatibility window; browser mặc định dùng HttpOnly cookie.

## UX đề xuất

- Profile card hiển thị email, role và trạng thái `Đã xác thực`/`Chưa xác thực` lấy từ backend; không suy diễn từ email tồn tại.
- Personal details panel cho phép sửa `display_name`; email hiển thị read-only kèm nút “Yêu cầu đổi email”.
- Sau khi lưu: toast/status có focus, giữ dữ liệu cũ nếu request lỗi, không làm mất session.
- Đổi email phải cảnh báo session có thể bị thu hồi và yêu cầu xác thực email mới.

## Tiêu chí nghiệm thu

- Migration có index/constraint phù hợp và không làm mất dữ liệu user hiện tại.
- PATCH profile có ownership, CSRF, validation, rate limit và audit log.
- Verification challenge chống replay, giới hạn thời gian và không tiết lộ email tồn tại.
- E2E bao phủ read-only email, cập nhật display name, lỗi validation, hết hạn challenge, multi-tab và session refresh.
