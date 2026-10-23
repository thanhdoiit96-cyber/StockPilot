# Hiệu chỉnh Đề xuất theo bằng chứng

## Signal explanation UI decision — 2026-10-23

History follow-up: show model/horizon cohort progress before outcome statistics, reusing the existing summary request. Do not aggregate distinct models/horizons into one success rate. Summary failure must display retry rather than a no-data state. Missing counts remain unavailable; only explicit server readiness marks a cohort comparable. Sector concentration means share of selected symbols in a frozen snapshot, not monetary portfolio exposure; no new allocation/ranking rule is inferred. No additional initial request, polling or cached persistence is introduced.

Users need to distinguish ranking evidence from measured signal outcomes. Extend the existing scoring-evidence component with a compact visible explanation: highest two criterion scores, lowest distinct criterion for review, declared horizon, price timestamp and explicit evaluation state. These are relative score comparisons, not newly invented trading thresholds. Only `statistics_eligible=true` together with `measurement_status=eligible` permits a validated outcome label; excluded/pending are displayed separately, and absent tracking fields mean untracked. Personalized results must not inherit scheduled-model evidence. Reuse the current response; add no request, polling, persistence or model change. Existing native details keep full provenance available by keyboard. Acceptance: missing/malformed evidence remains unknown; eligible/excluded/pending remain distinguishable; mobile layout and browser evidence disclosure pass.

## Mục tiêu và phạm vi

Tài liệu này ghi quyết định cho việc dùng outcome lịch sử để hiệu chỉnh trọng số Đề xuất. Người dùng cần biết liệu kết quả lịch sử có đang làm thay đổi điểm xếp hạng hay không; hệ thống không được diễn giải một tập outcome nhỏ, không cùng mô hình, thành bằng chứng cho đề xuất cá nhân hóa.

Phạm vi hiện tại là `short_term_rule_v2` (snapshot theo lịch) và `personalized_rule_v1` (xếp hạng theo trọng số người dùng). Không mở giao dịch, không thay đổi outcome đã lưu và không backfill dữ liệu legacy.

## Kết quả rà soát ngày 2026-10-19

Đọc dữ liệu runtime qua `GET /api/recommendations/history/summary` cho thấy cohort `short_term_rule_v2`, horizon 20 có 70 mã được chọn nhưng chưa có outcome hợp lệ: 65 đang chờ, 5 bị loại vì integrity và 0 measured. Vì vậy không có cơ sở để áp dụng hệ số hiệu chỉnh.

Rà soát code cũng xác định outcome của `short_term_rule_v2` từng được dùng để tạo hệ số cho `personalized_rule_v1`. Hai model không cùng quy tắc chọn/xếp hạng: model theo lịch xếp hạng bằng `scoreAnalysis`, còn model cá nhân hóa dùng các trọng số do người dùng đặt. Việc chuyển hệ số qua hai model sẽ lẫn tác động của cách chọn mẫu với tác động của từng tiêu chí.

## Quyết định triển khai

Phương án đơn giản và an toàn được chọn: outcome chỉ có thể điều chỉnh trọng số khi cùng `model` và cùng `horizon_days` với kết quả đang xếp hạng. Dữ liệu không cùng model vẫn được hiển thị là dữ liệu theo dõi, nhưng mọi hệ số gửi vào `personalized_rule_v1` phải là `1.00`.

API `learning` trả rõ `source`, `target`, `application_status` và `application_reason`. UI nêu rằng hiệu chỉnh chéo mô hình chưa được áp dụng, thay vì hiển thị lịch sử như đang bật hiệu chỉnh. Trạng thái `calibrated` chỉ có ý nghĩa khi đủ tối thiểu 15 outcome hợp lệ cho mọi tiêu chí trong phạm vi tương thích.

Phương án mở rộng là tạo snapshot bất biến và evaluator riêng cho `personalized_rule_v1`, gồm toàn bộ criteria, horizon, input provenance, outcome evidence và ledger event. Phương án này đáng làm sau khi có đủ outcome thật; không tự ghép outcome từ portfolio vì đó là hành vi người dùng và không phải mẫu xếp hạng đã phát hành.

## Phương pháp đánh giá được giữ

- Chỉ `statistics_eligible=true` được dùng cho report hoặc hiệu chỉnh. Guard kiểm snapshot hash, đủ số phiên EOD, provider/interval, currency/unit/adjustment, target price, return và evaluation evidence.
- Pending và outcome bị loại vẫn giữ nguyên để audit, nhưng không tham gia hit rate, return trung bình, cohort hay calibration.
- Mỗi cohort report được tách theo `model` và `horizon_days`; sector cohort chỉ dùng taxonomy đã chụp trong snapshot.
- UI mô tả hit rate là tỷ lệ mã có forward return dương sau đủ kỳ quan sát; đây là chỉ số theo dõi, không phải cam kết lợi nhuận hay quan hệ nhân quả.

## Điều kiện trước khi mở hiệu chỉnh thật

1. Có snapshot và evaluation evidence bất biến cho chính model/horizon đích.
2. Có ít nhất 15 outcome hợp lệ cho từng tiêu chí; pending, legacy và integrity failure bị loại.
3. Đánh giá độ ổn định theo snapshot độc lập và ghi rõ cách xử lý các mã cùng một run, trước khi dùng một hệ số thống kê để đổi điểm.
4. Phiên bản hóa công thức, ngưỡng và payload hiệu chỉnh; lưu chúng cùng kết quả để tái lập ranking.
5. Chạy regression cho guard, UI disclosure và xác nhận rằng trạng thái không đủ bằng chứng giữ trọng số trung tính.

## Rà soát runtime ngày 2026-10-20

Runtime có 14 snapshot `short_term_rule_v2`/20 phiên, gồm 70 mã được chọn nhưng 0 outcome eligible; 65 còn pending, 5 excluded. Trong 13 snapshot pending, chỉ 3 snapshot có hash xác minh được, 10 snapshot legacy bị chặn integrity. Cohort ngành chưa thể lập vì cả 70 mã thiếu taxonomy được chụp cùng snapshot.

Không tạo cohort tự động cho `personalized_rule_v1` ở giai đoạn này. Weights của model này là tiêu chí từng người dùng chọn, nên gộp các request cá nhân thành một cohort chung sẽ trộn nhiều policy xếp hạng và làm calibration không còn diễn giải được. Khi cần mở rộng, phải thiết kế profile criteria bất biến có version, ownership, consent, snapshot/evaluation evidence riêng; chỉ sau đó mới có thể đánh giá theo profile đó.

Ngân sách hiện tại: không thêm request mới. `learning` được trả cùng snapshot hoặc kết quả cá nhân hóa sẵn có; không polling và không lưu state client mới.
