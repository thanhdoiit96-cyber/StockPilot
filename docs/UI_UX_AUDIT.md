# Rà soát UI/UX và hiệu năng theo page

Cập nhật: 2026-10-02.

## Phạm vi và cách kiểm tra

Rà soát bảy surface người dùng: Đăng nhập, Tổng quan, Bảng giá, Danh mục cá nhân, Chi tiết mã, Đề xuất và AI Advisor. Mỗi page được kiểm tra bằng fixture có quote intraday, dữ liệu EOD thiếu một phần, vị thế, watchlist và đề xuất; viewport chuẩn là desktop `1440×1000` và mobile `390×844`.

Playwright kiểm tra page đích hiển thị, chỉ một mục điều hướng active, topbar đúng ngữ cảnh, document không tràn ngang và các contract dữ liệu quan trọng. Ảnh audit sinh ở `frontend/test-results/ui-audit/` và không lưu vào Git. Đây là kiểm tra UI với mock API, không phải xác nhận provider/production.

## Kết quả theo page

| Page | Hiện trạng và vấn đề chính | Đã thực hiện trong đợt này | Đề xuất tiếp theo |
| --- | --- | --- | --- |
| Đăng nhập | Form gọn, có trạng thái đăng nhập/đăng ký; chưa có luồng khôi phục mật khẩu và thông báo phiên hết hạn theo ngữ cảnh. | Bổ sung vào audit desktop/mobile và kiểm tra không tràn viewport. | Thêm hiện/ẩn mật khẩu, hướng dẫn mật khẩu, luồng quên mật khẩu khi backend có contract; đưa lỗi vào focus và `aria-live`. |
| Tổng quan | Phân cấp hero → KPI → độ rộng hợp lý. Dòng phạm vi từng ghi `0/0` dù các nhóm tăng/giảm đã có dữ liệu. | Đồng bộ topbar; sửa dòng phạm vi từ coverage thực của bảng; giữ cảnh báo chất lượng dữ liệu gần đầu page. | Thêm xu hướng độ rộng nhiều snapshot, hiệu suất ngành và lưu bộ lọc; chỉ triển khai khi backend có contract nhất quán. |
| Bảng giá | Bảng, timeline, filter và action đã rõ trên desktop. Mobile cần cuộn ngang nhưng trước đây kéo rộng cả document và không có chỉ dẫn. | Cô lập cuộn trong bảng, thêm hướng dẫn “Vuốt ngang”, giữ mã sticky; thêm cấu hình cột lưu cục bộ và xuất CSV đúng trang/bộ lọc hiện tại. Page React riêng hiện sở hữu render, navigation và quote lifecycle; observer cũ đã bị loại. | Đo lại bằng API/live data và lấy p50/p95 nhiều lượt trước khi quyết định pagination/windowing. |
| Danh mục cá nhân | Có ghi giao dịch, vị thế, P/L, donut, watchlist và lịch sử ledger theo người dùng. Form từng rơi về nền sáng; coverage quote ghi `4/1` vì đếm quote toàn thị trường. | Đồng bộ dark theme; coverage chỉ đếm dòng vị thế có Intraday; refresh nền không khóa form; giữ tooltip donut cho chuột và bàn phím; thêm nhật ký, export/import CSV nguyên tử, sửa/xóa qua dialog xác nhận và revalidation toàn timeline, cùng bộ lọc vị thế đang mở/đã đóng. | Chỉ thêm phân trang ledger khi dữ liệu thực tế đủ lớn; giữ invariant timeline cho mọi mutation. |
| Chi tiết mã | Tìm mã, giá hiện tại, lịch sử và phân tích lazy rõ ràng; page dài trên mobile sau khi mở phân tích. | Topbar đúng ngữ cảnh, mobile shell gọn, refresh intraday không chặn thao tác; giữ analysis chỉ tải khi người dùng yêu cầu; thêm mục lục dính và tooltip chart dùng chung cho hover/focus, hỗ trợ phím mũi tên/Escape. | Thêm zoom chart; chỉ thêm benchmark khi có series chỉ số cùng phiên và contract gap rõ ràng. |
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

Trạng thái: đang thực hiện.

1. Hoàn thành: chuyển Bảng giá từ runtime DOM injection thành `MarketBoardPage`; React sở hữu render, navigation/phân trang, loading/error/empty state, toolbar và quote lifecycle. `market-board-tools.js`, sidebar runtime và toàn bộ `MutationObserver` trong source frontend đã bị loại.
2. Hoàn thành: `overview-table-actions.js` đã được bỏ; `MarketBreadth` (Tổng quan), `PortfolioAllocation` (Danh mục) và lifecycle phân tích Chi tiết là component/service React, không dùng observer DOM. Tiếp theo tách `App.jsx` thành module page có tên rõ; chỉ code-split Detail, Đề xuất và Advisor khi source parity và full E2E còn xanh.
3. Baseline trước tách module gồm bốn lượt Chrome headless/build production cục bộ với mock API: p50 quan sát 300 mã `583/556/150 ms`, 500 mã `790/848/193 ms` theo first usable/chuyển Bảng giá/quote settlement. Hai lượt sau tách module lần lượt là `647/552/131 ms` và `986/722/182 ms`; tất cả vẫn trong budget regression. Mẫu nhỏ và API tức thời nên đây chưa phải SLA production; bước tiếp theo là đo nhiều lượt bằng API/live data và ghi cấu hình máy.
4. Sau phép đo, ưu tiên server pagination/windowing, memo hóa aggregate và lazy mount khối phân tích ngoài viewport nếu vượt budget được thống nhất.

Tiêu chí: source/dist tái tạo được; service tests, build, page audit và full E2E xanh; không tăng request concurrency để che độ trễ provider; có evidence đo 300/500 mã.

### P2 — Chiều sâu sản phẩm theo page

Trạng thái: backlog sau P1.

- Tổng quan: lịch sử độ rộng và drill-down ngành.
- Bảng giá: cấu hình cột, sticky symbol và export phạm vi hiện tại đã có; tiếp theo là preset cột theo tác vụ và server-side export nếu phạm vi vượt trang hiện tại.
- Danh mục: lịch sử, export/import CSV nguyên tử, sửa/xóa có xác nhận và bộ lọc vị thế đang mở/đã đóng đã có; chỉ thêm phân trang ledger khi có bằng chứng về quy mô.
- Chi tiết: đã có range, điều hướng section và tooltip chart bằng bàn phím; tiếp theo là zoom chart và benchmark khi có series chỉ số cùng phiên.
- Đề xuất: đã có so sánh hai snapshot theo trọng số, mã thêm/giữ/bớt, hạng và điểm; tiếp theo là drill-down evidence theo từng mã khi backend lưu đủ provenance nguồn.
- Advisor: đã có context selector Mã/Danh mục/Thị trường và citation gắn với từng câu trả lời; tiếp theo là quản lý nhiều hội thoại khi có API lưu trữ và chính sách retention.
- Đăng nhập: khôi phục mật khẩu và hardening session/cookie trước public.

Mỗi tính năng chỉ được đánh dấu hoàn thành khi có contract/backend tương ứng, empty/error/loading states, keyboard/mobile acceptance và bằng chứng kiểm thử.

## Ngân sách và giới hạn hiện tại

Build production ngày 2026-10-01 sau khi chuyển Bảng giá sang React tạo main JS khoảng `310,53 kB` (`93,15 kB` gzip), CSS `68,35 kB` (`13,12 kB` gzip) và runtime Tổng quan `97,10 kB` chưa gzip. Hai runtime Bảng giá/sidebar đã bị loại. Đây là kích thước artifact, không phải số đo tốc độ người dùng; tối ưu tải chỉ đánh giá sau phép đo live.

Blocker hiệu năng lớn nhất là source phục hồi vẫn tập trung trong `App.jsx` và một số behavior ngoài Bảng giá còn được bổ sung qua runtime sự kiện. Phép đo fixture hiện chưa cho thấy cần thêm thư viện virtualization; không chọn giải pháp đó trước khi có p50/p95 với API/live data và sau khi tách thêm page.
