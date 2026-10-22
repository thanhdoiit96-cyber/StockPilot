# EOD generator cho exit-guidance shadow

## Quyết định

Generator chỉ là một tác vụ internal, EOD-owned, tạo snapshot shadow cho danh mục có holding đã `reconciled`. Nó không được gọi từ HTTP read, UI, request đăng nhập, cron của nhiều instance hay provider bridge. Không có auto-sell, notification hoặc mutation portfolio.

Điều kiện hiện tại chưa cho phép bật generator: ownership worker production chưa được chứng minh và EOD coverage/provider completeness của từng held symbol chưa được đo. Vì vậy tài liệu này là contract trước khi có scheduler, không phải hướng dẫn bật một cron local.

## Luồng được chọn

```text
EOD ingestion sealed for session
  → scheduler owner acquires one run lock
  → enumerate portfolios with positive reconciled holdings
  → fetch only those stock_ids + required 60 daily rows
  → verify EOD/provenance/adjustment gate per holding
  → seal reconciliation run + exit run atomically
  → append audit outcome / release lock
```

Một holding thiếu input không được chặn portfolio khác; nó được lưu `unavailable` với reason/provenance. Nhưng một portfolio không được ghi exit run nửa chừng: reconciliation run, exit run và application/guidance payload phải commit hoặc rollback cùng transaction.

## Ownership, lock và idempotency

| Ràng buộc | Contract |
| --- | --- |
| Owner | Một process/queue consumer được cấu hình rõ `EXIT_GUIDANCE_EOD_OWNER_ID`; web process và worker không owner không chạy job. |
| Trigger | Chỉ nhận event `eod_ingestion_sealed` có `session_date`, provider, coverage evidence và run ID bất biến. Không tự poll provider hay lấy “latest”. |
| Lock | Advisory/distributed lock scoped `(provider, session_date, model)` với lease, heartbeat và fencing token; loser chỉ ghi skip audit. |
| Idempotency | Reconciliation key `(portfolio, as_of, model, input hash)` và exit key `(portfolio, as_of, model, input hash)` là hàng rào cuối. Retry không update snapshot sealed. |
| Retry | Chỉ retry error transient có phân loại; bounded exponential backoff trong cùng session. Missing EOD, mixed basis, lock loss và corporate-action mismatch là kết quả nghiệp vụ, không retry provider. |
| Backfill | Command tách riêng, explicit date/provider/portfolio scope, dry-run mặc định và audit artifact; không dùng endpoint/UI. |

## Data, hiệu năng và ngân sách

- Đầu vào portfolio phải lấy từ database với positive holding candidate; sau reconciliation chỉ giữ `reconciled` holding. Không được quét `stock_prices` toàn cục như writer prototype hiện tại.
- Với một portfolio, query stock price bằng `stock_id IN (...)`, `provider`, `interval='1d'`, khoảng thời gian tối thiểu bao phủ 60 session distinct và `observed_at <= as_of`; hard cap 100 holdings × 60 row, cộng margin nhỏ chỉ để dedupe session. Nếu vượt cap, ghi unavailable `holding_scope_limit_exceeded`.
- Gate mỗi holding: close dương, ≥60 distinct session, cùng provider/price unit/currency/adjustment, EOD as-of đúng session và reconciliation sealed. Không tạo provider request.
- Đo trước release: số query/session, portfolios/holdings/rows, payload, lock wait, p50/p95 job/portfolio và số sealed/unavailable/failed. Acceptance baseline chưa được đặt cho đến khi có ít nhất năm run development được lưu evidence.

## Audit và vận hành

Mỗi run scheduler cần record immutable: trigger run ID, owner/fencing token, session/provider, coverage input, portfolio attempted/sealed/unavailable/failed, duration, retry classification và error reference không chứa cost basis. Health chỉ công bố aggregate; dữ liệu từng portfolio thuộc owner và không xuất sang metrics/log công khai.

Kill switch tách khỏi config provider: `EXIT_GUIDANCE_EOD_ENABLED=false` mặc định. Tắt switch chỉ ngăn run mới; không sửa snapshot sealed và API tiếp tục đọc snapshot cũ với `as_of` rõ ràng.

## Điều kiện mở implementation

1. Xác minh một worker owner có durable lock/queue, identity và operational logs; không dùng `node-cron` process-local làm bằng chứng production.
2. Thêm query bounded, schema audit run và dry-run command; unit/integration test lock/idempotency/rollback.
3. Chạy tối thiểu năm dry-run EOD với evidence coverage per held symbol, đo ngân sách và xác minh zero provider request.
4. Sau review evidence mới cho phép `EXIT_GUIDANCE_EOD_ENABLED` ở development; production cần authority môi trường riêng.
5. Chỉ khi có snapshot sealed đủ horizon mới mở separate shadow evaluation 1/5/20 session. Không đổi tham số model hay diễn giải thành khuyến nghị đầu tư.
