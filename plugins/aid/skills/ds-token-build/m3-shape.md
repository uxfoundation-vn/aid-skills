# Dáng component theo brand

Khi các brand khác nhau **cả dáng component** (Brand 1 nút nền đặc bo 8; Brand 2 nút viền, nền trong, bo tròn hết), đổi màu ở Theme không đủ. Thêm nhóm `Component/<Tên>/*` vào Theme, mỗi mode khai dáng của brand đó.

Cần có M2 trước (collection Theme mode theo brand).

## Bước 1. Chọn component và thuộc tính
Chỉ làm cho component thực sự khác dáng giữa các brand. Hỏi người dùng, hoặc so ảnh/mô tả của các brand. Thuộc tính hay gặp:

| Token | Kiểu | Ví dụ Brand 1 · Brand 2 | Scope |
|---|---|---|---|
| `Component/Button/radius` | FLOAT | → `radius-md` · → `radius-full` | `CORNER_RADIUS` |
| `Component/Button/border-width` | FLOAT | 0 · 1.5 | `STROKE_FLOAT` |
| `Component/Button/bg` | COLOR | → `bg/bg-primary` · → `bg/bg-transparent` | `FRAME_FILL` |
| `Component/Button/border` | COLOR | → `bg/bg-primary` · → `border/border-primary` | `STROKE_COLOR` |
| `Component/Button/text` | COLOR | → `text/text-oncolor` · → `text/text-primary` | `TEXT_FILL` |
| `Component/Button/bg-opacity` | FLOAT | 1 · 0.12 | `OPACITY` |

**Giá trị trỏ về token chuẩn** (Semantic, radius), không ghi mã màu thô. Như vậy Light/Dark vẫn chạy: `Component/Button/text` → `text-primary`, mà `text-primary` đã có Light/Dark.

Cần `bg/bg-transparent` (alpha 0) trong Semantic nếu brand nào dùng nền trong suốt.

## Bước 2. Chỗ này là ngoại lệ, ghi rõ
Nhóm `Component/` trong Theme khác phần còn lại của Theme ở 3 điểm. Audit biết các ngoại lệ này qua hồ sơ (dòng "Trục: M3 (…)").
- **Scope mở, nhưng hẹp:** mỗi token chỉ mở đúng thuộc tính tên nó nói tới (S6). Phần còn lại của Theme vẫn scope rỗng (S1).
- **Component bind thẳng vào đây** thay vì Semantic, nhưng chỉ cho các thuộc tính có token ở bước 1. Thuộc tính khác của Button vẫn bind Semantic (F1).
- **Trỏ ra Semantic:** đây là chiều duy nhất Theme được trỏ ra ngoài. Semantic không bao giờ được trỏ ngược vào `Component/` (F2, tránh vòng).

Hồ sơ có thể chọn để nhóm này ở **collection riêng** (`Component Theme`, mode theo brand) thay vì trong Theme. Cách đó tách bạch hơn; DS mẫu để chung trong Theme. Cả hai đúng, ghi vào hồ sơ.

## Bước 3. Ghi và gắn
```js
{ collection: 'Theme', name: 'Component/Button/radius', type: 'FLOAT', scopes: ['CORNER_RADIUS'],
  values: { 'Brand 1': { alias: 'Semantic:radius/radius-md' }, 'Brand 2': { alias: 'Semantic:radius/radius-full' } } },
{ collection: 'Theme', name: 'Component/Button/bg', type: 'COLOR', scopes: ['FRAME_FILL'],
  values: { 'Brand 1': { alias: 'Semantic:bg/bg-primary' }, 'Brand 2': { alias: 'Semantic:bg/bg-transparent' } } },
```
Ghi bằng `write.js` (Semantic phải có sẵn trước). Gắn vào main component Button bằng `bind.js`: `p: 'radius'`, `p: 'fill'`, `p: 'stroke'`, `p: 'strokeWeight'`.

Dáng khác nhau về **cấu trúc** (brand này có icon, brand kia không; brand này 2 dòng chữ) thì token không làm được. Đó là việc của variant hoặc boolean property ở component, không phải của token.

## Bước 4. Thử
Đặt instance Button lên frame, đổi mode Theme. Nút phải đổi cả nền, viền, bo góc, màu chữ. Đổi Semantic sang Dark: cả hai kiểu nút vẫn đúng màu tối.
