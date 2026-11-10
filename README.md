# Khảo sát nhu cầu AI và đặt lịch tư vấn 1:1

Form công khai cho khách (doanh nghiệp, HTX) gửi nhu cầu ứng dụng AI, tải ảnh/tệp minh hoạ (tối đa 5 tệp, mỗi tệp dưới 5MB) và chọn ngày giờ tư vấn 1:1 (30 hoặc 60 phút, online hoặc trực tiếp).

Địa chỉ form (sau khi bật GitHub Pages): https://sfportal.github.io/khao-sat-nhu-cau/

## Luồng dữ liệu

```
Khách điền form (GitHub Pages, trang tĩnh)
        │  POST JSON, kèm tệp dạng base64
        ▼
Google Apps Script (apps-script/Code.gs, chạy bằng tài khoản Google của BVI)
        ├─ Lưu tệp vào Drive: mỗi khách một thư mục
        ├─ Ghi một dòng vào Google Sheet "Khảo sát nhu cầu AI - Quản lý"
        ├─ POST /v1/leads về BVI Điều hành (khóa API nằm trong Script Properties)
        └─ Email báo khách mới (tùy chọn)
```

Khóa API BVI **không** nằm trong trang web, đúng khuyến cáo của tài liệu API.

## Xem và quản lý khách

- **BVI Điều hành › Nhu cầu khách hàng**: khách vào ở trạng thái Mới, nguồn theo lựa chọn của khách (mặc định "Hội thảo AI 10/11"). Phần mô tả mở đầu bằng dòng `LỊCH TƯ VẤN MONG MUỐN`, cuối có link thư mục tệp đính kèm. Nhân sự đổi trạng thái, gán người phụ trách, hẹn ngày gọi lại ngay trên trang này.
- **Google Sheet quản lý**: đủ mọi trường kể cả SĐT, email, link tệp. Cột Trạng thái có danh sách chọn (Mới, Đã liên hệ, Đã hẹn, Đã tư vấn, Đã cọc, Đã ký, Không theo), cột Người phụ trách và Ghi chú để điền tay.
- **Thư mục Drive**: tệp khách gửi, đặt tên theo ngày giờ và tên công ty. Chỉ chủ tài khoản thấy, chia sẻ thư mục cho nhân sự cần xem.

## Cài đặt (làm một lần, khoảng 10 phút)

1. **Xin khóa API**: trong BVI Điều hành, owner tạo một khóa chỉ có quyền `leads_write`.
2. **Tạo Apps Script**: vào https://script.google.com bằng tài khoản Google của BVI › Dự án mới › dán toàn bộ `apps-script/Code.gs`.
3. **Đặt khóa**: Cài đặt dự án (bánh răng) › Thuộc tính tập lệnh › thêm `BVI_KEY` = khóa vừa xin. Tùy chọn: `NOTIFY_EMAIL` = email nhận báo.
4. **Chạy `setup`**: chọn hàm `setup` › Chạy › cấp quyền. Script tạo Sheet và thư mục Drive, lưu ID vào thuộc tính. Xem link trong Nhật ký thực thi.
5. **Triển khai**: Triển khai › Triển khai mới › Loại: Ứng dụng web › Thực thi với tư cách: **Tôi** › Ai có quyền truy cập: **Bất kỳ ai** › Triển khai. Sao chép URL dạng `https://script.google.com/macros/s/.../exec`.
6. **Gắn vào form**: trong `index.html`, dán URL đó vào dòng `const ENDPOINT = "";` rồi commit.
7. **Bật GitHub Pages**: Settings › Pages › Deploy from a branch › `main` / root.
8. **Chạy thử**: điền form một lần, kiểm tra có dòng mới trong Sheet, thư mục tệp trên Drive và bản ghi mới trong trang Nhu cầu khách hàng.

Khi sửa `Code.gs`: Triển khai › Quản lý bản triển khai › sửa › Phiên bản mới (giữ nguyên URL).

## Ghi chú

- `ENDPOINT` để trống thì form chạy thử: kiểm tra đủ trường, hiện màn hình cảm ơn, không gửi đi đâu.
- Có ô ẩn chống bot. Mỗi lần gửi có `external_id` riêng nên BVI Điều hành không tạo trùng khi gửi lại.
- Không ghi khóa, mật khẩu hay dữ liệu khách vào repo này.
