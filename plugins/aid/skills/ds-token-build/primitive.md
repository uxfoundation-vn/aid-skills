# Tạo bộ primitive

Primitive là tầng giá trị thô: **họ màu × bậc** (`blue/blue-500`). Ghi vào collection Primitive (tên theo hồ sơ), 1 mode, **scope rỗng** (rule S1), `hidden: true` để không lộ khi publish library.

## Bước 1. Chọn nguồn
Đọc mục "Primitive" của hồ sơ. Chưa có thì hỏi người dùng, kèm gợi ý:

| Nguồn | Thang | Chọn khi |
|---|---|---|
| **Tailwind** | 11 bậc 50–950 | Sản phẩm web dùng Tailwind/shadcn. Tên trùng code, dev và agent đọc là hiểu |
| **Radix** | 12 bậc 1–12, có sẵn bản tối | Cần dark mode chuẩn. Mỗi bậc có sẵn công dụng (xem dưới), dễ map sang semantic |
| **Tự làm** | Chọn thang | Brand có màu riêng không khớp bảng có sẵn |
| **Ghép** | Một thang chung | Thường gặp: trung tính và trạng thái lấy bảng có sẵn, brand tự làm |

**Cả bộ phải chung một thang** (rule F7). Lấy Tailwind thì thang brand tự làm cũng phải là 50–950. Lấy Radix thì brand cũng 1–12.

Công dụng từng bậc của Radix (dùng lại ở bước dựng semantic):

| Bậc | Dùng cho |
|---|---|
| 1–2 | Nền trang, nền phụ |
| 3–5 | Nền component: thường · hover · nhấn |
| 6–8 | Viền: nhạt · thường · đậm/focus |
| 9–10 | Nền đặc (nút chính) · hover của nền đặc. Bậc 9 luôn là đúng màu brand |
| 11–12 | Chữ phụ · chữ chính |

## Bước 2. Sinh thang
Dùng [`scale.py`](scale.py) (Python 3, không cần cài gì):

```bash
# tự làm: một màu → cả thang, neo màu nhập vào bậc gần độ sáng nhất
python3 scale.py gen "#2F5BD3" --scale tailwind --family brand
# ép màu brand nằm đúng bậc 500
python3 scale.py gen "#2F5BD3" --scale tailwind --family brand --anchor 500
# thang Radix: ra cả brand (sáng) và brand-dark (tối), màu nhập luôn ở bậc 9
python3 scale.py gen "#2F5BD3" --scale radix --family brand
# kiểm tương phản
python3 scale.py contrast "#ffffff" "#1944d0"
```

Đường dẫn `scale.py` nằm cạnh file này.

- Họ trung tính (xám) thì truyền màu xám chủ đạo của brand; script tự nhận ra (chroma thấp) và dùng đường độ sáng của xám.
- Script giữ nguyên hue, đổi độ sáng theo đường đo từ Tailwind v4 / Radix, giảm độ đậm ở hai đầu, tự kéo về trong gam sRGB.
- Đọc mục `warnings`: thang không đều độ sáng, hoặc bậc dùng cho chữ (600 với Tailwind, 11 với Radix) chưa đạt AA trên nền trắng. Có cảnh báo thì báo người dùng, đề xuất `--anchor` khác hoặc chỉnh màu.
- Trình bày kết quả dạng bảng: bậc, mã hex, tương phản với trắng/đen, đánh dấu bậc neo.

## Bước 3. Bảng có sẵn
Hai bảng nằm trong `presets/` cạnh file này:

| File | Nguồn | Nội dung |
|---|---|---|
| [`presets/tailwind.md`](presets/tailwind.md) | Tailwind CSS 4.1.11 | 22 họ × 11 bậc, thêm `base` (white, black). Đã quy OKLCH về hex sRGB |
| [`presets/radix.md`](presets/radix.md) | Radix Colors 3.0.0 | 31 họ × 12 bậc, mỗi họ có bản sáng (`blue`) và bản tối (`blue-dark`) |

Đọc file md để xem có những họ nào và chọn họ với người dùng. Khi lấy mã để ghi thì **dùng `scale.py`, không tự chép mã từ bảng** (hơn 200 ô, chép tay dễ sai):

```bash
python3 scale.py preset tailwind --families base,slate,blue,red,green,amber --plan
python3 scale.py preset radix --families gray,gray-dark,blue,blue-dark --plan
```

Radix có Light/Dark thì lấy cả họ `-dark` tương ứng.

Không có họ người dùng cần (màu brand riêng) thì sinh bằng `gen` (bước 2) với cùng thang, rồi ghép vào.

Nên lấy ít họ màu: 1 trung tính, brand, 4 trạng thái (đỏ, xanh lá, vàng/cam, xanh dương), cộng các họ mà utility cần. Lấy cả 22 họ của Tailwind thì picker rối mà không dùng tới.

## Bước 4. Đưa vào kế hoạch
Thêm `--plan` để in ra phần `variables` đúng định dạng của [`write.js`](../ds-token/write.js):

```bash
python3 scale.py gen "#2F5BD3" --family brand --plan --collection "Global" --mode "Value" --pattern "{f}/{f}-{s}"
```

- `--collection`, `--mode`, `--pattern` lấy theo hồ sơ (tên collection Primitive, cách đặt tên primitive).
- Gộp các đoạn `--plan` vào `PLAN.variables`, thêm `PLAN.collections = [{ name: 'Global', modes: ['Value'], hidden: true }]`.
- Chạy `write.js` với `DRY_RUN = true` trước. Collection Primitive phải ghi trước các collection trỏ tới nó.

## Thay bộ primitive cũ
Bộ cũ đang được alias tới thì **không xoá**. Ghi bộ mới bên cạnh, sau đó ở các file khung, trục đổi alias của Semantic sang bộ mới, kiểm lại bằng audit, cuối cùng người dùng tự xoá bộ cũ khi `read.js` cho thấy không còn biến nào trỏ tới.

## Theme ghi thẳng giá trị
Nếu hồ sơ chọn "Theme ghi thẳng giá trị" (M2), thang brand vẫn sinh bằng `scale.py`, nhưng ghi vào collection Theme (mỗi brand một mode) thay vì Primitive. Xem `m2-brand.md`.
