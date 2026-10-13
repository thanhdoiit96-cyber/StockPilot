# Hồ sơ và dữ liệu nền tảng doanh nghiệp

## Mục tiêu sản phẩm

Trang Chi tiết mã phải giúp người dùng đi từ biến động giá sang hiểu doanh nghiệp mà không biến thành một bảng dữ liệu dày đặc. Cấu trúc được mở theo nhu cầu: Hồ sơ trước, sau đó Cổ đông, Vốn và cổ tức, cuối cùng mới đến Tài chính. Dữ liệu thiếu phải được nói rõ; hệ thống không tự suy diễn hoặc trộn fixture vào dữ liệu production.

## Kiến trúc thông tin và UI

Giai đoạn 1 đã triển khai `Hồ sơ doanh nghiệp` ngay sau hero của trang Chi tiết mã. Card dùng cùng token panel/chip/button của ứng dụng, gồm danh tính, sàn/ngành/ngày niêm yết, bốn chỉ số tóm tắt, giới thiệu, liên hệ và provenance. Điều hướng section hỗ trợ cuộn đến card; mobile chuyển metric và nội dung về một cột.

Giai đoạn 2 đã triển khai `Cổ đông và lãnh đạo` thành endpoint/panel độc lập. Hai danh sách đặt cạnh nhau trên desktop và xếp dọc trên mobile; mỗi bản ghi chỉ trình bày tên, vai trò, tỷ lệ sở hữu, số cổ phiếu và ngày công bố nếu nguồn có cung cấp. Trạng thái unavailable không được biến thành danh sách giả hoặc số 0.

Các giai đoạn kế tiếp:

1. `Cổ đông`: đã có snapshot cổ đông lớn và ban lãnh đạo; thay đổi sở hữu theo thời gian còn chờ nguồn ổn định.
2. `Vốn & cổ tức`: bước kế tiếp; lịch sử vốn, cổ tức/corporate action và tái sử dụng event ledger thay vì tạo semantics thứ hai.
3. `Tài chính`: báo cáo năm/quý, biểu đồ tăng trưởng và biên lợi nhuận; chỉ tải khi người dùng mở tab.
4. `Tin tức & sự kiện`: timeline có nguồn, tách sự kiện doanh nghiệp khỏi nhận định.

Khi số section tăng, nội dung doanh nghiệp sẽ dùng tab con trong trang Chi tiết mã. Tab giữ lựa chọn trong URL và chỉ tải panel đang mở để tránh tăng thời gian tải đầu trang.

## Contract và hiệu năng

`GET /api/stocks/:id/company-profile` trả contract `company_profile_v1`. Backend hợp nhất bản ghi local với `Reference().company(symbol).info`, cache kết quả provider 360 phút và cache fallback 15 phút. Khi provider timeout/lỗi, endpoint vẫn trả hồ sơ local với `status=partial`, limitation và provenance; không biến lỗi upstream thành trang trắng.

`GET /api/stocks/:id/company-people` trả `company_people_v1` từ hai capability `shareholders` và `officers`. Hai capability có thể thành công độc lập; response vì vậy có `available`, `partial` hoặc `unavailable`, cache 360 phút khi có dữ liệu và 15 phút khi provider không khả dụng.

Mọi nhóm dữ liệu mở rộng phải có endpoint/cache riêng, ngày quan sát và license status. Không gọi đồng thời toàn bộ profile/shareholders/financials khi mở trang. Production chỉ công bố trường được quyền phân phối; UI nhỏ gọn nhưng provenance luôn truy cập được.

## Tiêu chí nghiệm thu tiếp theo

- Xác nhận response thực tế của provider và mapping bằng fixture contract trước khi mở Cổ đông.
- Hiển thị ngày dữ liệu cho từng bảng; phân biệt “không có dữ liệu” với số 0.
- Có skeleton/error/retry, bàn phím, mobile và dark/light cho từng panel.
- Đo payload/thời gian endpoint và không làm chậm chart/quote quan trọng của trang.
- Kiểm tra điều khoản phân phối trước khi bật trên production.
