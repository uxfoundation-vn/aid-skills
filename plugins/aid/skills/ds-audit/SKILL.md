---
name: ds-audit
description: Audit component trong file Figma Design System theo chuẩn agent-friendly. Chỉ quét và đề xuất, không sửa file. Dùng khi người dùng bảo "audit component", "check component", "quét DS", "component này đúng chuẩn chưa", hoặc gõ /ds-audit. Có 2 tầng: cơ bản (kiểm cú pháp theo chuẩn) và chuyên sâu (đối chiếu thêm với các design system thật trên component.gallery để bắt lỗi thiếu state). Skill này điều hướng sang các skill con ds-audit-component-naming, ds-audit-property-naming, ds-audit-structure, ds-audit-description, ds-audit-canvas, ds-audit-sources.
---

# ds-audit: skill tổng

Quét component trong file Figma, so với chuẩn, rồi đề xuất cách sửa. **Không sửa gì trong file Figma.** Người dùng đọc báo cáo rồi tự quyết sửa hay không.

Chuẩn ở đây hướng tới một mục tiêu: **Figma khớp 1:1 với code**, để dev, agent của dev và agent của designer cùng đọc một bộ tên mà không phải đoán. Chỉ xét **tầng component**. Không xét token, binding biến, theme.

## Bước 1. Hỏi phạm vi
Hỏi một câu, đưa sẵn lựa chọn:
- **Component đang chọn:** người dùng đang chạy plugin "Lâyơ ở mố?" thì đọc layer đang chọn theo skill `figma-desktop` (`nav.py sel`), khỏi xin link.
- **Một component:** người dùng gửi link Figma có `node-id`, hoặc dán tên component.
- **Một page:** tên page.
- **Cả file.**

Không có plugin thì Figma MCP không biết layer đang chọn, nên xin link hoặc tên.

## Bước 2. Hỏi tầng và phần
Hỏi chung một lượt với Bước 1:

| Tầng | Làm gì | Bắt được | Không bắt được |
|---|---|---|---|
| **Cơ bản** (mặc định) | 5 phần dưới, so với chuẩn đi kèm skill | Sai tên, sai trục, trộn khía cạnh, thiếu description, sai section | Component **thiếu** thứ lẽ ra phải có (chip chọn được mà không có `selected`) |
| **Chuyên sâu** | Cơ bản + phần 6 `ds-audit-sources`: tra component.gallery, đọc docs 3–6 DS thật, so state theo loại component | Thêm lỗi thiếu về nghĩa, có nguồn dẫn chứng | Chậm hơn vài phút, cần mạng và Node 18+ |

Gợi ý chuyên sâu khi: audit component lần đầu, DS của công ty khác, hoặc người dùng hỏi "thiếu gì". Quét cả page / cả file thì chạy cơ bản cho tất cả, rồi hỏi component nào cần chuyên sâu (mỗi component chuyên sâu tốn vài lượt đọc web).

Mặc định quét đủ các phần của tầng đã chọn. Người dùng nói rõ phần nào thì chỉ chạy phần đó.

| Phần | Skill con | Kiểm gì |
|---|---|---|
| Tên component | `ds-audit-component-naming` | Main hay element, cú pháp tên |
| Tên property | `ds-audit-property-naming` | Cách đặt tên property, boolean, text, size, icon swap |
| Cấu trúc variant | `ds-audit-structure` | So với 6 loại trục chuẩn: một trục một khía cạnh, đúng tên và giá trị, variant chỉ cho thứ đổi hình, không thừa, map được sang code |
| Description | `ds-audit-description` | Mô tả cho người và agent đọc |
| Canvas | `ds-audit-canvas` | Section chứa main và element |
| Đối chiếu nguồn (chỉ tầng chuyên sâu) | `ds-audit-sources` | So với các DS thật cùng loại component: thiếu state, thiếu cờ, lệch tên số đông |

## Bước 3. Đọc Figma một lần
Dùng Figma MCP (`use_figma`, chỉ đọc). Trước khi gọi `use_figma` phải load skill `figma-use`. Chạy đoạn dưới, thay `ROOT_IDS` bằng id node hoặc id page. Quét nhiều page thì chạy **mỗi page một lần gọi** (gọi song song), vì mỗi lần gọi chỉ được chuyển page một lần.

**Figma MCP cần quyền edit file.** File chỉ có quyền xem (file DS của công ty khác, file cộng đồng) thì nhắc người dùng duplicate file về drafts của mình rồi gửi link bản duplicate.

```js
const ROOT_IDS = ['<id>'];
const out = [];
for (const rid of ROOT_IDS) {
  const root = await figma.getNodeByIdAsync(rid);
  if (!root) continue;
  let pg = root; while (pg.type !== 'PAGE') pg = pg.parent;
  if (figma.currentPage !== pg) await figma.setCurrentPageAsync(pg);
  const nodes = root.type === 'COMPONENT_SET' || root.type === 'COMPONENT' ? [root]
    : root.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] });
  for (const n of nodes) {
    if (n.type === 'COMPONENT' && n.parent && n.parent.type === 'COMPONENT_SET') continue;
    let sec = n.parent; while (sec && sec.type !== 'SECTION' && sec.type !== 'PAGE') sec = sec.parent;
    const used = new Set();
    for (const i of n.findAll(x => x.type === 'INSTANCE')) {
      const m = await i.getMainComponentAsync(); if (!m) continue;
      used.add(m.parent && m.parent.type === 'COMPONENT_SET' ? m.parent.name : m.name);
    }
    out.push({
      id: n.id, name: n.name, type: n.type, description: n.description,
      section: sec && sec.type === 'SECTION' ? { name: sec.name, fills: sec.fills, strokes: sec.strokes, strokeWeight: sec.strokeWeight, cornerRadius: sec.cornerRadius } : null,
      props: Object.entries(n.componentPropertyDefinitions).map(([k, d]) => ({ name: k.split('#')[0], type: d.type, default: d.defaultValue, options: d.variantOptions || null })),
      variants: n.type === 'COMPONENT_SET' ? n.children.map(c => c.name) : [],
      uses: [...used],
    });
  }
}
return out;
```

Không chạy lệnh nào có ghi, đổi tên hay xoá.

Từ kết quả, dựng thêm một bảng phụ: element nào được dùng trong main nào (đảo ngược trường `uses`). `ds-audit-component-naming` cần bảng này.

## Bước 4. Gọi skill con
Đọc SKILL.md của từng skill con đã chọn, đưa dữ liệu ở bước 3 vào, chạy lần lượt. Skill con không đọc lại Figma.

Tầng chuyên sâu: chạy `ds-audit-sources` **sau** 5 phần kia, vì nó cần biết trục nào đã có. Một lỗi mà cả `ds-audit-structure` và `ds-audit-sources` cùng thấy thì gộp thành một dòng, giữ cả rule lẫn nguồn.

## Bước 5. Gộp báo cáo
Một bảng chung, xếp theo component rồi theo mức:

| Component | Phần | Rule | Hiện tại | Đề xuất | Mức | Nguồn |
|---|---|---|---|---|---|---|
| `Chip` | Cấu trúc variant | ST1 | Trục `state` gồm `default · hover · selected`, trộn tương tác với lựa chọn | Tách `selected` thành trục riêng | Phải sửa | Chuẩn skill |
| `Chip` | Đối chiếu nguồn | SR1 | Description nhận loại lọc / chọn, nhưng không có cách thể hiện đang chọn | Thêm cờ `selected` | Phải sửa | Backpack, Material (link) |

- **Mức:**
  - **Phải sửa:** sai cú pháp, hoặc làm agent đọc sai và viết sai code.
  - **Nên sửa:** đúng nhưng chưa gọn, chưa đồng bộ.
  - **Cần hỏi:** skill không tự kết luận được (các rule đánh dấu 👤). Ghi rõ câu hỏi cho người dùng.
- Cột **Nguồn**: lỗi tầng cơ bản ghi "Chuẩn skill"; lỗi đối chiếu ghi tên DS + link đã đọc.
- Đầu báo cáo ghi tóm tắt: tầng nào, quét bao nhiêu component, bao nhiêu lỗi mỗi mức.
- Chạy tầng cơ bản thì cuối báo cáo nhắc một dòng: tầng này không bắt lỗi thiếu state, muốn kiểm thì chạy chuyên sâu.
- Cuối báo cáo ghi 3 việc nên sửa trước, là những lỗi làm agent đọc sai nhiều nhất.
- Không tự sửa. Người dùng muốn sửa thì nhắc: lưu version Figma trước, sửa bằng đổi tên chứ không xoá rồi tạo lại (giữ instance đang dùng).
