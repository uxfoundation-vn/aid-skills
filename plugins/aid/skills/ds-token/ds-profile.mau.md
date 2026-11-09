# Hồ sơ DS: <tên DS>

Cả 3 skill `ds-token`, `ds-token-build`, `ds-token-audit` đọc file này trước khi làm. Mục nào để trống thì dùng giá trị mặc định ghi trong ngoặc.

## Cấu trúc
- Khung: K1   *(K1 · K2)*
- Trục: M1   *(M1 Light/Dark · M2 multi-brand đổi màu · M3 multi-brand đổi dáng; để trống nếu không có)*
- Trục khác: *(tên trục · tầng · các mode; ví dụ: Density · Semantic · Compact, Comfortable)*

## Collection
| Tầng | Tên trong file | Mode |
|---|---|---|
| Primitive | Primitive | Value |
| Theme | Theme | Brand 1 · Brand 2 |
| Semantic | Semantic | Light · Dark |
| Component | Component | Value |

*(Bỏ dòng Theme nếu không có M2. Bỏ dòng Component nếu không phải K2.)*

## Primitive
- Nguồn: Tailwind   *(Tailwind · Radix · tự làm · ghép, ví dụ "Tailwind cho trung tính và trạng thái, tự làm cho brand")*
- Thang: 50–950   *(50–950 · 1–12 · 50–900 · 100–1000; cả bộ dùng chung một thang)*
- Màu brand gốc: *(mã hex, mỗi brand một dòng)*

## Đặt tên
- Phân cách nhóm: `/`   *(`/` · `.`)*
- Kiểu tên: kebab, có lặp tiền tố nhóm   *(ví dụ `bg/bg-primary`; hoặc không lặp: `bg/primary`)*
- Bộ vai trò màu: bg · text · icon · border   *(ví dụ khác: bg · object · border; surface · on-surface · outline)*
- Tên primitive: `<họ màu>/<họ màu>-<bậc>`   *(ví dụ `blue/blue-500`)*

## Lựa chọn
- Theme ghi giá trị: alias về Primitive   *(alias về Primitive · ghi thẳng giá trị)*
- Màu không đổi theo brand: trỏ thẳng Primitive   *(trỏ thẳng Primitive · qua Theme)*
- Typography: text style gói biến   *(text style gói biến · có tầng alias riêng)*
- Bo góc đổi theo brand: không   *(có thì nằm ở Theme)*
- Khoảng cách: cố định   *(cố định · đổi theo trục khác, ví dụ Density)*
- Light/Dark mặc định: theo bảng trong `../ds-token-build/m1-light-dark.md` (nền brand Light 600 / Dark 500, chữ brand Light 600 / Dark 400)   *(chỉ dùng khi có M1; ghi đè từng token nếu DS khác)*

## Utility (không đổi theo brand)
*(Bỏ trống nếu không có. Mỗi nhóm một dòng.)*
| Nhóm | Dùng cho | Light/Dark |
|---|---|---|
| utility/illustration | hình minh hoạ | không |
| utility/status | nhãn trạng thái | có |

## Scope
*(Chỉ ghi chỗ khác bảng mặc định trong file `../ds-token-audit/scope.md`.)*
| Vai trò | Scope |
|---|---|

## Rule riêng
*(Rule của đội, đánh mã R1, R2… Ghi rõ kiểm gì và mức.)*
- R1:

## Hạ mức
*(Rule cố định muốn hạ từ "Phải sửa" xuống "Nên sửa". Bắt buộc có lý do. Không xoá được rule cố định.)*
| Rule | Áp cho | Lý do |
|---|---|---|
