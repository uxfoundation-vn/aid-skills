# clawd-combo: pet Clawd và thanh đo cho Claude Code

Mod cho Claude Code. Cài vào là có thêm một hàng ngay trên ô nhập lệnh:

- **Bên trái:** pet Clawd. Pet đổi dáng theo việc Claude đang làm, và phản ứng khi lệnh lỗi hoặc test chạy xong.
- **Ở giữa:** ba thanh đo.
  - **CTX:** context của session đã dùng bao nhiêu.
  - **5H:** giới hạn dùng trong 5 giờ đã dùng bao nhiêu.
  - **7D:** giới hạn dùng trong 7 ngày đã dùng bao nhiêu.

  Dưới thanh đo có đồng hồ đếm thời gian lượt đang chạy và trạng thái hiện tại của Claude. Khi cache hết hạn, dòng chữ đỏ **"cache expired · compact?"** hiện lên. Lúc đó lượt tiếp theo sẽ đắt hơn, nên compact trước khi làm tiếp.
- **Bên phải:** nút **Compact**. Bấm vào thì Claude nén lại context, giống gõ `/compact`.

Mod không cần tải thêm gói hình nào và không gửi dữ liệu ra ngoài máy.

## Cài đặt

Mở Claude Code, dán nguyên câu này:

```
Cài mod clawd-combo từ marketplace aid trên GitHub uxfoundation-vn/aid-skills giúp tôi. Chưa có marketplace aid thì add trước, có rồi thì update marketplace aid, rồi cài plugin clawd-combo@aid.
```

Muốn tự gõ lệnh trong terminal thì làm như sau. Nếu đã cài pack AID rồi thì bỏ qua lệnh đầu tiên.

```bash
claude plugin marketplace add uxfoundation-vn/aid-skills
```

```bash
claude plugin install clawd-combo@aid
```

Cài xong mở **session mới** là thấy mod.

## Lệnh `/clawd`

| Gõ | Làm gì |
|---|---|
| `/clawd` | Ẩn hoặc hiện mod |
| `/clawd demo` | Cho Clawd diễn lần lượt mọi dáng. Gõ `/clawd demo stop` để dừng |
| `/clawd moods on\|off` | Clawd đổi theo mùa, ngày lễ, giờ trong ngày |
| `/clawd reactions on\|off` | Clawd phản ứng khi lệnh lỗi và khi có kết quả test |
| `/clawd tantrums on\|off` | Clawd dỗi khi bạn cáu với Claude |
| `/clawd hemisphere north\|south` | Chọn bán cầu để tính mùa cho đúng (Việt Nam là `north`) |

## Cập nhật

```bash
claude plugin marketplace update aid
```

```bash
claude plugin update clawd-combo@aid
```

## Gỡ

```bash
claude plugin uninstall clawd-combo@aid
```

## Nguồn

Mod này gộp ba nguồn:

- **clawd-pet** của Revono (giấy phép MIT)
- **clawd-bar**, từ dự án clawd-companion của DevVaradPatil (giấy phép MIT)
- **Hình pixel Clawd** trong `hooks/crew-sprites.js`, lấy từ [clawd-crew](https://github.com/hudcolighting/clawd-crew) (giấy phép GPL-3.0)

Toàn văn giấy phép MIT nằm trong [LICENSE](LICENSE).
