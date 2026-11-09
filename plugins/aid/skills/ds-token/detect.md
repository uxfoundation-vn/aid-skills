# Nhận diện bộ token có sẵn

Đầu vào: kết quả [`read.js`](read.js) chạy với `READ_VARS = true`. Nên kèm `ROOT_IDS` là một page có component, để đoán được component đang bind vào tầng nào.

Đầu ra: file `ds-profile.md` nháp (theo mẫu [`ds-profile.mau.md`](ds-profile.mau.md)) và một bảng độ chắc chắn cho từng mục.

**Không tự đoán khi không chắc.** Mục nào dấu hiệu lẫn lộn thì ghi "chưa chắc" và hỏi lại người dùng. Hồ sơ sai thì cả bản audit sau đó sai theo.

## Bước 1. Gán tầng cho từng collection
Xét từng collection theo các dấu hiệu dưới đây. Một collection có thể chứa hai tầng (hay gặp: primitive và semantic chung một collection). Khi đó ghi rõ nhóm nào thuộc tầng nào.

| Tầng | Dấu hiệu |
|---|---|
| **Primitive** | Phần lớn giá trị là giá trị thô (hex, số). Tên có họ màu và số bậc (`blue-500`, `gray/100`, `blue.9`). 1 mode. Ít hoặc không trỏ tới collection khác |
| **Theme** | Nhiều mode, tên mode giống tên brand, sản phẩm, khách hàng (không phải Light/Dark). Ít biến. Collection khác trỏ vào nó |
| **Semantic** | Phần lớn là alias. Tên chứa từ vai trò: `bg`, `background`, `surface`, `text`, `fg`, `on-`, `object`, `icon`, `border`, `outline`, `stroke`. Mode Light/Dark nếu có |
| **Component** | Tên mở đầu bằng tên component (`button/`, `input/`, `chat/`). Trỏ vào Semantic |

Collection có tên rõ (`Primitive`, `Global`, `Core`, `Alias`, `Semantic`, `Theme`, `Brand`) thì lấy tên làm gợi ý, nhưng vẫn kiểm bằng dấu hiệu. Tên và nội dung lệch nhau thì ghi "chưa chắc".

## Bước 2. Khung
- Không có Variables, hoặc có nhưng trong `layers` phần lớn entry là `raw` / `style` → **K0**. Nếu một phần đã bind thì ghi "lai K0–K1".
- Có Primitive và Semantic, component bind vào Semantic → **K1**.
- Có tầng Component và component bind vào đó → **K2**.
- Chuỗi alias dài nhất (đếm từ biến component bind tới giá trị thô) là bằng chứng phụ: 1 bước ≈ K0/K1 phẳng, 2 bước ≈ K1, 3 bước trở lên ≈ K1 + M2 hoặc K2.

## Bước 3. Trục mode
- Có mode tên Light/Dark (hoặc Sáng/Tối, Day/Night) → **M1**, ghi nằm ở collection nào.
- Có collection mode theo brand → **M2**.
- Collection Theme có nhóm `Component/…` hoặc biến tên component (radius, border-width, alpha của từng component) → **M3**.
- Mode khác (Compact/Comfortable, iOS/Android, High contrast) → ghi vào "Trục khác".
- Hai trục nằm trong cùng một collection (mode `Brand1-Light`, `Brand1-Dark`…) → vẫn ghi đúng trục, và đánh dấu để `../ds-token-audit/structure.md` báo F3.

## Bước 4. Primitive và thang
- Đếm dãy bậc phổ biến nhất: `50…950` (11 bậc) → thang Tailwind; `1…12` → thang Radix; `50…900`, `100…1000`, `10…100` → thang tự làm.
- So vài giá trị với bảng có sẵn `../ds-token-build/presets/tailwind.md`, `../ds-token-build/presets/radix.md` (ví dụ bậc 500 / bậc 9 của họ xanh dương, xám): trùng nhiều → nguồn Tailwind / Radix, lệch → tự làm. Tailwind bản 3 có mã khác bản 4 (`blue-600` là `#2563eb` thay vì `#155dfc`), lệch đều cả họ như vậy thì ghi "Tailwind 3".
- Nhiều thang cùng tồn tại → ghi cả, đánh dấu để `../ds-token-audit/naming.md` báo F7.

## Bước 5. Đặt tên
- Dấu phân cách nhóm: `/` hay `.`.
- Có lặp tiền tố nhóm không (`bg/bg-primary` hay `bg/primary`).
- Bộ vai trò: liệt kê các tiền tố cấp 1 trong Semantic, xếp theo số biến.

## Bước 6. Utility
Tìm nhóm Semantic có tên `utility`, `fixed`, `static`, `illustration`, `chart`, `status`, `social`, hoặc nhóm toàn alias trỏ thẳng Primitive dù cả bộ có Theme. Ghi vào bảng Utility, kèm có Light/Dark hay không.

## Bước 7. Lựa chọn
- **Theme ghi giá trị:** biến Theme là giá trị thô → "ghi thẳng giá trị"; là alias tới Primitive → "alias về Primitive".
- **Typography:** có collection/nhóm typo với scope `FONT_*` và text style dùng biến → "text style gói biến".
- **Bo góc đổi theo brand:** radius nằm trong Theme → có.
- **Light/Dark mặc định:** lấy 2–3 biến brand (ví dụ `bg-primary`) xem mode Light và Dark trỏ vào bậc nào.

## Bước 8. Scope
Với mỗi tiền tố vai trò, gom scope phổ biến nhất của các biến trong nhóm đó. Khác bảng mặc định của `../ds-token-audit/scope.md` thì ghi vào mục Scope của hồ sơ. Scope lẫn lộn trong cùng một nhóm thì không ghi vào hồ sơ, để audit báo S4.

## Trình bày
1. Tóm tắt một câu: "Bộ token này là K1 + M1 + M2, primitive theo thang Tailwind, đặt tên `bg/bg-primary`."
2. Bảng độ chắc chắn:

| Mục | Đoán | Bằng chứng | Độ chắc |
|---|---|---|---|
| `Core` | Primitive | 220 biến, 100% giá trị thô, tên `blue/blue-500` | Chắc |
| `Brand` | Theme hay Semantic? | 3 mode tên brand, nhưng tên biến có `bg-` | Chưa chắc — hỏi |

3. Ghi `ds-profile.md` vào thư mục làm việc. Mục "chưa chắc" ghi `??` kèm câu hỏi.
4. Hỏi từng mục `??`. Người dùng trả lời xong mới chuyển sang audit.
