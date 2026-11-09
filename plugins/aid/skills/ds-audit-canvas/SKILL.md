---
name: ds-audit-canvas
description: Skill con của ds-audit. Kiểm main và element có nằm đúng section trên canvas không, và style các section có đồng bộ không. Chỉ báo lệch, không di chuyển hay sửa layer. Dùng khi ds-audit gọi, hoặc người dùng hỏi riêng "component đặt đúng chỗ chưa".
---

# ds-audit-canvas: section trên canvas

Nhận dữ liệu từ `ds-audit` (trường `section` của từng component). Báo cáo theo format chung của `ds-audit`.

Chia main và element ra hai khu riêng để người mở file thấy ngay cái nào được dùng thẳng, cái nào là cấu phần.

## Rule
| # | Rule | Kiểm | Mức khi sai |
|---|---|---|---|
| CV1 | Main nằm trong section tên bắt đầu bằng `💠` (ví dụ `💠Main Comp`, `💠Button`) | ✅ | Nên sửa |
| CV2 | Element (tên bắt đầu `--`) nằm trong section `🔒Base` | ✅ | Nên sửa |
| CV3 | Không có component nằm trơ trên canvas, ngoài mọi section | ✅ `section` = null | Nên sửa |
| CV4 | Các section cùng loại có style giống nhau (fill, stroke, độ dày stroke, bo góc). Lấy section xuất hiện nhiều nhất làm chuẩn, báo những section lệch | ✅ | Nên sửa |

## Lưu ý
- Skill chỉ báo lệch. Việc kéo component vào section để người dùng tự làm trên Figma.
- Style section là quy ước riêng của từng team. Nếu file chưa có quy ước, CV4 chỉ báo các section khác nhau, không bắt theo một giá trị cố định.
