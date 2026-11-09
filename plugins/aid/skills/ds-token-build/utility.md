# Màu giữ nguyên ở mọi brand

Có những màu **không được đổi khi đổi brand**. Chúng cần một nhóm riêng, đi thẳng từ Semantic xuống Primitive, **không qua Theme** (rule F10).

## Bước 1. Tìm nhóm cần có
Hỏi người dùng, hoặc nhìn kết quả `collect.js` / `read.js` (màu dùng trong illustration, nhãn, biểu đồ). Các nhóm hay gặp:

| Nhóm | Ví dụ tên | Light/Dark mặc định | Scope mặc định |
|---|---|---|---|
| Illustration | `utility/illustration/sky`, `…/leaf`, `…/skin-1` | Không, hình vẽ giữ màu | `SHAPE_FILL` `STROKE_COLOR` |
| Trạng thái | `utility/status/success`, `…/warning`, `…/error`, `…/info` (kèm `-subtle` cho nền nhạt) | Có, bản tối sáng hơn để đủ tương phản | `FRAME_FILL` `SHAPE_FILL` `TEXT_FILL` |
| Biểu đồ | `utility/chart/1` … `8` | Có, giữ thứ tự màu | `SHAPE_FILL` `STROKE_COLOR` |
| Thương hiệu ngoài | `utility/social/facebook`, `…/zalo`, `…/google` | Không | `SHAPE_FILL` `FRAME_FILL` |
| Nhãn người dùng chọn | `utility/tag/red`, `…/teal` | Có | `FRAME_FILL` `SHAPE_FILL` `TEXT_FILL` |

Tên nhóm (`utility/`, `fixed/`, `static/`) và có Light/Dark hay không là **linh động**, theo hồ sơ. Việc không đi qua Theme là **cố định**.

**Phân biệt với màu trạng thái của semantic.** Nếu DS đã có `bg-error`, `text-success` trong Semantic và chúng không đổi theo brand, thì không cần nhân đôi sang `utility/status`. Chỉ tạo `utility/status` khi nhãn trạng thái có màu riêng (ví dụ nhãn đơn hàng 6 trạng thái), hoặc khi Semantic `error`/`success` lại đổi theo brand.

## Bước 2. Giá trị
- Màu nằm trong thang primitive đã có → trỏ vào bậc đó (`teal/teal-400`).
- Màu ngoài thang (logo Zalo, màu da trong illustration) → thêm vào Primitive ở nhóm `Utility/` (`Utility/zalo`, `Utility/skin-1`), scope rỗng, rồi trỏ vào đó. **Không** ghi giá trị thô thẳng vào Semantic.
- Có Light/Dark: Light và Dark trỏ vào hai bậc khác nhau của cùng một họ. Kiểm tương phản bằng `scale.py contrast` (chữ trên nền nhãn ≥ 4.5:1, icon/viền ≥ 3:1).

## Bước 3. Kế hoạch ghi
Ví dụ trong `PLAN.variables` của `write.js`:

```js
{ collection: 'Semantic', name: 'utility/status/success', type: 'COLOR',
  scopes: ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL'],
  values: { Light: { alias: 'Primitive:green/green-600' }, Dark: { alias: 'Primitive:green/green-400' } } },
{ collection: 'Semantic', name: 'utility/illustration/leaf', type: 'COLOR',
  scopes: ['SHAPE_FILL', 'STROKE_COLOR'],
  values: { Light: { alias: 'Primitive:green/green-500' }, Dark: { alias: 'Primitive:green/green-500' } } },
```

Nhóm không có Light/Dark mà Semantic lại có 2 mode thì **hai mode trỏ cùng một chỗ** như `illustration/leaf` ở trên. Không bỏ trống mode nào (rule F4).

## Bước 4. Kiểm
- Không biến `utility/` nào có chuỗi alias đi qua collection Theme (F10).
- Sau khi bind, chạy audit binding: component màu brand không bind `utility/`, illustration không bind màu brand (F11).
- Nhắc người dùng thử đổi mode Theme trên một frame có illustration: illustration phải đứng yên.

## Vì sao không để utility trong Theme
Theme có mode theo brand. Để màu utility trong Theme thì mỗi brand phải khai lại cùng một giá trị, sớm muộn sẽ có brand khai lệch, và lúc đó illustration đổi màu theo brand mà không ai để ý. Trỏ thẳng Primitive thì chỉ có một chỗ khai, không lệch được.
