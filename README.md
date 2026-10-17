# AdBlocker – Extension chặn quảng cáo

Extension Manifest V3 cho Chrome, Edge, Cốc Cốc, Brave và các trình duyệt nhân Chromium khác.

## Tính năng

- **Chặn quảng cáo ở tầng mạng** (`declarativeNetRequest`): Google Ads/AdSense, Taboola, Outbrain, Criteo, các mạng popup/popunder, và mạng quảng cáo Việt Nam (Admicro, Eclick, Adtima, ANTS, Yomedia…).
- **Chặn trình theo dõi**: Google Analytics, Hotjar, Clarity, Facebook Pixel… (có thể tắt riêng).
- **Ẩn khung quảng cáo** còn sót lại trên trang (cosmetic filter), kể cả trong iframe.
- **YouTube**: tự bấm “Bỏ qua”, tắt tiếng và tua nhanh quảng cáo video; ẩn quảng cáo trong trang chủ/tìm kiếm.
- **Chọn phần tử để ẩn**: bấm nút trong popup hoặc chuột phải → *Chặn phần tử này…*, rồi click vào phần tử cần ẩn.
- **Danh sách trắng**: tắt chặn cho từng trang chỉ bằng một nút.
- Số quảng cáo bị chặn hiện trên icon, popup có thống kê theo trang.
- Sao lưu/khôi phục cài đặt. Giao diện sáng/tối tự động. Không gửi dữ liệu ra ngoài.

## Cài đặt trên Microsoft Edge

1. Gõ `edge://extensions` vào thanh địa chỉ rồi Enter.
2. Ở cột bên trái, bật **Chế độ nhà phát triển** (Developer mode).
3. Bấm **Tải mục đã giải nén** (Load unpacked) ở phía trên, chọn thư mục `E:\Tool\Adblocker`.
4. Bấm icon mảnh ghép 🧩 trên thanh công cụ → bấm biểu tượng con mắt cạnh **AdBlocker** để icon luôn hiện.

## Cài đặt trên Chrome / Cốc Cốc / Brave

1. Mở `chrome://extensions` (Edge: `edge://extensions`, Cốc Cốc: `coccoc://extensions`).
2. Bật **Developer mode / Chế độ dành cho nhà phát triển** (góc trên bên phải).
3. Bấm **Load unpacked / Tải tiện ích đã giải nén** và chọn thư mục này (`E:\Tool\Adblocker`).
4. Ghim icon AdBlocker lên thanh công cụ để tiện dùng.

Các tab đang mở từ trước cần **tải lại** để bắt đầu ẩn phần tử.

Sau khi sửa code: vào `chrome://extensions` và bấm nút ⟳ trên thẻ AdBlocker.

## Cú pháp bộ lọc ẩn phần tử

Vào **Cài đặt → Bộ lọc ẩn phần tử**, mỗi dòng một bộ lọc:

```
example.com##.banner          ẩn .banner trên example.com (và tên miền con)
a.com,b.com##div.popup        áp dụng cho nhiều trang
##.quang-cao-noi              áp dụng cho mọi trang
! dòng chú thích
```

## Cấu trúc thư mục

```
manifest.json          Khai báo extension
background.js          Service worker: đồng bộ cài đặt → luật chặn, icon, menu chuột phải
shared/settings.js     Cài đặt mặc định & hàm dùng chung
rules/ads.json         Danh sách tên miền quảng cáo
rules/trackers.json    Danh sách tên miền theo dõi
content/filters.js     Bộ lọc ẩn phần tử tích hợp (chung + theo từng trang)
content/content.js     Áp dụng bộ lọc, trả số liệu cho popup
content/picker.js      Công cụ chọn phần tử để ẩn
content/youtube.js     Bỏ qua quảng cáo video YouTube
popup/                 Giao diện khi bấm icon
options/               Trang cài đặt
icons/                 Icon (bản đỏ khi bật, xám khi tắt)
```

Muốn chặn thêm mạng quảng cáo cho mọi người dùng: thêm tên miền vào `requestDomains` trong `rules/ads.json`. Muốn ẩn thêm phần tử: thêm selector vào `content/filters.js`.

## Giới hạn

- YouTube thường xuyên thay đổi cách phát quảng cáo và có thể hiện cảnh báo chặn quảng cáo; phần bỏ qua quảng cáo có thể cần cập nhật selector theo thời gian.
- Quảng cáo do chính trang web tự phục vụ (cùng tên miền với nội dung) không chặn được bằng luật mạng; dùng *Chọn phần tử để ẩn* cho các trường hợp này.
- Danh sách chặn là danh sách thu gọn, không đầy đủ như EasyList/uBlock Origin.
- Nếu một trang bị lỗi hiển thị hoặc không đăng nhập được, hãy bấm *Tắt chặn trên trang này* hoặc tắt *Chặn trình theo dõi*.
