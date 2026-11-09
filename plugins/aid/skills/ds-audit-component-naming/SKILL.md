---
name: ds-audit-component-naming
description: Skill con của ds-audit. Kiểm component là main hay element, và tên component có đúng cú pháp không. Chỉ đánh giá và đề xuất, không sửa. Dùng khi ds-audit gọi, hoặc người dùng hỏi riêng "tên component đúng chưa", "cái này là main hay element".
---

# ds-audit-component-naming: tên component

Nhận dữ liệu từ `ds-audit` (danh sách component kèm `uses`, và bảng element được dùng trong main nào). Báo cáo theo format chung của `ds-audit`.

## Hai loại thành phần
- **Main:** thứ đặt thẳng vào màn, dùng riêng được. Ví dụ `Button`, `Text Field`, `Message / AI`.
- **Element:** cấu phần chỉ sống bên trong main, không dùng riêng. Ví dụ `--field / Label`, `--message / Text`.

## Rule
| # | Rule | Kiểm | Mức khi sai |
|---|---|---|---|
| CN1 | Main viết Title Case, không tiền tố. Thuộc một họ thì `Họ / Tên` | ✅ Tên không bắt đầu bằng `--`, mỗi từ viết hoa chữ đầu | Phải sửa |
| CN2 | Element viết `--<họ> / Tên`. Họ viết kebab-case, phần sau viết Title Case | ✅ Regex `^--[a-z0-9-]+ / [A-Z]` | Phải sửa |
| CN3 | Tiền tố của element là **họ của main sở hữu**, không phải element cha trực tiếp | ✅ So tiền tố với tên main đang dùng element đó (bảng phụ) | Phải sửa |
| CN4 | Chỉ một tầng tiền tố. Không viết `--a / b / c`, không lấy element trung gian làm tiền tố | ✅ Đếm dấu `/` sau tiền tố | Phải sửa |
| CN5 | Phần con mang gốc tên khối: `Image Grid` → `Image Grid Item` | ✅ So tên element con với element chứa nó | Nên sửa |
| CN6 | Element dùng trong nhiều main thì tiền tố là tên họ chung mô tả bản chất (`--field`, `--overlay`) | 👤 Element có tiền tố một main nhưng được dùng ở ≥ 2 main thì hỏi | Cần hỏi |
| CN7 | Main hay element do **cách dùng** quyết định, không do to nhỏ hay lồng mấy cấp. Phép thử: tách ra dùng riêng được không | 👤 Xem các ca dưới | Cần hỏi |

## Cách kiểm CN7 (chỉ nghi ngờ, không kết luận)
Đánh dấu "Cần hỏi" khi gặp:
- Main mà không component nào khác dùng, và tên hay description nói nó là một phần của thứ khác (Item, Header của…).
- Element được dùng ở từ 2 main trở lên, hoặc đứng thẳng trên màn mẫu. Có thể nên lên main.
- Nhiều element giống nhau ở các họ khác nhau (các kiểu item của menu, dropdown, sheet). Có thể nên gộp về một main.

Câu hỏi mẫu: "`--menu / Item` đang dùng ở 3 main (Menu, Dropdown, Sheet). Tách ra dùng riêng được không? Được thì nên lên main `Menu Item`."

Lên main hay không do người dùng quyết, skill chỉ đề xuất.
