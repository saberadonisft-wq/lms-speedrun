# Ghép bài

Tiện ích Chrome cho [LMS Đại học Quốc gia Hà Nội](https://lms.vnu.edu.vn). Tick các phần bài trên trang lớp, rồi mở mỗi phần trong một cửa sổ. Các cửa sổ xếp kín màn hình theo ô, không chồng lên nhau.

Tiện ích không có icon trên thanh công cụ. Nút **Ghép bài** và **Đóng hết** hiện ở góc trái trang lớp sau khi cài.

## Cài đặt

Cần Google Chrome và tài khoản đã đăng nhập được vào LMS.

1. Tải dự án này về máy. Có thể bấm **Code → Download ZIP** trên GitHub, giải nén, hoặc chạy:

   ```
   git clone https://github.com/saberadonisft-wq/lms-speedrun.git
   ```

2. Mở Chrome. Dán `chrome://extensions` vào thanh địa chỉ rồi nhấn Enter.

3. Bật **Chế độ dành cho nhà phát triển** ở góc trên bên phải. Công tắc này phải màu xanh thì mới thấy nút cài thư mục.

4. Bấm **Tải tiện ích đã giải nén**.

5. Chọn đúng thư mục `extension` trong dự án vừa tải. Trong thư mục đó phải có file `manifest.json`. Nếu chọn nhầm thư mục cha, Chrome báo không thấy manifest.

6. Thẻ **Ghép bài** xuất hiện trong danh sách tiện ích. Số phiên bản nằm trên thẻ. Để nguyên công tắc của thẻ ở trạng thái bật.

## Cách dùng

1. Đăng nhập [lms.vnu.edu.vn](https://lms.vnu.edu.vn).
2. Mở trang chi tiết một lớp học. Thanh địa chỉ có dạng `.../learn/lop-hoc/chi-tiet/...`.
3. Bấm **Ghép bài** ở góc trái.
4. Đợi dòng trạng thái hiện số mục và số địa chỉ khác nhau. Mỗi bài cần một địa chỉ riêng thì cửa sổ mới mở đúng bài đó.
5. Tick các video hoặc tài liệu cần xem.
6. Bấm **Mở cửa sổ**. Mỗi mục đã tick chiếm một ô trên màn hình. Trang có thể hiện mục cha vài giây, rồi chuyển sang đúng bài đã tick.
7. Bấm **Đóng hết** khi xem xong. Nút này chỉ đóng các cửa sổ do Ghép bài mở. Trang lớp đang học vẫn giữ nguyên.

Nếu bấm **Mở cửa sổ** mà dòng dưới nút báo chưa có mã bài, hãy tải lại trang lớp, bấm **Ghép bài** một lần nữa, rồi tick lại.

## Cập nhật sau khi tải bản mới

Chrome không tự nhận file vừa sửa. Mỗi lần cập nhật thư mục `extension`:

1. Mở `chrome://extensions`.
2. Trên thẻ **Ghép bài**, bấm nút mũi tên tròn. Nút này chỉ hiện khi **Chế độ dành cho nhà phát triển** đang bật.
3. Tải lại trang lớp trên LMS.
4. Bấm **Ghép bài** lại trước khi tick và mở cửa sổ.

## Gỡ tiện ích

Mở `chrome://extensions`, tìm thẻ **Ghép bài**, bấm **Xóa**.
