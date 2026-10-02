# Phân tích thị trường chứng khoán Việt Nam

Ứng dụng web hướng tới phân tích dữ liệu thị trường, theo dõi danh mục cá nhân và hỗ trợ phân tích bằng AI. Bản hiện tại là demo React/Vite → Express → PostgreSQL, có dashboard, danh sách và chi tiết cổ phiếu từ dữ liệu seed.

Danh mục và biểu đồ tổng quan dùng dữ liệu minh họa; AI, nguồn giá trực tiếp và tài khoản người dùng chưa được triển khai. Xem [trạng thái và bằng chứng kiểm tra](docs/PROJECT_STATUS.md) để biết mức độ hoàn thiện.

## Bắt đầu

- **Chạy ứng dụng:** [QUICK_START.md](QUICK_START.md), gồm chạy thủ công, Docker Compose và xử lý lỗi.
- **Bảng lệnh build/run:** [RUN_COMMANDS.md](RUN_COMMANDS.md), gồm các lệnh PowerShell để chạy worker, backend, frontend và kiểm thử.
- **Tiếp tục phát triển:** đọc [AGENTS.md](AGENTS.md), [tiến độ và bàn giao](docs/PROJECT_STATUS.md), rồi [lộ trình](docs/ROADMAP.md).
- **Tra cứu kỹ thuật:** [chỉ mục tài liệu](docs/INDEX.md), [backend](backend/README.md), [frontend](frontend/README.md).

## Vai trò tài liệu

| Tài liệu | Nội dung chịu trách nhiệm |
| --- | --- |
| README.md | Giới thiệu sản phẩm và điểm vào quy trình |
| QUICK_START.md | Cài đặt, cấu hình, chạy và kiểm tra bản demo |
| RUN_COMMANDS.md | Bảng lệnh PowerShell rút gọn; cấu hình chuẩn vẫn thuộc QUICK_START |
| AGENTS.md | Quy tắc thực hiện công việc, kiểm chứng và cập nhật tài liệu |
| docs/PROJECT_STATUS.md | Hiện trạng, kết quả kiểm tra, hạn chế và điểm tiếp tục |
| docs/ROADMAP.md | Mốc phát triển, ưu tiên, phụ thuộc và tiêu chí nghiệm thu |
| docs/INDEX.md | Điều hướng tới tài liệu theo vai trò |
| backend/README.md, frontend/README.md | Cấu trúc và hành vi kỹ thuật đang có |
| Tài liệu thiết kế trong docs/ | Đề xuất kiến trúc và tính năng tương lai, có nhãn phạm vi |

Chỉ lưu tiến độ chi tiết trong PROJECT_STATUS và trạng thái các mốc trong ROADMAP. Hướng dẫn khởi chạy tập trung ở QUICK_START; các tài liệu khác liên kết tới đó.
