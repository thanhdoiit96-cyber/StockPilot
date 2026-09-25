# Thiết kế workspace đề xuất

## Phạm vi

Đề xuất ngắn hạn và đánh giá kết quả là một workspace riêng. Tổng quan chỉ phục vụ độ phủ thị trường, giá, biến động, nguồn dữ liệu và thao tác danh mục. Workspace Đề xuất đọc snapshot bất biến từ `/api/recommendations/latest` và lịch sử từ `/api/recommendations/history`.

## Luồng hiển thị

1. Người dùng mở tab **Đề xuất**.
2. UI hiển thị thời điểm snapshot, model, universe, số mã chọn và trạng thái dữ liệu.
3. Mỗi mã hiển thị điểm, horizon, giá tham chiếu, rationale và evidence profile.
4. UI hiển thị riêng các nhóm tiêu chí: khách quan, vĩ mô, tin tốt/xấu, tâm lý thị trường, chủ quan và policy gate.
5. UI hiển thị đánh giá ngoài mẫu: measured, pending, hit rate, forward return và giới hạn diễn giải.

## Contract evidence

`rationale.evidence` gồm:

- `objective`: observations, trend, SMA/EMA, RSI, momentum, thanh khoản/biến động và trạng thái đủ lịch sử;
- `macro`: số yếu tố đã xác minh, nguồn, thời điểm công bố và quyền hiển thị;
- `news`: số tin tích cực/tiêu cực đã xác minh; tin thiếu nguồn hoặc quyền hiển thị bị loại;
- `sentiment`: điểm tâm lý chỉ có khi provider có phương pháp, mẫu và timestamp kiểm chứng;
- `subjective`: risk tolerance, holding period và max allocation do người dùng nhập; không suy ra từ giá;
- `policy`: `unverified_news_excluded`, `unavailable_factors_do_not_receive_points`, `no_trade_execution`.

Model `short_term_rule_v2` hiện chỉ tính nhóm technical/objective đã kiểm chứng. Macro, news, sentiment và subjective được ghi trạng thái nhưng không nhận điểm khi chưa có adapter/rights/evaluation. Đây là rào chắn chống overclaim, không phải thiếu sót được coi là dữ liệu trung tính.

## Tiêu chí đánh giá

Đề xuất chỉ đủ điều kiện khi có tối thiểu 50 quan sát giá. Đánh giá phải dùng giá tương lai ngoài mẫu sau đủ 20 phiên, giữ snapshot bất biến, báo số measured/pending, hit rate, phân phối forward return và phân bổ theo ngành. Không dùng pending để điều chỉnh trọng số. Trước khi thêm điểm tin tức hoặc sentiment cần fixture positive/negative, timestamp, nguồn, rights, phương pháp tính, kiểm tra độ trễ và đánh giá hiệu chuẩn theo ngành.

## Ranh giới an toàn

Điểm là bộ lọc nghiên cứu, không phải lệnh mua bán. Không dùng thông tin chủ quan để thay đổi điểm bằng chứng thị trường. Không hiển thị tin chưa xác minh như evidence. Generative AI và execution vẫn bị khóa.


## Verified external context in snapshots

Snapshot generation joins `ExternalFactor` rows with `status=verified`, `source`, and `published_at`, matching symbol-specific and global factors. Verified news may be shown as positive or negative from its impact field; unverified news is excluded. These groups remain evidence only until rights, method, and out-of-sample calibration are complete.
