# Thiết kế workspace đề xuất

## Phạm vi

Đề xuất ngắn hạn và đánh giá kết quả là một workspace riêng. Tổng quan chỉ phục vụ độ phủ thị trường, giá, biến động, nguồn dữ liệu và thao tác danh mục. Workspace Đề xuất đọc snapshot bất biến từ `/api/recommendations/latest` và lịch sử từ `/api/recommendations/history`.

## Luồng hiển thị

Workspace hiện chia bốn tab: **Đề xuất** ưu tiên form tiêu chí và kết quả; **Lịch sử & báo cáo** cho từng run/CSV; **So sánh bản lưu** cho cấu hình đã lưu; **Hiệu chỉnh** giải thích calibration. Chuyển tab không bỏ state, hỗ trợ Arrow/Home/End và mobile hai cột. Lịch sử được mount lần đầu theo nhu cầu; phân tích tổng hợp trong details mặc định đóng phía sau report, không chặn đường tới báo cáo. Không đổi thuật toán eligibility bằng thay đổi bố cục này.

1. Người dùng mở tab **Đề xuất**.
2. UI hiển thị thời điểm snapshot, model, universe, số mã chọn và trạng thái dữ liệu.
3. Mỗi mã hiển thị điểm, horizon, giá tham chiếu, rationale và evidence profile.
4. UI hiển thị riêng các nhóm tiêu chí: khách quan, vĩ mô, tin tốt/xấu, tâm lý thị trường, chủ quan và policy gate.
5. UI hiển thị đánh giá ngoài mẫu: measured, pending, hit rate, forward return và giới hạn diễn giải.

## Contract evidence

`recommendations.evaluation_evidence` (migration 032) lưu contract `recommendation_evaluation_v1` cho kết quả mới: `generated_at`, provider, interval, timezone, horizon, danh sách ngày quan sát, entry price, target metadata, forward return và outcome. Evaluator bỏ observation tương lai so với `generated_at`; report chỉ tính khi evidence khớp dữ liệu đã lưu. Dòng legacy không được backfill. JSONB có version nhưng chưa được ký độc lập/append-only.

Migration 033 dùng `generation_key` SHA-256 nullable/unique cho snapshot mới, để worker đồng thời chỉ giữ một winner. Các run legacy giữ null vì contract cũ có duplicate. Creation ghi run/items/seal hash cùng transaction; update outcome/evidence chỉ claim row còn pending trong transaction.

Migration 034 chuyển reads của scheduled snapshot vào `REPEATABLE READ` transaction và lưu `input_provenance` v1 nhỏ gọn. Scheduled snapshot chỉ dùng EOD, không intraday. Provenance ghi phạm vi/contract đếm được, không lưu giá chi tiết; chưa được hash riêng hay append-only. Upstream ingestion vẫn ngoài transaction này.

Migration 035 hash canonical `input_provenance` bằng SHA-256 và seal nó vào snapshot v2. Verifier kiểm hash snapshot và provenance; mismatch fail-closed. Đây là phát hiện sửa đổi sau lưu, chưa là signature độc lập hay ledger append-only.

Migration 036 thêm ledger event evaluation append-only trong PostgreSQL. Outcome/evidence và `evaluation_recorded` event hash được ghi cùng transaction sau conditional claim pending; trigger cấm update/delete. Ledger chưa có signature/external archive hoặc UI/export; legacy outcome không được backfill event.

`GET /api/recommendations/history/:id/evaluation-ledger` là đường audit chỉ đọc cho một snapshot có thật. Mỗi event trả payload đã lưu, SHA-256 và trạng thái integrity được server tính lại (`verified`/`invalid`), kèm rank/mã nếu quan hệ còn đọc được. Danh sách rỗng chỉ có nghĩa snapshot chưa có outcome được ghi ledger; endpoint không tạo, sửa hoặc backfill event. Snapshot không tồn tại trả 404 `recommendation_history_not_found`.

`GET /api/recommendations/lifecycle-readiness` đưa lifecycle scheduler ra UI dưới dạng chỉ đọc. Endpoint chỉ đọc EOD mới nhất theo provider và run đúng contract của phiên hiện tại, rồi trả `awaiting_eod`, `ready_to_generate`, `snapshot_missing_hash`, `snapshot_integrity_failed` hoặc `ready_to_evaluate`. UI Đề xuất dùng thông tin này để giải thích trạng thái nhỏ gọn, không cho người dùng kích hoạt job hay ngụ ý dữ liệu đã được đánh giá.

Backend chạy checkpoint lifecycle chỉ đọc mặc định lúc 16:40 ngày làm việc theo `Asia/Ho_Chi_Minh`, trước evaluator 16:45. Checkpoint dùng cùng query bounded/service với API và CLI, chỉ log trạng thái gate để kiểm tra sau EOD; không tạo snapshot, không chạy evaluator và không ghi evidence. Có thể tắt bằng `RECOMMENDATION_LIFECYCLE_CHECK_ENABLED=false`.

`npm run audit:recommendation-ledger` đọc toàn bộ event trong một PostgreSQL `REPEATABLE READ`/`READ ONLY` transaction. Nó kiểm hash canonical, đối chiếu ID/schema event với payload và đối chiếu payload với outcome/evidence hiện tại trên recommendation row. Audit chỉ báo drift/tamper, không repair hay backfill; exit 2 báo có finding, exit 0 là không có finding. Giá, đủ phiên, eligibility, signature ngoài database và lưu trữ ngoài hệ thống vẫn cần các kiểm chứng riêng.

Evaluator và read-time eligibility dùng chung observationWindow (2026-10-09): đếm ngày giá Việt Nam khác nhau, đúng provider/1d, kiểm đơn vị/adjustment/giá và duplicate trong N ngày đầu. Duplicate tương đương không tăng kỳ hạn; dữ liệu mâu thuẫn giữ pending thay vì nhảy sang giá muộn. Đây chưa phải chứng nhận đủ phiên sàn hoặc evidence được version hóa; cutoff thời gian chạy vẫn là phần cần triển khai.

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

Outcome chỉ được dùng để hiệu chỉnh trọng số của cùng model và cùng horizon. `short_term_rule_v2` và `personalized_rule_v1` là hai model khác nhau; outcome của snapshot theo lịch chỉ là dữ liệu theo dõi cho đề xuất cá nhân hóa và không được đổi trọng số của nó. Quyết định, contract trả về và điều kiện mở hiệu chỉnh thật được ghi tại [RECOMMENDATION_CALIBRATION_DESIGN.md](RECOMMENDATION_CALIBRATION_DESIGN.md).

## Ranh giới an toàn

### Đã triển khai: eligibility của báo cáo lịch sử

API list/detail/cohort và hiệu chỉnh tiêu chí dùng cùng read-time guard. Chỉ kết quả `statistics_eligible=true` tham gia hit-rate, mean và distribution. `measurement_status=excluded` khác với `pending`: kết quả đã lưu nhưng chưa đủ bằng chứng, được giữ nguyên để truy xuất. `exclusion_reasons` giải thích hash chưa xác minh, thiếu ngày quan sát, sai ngày đánh giá, evidence giá không tương thích, giá trùng mâu thuẫn hoặc return/sign không khớp. Không có mẫu hợp lệ thì tỷ lệ trả null.

Guard hiện kiểm hash persisted, N ngày giá EOD khác nhau theo Asia/Ho_Chi_Minh của cùng provider, VND_PER_SHARE/VND/unadjusted, giá hữu hạn dương và return làm tròn 4 chữ số. Đây là điều kiện tối thiểu theo quan sát, chưa chứng minh lịch phiên sàn hoàn chỉnh. Bằng chứng giá được đọc tại thời điểm báo cáo; versioned immutable evaluation evidence còn là bước đề xuất tiếp theo, chưa có schema lưu riêng.

UI dùng một section lịch sử chung để chọn run, xem trạng thái và xuất CSV; learning panel chỉ giữ hiệu chỉnh tiêu chí và liên kết đến lịch sử. Bản đề xuất cá nhân đã lưu/so sánh vẫn riêng vì phục vụ so sánh cấu hình, không phải đo forward return. Lịch sử tải tối đa 50 run gần nhất, mở rộng 8 dòng/lần. CSV để trống return chính của dòng bị loại và giữ raw outcome/return ở cột riêng ghi rõ chưa xác minh, cùng lý do Việt/Anh. Không backfill/hash hoặc sửa outcome cũ tự động.

Điểm là bộ lọc nghiên cứu, không phải lệnh mua bán. Không dùng thông tin chủ quan để thay đổi điểm bằng chứng thị trường. Không hiển thị tin chưa xác minh như evidence. Generative AI và execution vẫn bị khóa.


## Verified external context in snapshots

Snapshot generation joins `ExternalFactor` rows with `status=verified`, `source`, and `published_at`, matching symbol-specific and global factors. Verified news may be shown as positive or negative from its impact field; unverified news is excluded. These groups remain evidence only until rights, method, and out-of-sample calibration are complete.
