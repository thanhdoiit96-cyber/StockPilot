# Runbook xác minh quyền dữ liệu provider

Tài liệu này áp dụng cho prototype hiện tại và bước chuẩn bị public release. API key chỉ chứng minh quyền truy cập kỹ thuật; không tự chứng minh quyền lưu trữ, hiển thị, phân phối lại hoặc dùng dữ liệu để cung cấp dịch vụ cho người dùng khác.

## Trạng thái hiện tại

| Provider | Dữ liệu | Quyền hiện có | Được public display? | Hành động |
|---|---|---|---|---|
| Vnstock Community / VCI | EOD OHLCV | `internal_research_only` | Chưa xác minh | Chỉ dùng nội bộ; không bật public display |
| EODHD | EOD và corporate actions | Điều khoản Personal cho phép lưu trữ/phân tích riêng tư, nhưng cấm display, retransmit, redistribute hoặc cấp quyền truy cập | **Không được public display với Personal** | Xin Professional/commercial authorization bằng văn bản trước khi public |
| World Bank | CPI, GDP growth, exchange rate | CC BY 4.0 nếu dataset cụ thể mang license này | Có thể, kèm attribution | Lưu metadata/license URL cho từng indicator; kiểm tra dataset không phải license khác |

## Quy trình cho từng provider

1. Ghi rõ mục đích: ứng dụng web công khai cho người dùng phổ thông, hiển thị EOD và các chỉ báo phái sinh, không bán dữ liệu thô và không đặt lệnh. Theo điều khoản EODHD hiện hành, đây không còn là Personal Use vì có hiển thị cho người dùng khác.
2. Gửi yêu cầu bằng văn bản, dùng đúng tài khoản/API key đang sử dụng. Hỏi riêng bốn quyền: lưu trữ/cache, hiển thị trên web, tạo derived indicators/AI summaries, và phân phối lại hoặc cho phép tải xuống.
3. Yêu cầu provider xác nhận phạm vi lãnh thổ, số người dùng, thời hạn, attribution, giới hạn request, dữ liệu trễ/EOD, quyền tạo derived data/AI summaries, và nghĩa vụ xóa dữ liệu khi hủy gói.
4. Lưu bản trả lời, URL điều khoản, tên gói, ngày hiệu lực, ngày hết hạn và hash tài liệu vào hồ sơ quyền của dự án. Không coi email marketing hoặc trang pricing là giấy phép display nếu không nói rõ.
5. Chỉ khi văn bản đáp ứng đủ quyền cần thiết mới đặt `EXTERNAL_FACTOR_DISPLAY_RIGHTS=verified` và chạy lại `npm run verify:m5-quality`.

## Mẫu email gửi EODHD hoặc nguồn dữ liệu thị trường

```text
Subject: Request to confirm public web display and derived-data rights

I am an individual researcher building a public, non-brokerage web application for Vietnamese stock analysis.

The application will display delayed/end-of-day prices and derived technical indicators to ordinary users. It will not execute trades, provide a raw-data download/API, or resell the source feed. We may retain a server-side cache only as necessary for the product.

Please confirm in writing whether my current [PLAN NAME] and API key permit:
1) server-side storage/cache of EOD and corporate-action data;
2) public display of the data in charts and tables;
3) derived indicators, backtests, alerts and AI-generated summaries;
4) display to an unspecified number of end users;
5) attribution requirements and required source labels;
6) retention/deletion requirements after cancellation; and
7) whether a commercial, redistribution, startup or academic plan is required.

Please include the applicable terms version and effective date.
```

## World Bank attribution

Với dataset cụ thể được gắn CC BY 4.0, hiển thị attribution gần biểu đồ hoặc trong trang Sources:

```text
Source: World Bank, [dataset/indicator name], [country/period].
License: CC BY 4.0. Changes: normalized frequency and stored observation timestamp.
```

Mỗi lần ingest phải lưu `provider`, `dataset`, `indicator`, `license`, `license_url`, `retrieved_at` và `attribution`. Không suy luận license của một dataset chỉ từ việc nó xuất hiện trong World Bank Data Catalog.

## Cấu hình ứng dụng

Trong môi trường prototype, giữ:

```env
EXTERNAL_FACTOR_DISPLAY_RIGHTS=pending
```

Không đưa API key vào frontend, log hoặc artifact. Khi đã có xác nhận hợp lệ:

```env
EXTERNAL_FACTOR_DISPLAY_RIGHTS=verified
```

Sau đó chạy:

```bash
npm run verify:m5-quality
npm run validate:ai-gate
```

Nếu provider chỉ cho phép hiển thị nhưng không cho tải xuống, vẫn phải giữ raw endpoint và export bị khóa. Với EODHD Personal, không được hiển thị dữ liệu cho người dùng khác theo điều khoản hiện hành; tiếp tục để dữ liệu EODHD/Vnstock ở môi trường nội bộ cho tới khi có Professional/commercial authorization. 

## Tiêu chí nghiệm thu quyền

`verified` chỉ hợp lệ khi có đủ bốn bằng chứng: (1) danh tính provider và gói, (2) điều khoản phiên bản/ngày hiệu lực, (3) quyền display/cache/derived output phù hợp với sản phẩm, và (4) attribution cùng giới hạn người dùng được ghi nhận. Khi điều khoản hết hạn hoặc thay đổi, chuyển lại `pending` và khóa Generative AI/public display.

## Căn cứ rà soát ngày 2026-09-20

- [Vnstock License](https://vnstocks.com/onboard/giay-phep-su-dung): phần mềm không chuyển quyền dữ liệu bên thứ ba; quyền truy cập, lưu trữ, hiển thị và phân phối dữ liệu phải kiểm tra với nguồn đích.
- [EODHD Terms and Conditions](https://eodhd.com/financial-apis/terms-conditions): Non-Professional Use chỉ dành cho đầu tư cá nhân, riêng tư và phi thương mại; điều khoản cấm bán, truyền lại, phân phối, hiển thị hoặc cấp quyền truy cập thông tin/dịch vụ. Ứng dụng public phải xin phạm vi Professional/commercial phù hợp.
- [World Bank Data Access and Licensing](https://datacatalog.worldbank.org/public-licenses): CC BY 4.0 cho phép sử dụng và phân phối với attribution; từng dataset vẫn phải kiểm tra license cụ thể.
