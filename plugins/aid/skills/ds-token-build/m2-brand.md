# Tầng Theme, mode theo brand

```
Primitive  →  Theme (mode: Brand 1 · Brand 2)  →  Semantic (Light · Dark)  ←  component bind
     └──────────────── màu cố định ──────────────────↗
```

## Câu hỏi quyết định mọi thứ
Với từng giá trị: **"Đổi brand thì giá trị này có đổi không?"**
- **Có** → nằm ở Theme. Semantic trỏ vào Theme.
- **Không** → không vào Theme. Semantic trỏ thẳng Primitive.

| Ví dụ | Đổi brand có đổi không? | Trỏ về |
|---|---|---|
| `bg-primary` khi mỗi brand một màu chủ đạo | Có | Theme › `primary/primary-600` |
| `radius-md` khi brand này bo tròn, brand kia vuông | Có | Theme › `radius/…` |
| Font chữ | Thường có | Theme › `font/family-…` |
| Xám trung tính, màu lỗi/thành công | Thường không | Primitive |
| Illustration, nhãn trạng thái cố định | Không | Primitive, qua nhóm `utility/` |
| Khoảng cách | Không | Số cố định |

**Theme càng ít biến càng tốt.** Chỉ giữ phần thật sự khác nhau. Theme phình to là dấu hiệu đang chép Semantic vào Theme.

## Bước 1. Collection Theme
- Tên theo hồ sơ (`Theme`, `1. Theme`, `Brand`).
- Mỗi brand một mode, tên mode là tên brand.
- **Không có mode Light/Dark trong Theme** (F3).
- Scope rỗng (S1). Ngoại lệ: nhóm typography khi hồ sơ chọn "text style gói biến" thì mở scope `FONT_*`; nhóm `Component/` của M3 mở scope hẹp.
- `hidden: true`.

## Bước 2. Thang brand
Theo lựa chọn "Theme ghi giá trị" trong hồ sơ:

**Alias về Primitive** (mặc định): thang từng brand nằm ở Primitive (`brand-1/brand-1-600`), Theme trỏ vào.
```bash
python3 scale.py theme --brand "Brand 1=#2F5BD3" --brand "Brand 2=#E11D48" --anchor 600 --alias-primitive Primitive
```

**Ghi thẳng giá trị:** Theme giữ mã màu, Primitive không có thang brand.
```bash
python3 scale.py theme --brand "Brand 1=#2F5BD3" --brand "Brand 2=#E11D48" --anchor 600
```

Lệnh in ra `variables` sẵn cho `PLAN` của `write.js`, và `warnings` của từng brand (bậc chữ chưa đạt AA…). Đọc cảnh báo cho người dùng.

Cả hai cách đều đúng (rule linh động). Ghi thẳng giá trị thì gọn hơn khi brand ít; alias thì bảng màu nằm một chỗ, dễ so các brand với nhau.

## Bước 3. Nối Semantic vào Theme
Token Semantic đổi theo brand đổi alias từ Primitive sang Theme, giữ nguyên tên và bậc:

```js
{ collection: 'Semantic', name: 'bg/bg-primary', type: 'COLOR', scopes: ['FRAME_FILL', 'SHAPE_FILL'],
  values: { Light: { alias: 'Theme:primary/primary-600' }, Dark: { alias: 'Theme:primary/primary-500' } } }
```

Token không đổi theo brand giữ alias tới Primitive. Component không phải sửa gì: vẫn bind Semantic như cũ.

## Bước 4. Bo góc, font
Nếu đổi theo brand:
```js
{ collection: 'Theme', name: 'radius/radius-md', type: 'FLOAT', scopes: [], values: { 'Brand 1': 8, 'Brand 2': 0 } },
{ collection: 'Semantic', name: 'radius/radius-md', type: 'FLOAT', scopes: ['CORNER_RADIUS'], values: { Light: { alias: 'Theme:radius/radius-md' }, Dark: { alias: 'Theme:radius/radius-md' } } }
```
Nếu radius để ở collection riêng 1 mode (`3. Border Radius`) thì trỏ từ đó sang Theme, khỏi phải lặp Light/Dark.

## Bước 5. Thử
Chọn một frame, đổi mode của collection Theme sang brand khác. Màu brand, bo góc, font đổi; xám, trạng thái, illustration đứng yên. Đổi thêm Semantic sang Dark: brand mới ở dạng tối.

## Lỗi hay gặp
- **Brand là bản copy, không phải mode:** `Button - Brand A`, `Button - Brand B`. Một component, khác biệt nằm ở mode Theme.
- **Đưa cả màu cố định vào Theme** rồi khai giống nhau ở mọi brand. Thêm brand mới quên khai là lệch (F10 với utility).
- **Light/Dark trong Theme:** `primary-light`, `primary-dark` (F3).
- **Component bind thẳng Theme** (F1), bỏ qua Semantic. Ngoại lệ duy nhất là nhóm `Component/` của M3.
- **Brand khác cả dáng component** (nút đặc với nút viền) mà cố nhét vào màu → cần M3, xem `m3-shape.md`.
