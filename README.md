# Phân tích thị trường chứng khoán Việt Nam

Ứng dụng web phân tích dữ liệu thị trường Việt Nam, theo dõi danh mục cá nhân và hỗ trợ nghiên cứu có kiểm soát nguồn dữ liệu. Hệ thống dùng React/Vite → Express → PostgreSQL, kèm Python Vnstock worker cho dữ liệu thị trường.

Bản hiện tại có tài khoản và quản lý phiên, bảng giá, watchlist, sổ giao dịch và dòng tiền danh mục, dữ liệu doanh nghiệp, đề xuất có vòng đời đánh giá và forecast ở phạm vi research. Dữ liệu live, company scope và forecast chỉ được mở khi vượt qua các gate về nguồn, độ mới và bằng chứng; xem [trạng thái](docs/PROJECT_STATUS.md), [rà soát hiện hành](docs/PROJECT_AUDIT.md) và [lộ trình](docs/ROADMAP.md).

## Bắt đầu

- **Chạy ứng dụng:** [QUICK_START.md](QUICK_START.md), bắt đầu tại “Khởi động lại local đã cấu hình”. Bản local chạy bằng ba tiến trình: Python worker (`py`), backend và frontend; Compose đóng gói bốn runtime tương ứng (PostgreSQL, worker, backend, frontend Nginx). Hướng dẫn kiểm tra package trước và chỉ cài khi thiếu; không tạo `.venv` chỉ để chạy lại một máy đã cấu hình. Khi chạy qua agent/sandbox, xem mục Forecast LIVE: endpoint này cần backend được phép spawn Python bridge riêng.
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
