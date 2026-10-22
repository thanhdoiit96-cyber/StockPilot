# Thiết kế dự báo thị trường ngắn hạn

Ngày: 2026-10-12. Trạng thái: đề xuất phát triển, chưa triển khai model, schema hay API dự báo. Đây là ưu tiên tiếp theo theo yêu cầu người dùng; AI Advisor tiếp tục để sau.

## Mục tiêu và phạm vi

Giúp người dùng trả lời: trong 1 và 5 phiên tiếp theo, thị trường có thiên hướng nào, xác suất và biên độ bất định ra sao, dự báo trước đây có đáng tin không? Phát hành dự báo sau khi EOD đạt quality gate; mặc định UI chọn 5 phiên. Mở rộng 10 phiên sau nghiệm thu; intraday là dự án sau vì cần lịch sử intraday nhất quán.

Hai mục tiêu phải tách riêng:

- Khi có chuỗi chỉ số phù hợp: dự báo lợi suất đóng cửa VNINDEX tại t+h so với t; ba lớp tăng/đi ngang/giảm, kèm phân vị lợi suất. VN30 và chỉ số khác bổ sung sau.
- Khi chưa có chuỗi chỉ số: nghiên cứu dự báo độ rộng rổ cổ phiếu đủ điều kiện. Định nghĩa B(t,h) = số mã có lợi suất từ t đến t+h dương / số mã trong rổ tại t có outcome hợp lệ. Rổ chọn bằng dữ liệu đã biết tại t, lưu membership và coverage, không thay bằng danh sách hiện tại. Dùng nhãn tăng lan tỏa/cân bằng/giảm lan tỏa, không gọi đây là dự báo VNINDEX. Ngưỡng coverage phải chốt trước holdout; coverage thiếu dưới ngưỡng khiến outcome unavailable, không âm thầm bỏ mã thiếu rồi coi như toàn thị trường.

Ngưỡng lớp của mỗi target phải được định nghĩa và version hóa trước đánh giá. Với chỉ số, dùng dải trung tính phụ thuộc biến động quá khứ và horizon; tham số chỉ chọn trên train/validation. Với breadth, chốt dải cân bằng quanh 50% trên validation. Không đổi ngưỡng theo outcome test. MVP chọn một target chính sau audit dữ liệu, không gộp chất lượng hai target.

## Đánh giá hệ thống hiện tại

- `recommendationEngine.js` dùng điểm quy tắc kỹ thuật, xếp hạng và ngưỡng chọn mã; không có xác suất dự báo đã hiệu chỉnh. `buildReferencePlan` dùng quy tắc giá tham khảo, không phải phân phối giá dự báo.
- Đã có EOD, indicator, breadth, snapshot/provenance/hash và evaluation ledger để tái sử dụng nguyên tắc truy vết. Recommendation horizon 20 phiên là luồng riêng; không cần đợi nó trưởng thành mới nghiên cứu horizon 1/5 phiên.
- `riskBacktest.js` đếm việc chạm target/stop trên close; khi cả hai cùng xảy ra, logic hiện ưu tiên target. Nó không đủ để kết luận lợi nhuận chiến lược hay độ chính xác forecast. Cần evaluator forecast riêng.
- Checkpoint hiện có ghi nhận 624 mã metadata; chưa audit trong công việc này số phiên đủ chất lượng, lịch sử membership, corporate action hoặc khả năng tái tạo dữ liệu đã biết tại thời điểm dự báo. Chưa có bằng chứng lợi thế dự báo.

## Dữ liệu và chống nhìn trước

Outcome review: replay nhận reviewCutoff >= mọi origin/evaluation cutoff; mặc định dùng evaluation cutoff cuối. `outcome_audits` đối chiếu revision origin và label với trạng thái mới nhất đã biết tại review cutoff. Missing/not-yet-available/revoked/superseded làm outcome không đủ điều kiện trong projection dùng tính baseline; samples gốc không sửa. Đây là báo cáo hồi cứu tại review cutoff, có thể thay đổi train/metric so với bản as-issued; không xem là lịch sử dự báo đã phát hành. Manifest origin hiện chỉ có 60 phiên history của members và calendar origin; label có forward rows thực dùng của từng horizon và calendar origin. Thay đổi ngoài dependency không invalidates outcome. Không tự tái chọn thành phần rổ hoặc sửa nhãn đầu tiên khi giá missing được bổ sung sau đó.

Artifact import v1: JSON envelope `{version:'forecast_research_artifact_v1',payload,sha256}`. Payload gồm provider, synthetic, calendarKey, evidenceBundle, rows, origins, evaluationCutoffs, folds theo contract service. `artifactHash(payload)` dùng SHA-256 trên JSON với object keys sorted recursively; array order giữ nguyên. CLI `npm run report:forecast-research -- --input <path>` đọc regular file <=16 MiB, rows/revisions <=100.000, origins <=500, evaluationCutoffs <=1.000, folds <=100. Hash phải khớp, context synthetic phải nhất quán, IDs dòng không trùng; validation chi tiết session/cutoff/evidence chạy trong các service tương ứng. Sai input exit 2. Không nhận checksum như chữ ký nguồn hoặc tự cấp trạng thái training-ready.

Revision implementation: `createForecastEvidenceStore` nhận `{version:'forecast_evidence_bundle_v1',synthetic,revisions}`. Mỗi revision có id/kind(calendar|price)/key/revision/recorded_at/status(verified|revoked)/payload. Price key là row ID; calendar key chỉ định bởi caller. Version phải liên tiếp từ 1, recorded_at tăng dần; view chọn revision cuối đã biết tại cutoff, revoked không fallback. Price verification time được nâng tối thiểu lên recorded_at. Đây là immutable view trong bộ nhớ, không phải append-only storage hay chữ ký nguồn.

Replay nhận evidenceStore và calendarKey, freeze calendar/history tại origin; evaluation dùng evidence mới cho forward rows, lưu manifest riêng. Correction hoặc revocation lịch sử không viết lại feature của forecast cũ; việc vô hiệu outcome khi phát hiện vấn đề lịch sử về sau cần audit policy riêng trước live training. Baseline từ chối gộp khác calendar version; nghiên cứu nhiều calendar revision cần contract tương thích riêng. Bundle hash hiện dựa trên JSON serialization và thứ tự revision, không phải canonical semantic hash.

Evidence adapter v1 (`forecastEvidenceAdapter.js`): input raw rows và attestations `{id,row_id,provider,source_hash,source,available_at,verified_at,price_basis,basis_verified,events_verified}` cùng cutoff có timezone. Proof phải khớp row/provider/hash; chỉ một proof đã biết tại cutoff được chấp nhận, nhiều proof bị ambiguous đến khi có revision policy. Output normalized rows có availability=max(available_at,verified_at), evidence_id và exclusions. Các cờ là attestation upstream, không phải chứng minh tự động về nguồn/chữ ký/quyền dữ liệu. Fetched_at/is_adjusted không tự cấp evidence. Calendar phải có evidence riêng. Adapter chưa nối vào replay vì repository revision/cutoff chưa triển khai.

PostgreSQL exclusion CLI hiện không có evidence repository nên truyền tập evidence rỗng tường minh, trả evidence_source=not_configured; số accepted=0 chỉ chứng minh thiếu tích hợp evidence. Không xem đây là audit kết luận provider sai. Có giới hạn 100.000 dòng; vượt giới hạn thì fail thay vì báo cáo một phần không rõ phạm vi.

Audit read-only theo provider/symbol/session: độ dài lịch sử, trùng/thiếu phiên, giá điều chỉnh, sự kiện doanh nghiệp, thanh khoản, thay đổi niêm yết và thời điểm dữ liệu thực sự sẵn sàng. Mục tiêu nghiên cứu là vài năm và nhiều chế độ thị trường; đây là mục tiêu thu thập, không phải dữ liệu đã có.

Mỗi hàng feature giữ `observed_at`, `available_at`, cutoff và nguồn. Chỉ dùng dữ liệu available trước cutoff. Tin tức/vĩ mô bổ sung sau khi có lịch công bố và revision; dữ liệu cập nhật hồi tố không được coi là đã biết trong quá khứ. Với lịch sử không có available_at, backtest phải ghi giả định và giới hạn, không nhận là point-in-time hoàn chỉnh.

Lợi suất cổ phiếu dùng chính sách điều chỉnh corporate action nhất quán; loại cửa sổ sự kiện chưa giải quyết khỏi train/evaluation. Phải theo dõi mã hủy niêm yết và thiếu outcome để tránh thiên lệch chỉ giữ mã còn tồn tại. Horizon tính theo lịch phiên thị trường xác nhận, không coi h phiên có giá rời rạc của từng mã là h phiên liên tiếp.

Fixture dùng cho kiểm thử pipeline/UI, tách khỏi training, calibration và báo cáo accuracy thật.

## Mô hình và kiểm chứng

Research acceptance: CLI có summary scope, sample/exclusion counts và số fold/mẫu scored theo horizon; market_accuracy_verified luôn false vì tool không thực hiện nghiệm thu model ngoài mẫu. Kiểm thử tiến trình thực xác nhận artifact lặp lại cho JSON giống nhau, file không bị sửa, tamper bị từ chối, calendar revoked không sinh metric. F1 synthetic pipeline đạt, F1 live data acceptance chưa đạt. Có thể phát triển prototype F2 bằng synthetic theo ủy quyền development hiện có, giữ riêng mọi metric và provenance fixture.

Persistence implementation v1: lấy trạng thái có target_session gần nhất trong train hợp lệ tại fitCutoff, giữ cố định qua fold; xác suất cố định [0,8 lớp được chọn, 0,1 mỗi lớp khác] để log loss hữu hạn. Đây là baseline quy ước, không phải xác suất calibrated hoặc persistence cập nhật online. Cùng test rows với frequency; report lưu nguồn label và delta metric frequency-minus-persistence. Thay epsilon hoặc cơ chế cập nhật phải version hóa trước holdout. CLI fixture đã chạy cả hai baseline cho 1/5 phiên; chưa dùng để kết luận mô hình nào tốt hơn trên thị trường thật.

Replay checkpoint: `forecastReplay.js` nhận origins `{asOf, cutoff}`, evaluationCutoffs tăng dần và folds. Mỗi origin khóa features/membership; horizon giữ kết quả đầu tiên status available ở cutoff được cung cấp, kể cả coverage 95–99%, và không sửa khi giá bổ sung đến sau. Availability là thời điểm replay đã kiểm tra, không khẳng định thời điểm sớm nhất giữa hai cutoff. Evidence basis/event hiện là input đã chuẩn hóa; adapter thực phải cung cấp lịch sử evidence tương ứng cutoff trước khi dùng với dữ liệu thị trường. CLI `report:forecast-research -- --fixture` là demo synthetic độc lập; có giới hạn 500 origins/1.000 cutoff, chưa benchmark quy mô lớn.

Availability checkpoint: fold nay bắt buộc `fitCutoff` có timezone, trước 00:00 ICT của testStart (quy tắc nghiên cứu bảo thủ). Baseline yêu cầu label_available_at hợp lệ và <= fitCutoff cho train; báo riêng late_label_sessions. Label builder đặt availability bằng evaluatedAt của lần đánh giá coverage. Vì vậy chạy toàn bộ lịch sử với một evaluatedAt hiện tại sẽ không tạo tập train quá khứ hợp lệ; orchestration phải replay theo cutoff và giữ version nhãn phát hành lúc đó. Việc xác minh basis/event phải đã khả dụng tại cutoff tương ứng khi adapter thực được triển khai.

Baseline implementation: `forecastBaseline.js` nhận samples và folds `{trainStart?, testStart, testEnd}` theo thứ tự thời gian, horizon 1 hoặc 5. Baseline tần suất dùng alpha=1 cố định; thứ tự lớp declining/balanced/advancing, Brier là tổng bình phương ba lớp (không chia 3), log loss dùng log tự nhiên. Mỗi fold purge target >= testStart và có manifest train/test/purged. Các fold test không chồng nhau; train có thể mở rộng. Dataset hash hiện nhận diện projection nhãn dùng cho baseline, không thay input_hash/provenance của sample. Kiểm chứng mới bằng fixture; chưa có adapter dữ liệu thật hay kiểm tra thời điểm nhãn được biết tại model-fit. Chưa dùng metric này để lựa chọn model production.

Implementation checkpoint F1: `backend/src/services/forecastDataset.js` nhận input chuẩn hóa gồm calendar verified/source/version/sessions, rows stock_id/session/available_at/provider/interval/close/price_basis/basis_verified/events_verified và cutoff/evaluatedAt. Đây là core research dùng trong tiến trình, chưa có API. Output gồm membership và input hashes, features return 1/5/20 phiên, exclusions, labels 1/5 phiên. Adapter chịu trách nhiệm xác minh nguồn các cờ evidence; không được đặt true chỉ để vượt gate. Bộ tạo nhãn yêu cầu đầy đủ giá/basis/event cho cửa sổ forward, bảo thủ hơn chỉ kiểm tra hai đầu. Baseline và walk-forward split chưa triển khai.

1. Baseline: xác suất tần suất lịch sử trong cửa sổ train, persistence của trạng thái; với return thêm zero-return và phân phối return thực nghiệm theo horizon.
2. Model đầu: logistic regression có regularization cho ba lớp, dùng return lag, volatility, momentum, breadth và volume đã có. Bắt đầu với ít feature và kiểm tra độ ổn định.
3. Challenger: gradient boosting khi dataset đủ. Phân vị q10/q50/q90 cho target dùng quantile model; kiểm tra thứ tự phân vị và độ phủ khoảng. Chỉ thêm model phức tạp khi cải thiện ngoài mẫu.
4. Walk-forward theo ngày: train → validation/calibration → test tương lai. Purge các nhãn train có cửa sổ outcome chồng lên validation/test; gap theo horizon lớn nhất. Với panel, toàn bộ mã cùng ngày nằm cùng fold. Scaler, feature selection và calibration đều fit trong fold; giữ holdout cuối chưa dùng để chọn model.
5. Metric chính: multiclass Brier và log loss; reliability diagram để kiểm tra calibration riêng. Accuracy, balanced accuracy và confusion matrix là bổ sung. Với khoảng dự báo đo pinball loss, coverage thực tế và độ rộng. Brier một mình không chứng minh calibration tốt.
6. So baseline cùng target/horizon/date, báo theo chế độ thị trường và coverage. Ước lượng khoảng bất định của chênh lệch metric bằng bootstrap theo block thời gian, vì dự báo 5 phiên liên tiếp có nhãn chồng lấn. Không lấy số mã nhân số phiên làm số mẫu độc lập.
7. Nếu nghiên cứu chiến lược: giao dịch sớm nhất sau lúc phát hành, tính phí/slippage/thanh khoản, quy định khi thiếu giá hoặc cùng chạm stop/target. Báo cáo hiệu quả giao dịch tách khỏi accuracy dự báo.

Gate đề xuất trước public: model cải thiện metric chính so baseline trên holdout và ổn định qua walk-forward; khoảng bất định không cho phép kết luận khi mẫu ít. Khóa trước ngưỡng calibration, interval coverage, độ phủ dữ liệu và số phiên đánh giá tối thiểu trong experiment manifest. Không cam kết trước một tỷ lệ đúng tùy ý. Shadow run ít nhất 20–30 phiên hoàn tất để kiểm tra vận hành; thời lượng đó không tự chứng minh lợi thế thống kê.

## Kiến trúc đề xuất

EOD đạt gate → tạo feature snapshot → worker inference với artifact đã duyệt → lưu forecast bất biến → API đọc → evaluator sau horizon → lịch sử chất lượng.

- Python job huấn luyện offline; Node API đọc kết quả đã tính, không train khi mở trang. Tái sử dụng worker pattern hiện có nhưng tách job dự báo khỏi ingestion để không tranh tài nguyên không kiểm soát.
- Đề xuất bảng `forecast_models`, `forecast_runs`, `forecast_predictions`, `forecast_outcomes`; chỉ tạo bằng migration ở bước triển khai. Lưu model/feature/target version, train cutoff, input hash, issue time, target session, universe membership, probabilities, quantiles, quality và abstention reason. Sửa dữ liệu tạo revision có liên kết, không ghi đè dự báo cũ.
- API dự kiến `/api/forecasts/latest` và `/api/forecasts/history`, filter target/horizon có giới hạn. Đây chưa phải endpoint đang tồn tại.
- Chặn phát hành mới khi EOD thiếu, input drift nặng hoặc model không hợp lệ; giữ bản cũ kèm ngày và trạng thái hết hạn. Phân biệt dữ liệu thiếu với model có xác suất gần cân bằng. Model đủ dữ liệu vẫn có thể không đưa thiên hướng rõ.
- Cache theo forecast ID, lazy-load lịch sử, không polling dày. Đo latency API/render thực tế trước quyết định tối ưu; theo dõi duration job và lỗi riêng.

## UI/UX đề xuất

Tổng quan thêm card “Triển vọng ngắn hạn” phía trên chart breadth, dùng chung style dark/light, Vi/En và control hiện có. Card gồm target/phạm vi, selector 1/5 phiên, ngày phát hành và ba xác suất cộng 100%. Hiển thị thiên hướng chỉ khi vượt ngưỡng đã kiểm chứng; trường hợp cân bằng hiển thị “Chưa có thiên hướng rõ”.

Biểu đồ tách lịch sử thực bằng nét liền và dự báo bằng nét đứt; đánh dấu thời điểm phát hành. Nếu mới có forecast tại h=1/h=5, vẽ điểm/khoảng ở đúng horizon, không nội suy đường hằng ngày thành dự báo chưa tính. Chỉ dùng fan chart khi có quantile cho từng horizon. Ghi rõ khoảng dự báo, không gọi là khoảng tin cậy của độ chính xác.

Ba yếu tố ảnh hưởng nổi bật và điều kiện mô hình mất hiệu lực nằm dưới card; giải thích là quan hệ mô hình, không khẳng định nhân quả. Nguồn/chất lượng/version đặt trong popover (i) mở được bằng bàn phím và chạm. Màu luôn đi kèm chữ, mobile xếp card theo chiều dọc.

Thêm lối mở “Kiểm chứng dự báo” với dự báo đã phát hành, actual sau horizon, pending/unavailable và metric theo horizon. Phân biệt bản nghiên cứu lịch sử, shadow và live. Trang Đề xuất tiếp tục xếp hạng; khi forecast đạt gate mới dùng xác suất như một tiêu chí bổ sung, giữ điểm xếp hạng và xác suất riêng.

## Thứ tự triển khai và nghiệm thu

| Bước | Đầu ra | Điều kiện qua bước |
| --- | --- | --- |
| F0 — Audit và target contract | Báo cáo coverage read-only, target 1/5 phiên, cutoff, label, membership và danh sách gap | Chọn được target tái lập; chỉ rõ dữ liệu cần bổ sung |
| F1 — Dataset và baseline | Dataset version, split manifest, baseline metrics và leakage tests | Cùng input tái tạo cùng dataset; không trùng cửa sổ nhãn qua ranh giới train/test |
| F2 — Model xác suất | Logistic/challenger, calibration, quantile nếu đủ dữ liệu, báo cáo holdout | Đạt gate khóa trước; nếu không đạt thì báo inconclusive và bổ sung dữ liệu |
| F3 — Shadow thật | Migration, inference/EOD job, immutable snapshot và evaluator 1/5 phiên | Theo dõi 20–30 phiên tối thiểu, có kiểm tra tái lập và lỗi/stale; đủ evidence riêng để duyệt model |
| F4 — UI có kiểm chứng | Card Tổng quan và lịch sử dự báo, Vi/En, responsive | Browser test trạng thái thiếu/cân bằng/stale, keyboard/mobile, build và smoke Preview 4173 |
| F5 — Mở rộng | Ngành/mã, horizon 10 phiên, index khi có dữ liệu | Mỗi target qua baseline/holdout riêng; model mới được version hóa |

Ưu tiên ngay F0, tiếp F1. Có thể dựng prototype UI với fixture có nhãn song song sau khi contract F0 chốt. Không phải chờ snapshot recommendation 20 phiên để bắt đầu F0/F1. Ước lượng thời gian chỉ thực hiện sau audit vì thu thập lịch sử và shadow là phụ thuộc thực tế.

## Tài liệu phương pháp

## F0 — Audit và contract nghiên cứu v1 (2026-10-12)

Chạy `npm run audit:forecast-data` tại backend, lúc 2026-10-12T03:38:26Z trên PostgreSQL development trong transaction REPEATABLE READ, READ ONLY, timeout mỗi statement 30 giây. Script chỉ xuất stdout, không lưu artifact hoặc sửa database.

Kết quả: 56.381 dòng EOD Vnstock / 497 mã, từ 2025-01-02 đến 2026-10-09; không có observed_at/fetched_at/volume thiếu, close null hoặc không dương, hay trùng provider–mã–ngày. Kiểm tra này chưa kiểm tra tất cả dạng số không hữu hạn hoặc OHLC bất thường. Toàn bộ 56.381 dòng mang `is_adjusted=false`. Lịch sử mỗi mã có min/median/max 1/18/438 phiên; 124 mã có >=60, 117 có >=250, không mã nào có >=750 phiên. Phiên 09/10 có 357 mã; 14/09 có 111, 15/09 có 258: thay đổi coverage lớn cần tách khỏi tín hiệu thị trường.

Schema audit thấy fetched_at/is_adjusted và listing_status hiện tại, chưa thấy bảng index, calendar, historical membership hoặc corporate-action thị trường theo tên. Đây là kiểm tra schema có giới hạn, không chứng minh toàn hệ thống không có nguồn ngoài database. Corporate event danh mục người dùng không đủ để xác nhận sự kiện của toàn universe. Chưa xác minh quyền dữ liệu hoặc nội dung provider bằng audit này.

Contract chọn cho F1 là `breadth_forward_v1`, trạng thái **research_only**:

- Horizon: 1 và 5 phiên; thời điểm phát hành sau EOD và quality gate, lưu issued_at cùng data_cutoff. Không lấy giờ 15:00 đơn thuần làm bằng chứng ingestion hoàn tất.
- Universe tại t: chỉ mã có 60 phiên liên tiếp hợp lệ kết thúc t theo lịch phiên được xác nhận; giá hợp lệ, chính sách điều chỉnh thống nhất. Không lọc ngược bằng listing_status ngày hiện tại. Lưu danh sách ID và hash tại t trước khi nhìn outcome. Tối thiểu 50 mã; đây là ngưỡng nghiên cứu định trước, không bảo đảm đủ lực thống kê.
- Label: tại đúng ngày t+h trong calendar, return = close(t+h)/close(t)-1 theo cùng price basis đã được xác minh. Không chuyển ngày target tới lần có giá tiếp theo. Cửa sổ sự kiện chưa giải quyết hoặc thiếu giá làm outcome mã unavailable; không thay đổi membership đã khóa.
- B = số mã return > 0 / số mã có outcome hợp lệ; giá không đổi ở mẫu số nhưng không tính là tăng. Coverage outcome phải >=95% membership, nếu thấp hơn label tổng unavailable và ghi missing count. Class: B <0,45 là giảm lan tỏa; 0,45 <= B <=0,55 là cân bằng; B >0,55 là tăng lan tỏa. Các ngưỡng này khóa cho v1, thay đổi tạo target version mới trước holdout.
- Missing calendar, adjustment/event coverage chưa xác minh, thiếu dữ liệu đầu vào: unavailable với reason cụ thể. fetched_at chỉ là giới hạn biết dữ liệu tại ingestion; không mặc định đại diện publication time lịch sử. Backfill không được đưa vào feature trước lúc biết dữ liệu trong chế độ point-in-time.
- Dataset manifest phải có target version, calendar version/source, universe hash, provider, price basis, cutoff policy và research/synthetic flag. Không trộn fixture vào metric dữ liệu thật.

F0 hoàn tất kiểm kê ban đầu và target contract; **chưa đạt training readiness**. F1 tiếp theo: xây hàm tạo mẫu/label theo contract, fixture kiểm tra look-ahead, calendar gap, membership freeze, thiếu outcome và event chưa giải quyết; xuất exclusion report trên dữ liệu thật. Sau đó bổ sung calendar, corporate-action/adjustment evidence và availability history trước khi công bố baseline accuracy. Chưa tạo model, forecast API, bảng forecast hoặc thay UI ở F0.

### Nguồn phương pháp

- [scikit-learn TimeSeriesSplit](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html): chia theo thứ tự thời gian và gap; cần bổ sung purge theo nhãn của dự án.
- [scikit-learn calibration](https://github.com/scikit-learn/scikit-learn/blob/main/doc/modules/calibration.rst): reliability diagram, Brier/log loss và giới hạn diễn giải calibration.
- [Forecasting: Principles and Practice](https://otexts.com/fpp3/): đánh giá ngoài mẫu và dự báo có bất định.
## Implemented synthetic prototype — 2026-10-12

`forecastModel.js` implements a research-only three-class softmax model using basket mean 1/5/20-session returns. The existing frequency baseline supplies identical eligibility and fold manifests. Scaling is fit on training rows only. Fixed optimizer: 300 full-batch steps, learning rate 0.05, L2 0.01 excluding intercept; no test tuning. Output includes training hash, scaling/weights, per-session probabilities, Brier sum and log loss (floor 1e-15), and paired baseline deltas. Class order is declining/balanced/advancing, not the display order of the UI fixture.

Replay runs this prototype only for explicitly synthetic input after evidence audit. Missing features or fewer than two training classes make the fold unavailable. No calibration, market accuracy, live endpoint or UI integration is claimed. Next acceptance step: multi-regime synthetic replay with sufficient training origins for both horizons, followed by an explicit synthetic/unavailable UI contract.
## Presentation contract — 2026-10-12

`forecast_presentation_v1` maps exactly one historical replay prediction selected by horizon and `as_of`. Its class order is advancing/balanced/declining for presentation, while the model retains declining/balanced/advancing internally. An available value is always `status=research_preview`, `source=synthetic_replay`, `synthetic=true`, `research_only=true`, `live=false`, and `market_accuracy_verified=false`. It cannot represent a current forecast. Missing/ambiguous predictions, unavailable models, malformed probabilities, and non-synthetic reports return `status=unavailable` with a reason.

Mọi preview hiện công bố `breadth_target` với `version=breadth_forward_v1`, đơn vị `share_of_members_with_positive_return` và ba band cố định: giảm `<45%`, cân bằng `45–55%`, tăng `>55%`. `point_estimate_available=false`: xác suất lớp không phải tỷ lệ mã tăng dự báo. UI chỉ hiện ngưỡng của lớp có xác suất cao nhất, biểu diễn band đó trên đồ thị 0–100%, và làm tròn xác suất đến một chữ số thập phân. Màu mang ý nghĩa cố định theo lớp: tăng xanh, cân bằng vàng, giảm đỏ; không dùng màu để biểu thị mức xác suất hay lợi nhuận. Không suy diễn điểm giữa hoặc khoảng minh họa từ ba xác suất. Thiếu hoặc sai contract này phải hiển thị unavailable.

The multi-regime fixture now explicitly declares that it is not market evidence and regression checks that both horizons contain all three outcome classes. The full fixture evaluates both model horizons. The small two-origin artifact remains unavailable due to insufficient training classes, proving that the model does not relax its gate merely to populate the interface.
## Forecast validation disclosure — 2026-10-22

The product question is whether a user can distinguish a current-data display that is safe to monitor from a market forecast that has earned validation. The selected small-scope solution adds a fail-closed `validation` object to the existing `live-preview` payload and renders it only in the expanded **Evidence and evaluation** panel. It reuses the already fetched preview—one additional provider request, polling loop, cache or persisted client state is not introduced.

The panel separates five current-data checks (availability, integrity, coverage, input sessions and freshness) from the three market-evidence checks that remain pending (probability calibration, independent audit and provider validation). `market_accuracy_verified` stays false. It therefore communicates a shadow-monitoring boundary, never a buy/sell action, accuracy claim or return expectation. A malformed or missing disclosure makes the frontend reject the live payload rather than displaying an ambiguous state. This is presentation/provenance work only; it does not advance F3/F4, materialize snapshots or relax the forecast gate.

### Navigation cache — 2026-10-22

The Overview page unmounts when navigating away, so its local forecast state cannot be the cache boundary. A module-memory cache now retains only a contract-valid current-data preview for 60 seconds, keyed by normalized symbols and horizon. Returning during that interval restores the existing payload without a second provider bridge request; the UI labels this state. The cache is cleared on browser reload, is never persisted, does not cache errors and is bypassed by Retry. The 60-second bound is a responsiveness optimization, not a freshness or accuracy claim.

## Materialized research preview artifact — 2026-10-12

`generate:forecast-preview` runs the synthetic replay before serving requests and atomically writes a small `forecast_research_preview_artifact_v1` envelope. Canonical SHA-256 covers generated time, seven-day stale window, report/model/split metadata and both presentation contracts. The endpoint reads at most 256 KiB and validates the full contract. It returns artifact hash, generated time, age and fresh/stale classification; these describe artifact generation only, not market-data freshness. The evidence directory is intentionally not committed.
## Regime-aware stock ranking shadow evaluation — 2026-10-12

`forecast_regime_ranking_v1` compares `short_term_rule_v2` with a pre-specified overlay on identical synthetic test origins and forward outcomes. The overlay adds `(p_advancing - p_declining) × (momentum - stability) × 0.1` to the rule score. Forecast probabilities are frozen before each test origin; price history is capped at that origin. A regression test changes the last target outcome and proves selections remain unchanged.

Automatic coupling requires at least 20 comparable sessions and strictly positive deltas for both mean forward return and positive rate. The current seven-session fixture fails all practical evidence requirements: mean return is lower and positive rate is unchanged. Coupling remains disabled and these synthetic metrics are not market performance. Future policies must be pre-registered and evaluated with confidence intervals, turnover and concentration; test outcomes must not be used for tuning.
## Extended regime fixture and uncertainty — 2026-10-12

The ranking-only fixture contains 140 synthetic sessions with pre-registered 12-session advancing/balanced/declining blocks and relative winners in declining blocks. Its fixed test fold has 25 origins. Paired-session bootstrap uses 1,000 resamples with seed 20261012 and reports 95% percentile intervals. Diagnostics include consecutive top-k turnover, unique symbols, maximum selection share and HHI.

The return delta interval is positive, but the positive-rate delta interval includes zero and turnover is higher. The evidence gate therefore fails. Synthetic evaluation can only mark a policy eligible for later live-evidence validation; it can never directly set `coupling_enabled=true`. Next evaluation must use multiple disjoint walk-forward folds and include cost/slippage sensitivity.

## Multi-fold and transaction-cost gate — 2026-10-12

The extended evaluation uses three fixed 15-origin folds. Adjacent test folds are separated by a five-session purge, so the final five-session target of one fold ends before the next test origin. Hierarchical bootstrap first resamples folds and then sessions within each selected fold. This reflects fold-level variation more conservatively than treating all stock outcomes as independent, while remaining a synthetic diagnostic rather than a market-performance estimate.

Turnover resets at each fold. Initial formation is charged as 100% turnover; later turnover is one minus top-k overlap with the preceding origin in the same fold. Net-return sensitivity is reported at 0, 10, 25 and 50 one-way basis points, with 25 bps pre-registered as the primary gate. Passing requires positive lower 95% bounds for gross return, positive-rate and 25-bps net-return deltas, as well as a positive 25-bps net delta in every fold.

The fixed overlay does not pass. Across 45 origins / 225 stock outcomes, gross mean return is 0.396% for baseline and 0.398% for overlay; positive rates are 45.33% and 41.78%. At 25 bps, mean net delta is -0.011 percentage point with 95% interval [-0.340, +0.241] percentage point. One of three folds has negative net delta and positive-rate delta is -3.56 percentage points with interval [-10.67, +1.33]. Therefore `coupling_enabled` remains false and this overlay should not progress to live evidence. A different policy requires a new pre-registered hypothesis, not tuning on these held-out outcomes.

## Immutable research history and scoring — 2026-10-12

The preview artifact now materializes all seven test predictions for each 1/5-session horizon. Every entry preserves as-of, target/outcome availability, probabilities, predicted/actual class and the model, split and training hashes. Outcome scoring can change only the outcome fields and scores; regression verifies that it cannot change prediction identity. Pending outcomes remain unscored.

Primary proper scoring rules are multiclass Brier sum and log loss, both lower-is-better. Accuracy is secondary. Fixed confidence bins report sample count, mean confidence and observed accuracy, but bins below five samples are marked `insufficient_samples` and the entire report remains `calibrated=false`. Frequency and frozen-persistence baselines use the same fold/test samples; deltas follow model-minus-baseline, so negative favors the model.

The synthetic fixture is not evidence of market accuracy. Horizon 1 has Brier 0.806 and log loss 1.641 versus frequency baseline 0.703/1.165. Horizon 5 has Brier 1.239 and log loss 7.532 versus 0.755/1.214. Both are worse than frequency baseline. This result must be visible as an inconclusive/weak research state in the future UI, not presented as calibrated confidence.

## Append-only snapshot lifecycle — 2026-10-12

Migration 037 separates immutable prediction snapshots from append-only outcome events. A snapshot key hashes provider, model version, horizon and as-of. The payload hash covers probabilities plus split/training provenance. Retrying an identical identity is idempotent; a different payload for that identity is an integrity conflict. Database triggers reject update/delete on both tables.

Pending is the absence of an outcome event; measured is derived from the single integrity-bound event. Outcome time must be at or after 15:00 Asia/Ho_Chi_Minh on the declared target session. Brier/log loss are recomputed from the sealed probabilities and actual class, not accepted from callers. Retention is an immutable `expires_at` query boundary (default 180, bounded 30–730 days); expiration does not delete audit records. History ordering is as-of/id descending with a bounded opaque cursor and maximum 50 rows.

This is currently a persistence foundation only. The development artifact endpoint still reads its materialized file, and no scheduler writes the store. The next step is a development-only materializer that imports validated artifact predictions idempotently and resolves eligible outcomes transactionally; production remains disabled.

## Development artifact materializer — 2026-10-12

The materializer consumes only an artifact that has passed `readForecastPreviewArtifact`. Provider is now carried per prediction alongside model/split/training provenance. Prediction import and outcome evaluation are separate commands: the former creates sealed snapshots, while the latter looks up the exact generation key and appends an event only when `outcome_available_at <= now`. Evaluation never creates a missing snapshot.

The PostgreSQL development run imported 14 predictions (seven for each horizon) and measured 14 eligible outcomes. An immediate second run returned 14 existing snapshots and 14 existing outcomes with zero duplicates. This is synthetic lifecycle evidence only.

## Repository-backed research history — 2026-10-12

The development history endpoint now reads immutable PostgreSQL snapshots with a 1–50 limit and opaque as-of/id cursor. Every returned snapshot and outcome hash is checked before aggregation; one invalid row fails the response instead of silently dropping evidence. Proper scores and reliability bins are computed only from measured outcome events in the returned page. The UI merges unique cursor pages and recomputes loaded-row diagnostics.

Baseline metrics were not sealed into the first snapshot schema. For those rows, the endpoint returns `baseline_not_stored_with_snapshot` and the UI says evidence is accumulating. It does not join the mutable preview artifact to historical rows. Payload v2 below seals baseline for new predictions while existing immutable rows remain unchanged. Production access remains disabled.

## Snapshot payload v2 — sealed contemporaneous baseline — 2026-10-12

New snapshot inputs include the fold's frequency and frozen-persistence probability vectors, their versions and the fit cutoff. Validation requires complete three-class probability vectors and a fit cutoff before as-of. These fields are covered by the snapshot SHA-256. When an outcome is appended, repository history computes baseline Brier/log loss from those sealed probabilities and the same actual class used for the model score.

Comparison is all-or-nothing for measured rows in a returned cohort/page. If any measured row is v1, baseline status remains unavailable; the service does not compare only the convenient subset. The 14 existing development identities remain v1 and materialization reports `legacy_existing=14`, with no update or duplicate. PostgreSQL rollback smoke created a v2 snapshot/outcome, confirmed the baseline was sealed and the immutable trigger held, then retained no fixture.
### Cohort aggregate contract

The development-only `research-cohorts` contract is computed by a repository query independent of history pagination. It supports model, horizon and inclusive as-of date filters, then returns provider/model/horizon cohorts plus calendar-month cohorts. Every response reports v1/v2 prediction and measured coverage. Baseline scoring uses only measured v2 snapshots because those rows seal contemporaneous baselines; it remains `insufficient_samples` until the configured minimum (20 by default) is met. The query is bounded at 5,000 rows and fails closed on integrity errors. Synthetic output cannot be interpreted as market accuracy or enabled in production.

### Rolling development issuance

Rolling inference is separate from replay evaluation. An explicit fixture `as_of` and post-close cutoff are required. The origin feature vector may use observations from that completed session, while training labels must have `label_available_at <= cutoff` and target sessions strictly before the origin. Both future target sessions must be identifiable from the issuance calendar; otherwise the entire issuance fails before writing. Frequency and frozen-persistence baselines use the same eligible training set and are sealed into payload v2. Issuance creates pending snapshots only; outcome evaluation remains a later command. A repeated provider/model/horizon/as-of identity is idempotent, and the runner neither selects the next date automatically nor schedules production work. Same-day EOD fit cutoff is valid, but any cutoff after the end of `as_of` is rejected.
