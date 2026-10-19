# Nhật ký quyết định đầu tư — thiết kế v1

## Mục tiêu và phạm vi

Người dùng cần ghi lại lý do đưa ra một quyết định với một mã chứng khoán để có thể xem lại luận điểm, mốc rà soát và điều kiện làm luận điểm không còn phù hợp. V1 phục vụ nghiên cứu và tự phản tư; không đặt lệnh, không đưa khuyến nghị tự động và không suy diễn hiệu suất đầu tư từ nội dung nhật ký.

Mỗi entry gồm mã, loại quyết định (`RESEARCH`, `BUY`, `HOLD`, `SELL`), luận điểm do người dùng viết, ngày rà soát và điều kiện vô hiệu. Người dùng có thể liên kết một evidence snapshot từ giao dịch mua đã có `recommendation_context`; liên kết này là tùy chọn để không buộc người dùng tạo giao dịch chỉ nhằm viết nhật ký.

## Quyết định sản phẩm

| Lựa chọn | Phương án chọn | Lý do |
| --- | --- | --- |
| Evidence | Client chỉ gửi `evidence_transaction_id`; server xác minh giao dịch thuộc danh mục, cùng mã và có recommendation context rồi lưu snapshot | Không tin payload evidence từ client, vẫn giữ bằng chứng tại thời điểm tạo entry |
| Nội dung entry | Luận điểm 10–2.000 ký tự, ngày rà soát bắt buộc trong 1–730 ngày, điều kiện vô hiệu 5–1.000 ký tự | Buộc entry có thể được rà soát mà không ép người dùng dự báo giá |
| Vòng đời | Tạo, xem danh sách, đóng hoặc xóa entry | Đóng là trạng thái người dùng xác nhận, không phải outcome thị trường |
| Hiệu suất | Không có giá mục tiêu, return, win-rate hoặc kết luận đúng/sai | Tránh biến ghi chú chủ quan thành số liệu hiệu suất không có thiết kế đo lường |

Phương án đơn giản hơn là lưu một ghi chú tự do trong trình duyệt. Phương án này không đáp ứng persistence, phân tách người dùng hoặc evidence snapshot. Phương án mở rộng gồm nhiều revision, checklist và đánh giá định lượng; nó tăng schema/UI và cần định nghĩa outcome đáng tin cậy. V1 chọn persistence có validation và evidence server-side.

## Contract dữ liệu và API

`portfolio_decisions` thuộc một portfolio và một stock. Entry lưu `evidence_snapshot` JSONB hoặc `null`, cùng `created_at`, `closed_at` và trạng thái `ACTIVE`/`CLOSED`.

- `GET /api/portfolio` trả `decisions` mới nhất trước và `decision_evidence` là các giao dịch mua có context đủ điều kiện để người dùng chọn.
- `POST /api/portfolio/decisions` nhận `symbol`, `decision_type`, `thesis`, `review_date`, `invalidation_condition`, `evidence_transaction_id?`.
- `POST /api/portfolio/decisions/:decisionId/close` chỉ đổi trạng thái sau xác nhận rõ ràng.
- `DELETE /api/portfolio/decisions/:decisionId` chỉ xóa entry thuộc portfolio của người dùng đang đăng nhập và cần `confirmed: true`.

Snapshot chỉ chứa context đã được backend chuẩn hóa khi lưu giao dịch: nguồn, model, thời điểm tạo, horizon, score, rank, reference price và criteria. Nó không chứa quote hiện tại, return hoặc prediction mới.

## Trải nghiệm và trạng thái

Nhật ký là tab riêng trong Danh mục để không trộn với ledger giao dịch. Form đặt trước danh sách: mã, loại quyết định, ngày rà soát, luận điểm, điều kiện vô hiệu và evidence tùy chọn. Danh sách phân biệt rõ evidence snapshot với nội dung do người dùng nhập; entry chưa có evidence hiển thị trung thực là chưa gắn snapshot.

Khi tải, tab giữ trạng thái loading của portfolio; khi lưu/đóng/xóa, từng hành động bị khóa và lỗi được trả tại form. Đóng và xóa mở dialog xác nhận trước khi gọi API; `Escape`, Hủy hoặc bấm ngoài dialog hủy thao tác khi request chưa chạy. Dialog nhận focus, có `aria-modal` và mô tả rõ đóng entry không suy diễn outcome, còn xóa không thể hoàn tác. Tab dùng semantic form controls, label rõ ràng, thao tác bàn phím và không phụ thuộc hover. Trên mobile, entry xếp dọc thay vì bảng rộng.

## Hiệu năng, riêng tư và nghiệm thu

Không tạo request mới cho tab: dữ liệu nhỏ được trả trong payload `/api/portfolio` vốn đã có. Giới hạn tối đa 100 entry trả về và 200 entry mỗi portfolio để giữ payload hữu hạn. Snapshot không chứa secret, không gọi provider và không tạo dữ liệu thị trường.

Nghiệm thu v1: validation reject input sai trước khi ghi; evidence transaction ngoài danh mục, khác mã hoặc không có context bị từ chối; snapshot không đổi khi transaction gốc thay đổi; action close/delete chỉ tác động entry của người dùng và yêu cầu xác nhận UI rõ ràng; UI hiển thị loading/empty/error/success rõ ràng; backend/frontend test và production build đạt.
