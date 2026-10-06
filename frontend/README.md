# Frontend: tham chiếu mã hiện tại

Ứng dụng React 18/Vite, viết bằng JavaScript và CSS. Cách chạy và build nằm ở [QUICK_START](../QUICK_START.md); kết quả kiểm tra và công việc tiếp theo nằm ở [PROJECT_STATUS](../docs/PROJECT_STATUS.md).

Hồ sơ có xác nhận bỏ bản nháp trong dialog khi đóng/đăng xuất và cảnh báo trình duyệt khi tải lại trong lúc chưa lưu. Bản nháp chỉ ở bộ nhớ; không được phục hồi sau khi xác nhận rời trang. Escape hủy xác nhận và trả focus về trường tên.

Dialog tài khoản tách thành tab Hồ sơ/Bảo mật. Phím mũi tên và Home/End chuyển tab; bản nháp được giữ khi chuyển tab, mật khẩu nháp bị xóa khi đóng. Cần lưu/hoàn tác tên trước khi đổi mật khẩu.

Bảng Vị thế danh mục hỗ trợ tìm theo mã/tên doanh nghiệp không phân biệt dấu tiếng Việt, kết hợp nhóm Đang mở/Đã đóng và giữ từ khóa khi chuyển nhóm. Tìm kiếm chỉ lọc bảng, không thay đổi tổng giá trị hoặc phân bổ danh mục; từ khóa không lưu vào storage.

Watchlist có tìm kiếm mã/tên không phân biệt dấu, bộ đếm kết quả và trạng thái rỗng. Mở Chi tiết và Xóa là hai nút riêng; xóa cần xác nhận inline để tránh thao tác nhầm. Từ khóa Watchlist chỉ tồn tại trong bộ nhớ của trang.

Mutation Watchlist có trạng thái loading và khóa gửi lặp. Thông báo thành công/lỗi nằm trong panel; lỗi thêm giữ mã đang nhập, lỗi xóa giữ xác nhận và dòng hiện tại để thử lại. `scripts/verify-live-watchlist.mjs` kiểm tra thêm/xóa và persistence qua reload với cookie session development thật; script tạo và giữ một account cô lập, không ghi credential.

Bảng giá, bảng cổ phiếu Tổng quan và Chi tiết mã có nút “Theo dõi” cạnh thao tác thêm vào danh mục. Nút dùng trạng thái Đang thêm/Đã theo dõi/Thử lại, đồng bộ Watchlist và nhóm mã ghim sau khi lưu; mã đã theo dõi không gửi POST lặp.

Danh sách phiên hỗ trợ đăng xuất từng phiên với xác nhận ngay trên thẻ; giữ phiên hiện tại và các phiên chưa chọn. API từ chối phiên không còn khả dụng thì hiển thị lỗi và cho làm mới.

Tên phiên do người dùng tự đặt (tối đa 80 ký tự) giúp nhận diện phiên trước khi thu hồi; không phải thông tin thiết bị được hệ thống xác minh. Form hỗ trợ lưu/hủy/xóa nhãn và cảnh báo bản nháp.

“Xem thêm phiên” tải từng trang 50 phiên khác theo thời điểm đăng nhập, gộp theo id để không lặp phiên hiện tại. Lỗi tải thêm giữ nguyên danh sách và cho thử lại; “Làm mới phiên” quay về trang đầu mới nhất. Thu hồi toàn bộ phiên khác áp dụng cả những phiên chưa tải.

| Tệp | Vai trò |
| --- | --- |
| [src/components/AccountSessions.jsx](src/components/AccountSessions.jsx) | Danh sách phiên trong Bảo mật, tải khi tab active, trạng thái lỗi/thử lại, xác nhận thu hồi phiên khác và giữ phiên hiện tại |
| [scripts/verify-live-sessions.mjs](scripts/verify-live-sessions.mjs) | Live browser/API/database smoke qua 4173, tạo và giữ hai account development, kiểm chứng cách ly tài khoản và thu hồi refresh |
| [src/components/PasswordChangeForm.jsx](src/components/PasswordChangeForm.jsx) | Đổi mật khẩu trong dialog tài khoản, xác nhận/ẩn-hiện và thông báo lỗi; thành công kết thúc phiên và yêu cầu đăng nhập lại |
| [scripts/verify-live-password.mjs](scripts/verify-live-password.mjs) | Live smoke qua Preview 4173, tạo account test riêng và giữ lại; kiểm tra đổi mật khẩu, từ chối cookie/Bearer/mật khẩu cũ và đăng nhập mới; không lưu credential |
| [scripts/verify-live-profile.mjs](scripts/verify-live-profile.mjs) | Live smoke qua Preview 4173: tạo một tài khoản development riêng (giữ lại), kiểm tra lưu sau access-cookie expiry, reload và logout; không lưu credential |
| [src/components/AccountPanel.jsx](src/components/AccountPanel.jsx) | Sidebar account entry và dialog hồ sơ; PATCH tên hiển thị, email chỉ đọc, trạng thái xác thực và đăng xuất. Smoke với API mô phỏng: node scripts/verify-account-panel.mjs trên Preview 4173 |
| [src/main.jsx](src/main.jsx) | Khởi tạo React |
| [src/App.jsx](src/App.jsx) | Dashboard, chọn cổ phiếu, tải API và điều phối các page |
| [src/components/MarketBoardPage.jsx](src/components/MarketBoardPage.jsx) | Page Bảng giá: tải danh sách, render, phân trang, toolbar và vòng đời quote bằng React |
| [src/components/MarketBreadth.jsx](src/components/MarketBreadth.jsx) | Breadth Tổng quan: scope sàn/ngành dùng chung cho snapshot, Top list và mở mã dẫn đầu |
| [src/components/MarketBreadthHistory.jsx](src/components/MarketBreadthHistory.jsx) | Timeline A/D và volume breadth EOD theo scope sàn/ngành; chỉ vẽ chuỗi liên tục, phân kỳ nội tại không giả benchmark |
| [src/components/RecommendationWorkbench.jsx](src/components/RecommendationWorkbench.jsx) | Runtime duy nhất của trang Đề xuất: trọng số, xếp hạng, snapshot server/local fallback, so sánh snapshot, evidence và action thêm vào Danh mục |
| [src/components/RecommendationEvidence.jsx](src/components/RecommendationEvidence.jsx) | Drill-down provenance từng mã Đề xuất: model, nguồn/thời điểm giá, số phiên, chỉ báo, phép chấm điểm và citation HTTP(S) đã xác minh; nguồn ngoài hệ thống không được cộng điểm |
| [src/components/PortfolioAllocation.jsx](src/components/PortfolioAllocation.jsx) | Donut Danh mục có tooltip chuột/bàn phím và audit P/L theo quote |
| [src/components/RecommendationSnapshotComparison.jsx](src/components/RecommendationSnapshotComparison.jsx) | So sánh hai snapshot Đề xuất đã lưu theo tiêu chí, membership, hạng và điểm |
| [src/components/AdvisorWorkspace.jsx](src/components/AdvisorWorkspace.jsx) | Advisor rule-based với phạm vi mã/Danh mục/Thị trường và citation theo từng câu trả lời |
| [src/components/AuthPasswordField.jsx](src/components/AuthPasswordField.jsx) | Trường mật khẩu dùng chung có hiện/ẩn, Caps Lock và hướng dẫn đăng ký accessible |
| [src/components/AuthErrorMessage.jsx](src/components/AuthErrorMessage.jsx) | Thông báo lỗi auth có ngữ cảnh, aria-live và tự chuyển focus khi xuất hiện; form khóa gửi lặp khi request đang chạy |
| [src/components/DetailSectionNav.jsx](src/components/DetailSectionNav.jsx) | Mục lục dính của Chi tiết mã, cuộn và chuyển focus tới Tổng quan/Biểu đồ/Phân tích |
| [src/components/DetailPriceVolumeChart.jsx](src/components/DetailPriceVolumeChart.jsx) | Biểu đồ giá/khối lượng có range, zoom/pan trên phiên đã tải, gap notice và tooltip hover/focus |
| [src/services/api.mjs](src/services/api.mjs) | Kiểm tra HTTP/JSON và cấu trúc dữ liệu cổ phiếu, hủy request và bỏ qua phản hồi cũ |
| [src/services/requestCoordinator.js](src/services/requestCoordinator.js) | Cache/dedupe request, giữ quote hợp lệ và analysis gate không phụ thuộc DOM runtime |
| [src/hooks/useApiResource.js](src/hooks/useApiResource.js) | Trạng thái tải/lỗi/dữ liệu theo URL, retry, cleanup khi đổi lựa chọn hoặc unmount |
| [src/runtime/market-board-tools-core.mjs](src/runtime/market-board-tools-core.mjs) | Contract thuần cho cấu hình cột và xuất CSV, dùng chung cho runtime/unit test |
| [src/runtime/quality-overlay.js](src/runtime/quality-overlay.js) | Banner coverage EOD toàn ứng dụng, kèm trạng thái runtime và evidence job gần nhất |
| [src/styles.css](src/styles.css) | Giao diện |
| [vite.config.js](vite.config.js) | Dev server cổng 5173; proxy /api tới API_PROXY_TARGET hoặc localhost:5000 |

UI gọi health, thống kê cache, danh sách và chi tiết cổ phiếu. Lịch sử hiển thị 12 giá mới nhất theo thời gian tăng dần. Danh mục lưu giao dịch do người dùng nhập qua backend; AI Advisor hiện trả lời theo phân tích rule-based.

Auth browser mặc định dùng cookie mode: login/register gửi `X-Auth-Mode: cookie-v1`; request dùng same-origin credentials, mutation tự gắn CSRF từ cookie và một refresh mutex chỉ retry một lần sau 401. React/localStorage không giữ access hoặc refresh token. Nhiều tab dùng `BroadcastChannel('stockpilot-auth')`, fallback storage chỉ chứa type/time/nonce không bí mật. Parser Bearer/localStorage cũ được giữ tạm trong compatibility window cho session/test cũ và phải được loại sau khi rollout cookie ổn định.

Health, cache, danh sách và chi tiết tải độc lập. Lỗi HTTP/JSON có thông báo và nút thử lại; danh sách rỗng hợp lệ có trạng thái riêng. Khi đổi cổ phiếu, chi tiết cũ được ẩn ngay trong render và request cũ bị hủy. Lỗi chi tiết chỉ xuất hiện ở trang chi tiết; lỗi cache không làm mất danh sách.

Banner chất lượng EOD hiển thị coverage hiện tại và trạng thái vận hành tách biệt: job đang chạy dùng `runtime`, còn trạng thái nhàn rỗi dùng evidence EOD chính/gap retry gần nhất cùng thời điểm Việt Nam và kết quả hoàn tất/lỗi/chưa hoàn tất. Với gap retry mới, banner còn hiển thị số gap được price board xác nhận có giao dịch, phạm vi probe và tỷ lệ mã được ưu tiên; khi probe lỗi, banner nói rõ scheduler đã giữ phần hợp lệ và dùng fairness cho phần còn lại. Khi chưa có evidence cho phiên, banner nói rõ thay vì ngầm hiểu scheduler chưa được cấu hình.

Bộ kiểm thử [api.test.mjs](src/services/api.test.mjs) dùng Node test runner. Kiểm tra HTTP lỗi, JSON sai, empty state, retry, hủy request/phản hồi đến sai thứ tự và lỗi tài nguyên phụ. [market-board-tools.test.mjs](src/runtime/market-board-tools.test.mjs) kiểm tra default cấu hình cột, CSV escaping/formula guard và loại cột hành động khỏi export.

[e2e/loading.spec.mjs](e2e/loading.spec.mjs) dùng Playwright với Chrome headless để kiểm tra tương tác React: chuyển mã khi request còn chờ, lỗi mạng/404/500/JSON, empty state, retry chi tiết và lỗi health/cache độc lập. API được giả lập; kết quả PostgreSQL thật được kiểm tra riêng. [playwright.config.mjs](playwright.config.mjs) tự quản lý Vite ở cổng 4180 và báo cáo HTML. Lệnh chạy/điều kiện nằm trong [QUICK_START](../QUICK_START.md).

Auth dùng một lifecycle thu hồi phiên chung: mọi API có token trả 401 đều xóa `market-auth` trước khi đưa người dùng về màn hình đăng nhập, dọn email/mật khẩu và dữ liệu cá nhân trong memory nhưng vẫn giữ thông báo nguyên nhân. Đăng xuất chủ động dùng cùng cleanup và có xác nhận accessible; reload không khôi phục credential cũ.

Bootstrap chỉ khôi phục `market-auth` khi object có token và identity gồm email/role không rỗng. JSON lỗi hoặc schema thiếu bị xóa ngay trước render; dashboard không mount bằng credential mồ côi.

Response login/register phải qua cùng contract trước khi vào React state hoặc storage. Payload 2xx thiếu token/email/role được hiển thị như lỗi xác thực có focus và giữ input để thử lại; payload hợp lệ được chuẩn hóa khoảng trắng.

Phiên đọc từ storage phải được `/api/auth/me` xác minh trước khi dashboard mount. Pending dùng loading overlay toàn trang; 401 thu hồi phiên, còn lỗi kết nối giữ dữ liệu cá nhân ẩn và cung cấp retry hoặc quay lại đăng nhập. Phiên vừa login/register thành công không xác minh lặp.

Logout hoặc 401 xóa `market-auth` sẽ đồng bộ tới các tab cùng origin bằng `storage` event. Tab khác dọn private state và unmount dashboard ngay, kèm thông báo phiên đã kết thúc ở tab khác; không cần chờ API tiếp theo trả 401.

Nếu tab khác thay token/identity, tab nhận không dùng trực tiếp email trong storage: dữ liệu cá nhân cũ bị dọn, token mới qua schema validation và `/api/auth/me` gate rồi identity server mới được render. Payload cross-tab lỗi làm thu hồi phiên fail-closed trên các tab.

Chưa có React Router, Redux hoặc thư viện chart riêng. Các công nghệ đó trong tài liệu thiết kế là đề xuất. npm start chạy Vite preview; Dockerfile hiện chạy dev server.

## Overview intraday quotes

The overview defaults to 40 rows per page. It requests bounded VCI price-board snapshots for the active list and polls again 30 seconds after completion. Leaving the view or changing the list aborts the request. Missing or failed quotes fall back to labeled EOD. The coverage counter reports how many rows have quotes.

Valid snapshots show VND per share, percentage change against the provider's reference price, accumulated session volume, source-update time in Vietnam time and fetch time. Source-update time is not labeled as an exact trade timestamp. Both overview and detail consume the same price-board adapter. This is polling of a potentially delayed source, not streaming tick data.

## Ghim mã cá nhân và thao tác từ Tổng quan

Các vị thế có số lượng lớn hơn 0 và mã trong Watchlist được ghim thành một nhóm ở đầu danh sách, kèm nhãn Danh mục/Watchlist. Trong từng nhóm, bảng tiếp tục dùng thứ tự sắp xếp đang chọn. Frontend gửi `pinned` để backend ghim trước phân trang; tìm kiếm và lọc ngành vẫn được tôn trọng. Một mã xuất hiện trong cả hai danh sách chỉ có một dòng. Thay đổi nhóm ghim đưa bảng về trang 1.

Nút **Thêm vào danh mục** mở form ghi nhận giao dịch với mã, loại BUY và giá đang hiển thị; số lượng để trống và được focus. Người dùng sửa thông tin rồi bấm **Lưu giao dịch** để ghi vào backend. Thao tác này không đặt lệnh tại công ty chứng khoán. Sau khi lưu thành công, mã có vị thế được ghim khi quay lại Tổng quan.

`SourceLink` hiển thị liên kết HTTP/HTTPS với URL đầy đủ trong tooltip mặc định của trình duyệt khi hover. Áp dụng cho URL doanh nghiệp/nguồn nếu có trong payload, giấy phép quote và nguồn yếu tố bên ngoài. Liên kết mở tab mới; click không kích hoạt hành vi chọn dòng cổ phiếu. URL thiếu hoặc giao thức không an toàn được hiển thị dưới dạng văn bản thường.

Bảng dùng hàng compact, đổi nền và hiển thị cursor khi rê chuột. Metadata ngày giờ/giấy phép trong ô nguồn được rút thành biểu tượng `ⓘ`; hover hoặc focus biểu tượng để xem tooltip mà không chiếm chiều cao hàng.

Cột **Phân tích** không hiển thị nhãn xu hướng hoặc mô tả biến động tĩnh trên từng dòng. Nút **Phân tích chuyên sâu** là hành động duy nhất trong cột này; nút mở Chi tiết mã và chủ động yêu cầu tải phân tích kỹ thuật mới cho mã được chọn.

Khối **Tiếp tục từ đây** đã được bỏ vì trùng các action ở đầu trang. Giải thích dữ liệu được đặt ngay nơi sử dụng: biểu tượng thông tin của nguồn giải thích Intraday/EOD/dữ liệu cũ, biểu tượng cạnh khối lượng cho biết loại khối lượng của từng dòng, và nhãn **cũ** giải thích phiên dữ liệu cụ thể. Trạng thái mã đã rời sàn dùng nhãn **Đã hủy niêm yết**. Release gate kiểm tra cả bundle chính và runtime Tổng quan để tránh phát hành thiếu các hành vi này.

Bộ đếm **Hiển thị n/tổng số mã** và bộ chọn **Số mã / trang** nằm thành một cụm bên trái hàng phân trang dưới bảng; trạng thái trang và nút Trước/Sau nằm bên phải. Trên màn hình hẹp, cụm thông tin chiếm một hàng riêng. Tùy chọn `40` tương ứng với kích thước trang mặc định của Tổng quan.

Tiêu đề **Danh sách cổ phiếu** nằm riêng phía trên. Bộ lọc **Nhóm ngành** và ô **Tìm cổ phiếu** dùng chung một hàng ngay bên dưới, kể cả khi giao diện thu hẹp; hai ô tự co theo chiều rộng khả dụng.

Nút sidebar dùng chevron trái khi thanh đang mở và chevron phải khi đã thu gọn. Tooltip/`aria-label` lần lượt là **Thu gọn thanh điều hướng** và **Mở rộng thanh điều hướng**.
Nút có vùng bấm 32×32 px, nằm hoàn toàn bên trong mép sidebar ở cả hai trạng thái và có focus ring khi thao tác bằng bàn phím.

Tab **Đề xuất** tách snapshot ngắn hạn khỏi Tổng quan. Tab này hiển thị candidate/rationale, evidence groups (objective, macro, news, sentiment, subjective, policy), lịch sử đánh giá ngoài mẫu và đối chiếu hai snapshot đã lưu mà không chạy lại mô hình. Drill-down chỉ tạo link cho citation HTTP(S) đã được backend giữ từ `ExternalFactor.status=verified`, kèm nguồn và thời điểm; URL hỏng/không an toàn bị loại lần nữa ở frontend. Model hiện chỉ tính technical evidence đã kiểm chứng; citation ngoài hệ thống và nhóm chưa có nguồn không nhận điểm. Hit rate/forward return chỉ được tính sau đủ 20 phiên.

Tab **AI Advisor** giữ câu trả lời rule-based và citation theo ngữ cảnh Mã/Danh mục/Thị trường. Hội thoại được lưu bằng API theo JWT, có thể tạo/chọn/xóa, giới hạn 20 hội thoại và 100 tin nhắn mỗi hội thoại. UI khóa gửi trong lúc persist để một lượt không tạo nhiều conversation do request chồng lấp; lỗi đồng bộ không làm mất nội dung đang hiển thị trong phiên.

## Build và kiểm tra bản phát hành

`npm run build` dùng safe-build: gọi npm CLI qua Node để tương thích Windows, kiểm tra bundle và khôi phục dist trước đó nếu build/gate thất bại. `verify:release` kiểm tra service tests và dist hiện có, không thay thế build hoặc E2E. Source ứng dụng và CSS đã được khôi phục từ asset đã phát hành; xem [nguồn gốc khôi phục](recovery/README.md). App.jsx là mã ứng dụng đã định dạng lại từ bản biên dịch, còn tên biến cũ; React/vendor tiếp tục lấy từ package chuẩn. Chỉnh sửa source và build bình thường, không sửa dist trực tiếp.

## Intraday và trạng thái tải

`useLiveQuotes` dùng chung cho Tổng quan, Danh mục và Chi tiết. Chỉ trang đang mở polling, lần tiếp theo sau khi request kết thúc 30 giây; mỗi lượt giới hạn 12 giây và hủy khi đổi trang/mã. Trạng thái cập nhật intraday là toast nền không chặn click hoặc scroll; loading dữ liệu chính vẫn dùng state riêng trong page. Quote thành công từng mã được giữ tối đa 90 giây qua lỗi tạm thời, không đổi thời điểm gốc; hết hạn chuyển sang fallback EOD. Danh mục và Watchlist tải độc lập, lỗi Danh mục có nút thử lại và không hiển thị thành danh mục rỗng. Mã UUID được giữ nguyên khi khôi phục Chi tiết qua reload.

## Responsive và audit theo page

Ở viewport tối đa 800 px, sidebar trở thành thanh điều hướng ngang sticky, không giữ chiều cao toàn màn hình và không làm document tràn ngang. Bảng giá cuộn trong container và có hướng dẫn thao tác trên mobile. Topbar đổi theo page hiện tại; AI Advisor dùng live-region và chỉ cho gửi khi câu hỏi có nội dung.

Bảng giá giữ cột mã khi cuộn ngang. Người dùng có thể ẩn/hiện các cột Doanh nghiệp, Khối lượng, Phân tích và Thao tác; lựa chọn được lưu trong trình duyệt. Nút **Xuất CSV** chỉ xuất các dòng của trang/bộ lọc đang hiển thị và các cột dữ liệu đang bật, không xuất nút hành động hay tự tải thêm dữ liệu ngoài phạm vi đó.

Toolbar có preset **Đầy đủ**, **Theo dõi**, **Phân tích** và **Giao dịch** để đổi nhanh nhóm cột mà không request lại list/quote. Checkbox thủ công tiếp tục tạo cấu hình **Tùy chỉnh** và persist qua reload; preset cũng dùng cùng preference key để tương thích dữ liệu cũ. Thay đổi preference được đồng bộ giữa các tab cùng origin; payload storage sai bị bỏ qua và xóa khóa sẽ phục hồi cấu hình mặc định.

Phạm vi CSV có **Trang hiện tại** và **Toàn bộ kết quả (EOD)**. Trang hiện tại dùng đúng quote/dòng đang hiển thị; toàn bộ gọi `GET /api/stocks/export.csv` với filter/sort/pinned và cột đang bật, không nạp universe vào state. Server giới hạn 2.000 dòng, chống formula injection và không gọi realtime provider.

Bảng giá là component React riêng và sở hữu tải danh sách, render, điều hướng/phân trang, loading/error/empty state, timeline, toolbar và vòng đời quote. `MarketBreadth`, `PortfolioAllocation` và lifecycle phân tích Chi tiết cũng thuộc React; `overview-table-actions.js`, `market-board-tools.js` và `sidebar-toggle-icon.js` đã được loại khỏi source/build. Toàn bộ source frontend không còn dùng `MutationObserver`.

Timeline Tổng quan hiển thị A/D tích lũy cùng volume breadth EOD cho 1/5/20 phiên. Bộ chọn sàn và ngành áp dụng đồng thời cho snapshot, nhóm dẫn dắt và timeline; lựa chọn được lưu qua reload và đồng bộ giữa các tab cùng origin bằng một contract có kiểm tra giá trị. Dữ liệu storage sai bị bỏ qua, còn xóa preference phục hồi phạm vi mặc định. Danh mục ngành dùng chung với Bảng giá. Snapshot phạm vi chỉ dùng mã đang niêm yết. Cột volume biểu diễn `(khối lượng mã tăng − khối lượng mã giảm) / tổng volume hai nhóm`; tín hiệu phân kỳ chỉ so sánh hướng số mã với hướng volume trong cùng universe/sàn/ngành. Chuỗi gapped/insufficient không được nối hoặc vẽ, phiên thiếu volume bị bỏ trống và nội dung luôn ghi rõ đây không phải dòng tiền mua/bán chủ động hay benchmark VNINDEX.

[page-audit.spec.mjs](e2e/page-audit.spec.mjs) kiểm tra Đăng nhập, Tổng quan, Bảng giá, Danh mục cá nhân, Chi tiết mã, Đề xuất và AI Advisor ở desktop/mobile. Fixture của test không xác nhận provider thật. Phân tích và lộ trình chi tiết nằm trong [UI_UX_AUDIT](../docs/UI_UX_AUDIT.md).

[market-board-productivity.spec.mjs](e2e/market-board-productivity.spec.mjs) kiểm tra sticky mã, persistence cấu hình cột, nội dung CSV và budget tương tác fixture 300/500 mã. Số đo này chỉ là regression baseline cục bộ với mock API, không phải SLA production.
