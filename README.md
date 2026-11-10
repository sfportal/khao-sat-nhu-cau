# Khảo sát nhu cầu AI và đặt lịch tư vấn 1:1

Form công khai cho khách (doanh nghiệp, HTX) gửi nhu cầu ứng dụng AI và chọn ngày giờ tư vấn 1:1 (30 hoặc 60 phút, online hoặc trực tiếp). Nhu cầu gửi thẳng vào **BVI Điều hành › Nhu cầu khách hàng** qua `POST /v1/leads`.

Địa chỉ form (sau khi bật GitHub Pages): https://sfportal.github.io/khao-sat-nhu-cau/

## Cài đặt

1. Settings › Pages › Deploy from a branch › `main` / root.
2. Owner tạo trong BVI Điều hành một khóa API **chỉ có quyền `leads_write`**, đặt tên dễ nhận như `form-khao-sat`.
3. Mở trang quản trị https://sfportal.github.io/khao-sat-nhu-cau/quan-tri/, nhập mã PIN, dán khóa vào ô BVI_KEY cùng một GitHub fine-grained token (chỉ repo này, Contents: Read and write), bấm **Lưu và xuất bản**. Trang ghi khóa vào `config.json` trên nhánh `main`.
4. Sau 1–2 phút, điền thử một lần, kiểm tra bản ghi mới trong trang Nhu cầu khách hàng.

`bvi_key` trong `config.json` để trống thì form chạy thử: kiểm tra đủ trường, hiện màn hình cảm ơn, không gửi đi đâu.

## Trang quản trị

Mã PIN chỉ lưu dạng băm PBKDF2 trong mã trang, không lưu mã gốc. Đây là lớp chắn ngoài: trang tĩnh không giữ bí mật được, nên quyền thật để đổi khóa nằm ở GitHub token, chỉ người có token ghi vào repo mới lưu được. Đổi mã PIN: tính lại `PIN_SALT`, `PIN_HASH` trong `quan-tri/index.html`.

## Lưu ý về khóa

Khóa nằm trong mã trang công khai, ai xem mã nguồn cũng thấy. Vì vậy **chỉ dùng khóa có duy nhất quyền `leads_write`**: người lấy được khóa không đọc được dữ liệu nào, tệ nhất chỉ gửi được nhu cầu rác. Khi thấy rác, owner thu hồi khóa trong BVI Điều hành, tạo khóa mới và lưu lại ở trang quản trị.

## Dữ liệu gửi vào BVI Điều hành

| Trường | Nội dung |
|---|---|
| `name`, `org`, `phone`, `email`, `province` | Thông tin khách điền |
| `needs` | Dịch vụ quan tâm khách chọn |
| `detail` | Dòng đầu `LỊCH TƯ VẤN MONG MUỐN: ngày, khung giờ, thời lượng, hình thức`, sau đó chức vụ, ngành, quy mô, mảng gặp khó và mô tả nhu cầu |
| `source`, `referrer` | Nguồn (mặc định "Hội thảo AI 10/11"), người giới thiệu |
| `source_note` | `Form khảo sát nhu cầu AI · Lịch: …` |
| `external_id` | Mã riêng mỗi lần gửi, `ksnc-…` |

Nhân sự xem, đổi trạng thái, gán người phụ trách và hẹn ngày gọi lại ngay trong trang Nhu cầu khách hàng. Ảnh, tệp minh hoạ khách gửi qua Zalo 0901 403 819.
