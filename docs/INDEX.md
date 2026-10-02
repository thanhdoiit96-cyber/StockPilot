# Chỉ mục tài liệu

## Quy trình chung

Người mới bắt đầu từ [README](../README.md), chạy ứng dụng theo [QUICK_START](../QUICK_START.md). Khi tiếp tục phát triển, đọc [AGENTS](../AGENTS.md) → [PROJECT_STATUS](PROJECT_STATUS.md) → [ROADMAP](ROADMAP.md), thực hiện và kiểm chứng, rồi cập nhật đúng tài liệu chịu trách nhiệm.

| Nhu cầu | Tài liệu |
| --- | --- |
| Tổng quan và vai trò tài liệu | [README](../README.md) |
| Cài đặt, cấu hình, chạy demo, xử lý lỗi | [QUICK_START](../QUICK_START.md) |
| Bảng lệnh build/run PowerShell | [RUN_COMMANDS](../RUN_COMMANDS.md) |
| Quy tắc làm việc và cập nhật tài liệu | [AGENTS](../AGENTS.md) |
| Hiện trạng, bằng chứng và bàn giao | [PROJECT_STATUS](PROJECT_STATUS.md) |
| Ưu tiên, mốc phát triển và tiêu chí nghiệm thu | [ROADMAP](ROADMAP.md) |
| Hợp đồng, adapter và ingestion dữ liệu thị trường | [MARKET_DATA_CONTRACT](MARKET_DATA_CONTRACT.md) |
| Cấu trúc backend, API và cache hiện có | [Backend README](../backend/README.md) |
| Cấu trúc và hành vi frontend hiện có | [Frontend README](../frontend/README.md) |
| Nguồn gốc khôi phục source UI | [Source recovery](../frontend/recovery/README.md) |

## Thiết kế tham khảo

Các tài liệu dưới đây lưu thiết kế mục tiêu hoặc ví dụ đề xuất. Nội dung chưa triển khai không phải cam kết đã hoàn thành; không dùng các đoạn cấu hình/SQL mẫu thay cho hướng dẫn chạy hiện hành.

| Tài liệu | Phạm vi |
| --- | --- |
| [ARCHITECTURE](ARCHITECTURE.md) | Kiến trúc mục tiêu |
| [PROJECT_STRUCTURE](PROJECT_STRUCTURE.md) | Cấu trúc thư mục dự kiến |
| [MARKET_BREADTH_DESIGN](MARKET_BREADTH_DESIGN.md) | Org chart và cấu trúc thông tin Độ rộng thị trường |
| [MARKET_PAGES_SPLIT_DESIGN](MARKET_PAGES_SPLIT_DESIGN.md) | Thiết kế tách page Tổng quan và Bảng giá |
| [UI_UX_AUDIT](UI_UX_AUDIT.md) | Rà soát từng page, thay đổi đã thực hiện và kế hoạch UI/UX-hiệu năng |
| [TECH_STACK](TECH_STACK.md) | Lựa chọn công nghệ dự kiến; dependencies thực tế ở package.json/lockfile |
| [API_DESIGN](API_DESIGN.md) | Hợp đồng API mở rộng dự kiến; API hiện có ở Backend README |
| [DATABASE_SCHEMA](DATABASE_SCHEMA.md) | Schema mục tiêu; schema chạy thực tế do migrations quản lý |
| [CACHING_STRATEGY](CACHING_STRATEGY.md) | Chiến lược và ví dụ cache; hành vi hiện có ở Backend README |
| [DATA_FLOW](DATA_FLOW.md) | Luồng dữ liệu mục tiêu |
| [FLOW_DIAGRAMS](FLOW_DIAGRAMS.md) | Luồng nghiệp vụ dự kiến |
| [AI_STRATEGY](AI_STRATEGY.md) | Phân tích/AI dự kiến |
| [DEPLOYMENT](DEPLOYMENT.md) | Triển khai tương lai; chạy Compose demo theo QUICK_START |

## Mã và cấu hình làm căn cứ

- [Backend package.json](../backend/package.json), [frontend package.json](../frontend/package.json): scripts và dependencies.
- [docker-compose.yml](../docker-compose.yml): các dịch vụ và biến được truyền vào container.
- [.env.example](../.env.example), [backend/.env.example](../backend/.env.example): template còn chứa một số biến dự kiến; xem QUICK_START và Backend README để biết biến đang dùng.
- [Migrations](../backend/src/migrations), [seeders](../backend/src/seeders): schema và dữ liệu demo.

Quy tắc duy trì tài liệu nằm trong AGENTS. Chỉ mục này điều hướng tới nguồn nội dung, không giữ bản sao tiến độ hoặc hướng dẫn chạy.
