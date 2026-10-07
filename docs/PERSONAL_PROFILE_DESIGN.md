# Hồ sơ cá nhân mở rộng

## Quyết định — 2026-10-06

Người dùng đã đăng nhập cần quản lý thông tin cơ bản từ Tài khoản, không rời trang đang làm việc. Chọn mở rộng dialog hiện có thay vì thêm trang cài đặt: ít thao tác, giữ được draft và cơ chế xác nhận bỏ thay đổi. Hồ sơ gồm `full_name`, `phone`, `date_of_birth` nullable; tên hiển thị vẫn độc lập. Migration 027 bổ sung `preferred_language` và `timezone` có giá trị mặc định để lựa chọn luôn có hiệu lực.

## Contract

- PATCH `/api/auth/profile` cập nhật một phần, chỉ whitelist display_name/full_name/phone/date_of_birth/preferred_language/timezone. Field không gửi giữ nguyên; null chỉ dùng xóa field tùy chọn. Không sửa email/role/verification qua endpoint này; unknown field bị bỏ qua để tương thích client cũ, payload không có field hợp lệ bị từ chối.
- Họ tên/tên hiển thị: trim, 1–120 ký tự, không ký tự điều khiển. Điện thoại: tối đa 32 ký tự đầu vào, cho phép dấu cách/dấu nối/ngoặc, chuẩn hóa thành 8–15 chữ số với dấu + tùy chọn; không suy đoán mã quốc gia. Ngày sinh: ngày ISO thực, từ 1900 đến ngày UTC hiện tại, không chuyển timezone.
- Ownership lấy từ session, CSRF giữ nguyên. Update `updated_at` để theo dõi lần sửa gần nhất; chưa có lịch sử audit độc lập. Không ghi giá trị cá nhân vào log. Dữ liệu do người dùng tự khai, không chứng minh danh tính/KYC. Không có nút xác minh giả.
- GET me/login/refresh trả các field mới. Migration bổ sung nullable, không backfill/sửa dữ liệu cũ.
- Ngôn ngữ hỗ trợ `vi|en`; múi giờ hỗ trợ `Asia/Ho_Chi_Minh`, `Asia/Bangkok`, `Asia/Singapore`, `UTC`. Preference áp dụng ngay cho định dạng ngày/số/tiền trong Danh mục. Ngày phiên EOD vẫn theo timezone thị trường Việt Nam. Chuỗi UI và `html[lang]` vẫn là tiếng Việt cho đến mốc catalog song ngữ để screen reader không phát âm sai; locale formatter được phản ánh qua `data-locale`.

## UX, hiệu năng và nghiệm thu

- Tách nhóm thông tin cơ bản/liên hệ; field tùy chọn, email chỉ đọc. Một nút lưu; hoàn tác/đóng/chuyển tab giữ quy tắc draft hiện có. Lỗi không xóa bản nháp. Mobile không tràn, input có label/focus/autocomplete.
- Không request khi mở dialog, nhập hoặc đổi tab; một PATCH khi lưu; không polling, dependency hay storage cá nhân mới. Payload tăng tối đa vài trăm byte mỗi user response; chưa tuyên bố số đo latency.
- Test validation (ngày không tồn tại/tương lai/type), partial update/clear, ownership/CSRF/protected fields, lưu và hoàn tác UI, mobile và hồi quy Danh mục. Build và xác minh bundle Preview 4173.
- Form giao dịch: đồng bộ chiều cao/padding/font/màu/focus, numeric tabular; giữ number input và payload số hiện tại, không chèn dấu phân cách làm thay đổi parser tài chính.
