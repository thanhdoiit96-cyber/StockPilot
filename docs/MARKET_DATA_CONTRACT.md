> Phạm vi: hợp đồng dữ liệu thị trường và ingestion đã bắt đầu triển khai trong M2. Vnstock EOD hiện có adapter boundary và coverage probe; chưa bật polling dữ liệu thật trong production.

# Hợp đồng dữ liệu thị trường

## Mục tiêu

Chuẩn hóa dữ liệu từ fixture hoặc provider bên ngoài trước khi ghi PostgreSQL. Controller và frontend chỉ nhận dữ liệu canonical, không phụ thuộc vào JSON riêng của từng provider.

## Bản ghi canonical

```json
{
  "instrument": {
    "symbol": "FPT",
    "market": "HOSE",
    "provider_symbol": "FPT"
  },
  "quote": {
    "open": "122.00",
    "high": "124.50",
    "low": "121.80",
    "close": "123.45",
    "volume": "1520000",
    "currency": "VND",
    "price_unit": "VND_PER_SHARE"
  },
  "observed_at": "2026-09-17T02:15:00.000Z",
  "interval": "1d",
  "source": {
    "provider": "fixture",
    "dataset": "demo-market-2026-09-17",
    "license": "internal-test",
    "license_url": null
  },
  "fetched_at": "2026-09-17T16:00:05.000Z",
  "quality": {
    "is_delayed": false,
    "is_adjusted": false,
    "completeness": "full"
  }
}
```

Giá và khối lượng đi qua adapter dưới dạng chuỗi decimal để tránh sai số số thực. `observed_at` là thời điểm thị trường; `fetched_at` là thời điểm lấy dữ liệu. Các giá trị hợp lệ của `interval` hiện là `1m`, `5m`, `15m`, `1h`, `1d`; `completeness` là `full`, `partial` hoặc `unknown`.

Giá thiếu dùng `null`, không dùng `0`. `change` chỉ được tính khi có giá đóng cửa tham chiếu; ingestion hiện chưa tự suy diễn biến động.

## Luồng kỹ thuật

```text
Adapter.fetchQuotes()
  → normalize
  → validateMarketRecord()
  → resolve stocks.code
  → upsert theo (stock_id, provider, interval, observed_at)
  → invalidate stock caches
  → trả ingestion report
```

Mã triển khai nằm trong `backend/src/market-data/`:

- `contracts/marketDataContract.js`: field và quy tắc hợp đồng.
- `marketDataValidator.js`: tách bản ghi hợp lệ/bị từ chối, không làm hỏng cả batch.
- `adapters/FixtureMarketDataAdapter.js`: đọc fixture và chuẩn hóa symbol, số và UTC timestamp.
- `adapters/VnstockEodAdapter.js`: boundary cho client/bridge Vnstock Python; chuẩn hóa dòng EOD thành canonical record, ghi `provider`, `upstream`, `license`, `license_url` và một `fetched_at` chung cho mỗi lần lấy.
- `adapters/VnstockForeignFlowAdapter.js`: boundary riêng cho bốn số mua/bán khối ngoại theo volume/value; không trộn dữ liệu partial vào candle OHLCV.
- `adapters/EodhdEodAdapter.js`: EOD quotes và corporate-action metadata; `fetchCorporateActions()` đọc split events để gắn phiên trước ngày hiệu lực vào report reconciliation.
- `coverageProbe.js`: chạy kiểm tra độ phủ theo danh sách mã, số phiên, bản ghi bị từ chối, license và thời gian bắt đầu/kết thúc; kết quả có `status`, `coverage_ratio`, `results` và `errors` để lưu audit.
- `marketDataIngestionService.js`: transaction, resolve mã, insert/skip/update, hash nguồn và xóa cache.
- `vnstockEodIngestion.js`: kết nối adapter/bridge với ingestion service; dùng chung cho CLI và scheduler.
- `fixtures/valid-daily-quotes.json`: dữ liệu nội bộ, không đại diện dữ liệu thị trường trực tiếp.

`stock_prices` được mở rộng bằng migration `004_expand_market_data_contract.js`. Các cột cũ vẫn được giữ; `price` tương thích với `close`. Unique index logic gồm `stock_id`, `provider`, `interval`, `observed_at`. Migration có thể tiếp tục an toàn nếu một lần chạy trước đã thêm cột nhưng chưa ghi metadata/index. Vì các cột mới nullable để tương thích seed cũ, dữ liệu legacy chưa tự được gán nguồn; không được coi là dữ liệu live.

Foreign flow dùng bảng `foreign_flow_daily` từ migration 038, tách khỏi `stock_prices` vì cadence, quyền truy cập, correction và provenance có thể khác nguồn giá. Bảng lưu buy/sell volume và value gốc; net flow chỉ được dẫn xuất. Thiếu foreign flow không làm mất candle giá và không được quy thành net bằng 0.

## Ingestion report

Mỗi batch trả `received`, `inserted`, `updated`, `skipped`, `rejected` và `errors`. Cùng một quan sát với cùng nội dung canonical được skip. `source_hash` không bao gồm `fetched_at`, vì mỗi lần polling có thời điểm tải mới nhưng vẫn có thể là cùng dữ liệu. Record cùng khóa logic nhưng hash khác được update, phù hợp trường hợp provider sửa dữ liệu.

Khi ingestion thay đổi dữ liệu, cache loại `stock` và cache chi tiết/giá của mã bị ảnh hưởng được xóa. Cache của mã không liên quan được giữ lại.

## Kiểm thử và giới hạn

- Unit test contract/adapter/ingestion nằm ở `backend/src/market-data/marketData.test.js`.
- `npm run test:postgres` chạy bốn migrations, fixture ingestion và dedup trên schema PostgreSQL tạm.
- Vnstock adapter chưa gọi mạng trực tiếp: caller phải cung cấp `fetcher({ symbols, from, to, interval: '1d', source })`, thường là bridge Python có cài Vnstock. Điều này giữ dependency tùy chọn và cho phép test deterministic.
- Bridge mẫu dùng API `vnstock.api.quote.Quote`; dependency được ghim trong `backend/requirements-vnstock.txt`. Node không đưa Vnstock vào `package.json`.
- `scripts/ingest-vnstock-eod.cjs` ghi dữ liệu thật vào PostgreSQL; `VNSTOCK_EOD_ENABLED=true` mới bật scheduler trong server. Không bật mặc định để tránh gọi provider ngoài ý muốn.
- `market_data_ingestion_runs` lưu lifecycle và counters của CLI/scheduler; endpoint `GET /api/market-data/ingestion/latest` phục vụ trạng thái vận hành. Bridge retry lỗi process theo `VNSTOCK_RETRIES` (mặc định 2), timeout theo `VNSTOCK_TIMEOUT_MS` (mặc định 45 giây) và backoff theo `VNSTOCK_BACKOFF_MS` (mặc định 500ms).
- Chưa có lịch giao dịch chính thức, cơ chế retry/rate limit hoặc bảng ingestion audit bền vững; coverage probe hiện trả report để job/CLI lưu lại.
- Chưa quyết định dữ liệu điều chỉnh (adjusted) và chưa tính `change` từ phiên trước.
- Trước khi chọn provider thật cần xác minh license, giới hạn request, timezone, đơn vị giá và SLA.

## Vnstock EOD và coverage probe

Khởi tạo adapter với `fetcher` của môi trường triển khai:

```js
const VnstockEodAdapter = require('./src/market-data/adapters/VnstockEodAdapter');
const { runCoverageProbe } = require('./src/market-data/coverageProbe');

const adapter = new VnstockEodAdapter({ source: 'vci', fetcher });
const report = await runCoverageProbe({
  adapter,
  symbols: ['FPT', 'HPG', 'VCB'],
  from: '2026-09-01',
  to: '2026-09-17',
  minCoverage: 0.95,
  minSessions: 5
});
```

`report.status` chỉ đạt khi tỷ lệ mã có đủ số phiên tối thiểu đạt `minCoverage` và không có canonical record bị từ chối. Report phải được lưu cùng run ingestion nếu cần audit; không coi test fixture là bằng chứng coverage thị trường thật. License mặc định của adapter là `personal_research_only`; phải thay bằng metadata từ thỏa thuận provider trước khi public dữ liệu.

Probe thực tế ngày 2026-09-18 được lưu tại [`evidence/vnstock-coverage-2026-09-18.json`](evidence/vnstock-coverage-2026-09-18.json): 9 mã (3 HOSE, 3 HNX, 3 UPCOM), 45/45 record hợp lệ, 5 phiên/mã, coverage 100%. Khoảng ngày truyền vào là 2026-09-11 đến 2026-09-17; adapter lọc lại biên ngày sau khi provider trả dữ liệu. Ngày giao dịch được bridge giữ ở dạng `YYYY-MM-DD` rồi canonical hóa thành `00:00:00Z`, tránh phụ thuộc timezone của máy chạy.

Lần ingest ứng dụng được lưu tại [`evidence/vnstock-ingestion-2026-09-18.json`](evidence/vnstock-ingestion-2026-09-18.json): 3 mã đang có trong database, 15 bản ghi inserted, 0 rejected; cache stock đã được invalidate.

## Quy ước trình bày UI

- Giá VND hiển thị tối đa 2 chữ số thập phân; không làm tròn 0 chữ số cho giá cổ phiếu.
- Khối lượng dùng dạng compact ở danh sách/metric, nhưng API vẫn giữ số đầy đủ.
- Chart EOD hiển thị ngày giao dịch và tooltip gồm close, volume; OHLC đầy đủ vẫn có trong `price_history` để mở rộng bảng chi tiết sau này.
- Không suy diễn chart realtime, change hoặc chỉ báo kỹ thuật khi contract chưa có dữ liệu tham chiếu tương ứng.

## Reconciliation và quyền dữ liệu

`reconcile:vnstock` chỉ là kiểm định nội bộ. Kết quả `pass` không cấp quyền hiển thị dữ liệu; trạng thái license phải được xác minh riêng với từng upstream. Run bị lỗi hoặc thiếu một nguồn không được dùng để kết luận hai provider khớp nhau. Khi dự án chuẩn bị public, cần thay `internal_research_only` bằng bằng chứng quyền display/redistribution/commercial cụ thể và lưu phiên bản điều khoản vào source registry.

EODHD adapter dùng EOD historical API làm nguồn đối chiếu cá nhân. API key chỉ đọc từ `EODHD_API_KEY`; suffix mã mặc định `.VN` là giả định cần kiểm tra bằng exchange/ticker list. License adapter là `personal_plan_pending` cho tới khi người dùng xác nhận điều khoản của gói đã đăng ký.

### Quy tắc volume khi reconciliation

VCI/Vnstock history hiện cung cấp `matched_volume`/khối lượng khớp lệnh. EODHD mô tả `volume` là tổng khối lượng giao dịch trong kỳ và có thể được điều chỉnh theo corporate action/split. Vì vậy volume giữa hai nguồn chỉ là tín hiệu kiểm định tham khảo; không được tự động coi lệch volume là lỗi dữ liệu của một nguồn hoặc nới tolerance để biến run thành `pass`.

Reconciliation hiện phát hiện `corporate_action_mismatch` khi cả close và volume cùng lệch theo một hệ số với sai khác giữa hai tỷ lệ không quá 1%; trạng thái này vẫn làm run `fail` nhưng giúp tách lỗi điều chỉnh corporate action khỏi volume mismatch thông thường.

Chính sách volume được chọn là **dual representation**: giữ `volume_a`/`volume_b` nguyên gốc để audit, đồng thời tạo `volume_a_normalized`/`volume_b_normalized` cho phân tích. Khi có split metadata và phiên nằm trước ngày hiệu lực, volume của nguồn đã điều chỉnh được chia cho `ratio`; khi thiếu metadata, hệ thống giữ nguyên volume và chỉ phát cảnh báo. Report ghi `volume_policy: normalized`.

Khi hai provider có semantics volume khác nhau mà chưa có trường tổng tương đương, có thể chạy `RECONCILIATION_VOLUME_POLICY=advisory`. Khi đó mismatch volume trở thành `volume_warning`, không làm hỏng kết luận về giá; raw và normalized volume vẫn được ghi để kiểm tra sau. Policy mặc định vẫn là `normalized`/strict.

Giá cũng dùng cùng quy tắc cho reconciliation: giá nguồn đã điều chỉnh được chia cho split ratio trước ngày hiệu lực, nhưng `close_a`/`close_b` gốc vẫn được giữ. Nếu close và volume chỉ khớp sau điều chỉnh, trạng thái là `matched_after_corporate_action`; đây là pass có điều kiện theo policy, không phải tuyên bố hai nguồn trả cùng raw series.

Run nhiều mã ngày 2026-09-18 được lưu tại [`evidence/eodhd-vnstock-reconciliation-2026-09-18.json`](evidence/eodhd-vnstock-reconciliation-2026-09-18.json). Giá đã khớp đơn vị sau khi áp dụng hệ số 1.000 cho Vnstock. PVS có chênh lệch khoảng 1,2 lần ở phiên 2026-09-11; EODHD trả corporate action split `6/5` có hiệu lực 2026-09-14. FPT khớp giá 5/5 phiên nhưng volume lệch 4/5 phiên, phù hợp với khả năng khác định nghĩa `matched_volume` và `traded volume`.
