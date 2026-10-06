# Quy trình làm việc trong dự án

## Bắt đầu công việc

1. Đọc [trạng thái và bàn giao](docs/PROJECT_STATUS.md), rồi [lộ trình](docs/ROADMAP.md).
2. Đối chiếu mã nguồn, cấu hình và thay đổi hiện có trước khi sửa; giữ nguyên công việc không thuộc phạm vi.
3. Thực hiện yêu cầu mới nhất của người dùng. Khi được giao tiếp tục lộ trình, chọn việc tiếp theo đã ghi trong PROJECT_STATUS.

Người dùng yêu cầu chủ động xây dựng và thực thi lộ trình hoàn thiện dự án, luôn lưu tiến độ để phiên sau tiếp nối.

## Cổng phân tích sản phẩm trước khi triển khai

Mọi yêu cầu chức năng hoặc UI/UX mới phải được xử lý như một bài toán sản phẩm, không chuyển thẳng mô tả ban đầu thành mã nguồn. Trước khi sửa, tác nhân phải:

1. **Xác định yêu cầu:** nêu người dùng mục tiêu, vấn đề cần giải quyết, luồng chính, dữ liệu cần có, ràng buộc, trường hợp biên và tiêu chí thành công. Phân biệt rõ điều người dùng đã chốt với giả định cần kiểm chứng.
2. **Đánh giá chuyên gia:** kiểm tra tính đúng đắn nghiệp vụ, quyền riêng tư/bảo mật, khả năng truy cập, tính nhất quán với sản phẩm hiện tại và rủi ro tạo số liệu hoặc trạng thái gây hiểu nhầm.
3. **So sánh phương án:** cân nhắc tối thiểu phương án đơn giản nhất đáp ứng nhu cầu và phương án mở rộng; đánh giá giá trị người dùng, độ phức tạp, phụ thuộc dữ liệu/backend, khả năng bảo trì và chi phí hiệu năng. Chọn phương án tối ưu tổng thể, không chỉ phương án code nhanh nhất.
4. **Thiết kế trải nghiệm:** xác định phân cấp thông tin, vị trí hành động, trạng thái loading/empty/error/success, desktop/mobile, bàn phím/screen reader và cách giảm thao tác hoặc tải nhận thức. UI phải gọn, rõ, chuyên nghiệp và dùng component/design pattern sẵn có khi phù hợp.
5. **Đặt ngân sách hiệu năng:** mô tả request, payload, render, cache/persistence và các điểm có thể đo. Không thêm pagination, virtualization, polling hoặc cache chỉ theo cảm tính; đo trước và xác minh lại sau với mức kiểm thử tương xứng.
6. **Chốt phương án và triển khai:** ghi quyết định, trade-off, tiêu chí nghiệm thu và phần chưa làm vào tài liệu chịu trách nhiệm; sau đó mới code, kiểm thử và đo. Nếu thiếu dữ liệu hoặc phụ thuộc khiến kết quả không thể đúng, ưu tiên trạng thái trung thực hoặc hoãn phần phụ thuộc thay vì tạo dữ liệu giả.

Mức độ tài liệu phải tương xứng với rủi ro: thay đổi nhỏ có thể ghi ngắn trong PROJECT_STATUS hoặc ROADMAP; tính năng lớn, thay đổi schema/API, nghiệp vụ tài chính, xác thực hoặc luồng đa màn hình cần tài liệu thiết kế riêng và liên kết từ ROADMAP. Khi người dùng yêu cầu chủ động thực hiện, tác nhân tự đưa ra giả định hợp lý và chọn phương án sau phân tích; chỉ dừng hỏi khi thiếu quyết định có thể làm thay đổi đáng kể phạm vi hoặc gây tác động khó hoàn tác.

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
