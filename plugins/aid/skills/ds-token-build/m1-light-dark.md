# Light/Dark ở Semantic

**Light/Dark chỉ nằm ở Semantic** (rule F3). Primitive và Theme không có mode Light/Dark, không có biến kiểu `primary-dark`, `blue-500-dark`. Đổi sáng tối là đổi mode của Semantic; mỗi mode trỏ vào một bậc khác của cùng thang.

```
bg/bg-primary   Light → brand-600   Dark → brand-500
text/text-default   Light → neutral-900   Dark → neutral-50
```

Có M2 (nhiều brand) thì Light/Dark vẫn ở Semantic, Theme vẫn chỉ có mode theo brand. Hai trục độc lập: đổi brand đổi mode Theme, đổi sáng tối đổi mode Semantic.

## Bước 1. Mode
Collection Semantic có 2 mode `Light` · `Dark` (tên theo hồ sơ). Đang có 1 mode `Value` thì đổi tên thành `Light` rồi thêm `Dark` (`write.js` thêm mode thiếu; đổi tên mode thì làm tay hoặc `collection.renameMode`). Collection Radius, Spacing, Typography giữ 1 mode.

## Bước 2. Map Dark
Bảng mặc định, đặt cạnh cột Light của `k1.md`:

| Token | Dark · Tailwind | Dark · Radix |
|---|---|---|
| `bg/bg-default` | neutral-950 | gray-dark-1 |
| `bg/bg-subtle` | neutral-900 | gray-dark-2 |
| `bg/bg-muted` | neutral-800 | gray-dark-3 |
| `bg/bg-muted-hover` | neutral-700 | gray-dark-4 |
| `bg/bg-inverse` | neutral-50 | gray-dark-12 |
| `bg/bg-disabled` | neutral-800 | gray-dark-3 |
| `bg/bg-primary` | brand-500 | brand-dark-9 |
| `bg/bg-primary-hover` | brand-400 | brand-dark-10 |
| `bg/bg-primary-subtle` | brand-950 | brand-dark-3 |
| `bg/bg-error` … | red-500 … | red-dark-9 … |
| `bg/bg-error-subtle` … | red-950 … | red-dark-3 … |
| `text/text-default` | neutral-50 | gray-dark-12 |
| `text/text-secondary` | neutral-400 | gray-dark-11 |
| `text/text-disabled` | neutral-600 | gray-dark-8 |
| `text/text-inverse` | neutral-900 | gray-dark-1 |
| `text/text-oncolor` | `base/white`, hoặc neutral-950 nếu nền brand Dark quá sáng | `base/white` |
| `text/text-primary` | brand-400 | brand-dark-11 |
| `text/text-error` … | red-400 … | red-dark-11 … |
| `icon/icon-default` | neutral-300 | gray-dark-11 |
| `icon/icon-secondary` | neutral-500 | gray-dark-10 |
| `border/border-default` | neutral-800 | gray-dark-6 |
| `border/border-strong` | neutral-700 | gray-dark-7 |
| `border/border-primary` | brand-400 | brand-dark-8 |
| `border/border-focus` | brand-400 | brand-dark-8 |

**Radix gọn nhất:** Dark dùng cùng số bậc, chỉ đổi sang họ `-dark`. Thang Tailwind thì đảo đầu thang (50 ↔ 950) cho nền và chữ, còn màu brand lùi 1–2 bậc về phía sáng.

Hồ sơ có dòng "Light/Dark mặc định" thì theo hồ sơ (ví dụ DS chọn `bg-primary` Light 600 / Dark 400).

## Bước 3. Kiểm tương phản cả hai mode
Chạy `scale.py contrast` cho từng cặp chữ/nền ở **từng mode** (F8). Hay trượt ở Dark:
- `text-oncolor` trắng trên `bg-primary` Dark: nền brand sáng lên nên chữ trắng có thể dưới 4.5:1. Sửa: lùi `bg-primary` Dark một bậc tối hơn, hoặc cho `text-oncolor` Dark trỏ màu tối.
- `text-secondary` trên `bg-subtle`.
- Màu trạng thái (`text-warning`): vàng/cam ở Dark cần bậc sáng (300–400).

## Bước 4. Ghi
Mỗi biến Semantic có cả hai giá trị:

```js
{ collection: 'Semantic', name: 'bg/bg-primary', type: 'COLOR', scopes: ['FRAME_FILL', 'SHAPE_FILL'],
  values: { Light: { alias: 'Primitive:brand/brand-600' }, Dark: { alias: 'Primitive:brand/brand-500' } } }
```

Có M2 thì alias trỏ vào Theme thay vì Primitive, xem `m2-brand.md`.

Biến nào không đổi giữa sáng và tối (illustration giữ màu) thì hai mode trỏ cùng một chỗ, **không bỏ trống mode Dark** (F4).

## Bước 5. Thử
Nhắc người dùng: chọn một frame màn hình, ở panel bên phải đổi mode của collection Semantic sang `Dark`. Chỗ nào không đổi là chỗ còn giá trị thô hoặc gắn thẳng Primitive. Audit binding sẽ liệt kê đủ.

## Lỗi hay gặp
- Tạo `primary-light` và `primary-dark` trong Theme hay Primitive (F3). Số biến nhân đôi theo mỗi brand, và component phải biết đang ở mode nào để chọn biến.
- Tạo collection `Dark` riêng chép lại cả bộ Semantic. Hai bộ sẽ lệch tên dần. Dùng mode, không dùng bản sao.
- Gộp brand và Light/Dark thành 4 mode trong một collection (`Brand1-Light`, `Brand1-Dark`…) (F3). Thêm brand thứ 3 là phải thêm 2 mode và khai lại mọi biến.
