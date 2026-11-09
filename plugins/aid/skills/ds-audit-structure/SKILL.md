---
name: ds-audit-structure
description: Skill con của ds-audit. Đánh giá cấu trúc variant của component so với chuẩn DS đi kèm skill (mỗi trục một khía cạnh, đúng loại trục, đúng tên và giá trị chuẩn, variant chỉ cho thứ đổi hình, không thừa, map được sang code). Áp cho mọi loại component. Chỉ đánh giá và đề xuất, không sửa. Dùng khi ds-audit gọi, hoặc người dùng hỏi riêng "variant chia đúng chưa", "cấu trúc component ổn chưa".
---

# ds-audit-structure: cấu trúc variant

Nhận dữ liệu từ `ds-audit` (trường `props` và `variants`). Báo cáo theo format chung của `ds-audit`.

**Chuẩn để so là bảng "Loại trục chuẩn" bên dưới**, không phải quy ước của file đang audit. File đang audit lệch chuẩn thì báo lệch, dù cả file đều làm cùng một kiểu.

## Loại trục chuẩn
Mọi trục variant của mọi component đều phải xếp được vào một trong 6 loại. Component chỉ có những loại trục mà nó cần: nút không nhập liệu thì không có trục nội dung, icon tĩnh thì không có trục tương tác.

| Loại trục | Khía cạnh | Tên chuẩn | Bộ giá trị chuẩn (component dùng tập con) | Sang code |
|---|---|---|---|---|
| **Tương tác** | Người dùng đang làm gì với nó. Nền tảng tự đổi | `state` | `default · hover · pressed · focus` | Không phải prop |
| **Cờ điều kiện** | Sản phẩm bật/tắt một điều kiện | mỗi cờ một boolean variant, tên trần | `disabled` · `loading` (chờ dữ liệu) · `selected` (được chọn trong nhóm) · `checked` (bật/tắt) · `active` (vị trí hiện tại trong điều hướng) · `readOnly` | Prop boolean cùng tên |
| **Kết quả kiểm tra** | Dữ liệu hợp lệ hay không | `status` | `none · error · success · warning` | Prop |
| **Tiến trình** | Một bước, một quy trình đang ở giai đoạn nào | `phase` | `thinking · processing · completed · stopped` | Prop |
| **Nội dung** | Ô nhập đã có giá trị chưa | `filled` | `false · true` | Không phải prop, suy ra từ `value` |
| **Trục riêng** | Kiểu, kích thước, hình dạng, bố cục, chế độ nghiệp vụ của chính component | đặt theo nghĩa: `type`, `size`, `shape`, `layout`… (tên cụ thể hơn nếu có: `listening`, `action`) | kebab-case. `size` theo bộ `sm · md · lg` | Prop cùng tên |

## Tiêu chí đánh giá

| # | Tiêu chí | Câu hỏi | Dấu hiệu lệch | Đề xuất |
|---|---|---|---|---|
| ST1 | **Một trục, một khía cạnh** | Mỗi trục có chỉ chứa một loại trong bảng chuẩn không? | Một trục trộn nhiều loại (`state` chứa `selected`, `disabled`, `error`, `done`), hoặc giá trị ghép (`selected-hover`, `disabled-filled`) | Tách ra đúng loại trục chuẩn |
| ST2 | **Đúng tên và giá trị chuẩn** | Trục đã xếp được loại thì có dùng đúng tên và giá trị chuẩn không? | Tên khác (`interaction`, `validation`, `isError`), giá trị khác chữ (`focused`, `press`, `inactive`, `enabled`, `done`), cờ lẽ ra riêng lại gộp thành một trục, `error`/`success` tách thành boolean | Đổi về tên và giá trị chuẩn |
| ST3 | **Variant chỉ cho thứ đổi hình hay đổi cấu trúc** | Các variant khác nhau ở hình và bố cục, hay chỉ khác chữ, icon, ẩn/hiện một phần? | Nhiều variant chỉ khác nội dung chữ hoặc icon, hoặc trục chỉ để bật/tắt một phần tử | Đổi sang text property, instance swap, boolean property hoặc slot |
| ST4 | **Không thừa** | Có trục, giá trị hay tổ hợp nào không có lý do tồn tại không? | Trục chỉ có một giá trị · hai variant giống hệt nhau · tổ hợp không thể xảy ra vẫn được dựng (đang `disabled` mà `hover`/`pressed`/`focus`) | Bỏ đi. Tổ hợp không dựng nghĩa là không hỗ trợ, ghi vào description |
| ST5 | **Map được sang code** | Mỗi trục ứng với prop nào, hay không phải prop? | Trục không xếp được vào loại chuẩn nào, hoặc tên chung chung, tên mặc định (`Property 1`) | Đặt tên theo nghĩa, xếp vào trục riêng, ghi rõ có phải prop không |
| ST6 | **Đúng thứ tự** | Property trong set có xếp theo thứ tự chuẩn không? | Lệch thứ tự: trục riêng → `state` → `filled` → `status` → `phase` → cờ điều kiện | Sắp lại |

## Cách kết luận
- Xếp từng trục của component vào một loại trong bảng chuẩn trước, rồi mới xét tiêu chí.
- **ST1, ST2, ST6 tự kiểm được.** Mức: Phải sửa (ST1, ST2), Nên sửa (ST6).
- **ST3, ST4, ST5 cần phán đoán.** Nêu bằng chứng (tên trục, giá trị, số variant) và đề xuất, đánh mức **Cần hỏi** khi không chắc.
- Trục không xếp được vào loại nào thì không tự đoán, hỏi người dùng trục đó nghĩa là gì.
- Mỗi dòng báo cáo phải có bằng chứng cụ thể từ file, không báo chung chung.

## Ghi chú cho description
Báo cho `ds-audit-description` biết component nào có trục **không phải prop** (tương tác, nội dung). Description của component đó phải ghi rõ điều này. Nếu không, agent thấy một instance đang ở trạng thái hover trên mockup sẽ viết luôn trạng thái đó vào code.
