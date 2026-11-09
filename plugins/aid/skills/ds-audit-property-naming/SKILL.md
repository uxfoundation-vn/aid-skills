---
name: ds-audit-property-naming
description: Skill con của ds-audit. Kiểm tên property của component (variant, boolean, text, size, instance swap, slot) có đúng chuẩn và khớp được với code không. Chỉ đánh giá và đề xuất, không sửa. Dùng khi ds-audit gọi, hoặc người dùng hỏi riêng "tên property đúng chưa".
---

# ds-audit-property-naming: tên property

Nhận dữ liệu từ `ds-audit` (trường `props` của từng component). Báo cáo theo format chung của `ds-audit`.

Lý do quan trọng: **tên property trong Figma chính là tên prop trong code.** Agent đọc Figma thấy tên nào thì viết code đúng tên đó. Đặt tên tuỳ hứng là agent phải đoán.

## Rule chung
| # | Rule | Kiểm | Mức khi sai |
|---|---|---|---|
| PN1 | Tên property viết lowerCamelCase | ✅ Regex `^[a-z][a-zA-Z0-9]*$` | Phải sửa |
| PN2 | Giá trị variant viết kebab-case | ✅ Regex `^[a-z0-9]+(-[a-z0-9]+)*$` | Phải sửa |
| PN3 | Boolean variant có giá trị đúng `true` / `false` (không `yes/no`, `True/False`, `on/off`) | ✅ | Phải sửa |
| PN4 | Không để tên mặc định của Figma (`Property 1`, `Variant`, `Boolean`). `type` hợp lệ khi giá trị là các kiểu thật của component (trục riêng ở `ds-audit-structure`) | ✅ | Phải sửa |
| PN5 | Text property đặt theo vai trò của chữ, không theo nội dung mẫu, không đánh số (`fileName2` ❌, `Hello` ❌) | ✅ Đuôi số, hoặc tên trùng chữ mẫu | Phải sửa |
| PN6 | Slot đặt theo vai trò (`bubbleContent`, `actions`), không `slot`, `slot1` | ✅ | Phải sửa |
| PN7 | Cùng khái niệm thì cùng tên ở mọi component. Một tên chỉ mang một nghĩa | ✅ Gom tên property cả file, tìm cặp gần nghĩa (`subtext`/`subtitle`, `iconLeft`/`leadingIcon`) | Nên sửa |

## Boolean
| # | Rule | Kiểm | Mức khi sai |
|---|---|---|---|
| PN8 | Cờ điều kiện dùng tên trần: `disabled`, `loading`, `selected`, `checked`, `active`, `readOnly`. Không `is*`, `has*` | ✅ Tiền tố `is`/`has` | Phải sửa |
| PN9 | Bật/tắt một phần tử dùng `show…` (`showTitle`, `showLeadingIcon`). Không tên trần kiểu `icon`, `badge`, không đuôi `Visible` | ✅ Boolean property (không phải variant) thiếu `show` | Phải sửa |
| PN10 | Phần tử là nút thì thêm `Button`: `showClearButton`, `showCloseButton` | ✅ | Nên sửa |
| PN11 | Cờ hành vi, không phải ẩn/hiện, giữ tên trần: `required`, `removable` | 👤 Boolean không có `show` mà không thuộc danh sách cờ ở PN8 thì hỏi: đây là ẩn/hiện hay hành vi? | Cần hỏi |

## Text cùng nghĩa
| # | Vai trò | Tên đúng | Không dùng |
|---|---|---|---|
| PN12 | Dòng chính | `title` | `heading`, `Title` |
| | Dòng phụ ngắn, một dòng | `subtitle` | `subtext`, `subheading` |
| | Đoạn giải thích, nhiều dòng | `description` | `desc`, `subtext` |
| | Chữ gợi ý trong ô trống | `placeholder` | `hintText` |
| | Chữ trợ giúp cạnh nhãn field | `helperText` | `helper` |
| | Chữ trên nút, chip, nhãn field | `label` | `text` |

✅ Gặp tên ở cột "Không dùng" thì đề xuất tên đúng. Mức: Nên sửa.

## Size và icon
| # | Rule | Kiểm | Mức khi sai |
|---|---|---|---|
| PN13 | Size dùng `sm · md · lg`, nối ra hai đầu `2xs · xs … xl · 2xl · 3xl`. Không dùng chữ (`large`, `medium`), không dùng số px | ✅ | Phải sửa |
| PN14 | Instance swap đặt tên danh từ theo vị trí hoặc vai trò: `icon`, `leadingIcon`, `trailingIcon`, `logo`. Không đuôi `Swap`, không `iconLeft`, `prefixIcon` | ✅ | Phải sửa |
| PN15 | Instance swap ẩn/hiện được thì boolean đi kèm là `show` + tên swap (`leadingIcon` + `showLeadingIcon`) | ✅ | Nên sửa |
| PN16 | Tên swap không trùng tên một trục variant | ✅ | Phải sửa |
