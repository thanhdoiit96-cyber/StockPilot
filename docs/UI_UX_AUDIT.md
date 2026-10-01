# Rà soát UI/UX và hiệu năng theo page

Cập nhật: 2026-10-01.

## Phạm vi và cách kiểm tra

Rà soát bảy surface người dùng: Đăng nhập, Tổng quan, Bảng giá, Danh mục cá nhân, Chi tiết mã, Đề xuất và AI Advisor. Mỗi page được kiểm tra bằng fixture có quote intraday, dữ liệu EOD thiếu một phần, vị thế, watchlist và đề xuất; viewport chuẩn là desktop `1440×1000` và mobile `390×844`.

Playwright kiểm tra page đích hiển thị, chỉ một mục điều hướng active, topbar đúng ngữ cảnh, document không tràn ngang và các contract dữ liệu quan trọng. Ảnh audit sinh ở `frontend/test-results/ui-audit/` và không lưu vào Git. Đây là kiểm tra UI với mock API, không phải xác nhận provider/production.

## Kết quả theo page

| Page | Hiện trạng và vấn đề chính | Đã thực hiện trong đợt này | Đề xuất tiếp theo |
| --- | --- | --- | --- |
| Đăng nhập | Form gọn, có trạng thái đăng nhập/đăng ký; chưa có luồng khôi phục mật khẩu và thông báo phiên hết hạn theo ngữ cảnh. | Bổ sung vào audit desktop/mobile và kiểm tra không tràn viewport. | Thêm hiện/ẩn mật khẩu, hướng dẫn mật khẩu, luồng quên mật khẩu khi backend có contract; đưa lỗi vào focus và `aria-live`. |
| Tổng quan | Phân cấp hero → KPI → độ rộng hợp lý. Dòng phạm vi từng ghi `0/0` dù các nhóm tăng/giảm đã có dữ liệu. | Đồng bộ topbar; sửa dòng phạm vi từ coverage thực của bảng; giữ cảnh báo chất lượng dữ liệu gần đầu page. | Thêm xu hướng độ rộng nhiều snapshot, hiệu suất ngành và lưu bộ lọc; chỉ triển khai khi backend có contract nhất quán. |
| Bảng giá | Bảng, timeline, filter và action đã rõ trên desktop. Mobile cần cuộn ngang nhưng trước đây kéo rộng cả document và không có chỉ dẫn. | Sửa app shell mobile, cô lập cuộn trong bảng, thêm hướng dẫn “Vuốt ngang”, giữ action/phân tích và loading không chặn. | Tách thành route React thật; thêm cấu hình cột/sticky mã; đo và cân nhắc virtualization khi tải 300/500 mã. |
| Danh mục cá nhân | Có ghi giao dịch, vị thế, P/L, donut và watchlist. Form từng rơi về nền sáng; coverage quote ghi `4/1` vì đếm quote toàn thị trường. | Đồng bộ dark theme; coverage chỉ đếm dòng vị thế có Intraday; refresh nền không khóa form; giữ tooltip donut cho chuột và bàn phím. | Thêm lịch sử giao dịch với sửa/xóa có xác nhận, import/export CSV và bộ lọc vị thế đóng khi backend hỗ trợ. |
| Chi tiết mã | Tìm mã, giá hiện tại, lịch sử và phân tích lazy rõ ràng; page dài trên mobile sau khi mở phân tích. | Topbar đúng ngữ cảnh, mobile shell gọn, refresh intraday không chặn thao tác; giữ analysis chỉ tải khi người dùng yêu cầu. | Thêm range/zoom, benchmark, tooltip chart bằng bàn phím và mục lục dính cho các khối phân tích dài. |
| Đề xuất | Có tiêu chí giải thích được, snapshot và vòng phản hồi; mật độ nội dung cao, đặc biệt trên mobile. | Bảo toàn layout một cột mobile, topbar đúng ngữ cảnh và audit toàn chiều dài; không thay đổi logic chấm điểm. | Cho thu gọn tiêu chí sau khi có kết quả, so sánh hai snapshot và mở evidence/provenance tại chỗ; không cộng điểm nguồn chưa xác minh. |
| AI Advisor | Quick prompts và gate rule-based rõ, nhưng badge dài và input rỗng vẫn cho cảm giác có thể gửi. | Rút gọn badge, thêm `role=log`/`aria-live`, nhãn input và disable nút Gửi khi rỗng; topbar đúng ngữ cảnh. | Thêm bộ chọn mã/phạm vi danh mục, nút xóa hội thoại và citation theo câu trả lời; Generative AI tiếp tục khóa đến khi đạt quality/cost/source gate. |

## Thay đổi dùng chung đã triển khai

1. Mobile shell dùng một cột `minmax(0, 1fr)`, sidebar thành thanh điều hướng ngang sticky gọn; brand/profile/toggle desktop không chiếm một màn hình trước nội dung.
2. Loading intraday chuyển thành status toast không chặn click/scroll. Loading dữ liệu chính và lỗi vẫn dùng state riêng trong page.
3. Topbar phản ánh đúng page thay vì luôn ghi “Trung tâm phân tích”.
4. Audit regression mới bao phủ bảy surface ở desktop/mobile và kiểm tra không tràn document.
5. Hai số liệu sai ngữ cảnh được sửa: coverage độ rộng thị trường và coverage intraday của danh mục.

## Kế hoạch ưu tiên

### P0 — Tính đúng và khả dụng cơ bản

Trạng thái: hoàn thành trong đợt 2026-10-01.

- Không tràn ngang document ở `390×844`; bảng được phép cuộn trong container.
- Refresh nền không khóa page đang có dữ liệu.
- Coverage/nguồn dữ liệu hiển thị đúng phạm vi page.
- Navigation, topbar và active state thống nhất.

### P1 — Kiến trúc page và hiệu năng 300/500 mã

Trạng thái: tiếp theo.

1. Chuyển Bảng giá từ runtime DOM injection thành view/route React riêng, sau đó chuyển từng enhancement còn lại khỏi MutationObserver.
2. Tách `App.jsx` đã phục hồi thành module page/component có tên rõ; chỉ khi source parity và full E2E còn xanh mới code-split Detail, Đề xuất và Advisor.
3. Đo first usable paint, thời gian chuyển page, quote settlement và aggregate độ rộng với 300/500 mã trên build production. Ghi p50/p95, thiết bị và dữ liệu kiểm tra; không suy diễn từ fixture nhỏ.
4. Sau phép đo, ưu tiên server pagination/windowing, memo hóa aggregate và lazy mount khối phân tích ngoài viewport nếu vượt budget được thống nhất.

Tiêu chí: source/dist tái tạo được; service tests, build, page audit và full E2E xanh; không tăng request concurrency để che độ trễ provider; có evidence đo 300/500 mã.

### P2 — Chiều sâu sản phẩm theo page

Trạng thái: backlog sau P1.

- Tổng quan: lịch sử độ rộng và drill-down ngành.
- Bảng giá: cấu hình cột, sticky symbol và export phạm vi hiện tại.
- Danh mục: quản lý ledger đầy đủ và import/export.
- Chi tiết: chart tương tác, benchmark và điều hướng section.
- Đề xuất: so sánh snapshot/evidence.
- Advisor: context selector, citation và quản lý hội thoại.
- Đăng nhập: khôi phục mật khẩu và hardening session/cookie trước public.

Mỗi tính năng chỉ được đánh dấu hoàn thành khi có contract/backend tương ứng, empty/error/loading states, keyboard/mobile acceptance và bằng chứng kiểm thử.

## Ngân sách và giới hạn hiện tại

Build production ngày 2026-10-01 tạo main JS khoảng `304,78 kB` (`91,41 kB` gzip), CSS `61,47 kB` (`11,97 kB` gzip) và runtime Bảng giá khoảng `97,17 kB` chưa gzip. Đây là kích thước artifact, không phải số đo tốc độ người dùng.

Blocker hiệu năng lớn nhất là source phục hồi vẫn tập trung trong `App.jsx` và nhiều behavior còn được bổ sung qua runtime observer. Không nên thêm thư viện/virtualization trước khi đo 300/500 mã và tách page; nếu không sẽ tăng độ phức tạp nhưng chưa chứng minh cải thiện.
