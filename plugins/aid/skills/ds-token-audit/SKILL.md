---
name: ds-token-audit
description: Audit token (Figma Variables) của Design System theo hồ sơ DS — cấu trúc tầng và mode, tên token, layer đã gắn đúng token chưa, scope của từng token, tương phản và token trùng. Rule cố định không tắt được, rule linh động đọc từ hồ sơ. Chỉ quét và đề xuất, không sửa. Dùng khi người dùng bảo "audit token", "check token", "kiểm variables", "token đúng chuẩn chưa", "sao đổi theme chỗ này không đổi", "component nào chưa gắn biến". Cần ds-profile.md; chưa có thì đi qua skill ds-token trước.
---

# ds-token-audit: kiểm token

**Cần hồ sơ DS** (`ds-profile.md`). Chưa có thì quay lại skill `ds-token` (nhận diện bộ có sẵn, lập hồ sơ) trước. Audit không có hồ sơ là chấm theo chuẩn đoán mò.

## Bước 1. Hỏi phạm vi
- **Quét layer:** một component (link có `node-id`), một page, hay cả file.
- **Phần biến (Variables):** luôn quét toàn bộ.

## Bước 2. Hỏi quét phần nào
Mặc định cả 5. Chỉ đọc file của phần được chọn.

| Phần | File | Kiểm gì | Rule |
|---|---|---|---|
| Cấu trúc | [`structure.md`](structure.md) | Tầng khớp hồ sơ, tầng ngoài không giữ giá trị thô, chiều tham chiếu, mỗi trục mode ở đúng một tầng, mode đủ giá trị, utility không đi qua Theme, Theme gọn | C1–C3 F2 F3 F4 F10 |
| Tên | [`naming.md`](naming.md) | Tên theo vai trò, một cách đặt tên, khớp thang và bộ vai trò trong hồ sơ | F6 F7 N1–N3 |
| Binding | [`binding.md`](binding.md) | Layer còn giá trị thô hoặc Color Style, gắn sai tầng, lẫn màu brand và utility | F1a–F1d F11 B1 |
| Scope | [`scope.md`](scope.md) | Scope của từng biến, và từng layer có dùng token đúng scope không | S1–S6 |
| Giá trị | [`values.md`](values.md) | Tương phản, trùng lặp, thang lủng bậc | F8 F9 V1 |

## Bước 3. Đọc Figma một lần
Chạy [`../ds-token/read.js`](../ds-token/read.js) qua `use_figma` (load skill `figma-use` trước). Quét nhiều page thì mỗi page một lần gọi (gọi song song), lần đầu `READ_VARS = true`, các lần sau `false`. Các phần audit dùng chung dữ liệu này, không đọc lại Figma.

## Bước 4. Chạy từng phần
Đọc file của từng phần đã chọn, đưa dữ liệu bước 3 và hồ sơ vào, chạy lần lượt. Sau đó chạy các rule trong mục "Rule riêng" của hồ sơ, ghi mã `R1`, `R2`… như hồ sơ đặt.

## Bảng rule
Hai loại rule:
- **Cố định:** đúng với mọi DS. Hồ sơ không tắt được. Chỉ hạ mức được ở mục "Hạ mức" của hồ sơ, kèm lý do; báo cáo vẫn hiện dòng đó và ghi lý do.
- **Linh động:** tham số đọc từ hồ sơ (tên collection, cách đặt tên, thang, bộ vai trò, Theme ghi giá trị thẳng hay alias…).

| Mã | Rule cố định | Phần |
|---|---|---|
| F1 | Component chỉ gắn tầng ngoài cùng (Semantic, hoặc Component token ở K2). Không gắn Primitive, Theme, không để giá trị thô | binding |
| F2 | Tham chiếu đi một chiều từ ngoài vào trong. Không vòng, không alias đứt | structure |
| F3 | Mỗi trục biến thiên nằm ở đúng một tầng (không có `primary-dark` trong Theme) | structure |
| F4 | Mode nào cũng có đủ giá trị | structure |
| F5 | Scope đúng cho từng token, chi tiết ở S1–S6 | scope |
| F6 | Token ngoài cùng đặt tên theo vai trò, không theo giá trị | naming |
| F7 | Trong một bộ chỉ dùng một cách đặt tên, một thang | naming |
| F8 | Cặp chữ/nền đạt tương phản AA ở mọi mode | values |
| F9 | Không có hai token cùng vai trò, cùng giá trị ở cùng một tầng | values |
| F10 | Token utility không đi qua Theme | structure |
| F11 | Component màu brand không gắn utility, và ngược lại | binding |
| S1–S6 | Scope: tầng trong tắt, tầng ngoài không để All scopes, khớp vai trò, layer dùng đúng scope | scope |

## Format báo cáo
Một bảng chung, xếp theo đối tượng rồi theo mức:

| Đối tượng | Phần | Rule | Hiện tại | Đề xuất | Mức |
|---|---|---|---|---|---|
| `1. Theme` | Cấu trúc | F3 | Có `primary-light`, `primary-dark` | Bỏ, để Semantic mode Light/Dark trỏ vào bậc khác của thang | Phải sửa |

- **Mức:**
  - **Phải sửa:** đổi brand hoặc Light/Dark sẽ ra sai, hoặc người/agent sẽ chọn nhầm token.
  - **Nên sửa:** đúng nhưng chưa gọn, chưa đồng bộ.
  - **Cần hỏi:** không tự kết luận được. Ghi rõ câu hỏi.
- Đầu báo cáo: khung và trục theo hồ sơ, số biến, số layer đã quét, số lỗi mỗi mức.
- Cuối báo cáo: 3 việc nên sửa trước, ưu tiên lỗi làm đổi theme ra sai (F1, F3, F10, S5).
- Đối tượng là layer thì ghi `Component › layer` và id node để người dùng tìm.

## Không tự sửa
Chỉ quét và đề xuất. Người dùng bảo rõ "sửa đi" thì:
- Sửa biến (tên, giá trị, scope, alias): qua [`../ds-token/write.js`](../ds-token/write.js).
- Gắn lại layer: qua [`../ds-token/bind.js`](../ds-token/bind.js).

Luôn chạy thử trước, đưa danh sách thay đổi cho người dùng duyệt, nhắc lưu version Figma. Đổi tên, đổi giá trị tại chỗ, không xoá rồi tạo lại biến.
