# Trạng thái và bàn giao dự án

Cập nhật: 2026-10-19. Lịch sử checkpoint chi tiết trước lần rút gọn này nằm tại [PROJECT_STATUS_2026-10-19.md](archive/PROJECT_STATUS_2026-10-19.md). Tài liệu này chỉ giữ hiện trạng có thể dùng để tiếp tục công việc.

## Hiện trạng chạy local

- UI Vite dev: `http://localhost:4173/`; backend: `http://localhost:5000`.
- `GET /api/ready` đã xác nhận database và worker local khả dụng. Đây là bằng chứng development, không phải production readiness.
- Cookie auth dùng same-origin `/api` qua proxy frontend. Không lưu hoặc ghi secret trong tài liệu.

## Các phần đã hoàn tất gần đây

### Đề xuất: đánh giá và hiệu chỉnh

- Outcome chỉ được tính vào report/calibration khi qua snapshot integrity, evaluation evidence, đủ phiên EOD, price provenance và return check.
- Runtime hiện có 0 outcome hợp lệ cho cohort `short_term_rule_v2`/20 phiên; 65 pending và 5 bị loại vì integrity. Không có cơ sở để hiệu chỉnh trọng số.
- Outcome của `short_term_rule_v2` không còn đổi trọng số `personalized_rule_v1`. API trả source/target/application status; mismatch giữ toàn bộ hệ số `1.00`. Xem [RECOMMENDATION_CALIBRATION_DESIGN.md](RECOMMENDATION_CALIBRATION_DESIGN.md).
- Kiểm chứng gần nhất: backend controller 12/12, frontend unit/contract 100/100, Playwright Recommendation 3/3, build và bundle integrity đạt.

### Danh mục: mục tiêu và nhật ký quyết định

- Mục tiêu phân bổ v1 lưu tỷ trọng theo mã, tổng tối đa 100%, trả deviation từ snapshot vị thế; không tạo lệnh hoặc notification.
- Nhật ký quyết định v1 lưu luận điểm, ngày rà soát, điều kiện vô hiệu và evidence snapshot server-verified. Nó không có return, giá mục tiêu hay kết luận đúng/sai. Xem [DECISION_JOURNAL_DESIGN.md](DECISION_JOURNAL_DESIGN.md).
- Close/Delete nhật ký có dialog xác nhận, nhận focus và hủy được bằng Escape trước mutation. Tab Danh mục có năm cột desktop, ba cột màn hình trung bình, hai cột mobile.
- Kiểm chứng gần nhất: frontend unit/contract 100/100; build/bundle integrity đạt; targeted Playwright Danh mục và Recommendation đạt. Không coi test mock là bằng chứng mutation trên dữ liệu người dùng thật.

## Giới hạn giữ nguyên

- Recommendation, forecast và dữ liệu provider vẫn research/internal prototype cho đến khi có evidence, quyền nguồn và validation ngoài mẫu phù hợp.
- Forecast live, company-data scope mở rộng, so sánh mã/ngành, cảnh báo giá/dữ liệu và khôi phục mật khẩu chưa được mở: chúng lần lượt cần evidence dữ liệu, scheduler/kênh gửi hoặc email delivery provider.
- Chưa kiểm chứng deploy production, worker/scheduler production, backup/restore hoặc browser flow bằng tài khoản development thật trong checkpoint hiện tại.

## Điểm tiếp tục

1. Chọn hạng mục chỉ triển khai được khi dependency được chốt: password recovery sau email delivery, alerts sau scheduler/kênh gửi, hoặc comparison sau coverage/license.
2. Duy trì gate Đề xuất: không hiệu chỉnh hay diễn giải hiệu quả khi outcome chưa hợp lệ.
3. Khi thay đổi tính năng, cập nhật tài liệu thiết kế chịu trách nhiệm, file này và [ROADMAP.md](ROADMAP.md); đưa record cũ vào archive thay vì kéo dài tài liệu hiện hành.
