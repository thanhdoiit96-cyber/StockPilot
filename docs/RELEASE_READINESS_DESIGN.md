# Sẵn sàng phát hành và khôi phục — thiết kế vận hành

> Trạng thái: đề xuất dựa trên runtime và tài liệu hiện có, chưa phải hạ tầng đã triển khai. Hướng dẫn triển khai Vercel hiện có ở [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md); tài liệu này chỉ chốt các quyết định và bằng chứng phải có trước khi gọi một môi trường là production-ready.

## Mục tiêu, người dùng và ranh giới

Người vận hành cần phát hành backend, frontend, PostgreSQL và worker EOD theo cách có thể kiểm chứng, quan sát và phục hồi mà không lộ secret hoặc đánh đổi tính đúng đắn dữ liệu tài chính. Người dùng cuối chỉ được thấy dữ liệu có `as_of`/provenance trung thực; họ không được nhận một trạng thái “online” nếu job EOD hay nguồn dữ liệu đang thiếu.

Phạm vi gồm release/rollback, backup/restore, ownership scheduler/worker và observability. Không chọn cloud vendor, không triển khai hạ tầng, không thêm endpoint hay tự tạo backup trong workspace. `node-cron` trong backend hiện chỉ là scheduler process-local, nên không phải bằng chứng job production.

## Hiện trạng và ràng buộc đã xác minh

- Local `GET /api/ready` kiểm tra database và worker, nhưng không chứng minh môi trường production, alerting hay khôi phục dữ liệu.
- Workstation checkpoint 2026-10-21 không có Docker, `pg_dump` hoặc `psql`; do đó chưa có bằng chứng Compose, backup logical hay restore drill.
- Backend/frontend có release gate mã nguồn; kết quả test/build không thay thế migration, restore hoặc kiểm chứng provider thật.
- EOD phiên 2026-10-21 mới phủ 357/549 mã (65,0%). Release không được mở các tính năng phụ thuộc coverage khi gate của chính chúng chưa đạt.

## Phương án và quyết định đề xuất

| Hạng mục | Phương án đơn giản | Phương án mở rộng | Quyết định trước khi có hạ tầng |
| --- | --- | --- | --- |
| PostgreSQL backup | Dùng backup/PITR do PostgreSQL managed provider vận hành; kiểm tra retention và restore độc lập | Thêm logical backup mã hóa, kho lưu trữ tách biệt và kiểm tra tính toàn vẹn | Chọn phương án đơn giản nếu provider đáp ứng RPO/RTO đã chốt; chưa chọn provider nên chưa coi là có backup |
| Phát hành | Backend/frontend deploy riêng, migration chạy một lần ngoài build | Staging độc lập, canary và promotion tự động | Dùng release manual có checklist trước; staging/canary chỉ thêm khi môi trường và volume biện minh |
| Worker EOD | Worker luôn chạy độc lập, một owner/lock, retry bounded và ledger run | Hàng đợi/orchestrator đa worker | Không chạy scheduler trong serverless request process; chỉ bật sau khi có owner, lock và evidence từng run |
| Quan sát | Health/readiness, log có cấu trúc, dashboard và alert theo SLO tối thiểu | Tracing phân tán và SLO/error budget đầy đủ | Không coi cấu hình `SENTRY_DSN` hay endpoint metrics là monitoring cho tới khi có event/alert test |

Phương án đơn giản giảm vận hành tự quản, nhưng chỉ hợp lệ khi provider cho phép restore tới mục tiêu RPO/RTO. Backup không thể được xác nhận bằng cấu hình hoặc bản sao dump chưa từng restore.

## Luồng release và rollback

1. Chỉ release commit đã qua release gate tương ứng; ghi commit, migration, người vận hành và thời gian vào release record ngoài secret.
2. Chạy migration đúng một lần từ job/máy quản trị có quyền tối thiểu, ngoài Vercel build. Migration phá vỡ tương thích cần kế hoạch expand/migrate/contract riêng.
3. Deploy backend rồi frontend qua same-origin `/api`; kiểm tra `/api/health`, `/api/ready` và một API đọc database. Không log cookie, URL database hay API key.
4. Xác minh worker độc lập: owner, version, timezone, lịch chạy, lock, run ledger, coverage EOD và trạng thái failure. Một HTTP 200 từ web không chứng minh worker đang chạy.
5. Khi rollback code, giữ migration/data tương thích. Chỉ chạy migration down đã được đánh giá riêng và sau khi có restore point; rollback release không được tự ý xóa dữ liệu.

## Backup, restore và mục tiêu nghiệm thu

Trước production, owner phải chốt provider PostgreSQL, region, retention, RPO, RTO, người được quyền restore và nơi lưu release record. Restore drill phải tạo một database/môi trường cô lập, restore snapshot xác định, chạy migration-compatible read checks, đối chiếu số migration và một tập dữ liệu không nhạy cảm, rồi hủy môi trường drill theo retention đã duyệt. Không restore đè production để thử nghiệm.

Tiêu chí tối thiểu:

- Có backup/PITR thành công và restore point định danh được; quyền restore tách khỏi runtime role.
- Có restore drill có timestamp, owner, thời lượng, kết quả read check và lỗi đã xử lý; không ghi secret hoặc dữ liệu người dùng vào tài liệu/repository.
- Có quy tắc retention, mã hóa, region và quy trình rotate/revoke credential khi sự cố.
- Có quyết định rõ về dữ liệu provider/evidence filesystem: vị trí lưu bền vững, retention và cách khôi phục; filesystem ephemeral của serverless không là kho evidence.

## Observability, sự cố và ngân sách hiệu năng

Mỗi dependency chỉ được readiness kiểm tra có timeout; readiness không nằm trên request path dữ liệu. Dashboard/alert tối thiểu theo dõi availability API, lỗi/độ trễ database, worker heartbeat/run, thời lượng và coverage EOD, cùng deployment/migration failure. Alert coverage EOD phải nêu session, covered/missing và provenance, không tự coi ngày nghỉ hoặc response partial là thành công.

Mỗi release ghi latency/payload baseline liên quan khi có thay đổi request/render; không thêm polling, cache hoặc worker scale chỉ vì chuẩn bị production. Incident record cần thời điểm phát hiện, phạm vi, dữ liệu bị ảnh hưởng, hành động giảm thiểu, restore/rollback và kết quả xác minh.

## Điều kiện mở M6

M6 chỉ chuyển sang triển khai khi có authority cho môi trường đích và các input sau: domain/origin, PostgreSQL provider/region/plan, RPO/RTO/retention, secret manager và owner, runtime worker/orchestrator, kênh alert/on-call, storage evidence, và quyền/provider data cần thiết. Sau đó phải có bằng chứng deploy, migration, smoke browser có tài khoản development, worker EOD production, backup/restore drill và alert drill. Thiếu một mục thì trạng thái phải là chưa production-ready, không thay bằng dữ liệu hoặc monitoring giả.
