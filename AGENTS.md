# Quy trình làm việc trong dự án

## Bắt đầu công việc

1. Đọc [trạng thái và bàn giao](docs/PROJECT_STATUS.md), rồi [lộ trình](docs/ROADMAP.md).
2. Đối chiếu mã nguồn, cấu hình và thay đổi hiện có trước khi sửa; giữ nguyên công việc không thuộc phạm vi.
3. Thực hiện yêu cầu mới nhất của người dùng. Khi được giao tiếp tục lộ trình, chọn việc tiếp theo đã ghi trong PROJECT_STATUS.

Người dùng yêu cầu chủ động xây dựng và thực thi lộ trình hoàn thiện dự án, luôn lưu tiến độ để phiên sau tiếp nối.

## Phân công vai trò tài liệu

- [README](README.md): giới thiệu và điểm vào; không chép checklist tiến độ.
- [QUICK_START](QUICK_START.md): nguồn hướng dẫn chạy demo duy nhất.
- [PROJECT_STATUS](docs/PROJECT_STATUS.md): hiện trạng, bằng chứng kiểm tra, hạn chế, điểm tiếp tục.
- [ROADMAP](docs/ROADMAP.md): phạm vi, ưu tiên, phụ thuộc, trạng thái mốc và tiêu chí nghiệm thu.
- [INDEX](docs/INDEX.md): chỉ mục; không sao chép hướng dẫn hoặc báo cáo tiến độ.
- README của từng dịch vụ: hành vi và cấu trúc mã đang triển khai.
- Tài liệu thiết kế: ghi rõ phần đề xuất; không xem ví dụ thiết kế là API/schema đã tồn tại.

## Hoàn tất mỗi phần việc

1. Kiểm tra phù hợp với thay đổi. Sửa hành vi thì chạy kiểm thử liên quan; sửa frontend thì build. Sửa riêng tài liệu thì kiểm tra nội dung, đường dẫn và liên kết, không cần chạy lại test ứng dụng.
2. Cập nhật PROJECT_STATUS: ngày, việc đã làm, kiểm chứng, hạn chế và điểm tiếp tục cụ thể.
3. Cập nhật ROADMAP nếu phạm vi, thứ tự, phụ thuộc hoặc trạng thái mốc thay đổi. Chỉ đánh dấu xong khi đủ tiêu chí.
4. Sửa tài liệu chịu trách nhiệm trực tiếp: cách chạy → QUICK_START; hành vi dịch vụ → README dịch vụ; API/schema/kiến trúc → tài liệu chuyên môn tương ứng. Thay đổi schema cần migration.
5. Khi gộp/xóa tài liệu, chuyển nội dung còn giá trị về đúng nơi, sửa liên kết và cập nhật INDEX. Không tạo báo cáo hoàn thành/checklist trùng vai trò.

## Bằng chứng và an toàn dữ liệu

- Phân biệt mã đã có, dữ liệu demo, test dùng mock và kiểm chứng hệ thống thực tế. Không suy diễn test/build thành xác nhận production.
- Nếu tài liệu mâu thuẫn mã nguồn, xác minh và sửa đúng tài liệu thay vì chỉ thêm cảnh báo lên nội dung lỗi thời.
- Ghi rõ phần chưa chạy/chưa đạt; không ghi phần trăm hoàn thành hoặc hiệu năng khi chưa đo.
- Không lưu bí mật từ .env vào tài liệu; không tự xóa dữ liệu database để giải quyết lỗi setup.

<!-- vnai-bootstrap | auto-generated -->
# Vnstock Vibe Onboarding
Please visit https://vnstocks.com/onboard/agent-guide to learn how to setup AI Agents for vnstock.
