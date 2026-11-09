# Scope của từng token

Nhận `variables`, `layers` từ `read.js` và `ds-profile.md`. Báo cáo theo format trong `SKILL.md` của `ds-token-audit`.

Scope quyết định token hiện ở ô nào trong picker của Figma. Scope đúng thì designer khó chọn nhầm, và agent đọc scope biết token dùng cho thuộc tính nào. Nhưng **scope chỉ chặn picker của người**. Agent gắn biến qua API (`setBoundVariable`) không bị chặn, nên phải kiểm cả từng layer (S5).

## Bảng ánh xạ mặc định: vai trò → scope
Hồ sơ có mục "Scope" thì dòng trong hồ sơ thay dòng tương ứng ở đây.

| Vai trò trong tên | Scope |
|---|---|
| `bg-`, `surface-`, `background` | `FRAME_FILL` `SHAPE_FILL` |
| `text-` | `TEXT_FILL` |
| `icon-` | `SHAPE_FILL` `STROKE_COLOR` |
| `object-` (chữ và icon chung) | `TEXT_FILL` `SHAPE_FILL` `STROKE_COLOR` |
| `border-`, `outline-`, `stroke-` | `STROKE_COLOR` |
| `shadow-` | `EFFECT_COLOR` |
| `radius-` | `CORNER_RADIUS` |
| `spacing-`, `gap-`, `padding-` | `GAP` |
| `size-` | `WIDTH_HEIGHT` |
| `border-width-` | `STROKE_FLOAT` |
| `opacity-` | `OPACITY` |
| Typography | `FONT_FAMILY` · `FONT_STYLE` · `FONT_WEIGHT` · `FONT_SIZE` · `LINE_HEIGHT` · `LETTER_SPACING` theo đúng loại |
| `utility/illustration/`, `utility/chart/` | `SHAPE_FILL` `STROKE_COLOR` |
| `utility/status/`, `utility/tag/` | `FRAME_FILL` `SHAPE_FILL` `TEXT_FILL` |
| `utility/social/` | `SHAPE_FILL` `FRAME_FILL` |
| Component token `<comp>/<thuộc tính>` | Chỉ thuộc tính tên nói tới: `bg` → `FRAME_FILL`, `text` → `TEXT_FILL`, `border` → `STROKE_COLOR`, `radius` → `CORNER_RADIUS`, `border-width` → `STROKE_FLOAT` |

`ALL_FILLS` coi như bằng `FRAME_FILL` + `SHAPE_FILL` + `TEXT_FILL`.

## Lượt 1 · Biến

| # | Tiêu chí | Dấu hiệu lệch | Đề xuất | Mức |
|---|---|---|---|---|
| S1 | **Tầng trong tắt scope** | Biến Primitive hoặc Theme có scope khác rỗng. Ngoại lệ: Theme typography khi hồ sơ chọn "text style gói biến"; nhóm `Component/` của M3 | Đặt scope rỗng | Phải sửa |
| S2 | **Tầng ngoài không để All scopes** | Semantic, Component có `ALL_SCOPES` | Đặt scope theo bảng | Phải sửa |
| S3 | **Tầng ngoài có ít nhất một scope** | Semantic, Component scope rỗng | Không dùng nữa thì xoá; có dùng thì mở scope theo bảng | Nên sửa |
| S4 | **Scope khớp vai trò** | Scope thừa hoặc thiếu so với bảng (`border-strong` mở `FRAME_FILL`; `text-primary` thiếu `TEXT_FILL`) | Sửa scope theo bảng | Phải sửa (thiếu scope chính, mở scope sai loại) · Nên sửa (thừa một scope cùng loại, như `bg-` mở thêm `TEXT_FILL`) |
| S6 | **Component token mở hẹp** | Component token (K2, M3) mở nhiều hơn thuộc tính tên nó nói tới | Thu về đúng một loại | Phải sửa |

Vai trò không có trong bảng (tiền tố lạ) thì không đoán scope: ghi Cần hỏi, kèm scope hiện tại.

## Lượt 2 · Layer

| # | Tiêu chí | Kiểm thế nào | Đề xuất | Mức |
|---|---|---|---|---|
| S5 | **Layer dùng token đúng scope** | Mỗi entry có `v` trong `layers`: tìm biến, xét `t` (scope mà chỗ đó cần) có nằm trong scope của biến không | Đổi sang token cùng màu đúng vai trò (dùng cách tìm của `binding.md`), hoặc nếu token đặt scope sai thì sửa scope ở lượt 1 | Phải sửa |

Ví dụ S5: fill của frame `Chat bubble` gắn `object/object-oncolor` (scope `TEXT_FILL`). Thường do agent hoặc plugin gắn, hoặc gắn trước khi scope được thu hẹp.

Khi S5 và S4 cùng một biến (biến scope sai mà nhiều layer gắn theo đúng ý nghĩa thật của nó) thì sửa scope của biến (S4), đừng đề xuất đổi binding của từng layer. Phán đoán bằng số đông: phần lớn layer dùng biến cho một thuộc tính → đó là vai trò thật.

## Cách kết luận
- Gộp theo biến ở lượt 1, theo biến + thuộc tính ở lượt 2.
- Đầu phần này ghi: số biến tầng ngoài, bao nhiêu biến đang `ALL_SCOPES`. File làm tay thường có rất nhiều biến `ALL_SCOPES` vì đó là mặc định của Figma; báo một dòng chung kèm số lượng, không liệt kê từng biến.
- Sửa scope không ảnh hưởng layer đã gắn, nên an toàn. Nhắc người dùng điều này khi đề xuất.
