---
name: ds-token
description: Skill tổng cho token (Figma Variables) của Design System. Tìm hoặc lập hồ sơ DS (ds-profile.md), nhận diện bộ token có sẵn thuộc cấu trúc nào, rồi điều hướng sang ds-token-build (dựng) hoặc ds-token-audit (kiểm). Dùng khi người dùng bảo "token", "variables", "dựng token", "audit token", "bộ token này theo cấu trúc gì", "đổi theme không ăn", hoặc gõ /ds-token. Luôn bắt đầu từ skill này khi chưa có ds-profile.md.
---

# ds-token: skill tổng

Token ở đây là **Figma Variables**. Bộ skill gồm 3 skill:

| Skill | Làm gì |
|---|---|
| `ds-token` (skill này) | Tìm hoặc lập hồ sơ DS, nhận diện bộ có sẵn, điều hướng. Giữ các script đọc/ghi Figma dùng chung |
| `ds-token-build` | Dựng token: primitive, khung, trục mode, utility |
| `ds-token-audit` | Kiểm token: cấu trúc, tên, binding, scope, giá trị |

Mọi việc xoay quanh một file **hồ sơ DS** (`ds-profile.md`) mô tả DS đó có cấu trúc thế nào. Cả 3 skill đọc hồ sơ trước khi làm. Người dùng tùy biến bằng cách sửa hồ sơ, **không sửa skill**.

Mục tiêu: đổi brand hoặc đổi Light/Dark là cả file đổi theo đúng, chỗ nào cần giữ màu thì giữ, và người lẫn agent đều chọn đúng token mà không phải đoán.

## Bước 0. Tìm hồ sơ
Tìm `ds-profile.md` ở thư mục đang làm việc.
- **Có** → đọc, tóm tắt 3 dòng (khung, trục, nguồn primitive) cho người dùng xác nhận, rồi hỏi muốn dựng thêm hay audit, sang skill tương ứng.
- **Không có** → hỏi một câu, đưa sẵn hai lựa chọn:
  - **A · Chưa có token** (file chỉ có màu, cỡ chữ để thô, hoặc mới có Color Styles).
  - **B · Đã có Variables**, muốn audit hoặc chuẩn hoá.

Mọi đường đều cần **link Figma** (link file hoặc link có `node-id` của page/frame). Figma MCP không đọc được layer đang chọn, nên luôn xin link.

**Figma MCP cần quyền edit file.** File chỉ có quyền xem thì nhắc người dùng duplicate về drafts rồi gửi link bản duplicate. Trước mọi lần gọi `use_figma` phải load skill `figma-use`.

## Đường A · Dựng mới
1. **Hỏi 3 câu** (gộp một lượt):
   - Sản phẩm có mấy brand / mấy theme?
   - Có cần Light/Dark không?
   - Đổi brand có đổi cả dáng component không (bo góc, nền đặc hay viền, độ trong), hay chỉ đổi màu?
2. **Chọn khung và trục** theo bảng "Khung và trục" trong `ds-token-build`. Nói cho người dùng biết đã chọn gì và vì sao, bằng ví dụ trong chính file của họ.
3. **Gom giá trị đang dùng:** chạy [`collect.js`](collect.js) qua `use_figma` trên page người dùng chỉ. Trình bày bảng màu, bo góc, khoảng cách, cỡ chữ đang dùng kèm số lần dùng. Người dùng duyệt: giá trị nào gộp, giá trị nào bỏ.
4. **Lập hồ sơ:** chép [`ds-profile.mau.md`](ds-profile.mau.md) ra `ds-profile.md` ở thư mục làm việc, điền theo câu trả lời. Đưa người dùng duyệt.
5. **Dựng:** sang skill `ds-token-build`.
6. **Kiểm lại:** sang skill `ds-token-audit`.

## Đường B · Có token sẵn
1. Đọc [`detect.md`](detect.md): đọc Variables, đoán cấu trúc, viết `ds-profile.md` nháp.
2. **Người dùng duyệt hồ sơ.** Chỗ ghi "chưa chắc" phải được trả lời trước khi đi tiếp.
3. Sang skill `ds-token-audit`. Sau audit, muốn bổ sung phần còn thiếu (thêm Light/Dark, thêm brand) thì sang `ds-token-build`.

## Không tự sửa
Chỉ ghi vào Figma khi đang dựng (đường A) hoặc người dùng bảo rõ "sửa đi", luôn chạy thử (`DRY_RUN = true`) trước và đưa bảng thay đổi cho người dùng duyệt. Nhắc lưu version Figma trước khi ghi. Sửa thì đổi tên, đổi giá trị tại chỗ, **không xoá rồi tạo lại biến** (layer đang gắn sẽ mất liên kết).

## File đi kèm
- [`ds-profile.mau.md`](ds-profile.mau.md): mẫu hồ sơ.
- [`detect.md`](detect.md): cách nhận diện bộ token có sẵn (đường B).
- [`collect.js`](collect.js): gom giá trị thô đang dùng (đường A, bước 3).
- [`read.js`](read.js): đọc Variables (kèm chuỗi alias tới giá trị cuối) và binding của layer. Dùng ở detect và audit.
- [`write.js`](write.js): ghi kế hoạch vào Variables, có chạy thử, không bao giờ xoá.
- [`bind.js`](bind.js): gắn biến vào layer theo danh sách đã duyệt, chặn gắn sai scope, có chạy thử.

Các file `.js` là đoạn code dán vào `use_figma`. Đọc file, sửa mấy hằng số ở đầu file (`ROOT_IDS`, `PLAN`, `BINDINGS`, `DRY_RUN`), rồi gửi nguyên đoạn.
