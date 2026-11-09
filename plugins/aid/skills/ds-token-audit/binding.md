# Layer gắn token

Nhận `layers` và `variables` từ `read.js`, cùng `ds-profile.md`. Báo cáo theo format trong `SKILL.md` của `ds-token-audit`.

Đây là phần học viên thấy rõ nhất: đổi brand hoặc Light/Dark mà chỗ nào đứng yên, chỗ đó nằm trong báo cáo này.

**Tầng ngoài cùng** = Semantic (K1) hoặc Component (K2). Có M3 thì thêm nhóm `Component/` trong Theme cho đúng các thuộc tính có token.

## Tiêu chí

| # | Tiêu chí | Kiểm thế nào | Dấu hiệu lệch | Đề xuất | Mức |
|---|---|---|---|---|---|
| F1a | **Không còn màu thô** | Entry `raw` ở `fill`, `stroke`, `effect` | Fill `#2563eb` không gắn biến | Token gần nhất đúng scope (cách tìm bên dưới) | Phải sửa |
| F1b | **Không còn số thô ở bo góc, khoảng cách, cỡ chữ** | Entry `raw` ở `radius`, `padding*`, `itemSpacing`, `fontSize` | Bo góc `6` không gắn biến | Token gần nhất trong thang; giá trị lệch thang thì hỏi có nên làm tròn | Nên sửa |
| F1c | **Không gắn tầng trong** | Entry `v` trỏ vào collection Primitive hoặc Theme (trừ ngoại lệ M3) | Fill gắn `Primitive:blue/blue-600` | Token Semantic đang trỏ tới đúng biến đó, hoặc gần nhất | Phải sửa |
| F1d | **Không dùng Color Style thay biến** | Entry `style` ở fill/stroke | Fill dùng style `Brand/Primary` | Chuyển sang biến. Style đã gắn biến bên trong thì Nên sửa thay vì Phải sửa | Nên sửa |
| F11 | **Không lẫn màu brand và utility** | So tên layer, `comp` với nhóm token | Layer trong illustration (tên layer hoặc component có `illustration`, `illus`, `minh hoạ`, `artwork`, `spot`) gắn token có chain đi qua Theme · component điều khiển (Button, Input, Tab…) gắn `utility/illustration/*` | Đổi sang nhóm đúng | Cần hỏi |
| B1 | **Component dùng token của chính nó** (K2, M3) | Tên token Component so với `comp` | `Button` gắn `input/border` | Token của `button/`, hoặc Semantic | Nên sửa |

Text dùng text style là đúng, không báo F1b cho `fontSize` của layer có entry `textStyle`.
Paint dạng gradient, ảnh (`other`) thì bỏ qua, ghi số lượng ở cuối báo cáo.

## Tìm token đề xuất
Với mỗi giá trị thô hoặc biến Primitive:
1. Lọc ứng viên: token tầng ngoài cùng, scope chứa đúng `t` của entry (hoặc `ALL_FILLS` với fill), không `hidden`.
2. Lấy giá trị cuối của ứng viên ở mode mặc định (`resolved[mode].final`, hoặc `values` nếu không có alias).
3. Màu: chạy `python3 ../ds-token-build/scale.py nearest "<mã thô>" "<tên>=<hex>" …`. Kết quả `trùng` → đề xuất thẳng. `gần` → đề xuất, ghi "lệch nhẹ". `khác` → Cần hỏi: màu này đóng vai trò gì, có cần token mới không.
4. Gắn Primitive: nếu có token Semantic trỏ đúng vào biến Primitive đó thì đề xuất token ấy. Nhiều token cùng trỏ vào (`bg-muted` và `bg-disabled` cùng neutral-100) thì chọn theo ngữ cảnh layer, không chắc thì Cần hỏi.
5. Màu chữ chọn trong `text-`, nền frame trong `bg-`, viền trong `border-`. Không đề xuất token sai vai trò dù màu trùng (chữ xám trùng màu với viền xám vẫn phải dùng `text-`).

## Gộp báo cáo
- Cùng một giá trị thô xuất hiện ở nhiều layer → một dòng, ghi số layer, 3 id ví dụ và các component chứa nó.
- Xếp theo component (`comp`), layer không thuộc component nào (màn hình) xếp cuối.
- Layer nằm trong instance không có trong dữ liệu (`read.js` bỏ qua): lỗi của chúng nằm ở main component. Ghi chú điều này ở đầu báo cáo.

## Khi người dùng bảo sửa
Chuyển bảng đề xuất đã duyệt thành `BINDINGS` cho [`bind.js`](../ds-token/bind.js) (`id`, `p`, `v` = `Collection:tên`), chạy `DRY_RUN = true`, đưa danh sách bị chặn (sai scope, nằm trong instance) cho người dùng, rồi mới chạy thật. Nhắc lưu version Figma trước.
