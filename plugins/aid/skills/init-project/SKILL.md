---
name: init-project
description: Biến thư mục đang mở (chứa tài liệu đề bài PDF/Word đặt tên lung tung: PRD, SRS, flow…) thành một dự án Claude Code gọn gàng — chuyển hết sang .md bằng script, tự phân loại vào đúng vùng, viết CLAUDE.md, rồi chạy thử prototype đủ luồng. Dùng khi người dùng bảo "sắp xếp dự án", "dựng dự án từ đề bài", "chạy skill init-project".
---

# Sắp xếp dự án từ đề bài

Skill này biến thư mục đề bài lộn xộn đang mở thành một dự án AI đọc được ngay, rồi chạy thử prototype. Làm lần lượt 6 bước. Bước 1–2 chạy tự động, không hỏi.

Xưng hô: gọi người dùng là "bạn", câu ngắn, tránh thuật ngữ kỹ thuật không cần thiết.

## Bước 1 · Chuyển hết tài liệu sang .md (tự động, bằng script)
Thư mục dự án là **thư mục đang mở**. Tài liệu đề bài (PDF, Word…) nằm sẵn trong đó, tên file có thể lung tung.

Chạy script đóng kèm skill, **không tự đọc từng file PDF** (tốn token):
```bash
python3 "<thư mục của skill này>/scripts/to_md.py" .
```
- Script chuyển mọi `.pdf .docx .doc .rtf .txt` ở thư mục gốc sang `_md/<tên>.md`, rồi **dời file gốc vào `sources/`** (giữ nguyên tên, không sửa nội dung). Đầu mỗi bản `.md` có sẵn dòng `> **Đọc file này khi** [AI điền]. Nguồn: \`sources/<tên>\``.
- Script in ra JSON: mỗi file có số trang, số ký tự và 15 dòng đầu (`preview`). Dùng JSON này để phân loại ở bước 2, **không mở cả file**.
- File có `warn` (PDF scan, gần như không có chữ) hoặc `error`: lúc đó mới đọc trực tiếp file gốc, viết tay bản `.md`.
- Máy không có `python3`: đọc trực tiếp từng file và tự viết `.md`, báo người dùng là cách này chậm hơn.

## Bước 2 · Phân loại và xếp vào vùng (tự động)
Dựa vào `preview` (cần thì đọc thêm vài chục dòng đầu của file `.md`, không đọc hết), xếp mỗi file vào đúng vùng:

| Loại | Chứa gì | Đặt vào |
|---|---|---|
| PRD | Mục tiêu, phạm vi, user story, flow cần làm | `product/prd.md` |
| SRS | Rule nghiệp vụ, validation, trạng thái, case lỗi | `product/srs.md` |
| Research | Đối thủ, ảnh tham chiếu, điểm rút ra | `research/` |
| Flow | Các bước của flow, danh sách màn, màn nào nối màn nào | `design/flow.md` |
| Visual direction | Tính cách, màu, chữ, ảnh tham chiếu | `design/visual-direction.md` |
| Khác | Không thuộc loại nào ở trên | `context/` nếu là thông tin chung, không thì để lại `_md/` và báo ở bước 6 |

- Trước khi dời, tạo đủ các thư mục theo khung ở bước 3.
- Dời bản `.md` từ `_md/` sang vùng, đổi tên theo bảng. Nhiều file cùng loại thì đặt tên phân biệt (`prd-dat-ve.md`, `prd-thanh-toan.md`).
- File gốc đã nằm ở `sources/` từ bước 1, không dời nữa, không xoá. Vùng chỉ chứa bản `.md`.
- Một file chứa nhiều loại (ví dụ PRD kèm flow) thì giữ nguyên ở vùng chính, ghi chú ở `CLAUDE.md` là file đó có cả phần kia.
- Xong thì xoá thư mục `_md/` nếu đã trống.

## Bước 3 · Khung dự án
```
<thư mục đang mở>/
├── CLAUDE.md          bản đồ cho AI (mỗi vùng trừ context/ có thêm CLAUDE.md riêng, bước 5b)
├── context/           tong-quan.md: dự án là gì, cho ai, thuật ngữ. Mọi việc đều đọc
├── product/           prd.md · srs.md: làm gì, rule nghiệp vụ
├── research/          đối thủ, tham chiếu
├── planning/          ke-hoach.md: danh sách màn cần dựng, thứ tự, trạng thái
├── design/            flow.md · visual-direction.md (+ ref/ cho ảnh)
├── decisions/         sổ quyết định đã chốt (YYYYMMDD-ten.md)
├── prototype/         code prototype
├── sources/           file gốc (PDF, Word…), không sửa tay
└── .claude/settings.json   khoá không cho AI sửa sources/
```
- Chỉ đúng các mục trên, root không để file lẻ (`_md/` là thư mục tạm của bước 1, xoá khi xong).
- `context/` chỉ có tổng quan, không chép PRD hay SRS vào đây.
- `planning/ke-hoach.md` tự lập từ `design/flow.md`: bảng `Màn · Thuộc bước nào · Trạng thái cần có (từ SRS) · Xong chưa`.
- Bản `.md` là bản AI đọc và sửa. File gốc chỉ nằm ở `sources/` để đối chiếu.
- Tạo `.claude/settings.json` khoá `sources/`. CLAUDE.md chỉ là lời dặn, quyền mới chặn được hẳn:
  ```json
  {
    "permissions": {
      "deny": ["Edit(/sources/**)", "Write(/sources/**)"]
    }
  }
  ```
- Sau này có file do script sinh ra (trang tổng hợp, bảng tự động…) thì để trong `_generated/` của vùng, không sửa tay, và thêm `_generated/**` vào `deny`. Bản cũ không xoá mà cất vào `_archive/` trong vùng.

## Bước 4 · Dọn bản .md (chỉ sửa nhẹ, không viết lại)
- Không viết lại cả file, không tóm tắt, không tự thêm rule. Script đã giữ nguyên chữ của tài liệu.
- Điền chỗ `[AI điền]` trong dòng đầu mỗi file: đọc file này khi nào. Giữ phần `Nguồn: …`.
- Chỉ sửa chỗ hỏng rõ ràng do chuyển từ PDF: tiêu đề mất định dạng (thêm `#`), bảng bị vỡ thành dòng rời (dựng lại bảng Markdown). Chỉ sửa đoạn bị hỏng, đọc theo đoạn.
- Viết `context/tong-quan.md` (5–10 dòng): dự án là gì, cho ai, flow nào, thuật ngữ chính. Lấy từ PRD.
- Lập `planning/ke-hoach.md` từ flow và SRS.
- Chỗ tài liệu thiếu hoặc mâu thuẫn thì ghi `[THIẾU: …]` hoặc `[MÂU THUẪN: …]` ngay tại chỗ, không tự đoán. Lỗi chữ trong bản gốc thì giữ nguyên và ghi `[LỖI CHỮ?: …]`, không tự sửa.
- Thiếu loại tài liệu nào (ví dụ chỉ có PRD, chưa có SRS hay flow) thì không tạo file rỗng cho loại đó. Ghi `[THIẾU: …]` ở `CLAUDE.md` của vùng tương ứng. Riêng `ke-hoach.md`: không có flow thì suy tạm danh sách màn từ user story trong PRD, ghi rõ là bản suy tạm.

## Bước 5 · Viết CLAUDE.md

### 5a · CLAUDE.md gốc
Dưới 60 dòng, chỉ là bản đồ, không chép lại nội dung tài liệu. Điểm vào của mỗi vùng là `CLAUDE.md` của vùng đó:

```markdown
# <Tên dự án> — bản đồ

<Một câu: dự án là gì, flow nào, cho ai.>

| Vùng | Dùng khi | Điểm vào |
|---|---|---|
| `context/` | Mọi việc, đọc trước | `tong-quan.md` |
| `product/` | Cần biết làm gì, rule nghiệp vụ, validation, case lỗi | `product/CLAUDE.md` |
| `research/` | Cần tham chiếu đối thủ | `research/CLAUDE.md` |
| `planning/` | Biết còn màn nào chưa dựng | `planning/CLAUDE.md` |
| `design/` | Biết có những màn nào, nối nhau ra sao; làm visual | `design/CLAUDE.md` |
| `decisions/` | Trước khi đổi điều đã chốt | `decisions/CLAUDE.md` |
| `prototype/` | Code prototype | `prototype/CLAUDE.md` |
| `sources/` | Chỉ khi cần đối chiếu bản `.md` với file gốc | không sửa |

## Quy tắc
- Nghiệp vụ lấy từ `product/srs.md`, không tự bịa. Thiếu rule thì hỏi.
- Prototype dựng đủ luồng và nội dung trước, giao diện để mặc định. Chỉ đọc `visual-direction.md` khi làm visual.
- Dựng xong màn nào thì cập nhật `planning/ke-hoach.md`.
- Quyết định đã chốt ghi vào `decisions/`.
- `sources/` là file gốc, không sửa (đã khoá trong `.claude/settings.json`). File máy sinh để `_generated/`, bản cũ cất `_archive/` trong vùng.
```

### 5b · CLAUDE.md từng vùng (bản khung)
Mỗi vùng `product/ research/ planning/ design/ decisions/ prototype/` có một `CLAUDE.md` ngắn (5–10 dòng). `context/` chỉ có một file nên không cần. Đây là **bản khung**: chỉ ghi làm gì → đọc gì → KHÔNG đọc gì. Khi dự án lớn dần (thêm flow, thêm workflow) thì người dùng bổ sung chi tiết sau.

Mẫu:
```markdown
# <vùng>/ — <một dòng mục đích>

| Làm gì | Đọc | KHÔNG đọc |
|---|---|---|
| … | … | … |
```

Nội dung khung cho từng vùng (điền đúng tên file thật đã xếp ở bước 2):

| Vùng | Làm gì → Đọc | KHÔNG đọc |
|---|---|---|
| `product/` | Hỏi nghiệp vụ, validation, case lỗi → `srs.md` · Hỏi phạm vi, mục tiêu → `prd.md` | `../sources/`, trừ khi cần đối chiếu bản `.md` |
| `research/` | Tham chiếu đối thủ, ảnh ref → các file research | Khi đang dựng luồng prototype |
| `planning/` | Biết màn nào còn thiếu, cập nhật tiến độ → `ke-hoach.md` | — |
| `design/` | Dựng luồng → `flow.md` · Làm visual → `visual-direction.md` | `visual-direction.md` khi mới dựng luồng |
| `decisions/` | Ghi quyết định mới (`YYYYMMDD-ten.md`: Bối cảnh · Quyết định · Hệ quả) · Trước khi đổi điều đã chốt → file mới nhất | Quyết định cũ đã bị file mới thay |
| `prototype/` | Sửa code → `../planning/ke-hoach.md`, `../design/flow.md`, `../product/srs.md` | `../research/`, `../sources/` |

Sau đó: chưa có git thì `git init`. Hỏi người dùng trước khi commit mốc đầu tiên.

## Bước 6 · Báo cáo và chạy thử prototype
1. Báo ngắn: bảng `File gốc · Đã xếp vào` để người dùng soát lại phân loại, cây thư mục vừa dựng, các chỗ còn `[THIẾU]` hoặc `[MÂU THUẪN]` (nếu có).
2. Đưa câu lệnh mẫu để chạy thử, rồi hỏi có chạy luôn không:
   > Đọc CLAUDE.md. Dựng prototype đủ luồng trong `prototype/` theo `design/flow.md` và `product/srs.md`: đủ các màn, đủ trạng thái lỗi và trường hợp đặc biệt trong SRS, bấm qua lại được giữa các màn. Chưa làm visual, giao diện để mặc định. Dùng HTML, CSS, JS thuần, mở `index.html` là chạy.
3. Chạy xong thì báo cách mở xem, và liệt kê các màn, trạng thái đã dựng đối chiếu với `design/flow.md`, rồi cập nhật `planning/ke-hoach.md` để người dùng tự soát.
