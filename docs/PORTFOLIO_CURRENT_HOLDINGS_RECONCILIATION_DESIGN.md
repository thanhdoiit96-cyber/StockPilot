# Đối soát corporate action cho vị thế hiện tại

## Quyết định và giới hạn

Tài liệu này khóa contract `current_holding_reconciliation_v1` trước khi exit guidance được phép tạo snapshot theo lịch. Nó giải quyết một khoảng trống cụ thể: ledger giao dịch hiện cho quantity/weighted-average cost, còn corporate action chỉ được áp trong chuỗi định giá lịch sử. Vì vậy không được dùng quantity hoặc giá vốn hiện tại để kích hoạt exit rule nếu có corporate action chưa được đối soát.

Đây không phải công cụ nhập lệnh, không tự sửa giao dịch, không suy ra entitlement từ giá thị trường và không được gọi khi đọc API/UI. Mọi đầu ra không chứng minh được sẽ là `unavailable`.

## Người dùng, luồng và tiêu chí thành công

| Mục | Quyết định |
| --- | --- |
| Người dùng | Chủ sở hữu danh mục đã ghi BUY/SELL và corporate action liên quan. |
| Luồng chính | Ghi/cập nhật event → đối soát immutable theo ledger → chỉ khi trạng thái `reconciled` mới dùng position đã điều chỉnh để tạo snapshot EOD shadow. |
| Thành công | Mỗi position đủ điều kiện có version, event IDs, digest của giao dịch/event, quantity/cost trước-sau và lý do có thể tái lập. |
| Không đạt gate | Giữ position và snapshot exit ở `unavailable`; không bỏ event, không áp dụng một phần và không đưa số liệu thay thế vào UI. |

## Phát hiện từ audit mã nguồn ngày 2026-10-22

1. `summarizePortfolioHoldings` chỉ xử lý BUY/SELL theo weighted-average cost. `buildDailyValuationSeries` có logic corporate action riêng nên hai đường hiện không có cùng current-holding contract.
2. Event hiện có `PENDING`, `CONFIRMED`, `CANCELLED`, `SUPERSEDED`; `CONFIRMED` manual chỉ là `USER_CONFIRMED`, không đồng nghĩa có evidence provider độc lập.
3. `reconcilePortfolioEvent` kiểm tra entitlement tại record date bằng proxy trade-date; nó không sinh application ledger cho quantity/cost hiện tại và công bố `settlement_and_cash_in_lieu_not_verified`.
4. Writer exit guidance chưa có caller. Do đó không có scheduler đang dùng ledger sai; đây là thời điểm an toàn để chốt contract trước khi bật generation.

## Phương án đánh giá

| Phương án | Giá trị | Rủi ro | Quyết định |
| --- | --- | --- | --- |
| Bỏ qua mọi event đã `CONFIRMED` | Nhanh | Có thể sai quantity/cost sau split, stock dividend hoặc rights | Loại |
| Tái dùng trực tiếp logic valuation history | Có sẵn | Không có immutable application record, có khác biệt thứ tự/time boundary, không chứng minh current holding | Loại |
| Tạo application ledger versioned, fail-closed | Reproducible, audit được, tách rõ event evidence và current position | Cần migration, ownership và EOD worker design | Chọn |

## Contract được chọn

Mỗi lần đối soát phải tạo một `holding_reconciliation_run` bất biến, scoped bởi portfolio và input digest. Mỗi stock/event có `holding_reconciliation_application` bất biến. Không update/delete record đã niêm phong; correction tạo input mới và run mới.

Run tối thiểu phải chứa:

- `portfolio_id`, `as_of`, `model=current_holding_reconciliation_v1`, `generation_key`, thời điểm tạo và digest của transaction/event input;
- policy version, timezone `Asia/Ho_Chi_Minh`, thứ tự áp dụng được ghi rõ;
- counts `reconciled`, `unavailable`, `excluded` và hash payload.

Mỗi application phải chứa `stock_id`, event ID/version, status, reason codes, quantity/cost trước-sau, entitlement at record date, effective date, price basis requirement và evidence digest. Mỗi open position xuất cho exit engine phải tham chiếu run/hash này.

### Gate theo loại event

| Loại | Khi có thể dùng trong current holding | Nếu thiếu điều kiện |
| --- | --- | --- |
| `CASH_DIVIDEND` | Chỉ sau khi tiền thực nhận/cash ledger được đối soát; không đổi quantity/cost cổ phiếu | Không chặn quantity riêng, nhưng không được dùng để chứng minh cash/performance |
| `STOCK_DIVIDEND` | Có entitlement khớp, received whole quantity, effective date và evidence nguồn/owner đạt gate | `unavailable` cho stock |
| `STOCK_SPLIT` | Ratio hợp lệ, effective date, whole-share/cash-in-lieu policy và price-adjustment basis nhất quán | `unavailable` cho stock |
| `RIGHTS_ISSUE` | Entitlement, exercised quantity, subscription cash và resulting shares đều đối soát | `unavailable` cho stock |

`PENDING`, `CANCELLED`, `SUPERSEDED`, source không đủ evidence, fractional/cash-in-lieu chưa có policy, event trùng/không xác định thứ tự, hoặc mismatch entitlement đều fail closed. `USER_CONFIRMED` chỉ cho phép đi vào hàng chờ đối soát; không tự chuyển thành source-verified evidence.

### Thứ tự và giá vốn

1. Sort event theo effective date, rồi record date, created time và ID; giao dịch có ordering/tie-breaker đã tồn tại.
2. Tính entitlement ở record date với boundary đã versioned; không giả định settlement T+ nếu chưa có dữ liệu settlement.
3. Áp dụng event đã chứng minh tại effective date vào quantity/cost. Split giữ tổng cost và thay quantity; stock dividend thêm quantity theo payload nhưng không bịa giá vốn; rights chỉ tăng quantity/cost khi cả share và cash exercise đã được chứng minh.
4. Giao dịch BUY/SELL sau event tiếp tục weighted-average trên quantity/cost đã đối soát. Bán vượt quantity là lỗi input, không được âm thầm clamp.
5. Exit snapshot chỉ nhận `{ quantity, average_cost, reconciliation_run_id, reconciliation_sha256 }` có status `reconciled`; mọi trạng thái khác phải đi tới `unavailable` cùng reason code.

Các quy tắc cost của stock dividend, fractional share/cash-in-lieu và settlement cần evidence nghiệp vụ trước khi được bật. Đến khi đó, application tương ứng vẫn `unavailable`; không dùng phép chia cost hoặc close-price proxy để lấp dữ liệu.

## Hiệu năng, ownership và UX

- Generation là tác vụ EOD-owned duy nhất, lock theo portfolio/as-of/model, idempotent theo digest. Read API/UI không được gọi writer.
- Truy vấn chỉ lấy transaction/event của portfolio và các held stock cần thiết; không quét toàn bộ `stock_prices`. Đo request count, rows, payload, p50/p95 trước khi bật scheduler.
- UI exit tiếp tục chỉ đọc sealed snapshot. Nếu reconciliation không đạt, chip hiển thị “Chưa đủ dữ liệu” và reason ngắn; không hiển thị mức stop/target từ position chưa đối soát.
- Không đưa source URL/note nhạy cảm hay cost basis của user khác vào response/log/evidence công khai.

## Lộ trình và nghiệm thu

1. Thêm migration/application ledger cùng constraints/hash/immutability và test migration rollback.
2. Viết pure reconciler với fixture cho split, stock dividend, rights, pending, superseded, mismatch, same-day ordering, fractional/cash-in-lieu và transaction oversell.
3. Chỉ sau khi test/measurement pass, thay input của exit snapshot bằng position đã `reconciled`; giữ writer không có caller.
4. Thiết kế riêng EOD-owned bounded generator; proof worker ownership, lock/retry, coverage EOD và audit logs trước khi bật nó.
5. Thu shadow snapshots, sau đó mới thiết kế baseline 1/5/20 session và evaluation ngoài mẫu.

Không nằm trong phạm vi hiện tại: sửa ngược immutable exit snapshots, thay đổi giao dịch người dùng tự động, auto-sell, notification hay calibration tham số exit rule.
