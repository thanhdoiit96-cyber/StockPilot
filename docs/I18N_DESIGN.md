# Thiết kế catalog giao diện Việt/Anh

## Mục tiêu và quyết định

Ứng dụng dùng catalog key tĩnh `vi`/`en`, tiếng Việt là fallback. Lựa chọn này phù hợp với quy mô hiện tại, không thêm dependency/runtime request và cho phép kiểm tra parity trực tiếp. Mã cổ phiếu, tên nguồn dữ liệu và dữ liệu do người dùng nhập không được dịch.

Ngôn ngữ trước đăng nhập lưu tại `stockpilot-language` để màn hình auth không đổi lại sau reload. Sau đăng nhập, `user.preferred_language` là nguồn chính và được đồng bộ về local preference để giữ ngôn ngữ khi đăng xuất. Chỉ container đã dịch mới nhận thuộc tính `lang`; `html[lang]` tiếp tục là `vi` cho đến khi toàn bộ nội dung đang hiển thị có catalog English, tránh cung cấp metadata accessibility sai.

## Lộ trình triển khai

1. Đăng nhập, xác minh phiên, điều hướng và tiêu đề trang.
2. Danh mục, Watchlist, giao dịch, dòng tiền và trạng thái hiệu suất — đã triển khai.
3. Bảng giá và phần giao diện Chi tiết mã — đã triển khai; Tổng quan đã phủ hero/metric/Market Breadth và lịch sử A/D; tiếp theo data-quality dùng chung và Đề xuất.
4. Chuỗi validation/backend phổ biến, email hệ thống và rà soát accessibility/layout mobile.

Mỗi lát cắt phải giữ key parity giữa hai catalog, fallback về tiếng Việt khi key thiếu, không dịch bằng cách dò/thay nội dung DOM và không tải catalog qua mạng. Nghiệm thu gồm unit test parity/fallback, browser test đổi ngôn ngữ + reload + đăng nhập và kiểm tra layout ở desktop/mobile.

## Hiệu năng và bảo trì

Bảng giá dùng key ngữ nghĩa trong `i18n.mjs`; Chi tiết dùng adapter tĩnh `detailCatalog.mjs` cho contract `translate` có sẵn, không dò/thay DOM. Đổi ngôn ngữ không thay query hoặc reset range biểu đồ. Tooltip thời điểm intraday giữ độ chính xác đến giây. CSV trang hiện tại dịch header; CSV toàn bộ kết quả từ server giữ contract hiện có. Nội dung phân tích, tin tức và lỗi thô do backend/provider trả về giữ nguyên ngôn ngữ nguồn; chưa xem đó là nội dung đã dịch. Mapping error code và narrative có cấu trúc là công việc tiếp theo, không dịch suy đoán dữ liệu tài chính.

Catalog được bundle cùng frontend; lookup là truy cập object đồng bộ và không làm tăng số request. Key mới phải có ở cả `vi` và `en`. Khi catalog lớn đủ để ảnh hưởng bundle đo được, mới tách theo route; chưa lazy-load sớm vì sẽ làm auth phụ thuộc thêm một request và tăng trạng thái lỗi.
