---
name: ds-audit-description
description: Skill con của ds-audit. Kiểm description của main và element theo mẫu agent-friendly (học từ Astryx): một câu nói nó là gì, USE WHEN, DON'T, KEYWORDS, và ghi rõ thứ không phải prop. Chỉ đánh giá và đề xuất bản viết lại, không sửa file. Dùng khi ds-audit gọi, hoặc người dùng hỏi riêng "description viết đúng chưa".
---

# ds-audit-description: mô tả component

Nhận dữ liệu từ `ds-audit` (trường `description`, `props`, `variants`) và ghi chú từ `ds-audit-structure`. Báo cáo theo format chung của `ds-audit`.

Lý do quan trọng: agent đọc Figma qua MCP chủ yếu nhìn thấy **tên + description**. Description là thứ giúp người và agent chọn đúng component, không phải chỗ liệt kê variant.

## Mẫu cho main
```
<Tên>: <nó là gì, một câu>.
USE WHEN: <tình huống nên dùng>.
DON'T: <tình huống không dùng> → <component dùng thay>.
KEYWORDS: <từ người dùng hay gọi, cả tiếng Việt và tiếng Anh>
NOT PROPS (preview only): <state, filled… nếu có>
```

## Mẫu cho element
```
🚫 Don't use this component separately, it is a part of a main component.
```

## Rule
| # | Rule | Kiểm | Mức khi sai |
|---|---|---|---|
| DE1 | Main có description, không để trống | ✅ | Phải sửa |
| DE2 | Element có đúng câu 🚫 ở trên | ✅ | Phải sửa |
| DE3 | Main có đủ 4 phần: câu mở đầu · `USE WHEN` · `DON'T` · `KEYWORDS` | ✅ Tìm 3 nhãn | Phải sửa |
| DE4 | `DON'T` chỉ sang một component dùng thay bằng `→`, và component đó **có thật** trong file | ✅ Tên sau `→` có trong danh sách component | Phải sửa |
| DE5 | Component có `state` hoặc `filled` thì description ghi rõ đó không phải prop | ✅ Dựa vào ghi chú của `ds-audit-structure` | Phải sửa |
| DE6 | Không mô tả sai trục thật. Nếu có dòng `Variants:` thì phải khớp đúng tên các trục | ✅ So với `props` | Phải sửa |
| DE7 | Câu mở đầu nói **nó là gì và để làm gì**, không chỉ nhắc lại tên (`Button: a button` ❌) | 👤 | Cần hỏi |
| DE8 | `KEYWORDS` có cả tiếng Việt lẫn tiếng Anh, gồm cả cách gọi đời thường (ô nhập, menu ba chấm) | ✅ Có chữ có dấu tiếng Việt | Nên sửa |

## Đề xuất bản viết lại
Với mỗi main sai DE1, DE3, DE5 hoặc DE6, viết sẵn một bản description theo mẫu, dựa trên tên, property và cách component được dùng. Chỗ nào không đủ dữ liệu (ví dụ không biết component nào dùng thay) thì để `[CẦN ĐIỀN]`, không bịa tên component.
