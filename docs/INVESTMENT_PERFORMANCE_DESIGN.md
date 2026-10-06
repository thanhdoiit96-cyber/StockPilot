# Thiết kế Hiệu suất đầu tư

## Mục tiêu và người dùng

Nhà đầu tư cần biết danh mục đang tạo ra bao nhiêu lãi/lỗ từ các giao dịch họ đã ghi nhận, đồng thời hiểu dữ liệu nào đã và chưa được tính. Bản đầu ưu tiên tính đúng, truy vết tới ledger và phản ánh trung thực dữ liệu thiếu hơn là dựng biểu đồ hoặc tỷ suất chuẩn ngành khi chưa đủ cash flow.

## Quyết định bản đầu

- Dùng giá vốn bình quân theo từng mã, nhất quán với vị thế hiện có.
- Công bố giá trị thị trường, giá vốn đang mở, giá vốn đã tất toán, lãi/lỗ đã thực hiện, chưa thực hiện, tổng lãi/lỗ và lợi nhuận trên tổng giá vốn.
- Chỉ công bố tổng lãi/lỗ và tỷ suất khi mọi vị thế mở đều có giá. Nếu thiếu giá, giữ phần đã thực hiện nhưng trả trạng thái `partial` và để các tổng phụ thuộc giá là `null`.
- Gắn contract `weighted_average_cost_basis_v1`. Đây là tỷ suất trên giá vốn, không phải time-weighted return (TWR) hoặc money-weighted return (MWR/XIRR).
- UI đặt đầu trang Danh mục, ưu tiên một con số tổng, ba thành phần đối chiếu và trạng thái coverage; responsive một cột trên mobile.

## Phương án đã loại

- Không dùng `(giá trị hiện tại - tổng tiền mua) / tổng tiền mua`: cách này sai khi có bán một phần hoặc tái sử dụng vốn.
- Không gọi kết quả hiện tại là TWR/MWR: ledger chưa có nạp/rút tiền, cash balance, cổ tức và corporate action.
- Chưa dựng chuỗi biểu đồ từ giá EOD: cần valuation theo từng phiên, quy tắc cutoff/timezone và coverage lịch sử trước.

## Contract và tiêu chí nghiệm thu

- API danh mục trả thêm `performance`, không tạo request riêng và không làm tăng số lần gọi provider. Frontend tái định giá các trường phụ thuộc giá từ cùng quote refresh đang dùng cho vị thế để snapshot không lệch với bảng bên dưới.
- Kết quả phải khớp tổng `realized_pnl` và `unrealized_pnl` của các vị thế; phí mua nằm trong giá vốn, phí bán trừ khỏi lợi nhuận đã thực hiện.
- Trả coverage số vị thế có giá/tổng vị thế mở, `complete|partial|empty`, các limitation có cấu trúc và TWR/MWR là `null`.
- Unit test bao phủ bán một phần, phí, dữ liệu giá đầy đủ và thiếu giá. UI phải có trạng thái empty/partial/complete, đọc được bằng screen reader và không tràn ở 390px.

## Bước mở rộng có điều kiện

### Cash-flow ledger — triển khai 2026-10-06

- Migration 024 tạo `portfolio_cash_flows` cho đúng hai loại dòng tiền bên ngoài: `DEPOSIT` và `WITHDRAWAL`. Số tiền luôn dương; chiều dòng tiền do `type` quyết định. Mỗi bản ghi có thời điểm, ghi chú tùy chọn, audit timestamp và thuộc đúng một portfolio.
- `GET /api/portfolio` trả timeline `cash_flows` và tổng `deposits`, `withdrawals`, `net` trong `performance.external_cash_flows`. Dòng tiền không được cộng vào realized/unrealized P&L.
- POST/PUT kiểm tra loại, số tiền, mốc từ năm 2000 đến hiện tại + 5 phút và ghi chú tối đa 240 ký tự. PUT/DELETE lọc đồng thời `id` và `portfolio_id`; DELETE yêu cầu `confirmed=true`.
- Cổ tức không dùng loại cash flow chung vì cần stock/entitlement/source; stock split và quyền mua cần contract corporate action riêng.

### Điều kiện trước TWR/MWR

UI quản lý nạp/rút đã triển khai ngày 2026-10-06: tổng nạp/rút/ròng, thêm/sửa/xóa, xác nhận xóa, khóa mutation lặp, lỗi phục hồi tại chỗ và responsive 390px. Sau mỗi mutation, frontend tải lại toàn bộ portfolio contract thay vì tự vá hiệu suất cục bộ.

### Daily valuation và TWR — triển khai 2026-10-06

- `GET /api/portfolio/performance/history?sessions=N` dùng `daily_close_twr_v1`, giới hạn 2–260 phiên và múi giờ `Asia/Ho_Chi_Minh`. Endpoint chỉ đọc EOD trong PostgreSQL, không gọi provider.
- Dòng tiền ngoài được áp dụng đầu phiên (`beginning_of_session`); giao dịch dựng lại holdings và cash. Một điểm chỉ `complete` khi mọi mã đang nắm giữ có giá đúng phiên và cash không âm. Không carry-forward hoặc nội suy qua khoảng trống.
- TWR chỉ công bố khi toàn bộ chuỗi hoàn chỉnh, có ít nhất hai điểm và có daily return tính được. Ledger cũ thiếu khoản nạp ban đầu được đánh dấu partial thay vì giả định vốn bằng giao dịch mua.
- UI tải lười tại trang Danh mục, cho chọn 20/30/60/120 phiên. Đường SVG tách segment qua điểm partial; summary và cảnh báo giữ `Chưa đủ dữ liệu` khi TWR không hợp lệ. Không thêm chart dependency hoặc polling.

Contract cổ tức/corporate action đã được chốt tại [PORTFOLIO_EVENT_LEDGER_DESIGN.md](PORTFOLIO_EVENT_LEDGER_DESIGN.md): ledger append-only, core columns + payload versioned, entitlement snapshot, provenance và correction chain. Bước triển khai kế tiếp là migration/model/validator/API độc lập với valuation; chỉ sau khi event đã được reconcile và áp dụng vào daily valuation mới đánh giá MWR/XIRR và benchmark.
