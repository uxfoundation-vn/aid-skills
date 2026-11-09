# Giá trị

Nhận `variables` (có `resolved`) từ `read.js` và `ds-profile.md`. Báo cáo theo format trong `SKILL.md` của `ds-token-audit`. Tính tương phản bằng `python3 ../ds-token-build/scale.py contrast "<a>" "<b>"`.

## Tiêu chí

| # | Tiêu chí | Kiểm thế nào | Dấu hiệu lệch | Đề xuất | Mức |
|---|---|---|---|---|---|
| F8 | **Tương phản đạt AA ở mọi mode** | Từng cặp ở bảng dưới, với **mỗi mode Semantic × mỗi mode brand** | Chữ < 4.5:1 · icon, viền ô nhập < 3:1 | Lùi bậc trong thang (bậc nào đạt thì đề xuất bậc đó) | Phải sửa |
| F9 | **Không trùng vai trò, trùng giá trị** | Trong cùng một tầng, hai biến có cùng giá trị cuối ở **mọi** mode **và** cùng vai trò (cùng tiền tố, tên gần nghĩa: `bg-primary` với `bg-brand`, `text-default` với `text-body`) | `bg/bg-brand` và `bg/bg-primary` trùng hoàn toàn | Gộp về một, đổi layer đang gắn sang token giữ lại | Nên sửa |
| V1 | **Thang primitive đủ bậc, đều độ sáng** | Mỗi họ màu ở Primitive: bậc thiếu so với thang hồ sơ; độ sáng không giảm dần (dùng `scale.py gen` với màu bậc giữa để so) | `blue` có 50, 100, 500, 900 · bậc 400 tối hơn 500 | Sinh lại họ đó bằng `../ds-token-build/primitive.md`, giữ đúng màu bậc neo | Nên sửa |

Hai token **khác** vai trò cùng trỏ một giá trị là bình thường (`bg-muted` và `bg-disabled`), không báo F9.

## Cặp kiểm tương phản
Dựng cặp theo tên trong bộ vai trò của hồ sơ. Mặc định:

| Chữ / icon | Trên nền | Ngưỡng |
|---|---|---|
| `text-default`, `text-secondary` | `bg-default`, `bg-subtle`, `bg-muted` | 4.5 |
| `text-primary`, `text-error`, `text-success`, `text-warning` | `bg-default` | 4.5 |
| `text-oncolor` | `bg-primary`, `bg-error`, `bg-success`, `bg-info` (và `-hover`) | 4.5 |
| `text-inverse` | `bg-inverse` | 4.5 |
| `text-error` | `bg-error-subtle` (tương tự với success, warning, info) | 4.5 |
| `text-primary` | `bg-primary-subtle` | 4.5 |
| `icon-default`, `icon-secondary` | `bg-default` | 3 |
| `border-strong` (viền ô nhập) | `bg-default` | 3 |
| Component token K2/M3: `<comp>/text` | `<comp>/bg` | 4.5 |
| `utility/status/*` chữ | nền nhãn tương ứng | 4.5 |

**Không kiểm:** `text-disabled`, `border-default` (viền trang trí), placeholder. WCAG không yêu cầu với chữ vô hiệu và viền trang trí.

## Lấy giá trị theo mode
- `resolved[mode].final` cho từng mode Semantic. Có M2: `read.js` lần alias theo mode mặc định của Theme. Để kiểm đủ brand, với mỗi biến Theme trong chain, đọc `values` của biến Theme đó ở từng mode brand rồi lần tiếp xuống Primitive (tra trong `variables`).
- Màu có alpha (`#rrggbbaa`): ghép lên màu nền trước khi tính tương phản, ghi rõ trong báo cáo.

## Cách kết luận
- Mỗi cặp trượt một dòng: `text-oncolor / bg-primary · Dark · Brand 2 · 3.1:1`, kèm đề xuất bậc mới và tỉ lệ đạt được sau khi đổi.
- Cùng một cặp trượt ở nhiều brand → gộp, liệt kê brand.
- Có M3 mà Button brand nền trong suốt: kiểm `button/text` trên `bg-default` thay vì trên `button/bg`.
