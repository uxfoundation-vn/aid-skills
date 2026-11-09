---
name: ds-token-build
description: Dựng token (Figma Variables) cho Design System theo hồ sơ DS — sinh bộ primitive từ Tailwind, Radix hoặc màu brand, dựng khung (Primitive → Semantic, thêm Component token), thêm trục mode (Light/Dark, nhiều brand, đổi dáng component theo brand), dựng nhóm màu utility giữ nguyên ở mọi brand, rồi ghi vào Figma và gắn vào component. Dùng khi người dùng bảo "dựng token", "tạo variables", "làm dark mode", "thêm brand", "sinh thang màu", "màu illustration để đâu". Cần ds-profile.md; chưa có thì đi qua skill ds-token trước.
---

# ds-token-build: dựng token

**Cần hồ sơ DS** (`ds-profile.md`). Chưa có thì quay lại skill `ds-token` để lập hồ sơ trước.

Cấu trúc nào cũng ghép từ **một khung** và **0–3 trục**. Mỗi khung, mỗi trục là một file hướng dẫn trong skill này. **Chỉ đọc file của phần hồ sơ đang bật**, không đọc hết.

## Khung và trục

| Khung | Cấu trúc | Component gắn vào | File |
|---|---|---|---|
| **K0** | Chưa có token: giá trị thô hoặc chỉ Color Styles. Điểm xuất phát, không phải đích | — | — |
| **K1** | Primitive → Semantic | Semantic | [`k1.md`](k1.md) |
| **K2** | Primitive → Semantic → Component token | Component token | [`k1.md`](k1.md) rồi [`k2.md`](k2.md) |

| Trục | Thêm gì | Tầng | File |
|---|---|---|---|
| **M1 · Light/Dark** | 2 mode Light · Dark, mỗi mode trỏ vào bậc khác của thang | Semantic | [`m1-light-dark.md`](m1-light-dark.md) |
| **M2 · Nhiều brand đổi màu** | Tầng Theme giữa Primitive và Semantic, mỗi brand một mode, chỉ giữ phần khác nhau giữa các brand | Theme | [`m2-brand.md`](m2-brand.md) |
| **M3 · Nhiều brand đổi dáng** | `Component/<Tên>/*` trong Theme: bo góc, độ dày viền, độ trong… mỗi brand khai dáng riêng. Cần M2 | Theme | [`m3-shape.md`](m3-shape.md) |

Trục khác (mật độ compact/comfortable, high-contrast, platform) khai trong hồ sơ, làm theo cùng cách với M1: tên trục, nằm ở tầng nào, có những mode gì.

Gợi ý chọn:
- 1 brand, không dark → K1
- 1 brand, có dark → K1 + M1 (hay gặp nhất)
- Nhiều brand chỉ khác màu → K1 + M1 + M2
- Nhiều brand khác cả dáng nút, ô nhập → K1 + M1 + M2 + M3
- DS lớn nhiều đội, cần chỉnh riêng từng component mà không đụng Semantic → K2

## Thứ tự dựng
1. **Primitive:** [`primitive.md`](primitive.md). Sinh thang màu bằng [`scale.py`](scale.py), bảng gốc trong `presets/`.
2. **Khung:** `k1.md`, có K2 thì thêm `k2.md`.
3. **Trục đang bật:** `m1-light-dark.md`, `m2-brand.md`, `m3-shape.md`, theo đúng thứ tự này.
4. **Utility:** [`utility.md`](utility.md), nếu file có illustration, nhãn trạng thái, biểu đồ, logo ngoài.
5. **Ghi vào Figma:** gộp tất cả vào một `PLAN` cho [`../ds-token/write.js`](../ds-token/write.js), chạy `DRY_RUN = true`, đưa bảng tạo/sửa cho người dùng duyệt, rồi chạy thật. Collection được trỏ tới phải ghi trước (Primitive → Theme → Semantic → Component).
6. **Gắn vào component:** lấy danh sách layer còn giá trị thô từ phần binding của `ds-token-audit`, người dùng duyệt bảng đề xuất, gắn bằng [`../ds-token/bind.js`](../ds-token/bind.js) (chạy thử trước, chỉ gắn trên main component).
7. **Kiểm lại:** sang `ds-token-audit`.

Mỗi file bổ sung vào cùng một bản kế hoạch: file sau không làm lại phần file trước đã có, chỉ thêm mode, đổi alias, thêm biến.

## Không tự sửa ngoài kế hoạch
Chỉ ghi những gì đã có trong `PLAN` người dùng duyệt. Không xoá biến hay collection: bộ cũ cần thay thì ghi bộ mới bên cạnh, đổi alias, để người dùng tự xoá bộ cũ khi không còn gì trỏ tới. Nhắc lưu version Figma trước khi ghi.

## File đi kèm
| File | Dùng khi |
|---|---|
| [`primitive.md`](primitive.md) | Sinh bộ primitive: Tailwind, Radix, tự làm, ghép nguồn |
| [`scale.py`](scale.py) | Sinh thang (`gen`), lấy bảng có sẵn (`preset`), thang Theme nhiều brand (`theme`), token gần màu nhất (`nearest`), tương phản (`contrast`). Python 3, không cần cài gì |
| `presets/tailwind.md`, `presets/radix.md` | Bảng màu gốc Tailwind 4.1.11, Radix 3.0.0. `scale.py` đọc, không sửa tay |
| [`utility.md`](utility.md) | Màu giữ nguyên ở mọi brand |
| [`k1.md`](k1.md) | Bộ semantic mặc định cho màu, bo góc, khoảng cách, typography |
| [`k2.md`](k2.md) | Tầng Component token |
| [`m1-light-dark.md`](m1-light-dark.md) | Bảng map Dark cho Tailwind và Radix |
| [`m2-brand.md`](m2-brand.md) | Tầng Theme, câu hỏi "đổi brand có đổi không" |
| [`m3-shape.md`](m3-shape.md) | Token dáng component theo brand |
