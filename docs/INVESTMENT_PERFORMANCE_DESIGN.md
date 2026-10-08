# Thiết kế Hiệu suất đầu tư

## Contract index-series cho Benchmark (chuẩn bị triển khai)

### Development fixture preview

UI có thể hiển thị chuỗi synthetic đã gắn nhãn bằng cờ build `VITE_SHOW_INDEX_FIXTURE=true`. Cờ này chỉ dành cho development/preview có kiểm soát; production public phải để mặc định tắt. Card luôn hiển thị provenance `Dữ liệu mô phỏng (development)` và không được dùng để công bố benchmark hay hiệu suất thật.

Benchmark chỉ được mở khi provider trả về chuỗi chỉ số có provenance và license rõ ràng. Contract tối thiểu:

- `symbol`, `provider`, `license`, `return_type` (`price_return` hoặc `total_return`), `currency`.
- Mỗi điểm gồm `session_date` theo `Asia/Ho_Chi_Minh`, `observed_at`, `close` và tùy chọn `total_return_level`; không suy diễn điểm thiếu.
- Metadata phải khai báo `session_timezone`, lịch phiên áp dụng, `first_session`, `last_session`, `continuity` (`continuous|gapped|insufficient`) và danh sách gap.
- API phải giữ nguyên gap/partial để UI hiển thị unavailable; không nối đường biểu đồ qua phiên thiếu và không trộn price-return với portfolio total-return nếu chưa có cảnh báo semantics.
- Provenance cần URL/identifier nguồn, thời điểm lấy dữ liệu, phiên bản adapter và trạng thái license; không coi dữ liệu mock/test là bằng chứng production.

Tiêu chí mở triển khai: có ít nhất một series được cấp phép, kiểm tra continuity qua nhiều khoảng phiên, đối chiếu độc lập một số điểm, timezone/session contract được backend test, rồi mới thêm API chọn chỉ số và UI card/overlay.

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
- Chuỗi bắt đầu tại hoạt động ledger đầu tiên; các phiên EOD trước giao dịch/dòng tiền/sự kiện đầu tiên không được biểu diễn thành điểm giá trị 0. Điểm partial trả lý do có cấu trúc `negative_cash_balance`, `missing_prices` hoặc `unresolved_event` để UI không gộp mọi lỗi thành “thiếu dữ liệu”.
- UI tải lười tại trang Danh mục, cho chọn 20/30/60/120 phiên. Đường SVG tách segment qua điểm partial, có trục VND và label bàn phím cho từng điểm. Khi không có điểm hoàn chỉnh, UI nêu nguyên nhân/hành động thay vì vẽ đường 0; TWR giữ `Chưa đủ dữ liệu`. Không thêm chart dependency hoặc polling.

Contract cổ tức/corporate action đã được chốt tại [PORTFOLIO_EVENT_LEDGER_DESIGN.md](PORTFOLIO_EVENT_LEDGER_DESIGN.md): ledger append-only, core columns + payload versioned, entitlement snapshot, provenance và correction chain. Bước triển khai kế tiếp là migration/model/validator/API độc lập với valuation; chỉ sau khi event đã được reconcile và áp dụng vào daily valuation mới đánh giá MWR/XIRR và benchmark.

### MWR/XIRR — contract backend hoàn thành 2026-10-06

- `GET /api/portfolio/performance/history` trả thêm `mwr` theo `xirr_actual_365_v1`, phạm vi `inception_to_terminal`. Phạm vi này cố ý độc lập với lựa chọn 20/30/60/120 phiên của biểu đồ: mọi external cash flow từ đầu ledger đến phiên định giá cuối được dùng, tránh biến vốn đã có trước cửa sổ thành dòng tiền vô hình.
- Dấu theo góc nhìn nhà đầu tư: `DEPOSIT` âm, `WITHDRAWAL` dương, portfolio value ở phiên cuối dương. Cash dividend, giao dịch, stock action và quyền mua không được thêm lần nữa vào chuỗi XIRR; ảnh hưởng của chúng đã nằm trong terminal value. Các dòng cùng ngày được gộp, thời gian dùng số ngày thực tế/365 và precision theo ngày Việt Nam.
- Chỉ công bố `annualized_mwr_pct` khi valuation hoàn chỉnh, chuỗi có cả dấu âm/dương và có đúng một nghiệm trong miền hỗ trợ `-99,99%` đến khoảng `999.900%`/năm. Solver quét trên `log(1+r)`, chia đôi các khoảng đổi dấu và dùng Newton từ nhiều seed để phát hiện nghiệm tiếp xúc; mỗi nghiệm phải qua kiểm tra NPV residual tối đa `max(0,01 VND, 1e-10 × tổng trị tuyệt đối dòng tiền)`.
- Không chọn nghiệm tùy ý. Không có nghiệm trả `status=no_root`; nhiều nghiệm trả `status=multiple_roots`, `annualized_mwr_pct=null` và danh sách `roots_pct` để audit. Thiếu đổi dấu, partial valuation, input lỗi hoặc external flow sau terminal trả `status=unavailable` với `reason` cụ thể.
- Đối chiếu độc lập dùng công thức NPV trực tiếp trên fixture một năm: nạp 100.000, terminal 110.000 cho đúng 10%; residual không vượt 0,01. Fixture phi chuẩn `[-100, +230, -132]` cho hai nghiệm 10%/20% và không công bố MWR; `[-100, +100, -100]` không có nghiệm. Live PostgreSQL chứng minh cash-only cho MWR 0 và cash dividend tạo MWR dương với residual hợp lệ.
- UI đã triển khai 2026-10-06 trong panel lịch sử hiệu suất. Card “MWR từ khi bắt đầu” chỉ hiển thị tỷ suất nổi bật cho `available`, ghi rõ “Tỷ suất thường niên hóa · Từ khi bắt đầu” và có tooltip giải thích ảnh hưởng của thời điểm/quy mô nạp rút. `unavailable`, `no_root`, `multiple_roots` được chuyển thành hướng dẫn dễ hiểu; `roots_pct` không xuất hiện trên giao diện. Card dùng layout 4/2/1 cột theo desktop/tablet/mobile và không thay đổi khi người dùng đổi số phiên của biểu đồ.

Benchmark vẫn bị khóa cho đến khi có index-series hợp lệ về license, session/timezone, continuity và semantics total-return/price-return. Không dùng stock breadth hoặc chuỗi giá tự tổng hợp làm benchmark thay thế.
