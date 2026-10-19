# Rà soát sản phẩm và kỹ thuật

Ngày rà soát: 2026-10-19.

## Kết luận

Dự án đã vượt xa phạm vi demo ban đầu: có xác thực bằng cookie và quản lý phiên, bảng giá, watchlist, sổ giao dịch và dòng tiền danh mục, đề xuất có vòng đời kiểm chứng, dữ liệu doanh nghiệp, forecast research và hệ thống kiểm soát nguồn dữ liệu. Nền tảng có nhiều kiểm thử, nhưng trải nghiệm người dùng và khả năng bảo trì chưa theo kịp số lượng tính năng.

Ưu tiên hiện tại là làm sản phẩm dễ sử dụng và mã nguồn dễ thay đổi, trong khi tiếp tục giữ ranh giới research/live. Không mở rộng dự báo hoặc tự động hóa quyết định đầu tư trước khi đủ evidence ngoài mẫu.

## Phạm vi và bằng chứng

- Đối chiếu mã nguồn frontend, backend, worker, migrations, cấu hình, tài liệu và thay đổi chưa commit.
- Frontend: 94 unit/contract test đạt; production build đạt. Bundle JavaScript chính trước cải tiến là 557,96 kB (164,41 kB gzip) và Vite cảnh báo vượt 500 kB.
- Backend: 99 file test được phát hiện. Bộ Jest đầy đủ được chạy trong lần rà soát này; kết quả cuối được ghi ở `PROJECT_STATUS.md`.
- Backend lint trước rà soát không chạy được vì thiếu cấu hình ESLint dù `package.json` đã khai báo lệnh `lint`.
- `frontend/src/App.jsx` có 2.332 dòng/98,6 kB. Lịch sử dài của trạng thái và roadmap đã được chuyển vào [archive](archive/README.md); hai tài liệu hiện hành chỉ giữ thông tin cần để tiếp tục công việc.

## Đánh giá theo lĩnh vực

| Lĩnh vực | Hiện trạng | Khoảng trống | Ưu tiên |
| --- | --- | --- | --- |
| Điều hướng | Sáu view chính hoạt động nhưng view chỉ lưu trong session; URL chỉ giữ mã chi tiết | Không chia sẻ được link tới Bảng giá/Danh mục/Đề xuất; Back/Forward không theo view | P0 |
| Bảo mật | Cookie session, CSRF, thu hồi phiên và rate limit đã có | `/api/debug-env` công khai metadata kết nối; chưa có phục hồi mật khẩu/MFA | P0/P2 |
| Frontend | Nhiều component đã tách và có accessibility regression | `App.jsx` vẫn điều phối quá nhiều state/request; bundle chính vượt ngưỡng cảnh báo | P1 |
| Backend | Controller/service phong phú, nhiều gate dữ liệu | `app.js` vừa bootstrap vừa đăng ký scheduler/ops; lint gate bị hỏng; health chưa phản ánh dependency readiness | P0/P1 |
| Dữ liệu thị trường | Có provenance, freshness, coverage và fail-closed gate | Provider còn bất ổn; company scope mở rộng và forecast live chưa đủ evidence | P1 phụ thuộc dữ liệu |
| Danh mục | Có vị thế, ledger, cash flow, performance và import/export | Chưa có mục tiêu phân bổ, cảnh báo lệch tỷ trọng hoặc nhật ký quyết định của người dùng | P2 |
| Tài khoản | Hồ sơ, đổi mật khẩu và quản lý phiên đã có | Chưa có quên mật khẩu; email delivery và token lifecycle chưa được thiết kế | P2 |
| Tài liệu | Có tài liệu thiết kế và bằng chứng chi tiết | Status/roadmap quá dài, README mô tả lỗi thời, thông tin hiện tại khó tìm | P0 |
| Vận hành | Có metrics, Prometheus contract, Docker và scheduler | Chưa có readiness endpoint đầy đủ, job lock thống nhất và cách chạy worker production đã chốt | P1, để sau phát triển tính năng |

## Lộ trình được chọn

### Giai đoạn A — Làm sạch nền tảng phát triển (đang thực hiện)

1. Thêm URL chuẩn cho từng view, hỗ trợ Back/Forward và link chi tiết cổ phiếu.
2. Khóa endpoint debug bằng quyền quản trị.
3. Khôi phục lint backend và đưa vào release verification.
4. Tạo bản trạng thái ngắn hiện hành; chuyển lịch sử dài sang archive mà không mất bằng chứng. Hoàn thành 2026-10-19; record cũ nằm tại [archive](archive/README.md).

Nghiệm thu: URL round-trip được test; navigation browser đạt; request debug không có quyền bị từ chối; lint/test/build xanh; tài liệu hiện trạng không mâu thuẫn mã.

### Giai đoạn B — Tách frontend và giảm chi phí tải (đang thực hiện)

1. Tách state/request theo page container, bắt đầu từ Đề xuất và Advisor.
2. Lazy-load Bảng giá, Đề xuất và Advisor đã hoàn thành bước đầu: entry JS giảm từ 557,96 kB xuống 481,94 kB; ba page chunk lần lượt 19,48 kB, 52,12 kB và 6,75 kB. Các tab doanh nghiệp còn lại sẽ chỉ tách khi đo cho thấy có lợi.
3. Chuẩn hóa route/page title/focus restoration và loading boundary.
4. Chỉ thêm virtualization hoặc server pagination sau khi đo trên universe thực tế.

Nghiệm thu: entry bundle giảm có số đo; không tăng request lúc mở Tổng quan; keyboard, mobile và E2E hiện hữu đạt.

### Giai đoạn C — Readiness và độ tin cậy dữ liệu

1. Tách liveness/readiness; readiness có timeout và không lộ secret.
2. Chuẩn hóa run ledger và lock chống scheduler chạy trùng.
3. Hiển thị freshness/coverage theo nguồn ở đúng màn hình người dùng, không đưa log vận hành vào UI thường.
4. Tiếp tục company-data gate và forecast shadow theo evidence; không hạ gate để mở tính năng.

### Giai đoạn D — Tính năng người dùng tiếp theo

1. **Mục tiêu danh mục và cảnh báo lệch tỷ trọng:** tận dụng position/performance hiện có, không cần dự báo mới. Bản đầu chỉ tính và hiển thị, không gửi lệnh hay notification.
2. **Nhật ký quyết định đầu tư:** người dùng ghi luận điểm, thời hạn, mức vô hiệu và liên kết snapshot evidence; giúp đánh giá quyết định thay vì chỉ nhìn P&L.
3. **Khôi phục mật khẩu:** cần token một lần, hash trong DB, hết hạn/thu hồi, rate limit và email provider. Chỉ triển khai sau khi chốt delivery provider.
4. **Cảnh báo giá/dữ liệu:** cần scheduler đáng tin cậy và kênh gửi; bắt đầu bằng cảnh báo trong ứng dụng, sau đó mới email/push.
5. **So sánh mã/ngành:** chỉ mở khi coverage và license của company/sector data đạt gate.

Không ưu tiên thêm chatbot, tín hiệu mua bán hoặc forecast mới. Các bề mặt đó đã có research prototype nhưng còn thiếu bằng chứng live; mở rộng lúc này làm tăng rủi ro gây hiểu nhầm hơn là tăng giá trị.

## Ngân sách hiệu năng và dữ liệu

- Điều hướng không được tạo request mới chỉ vì đồng bộ URL.
- Tổng quan không tải code và dữ liệu của các page chưa mở sau khi hoàn tất Giai đoạn B.
- Request readiness tối đa 2 giây mỗi dependency và không nằm trong request path dữ liệu người dùng.
- Cảnh báo danh mục tương lai được tính từ snapshot/position hiện có; không polling nhanh hơn quote policy hiện tại.
- Mọi số liệu tài chính mới phải có `as_of`, provider/provenance và trạng thái unavailable/stale rõ ràng.

## Phần chưa làm

- Chưa chọn email provider cho phục hồi mật khẩu và cảnh báo.
- Chưa xác nhận scheduler/worker production; quyết định deploy được hoãn theo yêu cầu hiện tại.
- Chưa có bằng chứng để mở company scope ngoài profile hoặc công bố forecast live.
- Archive trạng thái/lộ trình đã hoàn thành; các thay đổi mới chỉ cập nhật nguồn hiện hành và archive khi một record không còn là trạng thái tiếp tục.
