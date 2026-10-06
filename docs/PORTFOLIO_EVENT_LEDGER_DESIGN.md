# Thiết kế event ledger cho cổ tức và corporate action

Trạng thái: thiết kế đã chốt; migration/model/validator/API nền đã triển khai ngày 2026-10-06. Reconciliation entitlement và ảnh hưởng lên valuation chưa triển khai. Ví dụ payload tiếp tục là contract, không phải dữ liệu thật.

## 1. Bài toán và tiêu chí thành công

Daily valuation hiện dựng lại vị thế và tiền mặt từ giao dịch, nạp/rút và giá EOD. Chuỗi sẽ sai nếu trong thời gian nắm giữ có cổ tức, chia cổ phiếu, split hoặc quyền mua mà không có sự kiện tương ứng. Event ledger phải:

- gắn sự kiện với đúng portfolio và mã chứng khoán;
- lưu riêng ngày chốt quyền, ngày hiệu lực và ngày thanh toán;
- snapshot entitlement đã dùng để tính, không âm thầm tính lại khi ledger cũ được sửa;
- truy ra nguồn, thời điểm lấy dữ liệu và mức xác minh;
- hỗ trợ đính chính mà không xóa dấu vết cũ;
- idempotent khi cùng sự kiện được ingest lại;
- không biến sự kiện chưa xác minh thành tiền hoặc số lượng trong valuation.

Không nằm trong lát cắt đầu: trái phiếu, coupon, merger/spin-off phức tạp, thuế đa quốc gia, tự động thực hiện quyền mua hoặc provider chưa xác nhận license.

## 2. Quyết định mô hình

Dùng bảng `portfolio_events` theo mô hình **core columns + versioned payload**, append-only đối với nội dung tài chính.

| Trường | Ý nghĩa/ràng buộc |
| --- | --- |
| `id` | UUID khóa chính |
| `portfolio_id`, `stock_id` | FK bắt buộc trong v1 |
| `event_type` | `CASH_DIVIDEND`, `STOCK_DIVIDEND`, `STOCK_SPLIT`, `RIGHTS_ISSUE` |
| `status` | `PENDING`, `CONFIRMED`, `CANCELLED`, `SUPERSEDED` |
| `schema_version` | Bắt đầu bằng `1` |
| `record_date` | Ngày chốt quyền theo Việt Nam; bắt buộc |
| `effective_date` | Ngày thay đổi số lượng/giá vốn; bắt buộc với stock event |
| `payment_date` | Ngày tiền thực nhận; bắt buộc với cash dividend |
| `entitlement_quantity` | Số lượng đủ quyền đã snapshot, không âm |
| `payload` | JSONB được validator theo loại/version |
| `source_type` | `MANUAL` hoặc `PROVIDER` |
| `source_name`, `source_url`, `source_reference` | Provenance; reference bắt buộc với provider |
| `announced_at`, `fetched_at` | Thời gian công bố/thu thập |
| `verification_status` | `UNVERIFIED`, `USER_CONFIRMED`, `SOURCE_VERIFIED` |
| `supersedes_event_id` | Event cũ bị thay thế; phải cùng portfolio |
| `note` | Tối đa 240 ký tự, không tham gia tính toán |
| `created_at`, `created_by`, `updated_at` | Audit user/system actor |

Index chính: timeline `(portfolio_id, record_date, id)`, valuation `(portfolio_id, status, effective_date)`, mã/ngày `(stock_id, record_date)`. Unique có điều kiện trên `(portfolio_id, source_type, source_name, source_reference)` khi reference khác null để ingest idempotent.

Không dùng bảng riêng cho từng loại vì làm timeline/audit phức tạp. Không dùng JSONB hoàn toàn vì mất FK, index ngày, uniqueness và constraint quan trọng. Không mở rộng `portfolio_cash_flows`: cổ tức là lợi nhuận nội bộ, không phải dòng tiền ngoài cần trung hòa trong TWR.

## 3. Payload v1 theo loại

### `CASH_DIVIDEND`

```json
{ "gross_per_share": 2000, "withholding_tax": 0, "net_cash_amount": 2000000, "currency": "VND" }
```

`gross_per_share > 0`, thuế từ 0 đến gross entitlement, `net_cash_amount >= 0`. Valuation cộng đúng net cash tại `payment_date`; đây không phải external cash flow.

### `STOCK_DIVIDEND`

```json
{ "ratio_numerator": 20, "ratio_denominator": 100, "received_quantity": 200 }
```

Số lượng được cộng tại `effective_date`; tổng giá vốn không đổi và giá vốn bình quân trên đơn vị được phân bổ lại.

### `STOCK_SPLIT`

```json
{ "ratio_numerator": 2, "ratio_denominator": 1 }
```

Số lượng nhân theo tỷ lệ tại `effective_date`, tổng giá vốn không đổi. Reverse split dùng tử số nhỏ hơn mẫu số; xử lý phần lẻ phải được chốt trước production.

### `RIGHTS_ISSUE`

```json
{ "ratio_numerator": 1, "ratio_denominator": 5, "subscription_price": 15000, "exercised_quantity": 0, "exercise_cash_amount": 0 }
```

Event mô tả entitlement. `exercised_quantity=0` không đổi holdings/cash. Phần thực hiện phải do người dùng xác nhận; không tự giả định thực hiện toàn bộ quyền.

## 4. Vòng đời và provenance

1. Event manual bắt đầu `PENDING/UNVERIFIED`; UI ghi rõ “Tự khai báo”. Người dùng xem entitlement rồi xác nhận thành `CONFIRMED/USER_CONFIRMED`.
2. Event provider chỉ thành `SOURCE_VERIFIED` khi có source reference, ngày nguồn và adapter được phép sử dụng. Ingest dùng unique key, không tạo bản sao.
3. Valuation chỉ áp dụng event `CONFIRMED` không bị supersede. `PENDING` tạo coverage warning; cancelled/superseded không tác động phép tính.
4. Event confirmed không sửa tài chính tại chỗ. Đính chính tạo event mới qua `supersedes_event_id`, đánh dấu bản cũ `SUPERSEDED` trong cùng transaction.
5. Delete vật lý chỉ dùng cho rollback migration/test cô lập. API người dùng dùng cancel có xác nhận và giữ audit.

Provenance không đồng nghĩa entitlement đúng. `SOURCE_VERIFIED` xác nhận nguồn sự kiện; entitlement vẫn phải đối chiếu holdings tại `record_date`. Nếu lệch, event giữ pending hoặc valuation trả partial.

## 5. API mục tiêu

- `GET /api/portfolio/events?status=&type=&from=&to=`: timeline theo ownership, cursor ổn định.
- `POST /api/portfolio/events`: tạo event manual ở pending; server tính entitlement dự kiến và trả chênh lệch.
- `POST /api/portfolio/events/:id/confirm`: xác nhận payload/entitlement, yêu cầu CSRF và `confirmed: true`.
- `POST /api/portfolio/events/:id/cancel`: hủy có lý do, không xóa dòng.
- `POST /api/portfolio/events/:id/correct`: tạo bản thay thế atomically, không dùng PUT ghi đè.

Mọi mutation khóa portfolio timeline trong transaction. Client manual không được truyền `portfolio_id`, `created_by`, verification nguồn hoặc provenance provider.

## 6. Thứ tự tích hợp valuation

1. Migration/model/validator/API và ownership tests, chưa ảnh hưởng valuation — hoàn thành 2026-10-06.
2. Reconciliation dựng entitlement từ transaction ledger tại `record_date`; test timezone và giao dịch cùng ngày — hoàn thành 2026-10-06 theo `trade_date_end_of_day_proxy_v1`. Giao dịch cùng ngày được tính; response luôn ghi `unverified_t_plus_settlement` vì ledger chưa có ngày settlement/VSD.
3. Áp dụng cash dividend tại payment date; TWR coi đây là investment return, không phải external flow — hoàn thành 2026-10-06, gồm pending/unsupported coverage gate và live PostgreSQL smoke.
4. Áp dụng stock dividend/split vào quantity/cost basis tại effective date.
5. Quyền mua chỉ áp dụng phần người dùng xác nhận thực hiện.
6. Chạy isolated PostgreSQL và live development smoke trước khi bật event trong UI/valuation mặc định.

Nếu có event pending, entitlement mismatch hoặc loại chưa hỗ trợ trong khoảng, history phải trả `partial`, `twr_available=false` và limitation cụ thể; không bỏ qua im lặng.

## 7. UI/UX dự kiến

Panel “Sự kiện danh mục” nằm sau biểu đồ hiệu suất, mặc định là timeline gọn. Mỗi dòng hiển thị mã, loại, ngày tác động, giá trị/số lượng, trạng thái và nguồn. Form thay đổi theo loại, luôn có bước xem trước entitlement. Pending/mismatch dùng cảnh báo có hành động; provenance mở nguồn qua URL an toàn.

Không trộn event vào bảng nạp/rút và không đưa metadata kỹ thuật lên giao diện chính. Mobile dùng card, desktop dùng bảng; confirm/cancel/correct có focus management, pending lock và lỗi phục hồi tại chỗ.

## 8. Hiệu năng và nghiệm thu

- Timeline p95 mục tiêu dưới 200 ms trên 10.000 event/portfolio với index, page tối đa 50.
- Valuation tối đa 260 phiên tải event một lần theo khoảng, không query từng ngày/mã.
- Không gọi provider trong request portfolio/history.
- Unit: validator từng type, biên số/ngày/URL, correction, idempotency.
- Controller/PostgreSQL: ownership, CSRF, transaction/lock, unique provider reference, rollback atomically.
- Valuation: dividend/split/right, pending/mismatch, corrected event, timezone, coverage.
- UI: loading/empty/error/pending/confirmed/mismatch, keyboard và không tràn 390px.

## 9. Gate cho MWR/XIRR và benchmark

MWR/XIRR chỉ bắt đầu khi cash flow ngoài và event ledger đã qua PostgreSQL/live smoke, daily valuation áp dụng đủ event supported và không còn silent gap. Benchmark chỉ bắt đầu khi có index-series hợp lệ về license, timezone, continuity và total-return/price-return semantics. Không so VNINDEX price return với portfolio total return có cổ tức mà không ghi rõ khác biệt.
