# So sánh mã và ngành — thiết kế evidence-gated

> Trạng thái: đề xuất, chưa có endpoint hoặc UI so sánh. Dữ liệu doanh nghiệp hiện có chỉ được mở theo company-data gate; taxonomy `stocks.industry` còn thiếu ở nhiều snapshot nên không thể dùng để suy diễn lịch sử.

## Mục tiêu và phạm vi

Người dùng cần đặt tối đa năm mã cạnh nhau để đọc các chỉ số cùng định nghĩa, cùng kỳ báo cáo và biết rõ dữ liệu nào thiếu/cũ. Họ không cần bảng xếp hạng “tốt nhất”, ước lượng chỉ số còn trống hay khuyến nghị mua/bán.

V1 chỉ so sánh dữ liệu snapshot đã được provider cho phép hiển thị: identity/listing, ngành do provider trả về, chỉ số tài chính có period/as_of, và EOD close có provider/observed date. So sánh ngành là aggregate của cùng tập snapshot đủ điều kiện; không dùng tên công ty để đoán ngành, không backfill ngành hiện tại vào snapshot cũ.

## Quyết định sản phẩm

| Vấn đề | Phương án chọn | Lý do |
| --- | --- | --- |
| Kỳ dữ liệu | Chỉ đặt cạnh các metric cùng `metric_key`, currency, period type/end và accounting basis | Tránh tỷ số cùng tên nhưng khác kỳ/định nghĩa |
| Dữ liệu thiếu | Hiển thị unavailable + lý do/provenance, loại khỏi percentile | Không proxy bằng 0, median khác kỳ hay mã khác |
| Ngành | Provider industry được snapshot hóa, rồi map qua catalog versioned | Không diễn giải lịch sử theo taxonomy hiện tại |
| Giá | EOD cùng provider/phiên; intraday chỉ là nhãn riêng, không trộn vào peer metric | Tránh tạo so sánh point-in-time giả |
| Xếp hạng | Không có “top pick” ở v1; chỉ percentile khi mẫu ngành đủ và uniform | So sánh mô tả, không phải tín hiệu đầu tư |

Phương án đơn giản hơn là frontend gọi nhiều trang chi tiết và tự tính. Nó làm mất kiểm soát period/provenance, tăng request và không có cách biểu đạt thiếu dữ liệu. Phương án mở rộng gồm screening/ranking đa ngành phải chờ coverage/lifecycle evidence.

## Contract dữ liệu và API đề xuất

Backend trả snapshot immutable theo từng mã, không trả raw provider payload. Mỗi ô metric gồm `value`, `unit`, `period_end`, `reported_at`, `as_of`, `provider`, `dataset_version`, `freshness` và `availability_reason?`. Nếu không có các trường này, ô không đủ điều kiện so sánh.

`GET /api/company-comparisons?symbols=FPT,HPG&metrics=revenue,roe` dự kiến giới hạn 2–5 mã, 12 metric và trả:

- `comparison_as_of`: thời điểm tạo response cùng policy freshness;
- `symbols`: identity, provider industry snapshot và cells theo metric;
- `comparability`: từng metric có `comparable`, `reason`, period/currency/basis chung;
- `peer_groups`: chỉ xuất hiện khi industry snapshot đồng nhất và số quan sát vượt ngưỡng đã chốt;
- `provenance` và `coverage` để UI hiển thị unavailable/stale trung thực.

Không nhận formula/provider/period từ client. Cache key gồm danh sách mã đã normalize, metric set và version của snapshot policy; TTL chỉ là tối ưu sau khi đo payload/render, không dùng để che freshness.

## Trải nghiệm và accessibility

Điểm vào là hành động “So sánh” từ Chi tiết mã và Watchlist, với danh sách mã đã chọn hiển thị rõ, không tự thêm mã. Desktop dùng table có sticky label; mobile chuyển mỗi metric thành card theo mã, không ép cuộn ngang toàn trang. Người dùng chọn metric nhóm; trạng thái loading skeleton, empty, partial coverage, stale và error tách biệt. Table có caption, headers `scope`, keyboard remove/focus, và nút mở provenance thay vì tooltip-only.

Percentile/median luôn đi cùng mẫu `n`, period và số mã bị loại. Không biểu đồ radar/heatmap khi có dữ liệu thiếu làm màu sắc ngụ ý so sánh đầy đủ.

## Gate, hiệu năng và nghiệm thu

Trước khi code: provider rights cho metric, schema mapping, coverage/freshness threshold, currency/accounting-basis policy, version taxonomy và sample threshold ngành phải được chốt. Company-data scheduler hiện chỉ development opt-in và expansion scopes còn có gate ba run sạch; nó không là bằng chứng để mở comparison production.

Nghiệm thu: test không trộn kỳ/currency/provider, missing/stale hiển thị đúng, snapshot industry không bị thay bởi dữ liệu hiện tại, ownership không lộ watchlist private, payload limit, keyboard/mobile, và browser smoke với fixture provenance. Không mở ranking/screening cho đến khi audit coverage thực tế đạt gate.

Thiết kế này không phải API hay schema đang chạy.
