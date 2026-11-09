---
name: ds-audit-sources
description: Skill con của ds-audit, tầng chuyên sâu. Đối chiếu component với cách các design system thật làm cùng loại component (dữ liệu component.gallery + docs gốc của từng DS), để bắt lỗi thiếu về nghĩa mà rule cú pháp không thấy, ví dụ chip chọn được mà không có `selected`. Mỗi phát hiện kèm nguồn. Chỉ đánh giá và đề xuất, không sửa. Dùng khi ds-audit chạy tầng chuyên sâu, hoặc người dùng hỏi "component này thiếu state gì", "các DS khác làm cái này thế nào".
---

# ds-audit-sources: đối chiếu nguồn

Năm skill con kia kiểm **cú pháp**: tên, trục, thứ tự. Chúng không biết component **lẽ ra phải có gì**. Skill này trả lời câu đó bằng dữ liệu, không bằng phán đoán của Claude: xem các design system thật làm cùng loại component ra sao, rồi so.

Nhận dữ liệu từ `ds-audit` (tên, description, `props`, `variants`). Báo cáo theo format chung của `ds-audit`, phần **Đối chiếu nguồn**, thêm cột **Nguồn**.

## Bước 1. Xác định component là gì và thuộc loại nào
- **Tên để tra:** tên component, bỏ tiền tố và tên DS (`Moon/Chip` → `chip`).
- **Loại:** nhiều component có nhiều loại với bộ state khác nhau. Ví dụ chip: hành động (bấm là làm), lọc / chọn (bật tắt), xoá được. Đọc description và variant để đoán loại. Description nhắc nhiều loại thì component phải đáp ứng **đủ các loại nó nhận**. Không rõ thì hỏi người dùng một câu, đưa sẵn lựa chọn.

## Bước 2. Tra component.gallery theo cả tên gọi khác
component.gallery gộp nhiều tên vào một trang (Chip nằm trong trang Badge, Snackbar trong Toast, Stepper trong Progress indicator). Tra theo slug sẽ trượt, nên luôn dùng lệnh `find`:

```bash
node "<thư mục skill này>/scripts/crawl.mjs" find chip
```

- Cần Node 18+. Không có Node thì báo người dùng chạy `/aid:setup`, rồi dừng tầng chuyên sâu (vẫn trả báo cáo tầng cơ bản).
- Cache ghi vào `.aid/component-gallery/` trong thư mục đang làm việc. Kết quả lưu ở `_find-<tên>.json`, lần sau đọc lại, không tra lại.
- `find` không thấy gì thì chạy lại với `--all` (tải đủ 60 trang về cache một lần, khoảng 2 phút, để dò cả tên trong ví dụ). Vẫn không thấy thì báo "component.gallery không có", chuyển sang Bước 3 với docs DS lớn do người dùng gợi ý, hoặc dừng.
- **Trang gộp (kết quả có ⚠):** chỉ dùng các ví dụ có tên khớp. **Không lấy prose, guideline chung của trang đó** làm chuẩn: guideline trang Badge viết cho badge tĩnh, áp cho chip sẽ ra kết luận sai kiểu "chip không cần state".

## Bước 3. Đọc docs gốc của các DS
- Chọn **6 link** từ ví dụ khớp. Ưu tiên DS lớn, docs kỹ (Material, Polaris, Carbon, Atlassian, Spectrum, Backpack, GOV.UK…), mỗi DS một link.
- WebFetch từng link, hỏi đúng 3 ý: DS này chia component thành những loại nào · mỗi loại có những state / prop nào, đúng tên · có ghi rõ state nào **không** hỗ trợ không.
- Link chết (404, 403, timeout) hoặc trang không đọc được nội dung (chỉ có khung JS) thì **ghi lại**, lấy link kế tiếp. Cần tối thiểu **3 nguồn đọc được**. Hết link mà chưa đủ 3 thì vẫn báo, nhưng mọi phát hiện hạ xuống **Cần hỏi** và ghi rõ thiếu nguồn.
- Lưu bản tóm vào `.aid/component-gallery/_sources-<tên>.json` (url, DS, loại, state, link chết) để lần audit sau dùng lại.

## Bước 4. So và kết luận

| # | Tiêu chí | Dấu hiệu lệch | Mức |
|---|---|---|---|
| SR1 | **Thiếu state theo loại** | Loại component mà nó nhận (Bước 1) cần một state mà các DS đều có, nhưng component không có trục hay giá trị nào thể hiện. Ví dụ chip lọc thiếu `selected` | Phải sửa khi **≥ 2 nguồn** cùng có · 1 nguồn thì Cần hỏi |
| SR2 | **Thiếu cờ chung** | Component tương tác được mà không có `disabled` trong khi đa số nguồn có | Nên sửa · Cần hỏi nếu sản phẩm có thể chủ ý không cần |
| SR3 | **Lệch tên so với số đông** | Trục hay giá trị cùng nghĩa nhưng tên khác hẳn đa số DS (vd `on/off` trong khi số đông dùng `selected`) | Nên sửa. Tên chuẩn cuối cùng vẫn theo `ds-audit-structure` |
| SR4 | **Thứ không nguồn nào có** | Trục, giá trị hay tổ hợp không DS nào trong nguồn có | Cần hỏi: hỏi dùng để làm gì, không tự kết luận là thừa |
| SR5 | **Làm tay ngoài component** | Có dấu hiệu designer phải override tay để ra một state (fill, stroke đổi tay trên instance) | Phải sửa, đi kèm SR1 |

Quy tắc:
- **Mỗi dòng phải có cột Nguồn**: tên DS + link đã đọc được. Không có nguồn thì không đưa vào báo cáo.
- Ví dụ trong component.gallery chỉ cho biết DS **có** component đó; state, prop phải lấy từ docs đã đọc ở Bước 3, không suy từ tên hay ảnh.
- Nguồn mâu thuẫn nhau (Backpack có `selected`, Polaris clickable chip ghi rõ không có) thì đó thường là **khác loại**, không phải khác ý kiến: ghi rõ loại nào cần gì, đối chiếu với loại component nhận ở Bước 1.
- Không đổi chuẩn cú pháp: tên trục, giá trị đề xuất vẫn theo `ds-audit-structure` (`selected` là cờ điều kiện boolean, không nhét vào `state`).
- Cuối phần này ghi: đã đọc bao nhiêu nguồn, link nào chết, phần nào chỉ có 1 nguồn.
