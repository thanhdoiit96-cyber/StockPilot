# Frontend: tham chiếu mã hiện tại

Ứng dụng React 18/Vite, viết bằng JavaScript và CSS. Cách chạy và build nằm ở [QUICK_START](../QUICK_START.md); kết quả kiểm tra và công việc tiếp theo nằm ở [PROJECT_STATUS](../docs/PROJECT_STATUS.md).

| Tệp | Vai trò |
| --- | --- |
| [src/main.jsx](src/main.jsx) | Khởi tạo React |
| [src/App.jsx](src/App.jsx) | Dashboard, chọn cổ phiếu, tải API, biểu đồ minh họa, danh mục và chat demo |
| [src/services/api.mjs](src/services/api.mjs) | Kiểm tra HTTP/JSON và cấu trúc dữ liệu cổ phiếu, hủy request và bỏ qua phản hồi cũ |
| [src/hooks/useApiResource.js](src/hooks/useApiResource.js) | Trạng thái tải/lỗi/dữ liệu theo URL, retry, cleanup khi đổi lựa chọn hoặc unmount |
| [src/runtime/overview-table-actions.js](src/runtime/overview-table-actions.js) | Chuẩn hóa cột hành động Phân tích trên bảng Tổng quan của bundle đang phục vụ |
| [src/runtime/sidebar-toggle-icon.js](src/runtime/sidebar-toggle-icon.js) | Hiển thị chevron trái/phải và nhãn truy cập đúng trạng thái cho nút sidebar |
| [src/styles.css](src/styles.css) | Giao diện |
| [vite.config.js](vite.config.js) | Dev server cổng 5173; proxy /api tới API_PROXY_TARGET hoặc localhost:5000 |

UI gọi health, thống kê cache, danh sách và chi tiết cổ phiếu. Lịch sử hiển thị 12 giá mới nhất theo thời gian tăng dần. Danh mục lưu giao dịch do người dùng nhập qua backend; AI Advisor hiện trả lời theo phân tích rule-based.

Health, cache, danh sách và chi tiết tải độc lập. Lỗi HTTP/JSON có thông báo và nút thử lại; danh sách rỗng hợp lệ có trạng thái riêng. Khi đổi cổ phiếu, chi tiết cũ được ẩn ngay trong render và request cũ bị hủy. Lỗi chi tiết chỉ xuất hiện ở trang chi tiết; lỗi cache không làm mất danh sách.

Bộ kiểm thử [api.test.mjs](src/services/api.test.mjs) dùng Node test runner. Kiểm tra HTTP lỗi, JSON sai, empty state, retry, hủy request/phản hồi đến sai thứ tự và lỗi tài nguyên phụ.

[e2e/loading.spec.mjs](e2e/loading.spec.mjs) dùng Playwright với Chrome headless để kiểm tra tương tác React: chuyển mã khi request còn chờ, lỗi mạng/404/500/JSON, empty state, retry chi tiết và lỗi health/cache độc lập. API được giả lập; kết quả PostgreSQL thật được kiểm tra riêng. [playwright.config.mjs](playwright.config.mjs) tự quản lý Vite ở cổng 4180 và báo cáo HTML. Lệnh chạy/điều kiện nằm trong [QUICK_START](../QUICK_START.md).

Chưa có React Router, Redux hoặc thư viện chart riêng. Các công nghệ đó trong tài liệu thiết kế là đề xuất. npm start chạy Vite preview; Dockerfile hiện chạy dev server.

## Overview intraday quotes

The overview defaults to 40 rows per page. It requests bounded VCI price-board snapshots for the active list and polls again 30 seconds after completion. Leaving the view or changing the list aborts the request. Missing or failed quotes fall back to labeled EOD. The coverage counter reports how many rows have quotes.

Valid snapshots show VND per share, percentage change against the provider's reference price, accumulated session volume, source-update time in Vietnam time and fetch time. Source-update time is not labeled as an exact trade timestamp. Both overview and detail consume the same price-board adapter. This is polling of a potentially delayed source, not streaming tick data.

## Ghim mã cá nhân và thao tác từ Tổng quan

Các vị thế có số lượng lớn hơn 0 và mã trong Watchlist được ghim thành một nhóm ở đầu danh sách, kèm nhãn Danh mục/Watchlist. Trong từng nhóm, bảng tiếp tục dùng thứ tự sắp xếp đang chọn. Frontend gửi `pinned` để backend ghim trước phân trang; tìm kiếm và lọc ngành vẫn được tôn trọng. Một mã xuất hiện trong cả hai danh sách chỉ có một dòng. Thay đổi nhóm ghim đưa bảng về trang 1.

Nút **Thêm vào danh mục** mở form ghi nhận giao dịch với mã, loại BUY và giá đang hiển thị; số lượng để trống và được focus. Người dùng sửa thông tin rồi bấm **Lưu giao dịch** để ghi vào backend. Thao tác này không đặt lệnh tại công ty chứng khoán. Sau khi lưu thành công, mã có vị thế được ghim khi quay lại Tổng quan.

`SourceLink` hiển thị liên kết HTTP/HTTPS với URL đầy đủ trong tooltip mặc định của trình duyệt khi hover. Áp dụng cho URL doanh nghiệp/nguồn nếu có trong payload, giấy phép quote và nguồn yếu tố bên ngoài. Liên kết mở tab mới; click không kích hoạt hành vi chọn dòng cổ phiếu. URL thiếu hoặc giao thức không an toàn được hiển thị dưới dạng văn bản thường.

Bảng dùng hàng compact, đổi nền và hiển thị cursor khi rê chuột. Metadata ngày giờ/giấy phép trong ô nguồn được rút thành biểu tượng `ⓘ`; hover hoặc focus biểu tượng để xem tooltip mà không chiếm chiều cao hàng.

Cột **Phân tích** không hiển thị nhãn xu hướng hoặc mô tả biến động tĩnh trên từng dòng. Nút **Phân tích chuyên sâu** là hành động duy nhất trong cột này; nút mở Chi tiết mã và chủ động yêu cầu tải phân tích kỹ thuật mới cho mã được chọn.

Khối **Tiếp tục từ đây** đã được bỏ vì trùng các action ở đầu trang. Giải thích dữ liệu được đặt ngay nơi sử dụng: biểu tượng thông tin của nguồn giải thích Intraday/EOD/dữ liệu cũ, biểu tượng cạnh khối lượng cho biết loại khối lượng của từng dòng, và nhãn **cũ** giải thích phiên dữ liệu cụ thể. Trạng thái mã đã rời sàn dùng nhãn **Đã hủy niêm yết**. Release gate kiểm tra cả bundle chính và runtime Tổng quan để tránh phát hành thiếu các hành vi này.

Bộ đếm **Hiển thị n/tổng số mã** và bộ chọn **Số mã / trang** nằm thành một cụm bên trái hàng phân trang dưới bảng; trạng thái trang và nút Trước/Sau nằm bên phải. Trên màn hình hẹp, cụm thông tin chiếm một hàng riêng. Tùy chọn `40` tương ứng với kích thước trang mặc định của Tổng quan.

Tiêu đề **Danh sách cổ phiếu** nằm riêng phía trên. Bộ lọc **Nhóm ngành** và ô **Tìm cổ phiếu** dùng chung một hàng ngay bên dưới, kể cả khi giao diện thu hẹp; hai ô tự co theo chiều rộng khả dụng.

Nút sidebar dùng chevron trái khi thanh đang mở và chevron phải khi đã thu gọn. Tooltip/`aria-label` lần lượt là **Thu gọn thanh điều hướng** và **Mở rộng thanh điều hướng**.

Tab **Đề xuất** tách snapshot ngắn hạn khỏi Tổng quan. Tab này hiển thị candidate/rationale, evidence groups (objective, macro, news, sentiment, subjective, policy) và lịch sử đánh giá ngoài mẫu. Model hiện chỉ tính technical evidence đã kiểm chứng; nhóm chưa có nguồn hiển thị `unavailable` và không nhận điểm. Hit rate/forward return chỉ được tính sau đủ 20 phiên.

## Build và kiểm tra bản phát hành

`npm run build` dùng safe-build: gọi npm CLI qua Node để tương thích Windows, kiểm tra bundle và khôi phục dist trước đó nếu build/gate thất bại. `verify:release` kiểm tra service tests và dist hiện có, không thay thế build hoặc E2E. Source ứng dụng và CSS đã được khôi phục từ asset đã phát hành; xem [nguồn gốc khôi phục](recovery/README.md). App.jsx là mã ứng dụng đã định dạng lại từ bản biên dịch, còn tên biến cũ; React/vendor tiếp tục lấy từ package chuẩn. Chỉnh sửa source và build bình thường, không sửa dist trực tiếp.

## Intraday và trạng thái tải

`useLiveQuotes` dùng chung cho Tổng quan, Danh mục và Chi tiết. Chỉ trang đang mở polling, lần tiếp theo sau khi request kết thúc 30 giây; mỗi lượt giới hạn 12 giây và hủy khi đổi trang/mã. Overlay dựa trên trạng thái request đầu tiên, luôn kết thúc cả khi lỗi hoặc rỗng. Quote thành công từng mã được giữ tối đa 90 giây qua lỗi tạm thời, không đổi thời điểm gốc; hết hạn chuyển sang fallback EOD. Danh mục và Watchlist tải độc lập, lỗi Danh mục có nút thử lại và không hiển thị thành danh mục rỗng. Mã UUID được giữ nguyên khi khôi phục Chi tiết qua reload.
