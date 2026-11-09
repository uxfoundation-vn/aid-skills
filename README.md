# AID Skills: bộ skill thực hành khóa AI for Product Designer

Bộ skill Claude Code dùng trong các buổi thực hành khóa **AI for Product Designer (AID)**. Pack này giúp Claude:

- làm việc với file Figma desktop đang mở (biết bạn đang chọn layer nào, sửa xong có bảng layer ngay trong Figma)
- biến thư mục đề bài lộn xộn thành một dự án AI đọc được
- audit component và token của Design System

Pack được đóng gói thành một **plugin marketplace** của Claude Code: marketplace `aid` chứa plugin `aid`. Cài một lần, có bản mới thì cập nhật bằng một lệnh.

---

## Mục lục

1. [Cần có](#cần-có)
2. [Cài đặt](#cài-đặt)
3. [Các skill trong pack](#các-skill-trong-pack)
   - [`setup`](#setup-cài-phần-còn-lại-từng-bước)
   - [`figma-desktop`](#figma-desktop-làm-việc-với-figma-desktop)
   - [`init-project`](#init-project-dựng-dự-án-từ-đề-bài)
   - [`ds-audit` và 6 skill con](#ds-audit-audit-component)
   - [`ds-token`, `ds-token-build`, `ds-token-audit`](#ds-token-dựng-và-audit-token)
4. [Dùng hằng ngày](#dùng-hằng-ngày)
5. [Cập nhật](#cập-nhật)
6. [Đã cài bản cũ?](#đã-cài-bản-cũ)
7. [Gặp lỗi](#gặp-lỗi)
8. [Pack làm gì trên máy bạn](#pack-làm-gì-trên-máy-bạn)
9. [Cấu trúc repo](#cấu-trúc-repo)

---

## Cần có

| Thứ cần | Bắt buộc? | Dùng cho |
|---|---|---|
| **Claude Code** (app desktop hoặc terminal), đã đăng nhập | Có | Mọi thứ |
| **Figma desktop** | Có, cho các skill Figma | Bản web không chạy được development plugin |
| **Python 3.8+** | Có | Server `claude-nav`, chuyển tài liệu sang `.md`, sinh thang màu. Chưa có thì skill `setup` dẫn cài |
| Seat **Dev** hoặc **Full** trên gói Figma trả phí | Không | MCP Figma desktop: Claude tự đọc cây layer, chụp ảnh frame |
| **Node 18+** | Không | Tầng chuyên sâu của `ds-audit` (tra component.gallery) |
| **pypdf** (thư viện Python) | Không | `init-project` đọc file PDF. Không có thì vẫn đọc được DOCX, PPTX, XLSX |

---

## Cài đặt

### Bước 1 · Cài pack

Chọn **một** trong ba cách.

**Cách A: nhờ Claude cài.** Mở Claude Code và nói:

> Cài pack AID từ GitHub `uxfoundation-vn/aid-skills` giúp tôi

**Cách B: gõ lệnh trong Claude Code.** Gõ lần lượt hai lệnh:

```
/plugin marketplace add uxfoundation-vn/aid-skills
```

```
/plugin install aid@aid
```

**Cách C: dùng terminal.**

```bash
claude plugin marketplace add uxfoundation-vn/aid-skills
```

```bash
claude plugin install aid@aid
```

### Bước 2 · Cài phần còn lại

Mở **session Claude Code mới** rồi gõ:

```
/aid:setup
```

Claude dò máy, in bảng các phần đã có và còn thiếu, rồi dẫn bạn làm từng phần: Python, plugin Figma "Lâyơ ở mố?", MCP Figma desktop, Figma MCP, công cụ phụ, rồi chạy thử. Bạn làm xong phần nào thì báo, Claude tự kiểm tra rồi mới sang phần sau. Chi tiết ở [skill `setup`](#setup-cài-phần-còn-lại-từng-bước).

---

## Các skill trong pack

| Skill | Dùng ở | Làm gì |
|---|---|---|
| `setup` | Ngay sau khi cài | Dẫn cài phần còn lại từng bước, xong phần nào kiểm phần đó |
| `figma-desktop` | Mọi buổi có Figma | Claude biết bạn đang chọn layer nào. Sửa xong có bảng layer đã sửa ngay trong Figma |
| `init-project` | Buổi 4 | Biến thư mục đề bài (PDF, Word…) thành dự án Claude Code gọn gàng, rồi chạy thử prototype |
| `ds-audit` và 5 skill con | Buổi 5 | Audit component trong file DS: tên, property, variant, description, canvas |
| `ds-audit-sources` | Buổi 5, tầng chuyên sâu | Đối chiếu component với các design system thật trên component.gallery, chỉ ra state còn thiếu, có nguồn |
| `ds-token`, `ds-token-build`, `ds-token-audit` | Buổi 6 | Lập hồ sơ DS, dựng và audit token (Figma Variables) |

Có hai cách gọi skill:

- Nói tự nhiên, ví dụ "audit component này", "sắp xếp dự án", "dựng token".
- Gõ `/aid:<tên skill>`, ví dụ `/aid:ds-audit`.

Các skill audit chỉ quét và đề xuất. Chúng **không tự sửa file Figma** khi bạn chưa bảo rõ.

---

### `setup`: cài phần còn lại từng bước

**Gọi khi:** vừa cài pack; gõ "setup", "cài đặt", "kiểm tra pack"; hoặc khi skill khác báo plugin hay MCP chưa sẵn sàng.

Claude in bảng 6 phần (✓ / chưa / không áp dụng), bỏ qua phần đã đạt, và mỗi lần chỉ dẫn một phần. Phần nào tự làm được thì Claude tự làm. Phần cần bạn bấm thì Claude dặn theo đúng giao diện trên máy bạn rồi chờ bạn báo xong.

| # | Phần | Claude kiểm thế nào |
|---|---|---|
| 1 | **Python và server `claude-nav`** (cổng 3847 trên máy) | `nav.py ensure` in `ok`, server trả `{"ok":true,"app":"claude-nav"}` |
| 2 | **Plugin Figma "Lâyơ ở mố?"**: Claude chép plugin ra một thư mục cố định, bạn import vào Figma desktop (Plugins → Development → Import plugin from manifest…) | `nav.py sel` thấy đúng file và frame bạn đang chọn |
| 3 | **MCP Figma desktop**: bạn bật desktop MCP server trong Dev Mode, Claude thêm MCP `figma-desktop` | `claude mcp list` báo `figma-desktop` Connected |
| 4 | **Figma MCP** (để Claude sửa file): Claude cài plugin `figma`, bạn đăng nhập qua `/mcp` → `figma` → Authenticate | `figma` Connected và session có tool `use_figma` |
| 5 | **Công cụ phụ**: Node 18+, pypdf | `node --version` ≥ 18, Python import được `pypdf` |
| 6 | **Chạy thử**: chọn một frame, Claude đọc, chụp, đẩy một lượt lên bảng | Bạn bấm dòng trên bảng R1 trong Figma, Figma nhảy tới frame |

Không có seat Figma trả phí thì phần 3 ghi "không áp dụng". Khi đó Claude không tự đọc cây layer hay chụp ảnh frame được, nhưng vẫn biết bạn chọn gì và vẫn sửa được qua Figma MCP.

---

### `figma-desktop`: làm việc với Figma desktop

**Gọi khi:** bạn nhắc tới frame, màn, layer, component; nói "cái này", "frame này", "sửa chỗ này"; hoặc gõ `bảng`, `mở bảng R3`, `mở 2`. Claude tự dùng skill này trước mọi việc đụng tới Figma.

**Gồm 3 thứ:**

- **Plugin "Lâyơ ở mố?"**: chạy trong từng file Figma. Mỗi giây plugin gửi lựa chọn hiện tại về server trên máy, và hiện bảng layer Claude đã sửa trong file đó.
- **`nav.py`**: server cục bộ (cổng 3847) và các lệnh cho Claude. Lệnh nào cũng tự bật server nếu nó chưa chạy. Hook của pack cũng tự bật server mỗi khi mở session.
- **MCP**: `figma-desktop` để đọc sâu tab đang mở (cây layer, ảnh chụp, biến), `use_figma` để sửa.

**Layer đang chọn là ngữ cảnh.** Bạn chọn một frame rồi nói "sửa cái này", không cần dán link. Câu đầu tiên Claude luôn nói rõ mình hiểu đó là layer nào trong file nào, để bạn sửa lại nếu sai. Nếu bạn gửi link hoặc nói rõ thứ khác thì Claude theo đó.

**Bảng layer đã sửa.** Sau mỗi lượt sửa hay nhắc tới layer, Claude:

1. đẩy danh sách layer lên bảng trong Figma
2. trả lời trong chat 1–2 câu tóm tắt, kèm bảng `Layer · <tên file> · R<n>`

Số thứ tự trong chat khớp với số trên bảng Figma. Bấm từng dòng trên bảng là Figma nhảy tới layer đó.

- Mỗi session có 3 lượt R1–R3 xoay vòng, lượt thứ 4 dùng lại R1.
- Nhiều session cùng sửa một file thì bảng chia nhóm theo session, giữ tối đa 3 session. Session không đẩy gì trong 7 ngày thì tự rơi khỏi bảng.
- Bảng thu nhỏ được. Có lượt mới lúc đang thu thì hiện chấm xanh.

| Gõ trong chat | Kết quả |
|---|---|
| `bảng` / `mở bảng` | Mở lượt mới nhất của session này |
| `mở bảng R2` | Mở lại lượt R2 |
| `mở 3` / `mở <tên layer>` | Figma nhảy tới layer số 3 (hoặc layer có tên đó) |

**Quy tắc khi sửa:**

- Sửa lớn (nhiều frame, xoá, đổi cấu trúc): Claude nói trước sẽ sửa gì, chờ bạn đồng ý, và nhắc bạn lưu version trước.
- Claude sửa thẳng vào layer cũ, không nhân bản frame ra dựng lại bên cạnh.
- File chưa lưu lên Figma cloud thì vẫn đọc được nhưng không sửa được bằng `use_figma`.

---

### `init-project`: dựng dự án từ đề bài

**Gọi khi:** "sắp xếp dự án", "dựng dự án từ đề bài", "chạy skill init-project". Mở Claude Code **ngay trong thư mục chứa tài liệu đề bài** rồi gọi.

Skill đi qua 6 bước. Bước 1–2 chạy tự động, không hỏi.

1. **Chuyển tài liệu sang `.md` bằng script.** Mọi file `.pdf .docx .doc .rtf .txt` được chuyển thành Markdown. File gốc dời vào `sources/`, giữ nguyên tên và nội dung. Script chỉ trả về trang đầu của mỗi file, nên Claude không phải đọc hết từng PDF (đỡ tốn token). PDF scan không có chữ thì Claude mới đọc trực tiếp.
2. **Phân loại vào đúng vùng:** PRD vào `product/prd.md`, SRS vào `product/srs.md`, flow vào `design/flow.md`, visual direction vào `design/visual-direction.md`, đối thủ vào `research/`.
3. **Dựng khung dự án:**
   ```
   CLAUDE.md          bản đồ cho AI
   context/           tổng quan: dự án là gì, cho ai, thuật ngữ
   product/           prd.md · srs.md
   research/          đối thủ, tham chiếu
   planning/          ke-hoach.md: màn nào cần dựng, xong chưa
   design/            flow.md · visual-direction.md
   decisions/         sổ quyết định đã chốt
   prototype/         code prototype
   sources/           file gốc, bị khoá không cho AI sửa
   ```
4. **Dọn bản `.md`:** chỉ sửa chỗ hỏng do chuyển từ PDF (tiêu đề, bảng vỡ), không viết lại hay tóm tắt. Chỗ tài liệu thiếu hoặc mâu thuẫn được đánh dấu `[THIẾU: …]` hoặc `[MÂU THUẪN: …]`, Claude không tự đoán.
5. **Viết `CLAUDE.md`:**
   - một bản đồ gốc dưới 60 dòng
   - mỗi vùng thêm một `CLAUDE.md` ngắn ghi làm gì thì đọc gì, và **không** đọc gì
6. **Báo cáo và chạy thử prototype:** Claude đưa bảng "file gốc → đã xếp vào đâu" để bạn soát. Sau đó Claude đề xuất dựng prototype đủ luồng và trạng thái lỗi theo SRS, bằng HTML/CSS/JS thuần, mở `index.html` là chạy.

Bản `.md` là bản AI đọc và sửa. File gốc chỉ nằm ở `sources/` để đối chiếu, và bị khoá bằng `.claude/settings.json`.

---

### `ds-audit`: audit component

**Gọi khi:** "audit component", "check component", "quét DS", "component này đúng chuẩn chưa", hoặc `/aid:ds-audit`.

**Mục tiêu:** Figma khớp 1:1 với code, để dev, agent của dev và agent của designer cùng đọc một bộ tên mà không phải đoán. Skill chỉ xét tầng component. Token để cho bộ `ds-token`.

**Cách chạy:**

1. Claude hỏi **phạm vi**: component đang chọn (đọc qua plugin "Lâyơ ở mố?"), một component (link hoặc tên), một page, hay cả file.
2. Claude hỏi **tầng**:

   | Tầng | Làm gì | Bắt được | Không bắt được |
   |---|---|---|---|
   | **Cơ bản** (mặc định) | 5 phần kiểm cú pháp theo chuẩn | Sai tên, sai trục, trộn khía cạnh, thiếu description, sai section | Component **thiếu** thứ lẽ ra phải có |
   | **Chuyên sâu** | Cơ bản + đối chiếu với DS thật | Thêm lỗi thiếu state, có nguồn dẫn chứng | Cần mạng và Node 18+, chậm hơn vài phút |

3. Claude đọc Figma **một lần** (chỉ đọc, không ghi), rồi chuyển dữ liệu cho từng skill con:

   | Skill con | Kiểm gì |
   |---|---|
   | `ds-audit-component-naming` | Component là main hay element, tên đúng cú pháp chưa |
   | `ds-audit-property-naming` | Tên property (variant, boolean, text, size, instance swap, slot) đúng chuẩn và khớp được với code |
   | `ds-audit-structure` | Cấu trúc variant so với 6 loại trục chuẩn: mỗi trục một khía cạnh, đúng tên và giá trị, variant chỉ dành cho thứ đổi hình, không thừa |
   | `ds-audit-description` | Description theo mẫu agent-friendly: một câu nói nó là gì, USE WHEN, DON'T, KEYWORDS |
   | `ds-audit-canvas` | Main và element có nằm đúng section trên canvas không, style section có đồng bộ không |
   | `ds-audit-sources` (chỉ tầng chuyên sâu) | Tra component.gallery theo cả tên gọi khác, đọc docs gốc của 3–6 DS lớn (Material, Polaris, Carbon, Atlassian, Spectrum…), so state theo từng loại component. Ví dụ: chip chọn được mà thiếu `selected` |

4. Claude gộp thành **một báo cáo**:

   | Component | Phần | Rule | Hiện tại | Đề xuất | Mức | Nguồn |
   |---|---|---|---|---|---|---|
   | `Chip` | Cấu trúc variant | ST1 | Trục `state` gồm `default · hover · selected` | Tách `selected` thành trục riêng | Phải sửa | Chuẩn skill |

   - **Mức:** *Phải sửa* (sai cú pháp, hoặc làm agent viết sai code) · *Nên sửa* (đúng nhưng chưa gọn) · *Cần hỏi* (skill không tự kết luận được, kèm câu hỏi cho bạn).
   - Cuối báo cáo có 3 việc nên sửa trước.

Figma MCP cần quyền edit file. File chỉ có quyền xem (DS của công ty khác, file cộng đồng) thì duplicate về drafts rồi gửi link bản duplicate.

---

### `ds-token`: dựng và audit token

**Gọi khi:** "token", "variables", "dựng token", "audit token", "làm dark mode", "thêm brand", "đổi theme không ăn", hoặc `/aid:ds-token`.

Token ở đây là **Figma Variables**. Bộ có 3 skill, xoay quanh một file **hồ sơ DS** (`ds-profile.md`) nằm trong thư mục bạn đang làm việc. Hồ sơ ghi DS của bạn có cấu trúc thế nào. Muốn tuỳ biến thì sửa hồ sơ, không sửa skill.

| Skill | Làm gì |
|---|---|
| `ds-token` | Điểm bắt đầu. Tìm hoặc lập hồ sơ DS, nhận diện bộ token có sẵn, rồi chuyển sang dựng hoặc audit |
| `ds-token-build` | Dựng token: primitive, khung, trục mode, nhóm màu utility, ghi vào Figma, gắn vào component |
| `ds-token-audit` | Kiểm token: cấu trúc, tên, binding, scope, giá trị |

**Hai đường bắt đầu:**

- **A · Chưa có token** (màu và cỡ chữ để thô, hoặc mới có Color Styles):
  1. Claude hỏi 3 câu: mấy brand, có Light/Dark không, đổi brand có đổi cả dáng component không.
  2. Claude gom các giá trị đang dùng kèm số lần dùng. Bạn duyệt giá trị nào gộp, giá trị nào bỏ.
  3. Claude lập hồ sơ, rồi dựng.
- **B · Đã có Variables:**
  1. Claude đọc bộ token, đoán cấu trúc, viết hồ sơ nháp.
  2. Bạn duyệt hồ sơ.
  3. Claude audit. Còn thiếu phần nào (Light/Dark, thêm brand) thì dựng bổ sung.

**Khung và trục** (`ds-token-build`): mọi cấu trúc ghép từ một khung và 0–3 trục.

| | Cấu trúc | Khi nào |
|---|---|---|
| **K1** | Primitive → Semantic | Phần lớn DS |
| **K2** | Primitive → Semantic → Component token | DS lớn, nhiều đội, cần chỉnh riêng từng component |
| **M1 · Light/Dark** | 2 mode ở tầng Semantic | Có dark mode |
| **M2 · Nhiều brand đổi màu** | Thêm tầng Theme, mỗi brand một mode | Nhiều brand chỉ khác màu |
| **M3 · Nhiều brand đổi dáng** | Token bo góc, viền, độ trong theo brand | Nhiều brand khác cả dáng nút, ô nhập |

- Primitive sinh từ bảng màu **Tailwind 4.1.11**, **Radix 3.0.0**, hoặc từ màu brand của bạn, bằng `scale.py`. `scale.py` cũng tính tương phản và tìm token gần màu nhất.
- Màu cần giữ nguyên ở mọi brand (illustration, nhãn trạng thái, biểu đồ, logo ngoài) đi vào nhóm **utility**.

**Audit** (`ds-token-audit`) có 5 phần: Cấu trúc · Tên · Binding · Scope · Giá trị. Rule chia hai loại:

- **Rule cố định**, đúng với mọi DS. Ví dụ:
  - component chỉ gắn tầng ngoài cùng
  - mỗi trục mode nằm ở đúng một tầng
  - mode nào cũng đủ giá trị
  - cặp chữ/nền đạt tương phản AA ở mọi mode
  - utility không đi qua Theme
- **Rule linh động**, đọc từ hồ sơ.

Báo cáo có cùng format với `ds-audit`, ưu tiên các lỗi làm đổi theme ra sai.

**Ghi vào Figma luôn an toàn:**

- Claude chạy thử (`DRY_RUN`) trước, đưa bảng thay đổi cho bạn duyệt rồi mới ghi thật.
- Claude nhắc bạn lưu version trước khi ghi.
- Claude **không bao giờ xoá rồi tạo lại biến**, để layer đang gắn không mất liên kết.

---

## Dùng hằng ngày

1. Mở file Figma, chạy plugin **Lâyơ ở mố?** (Plugins → Development). Mỗi file phải chạy plugin riêng. Phím chạy lại plugin vừa dùng: macOS `Cmd+Opt+P`, Windows `Ctrl+Alt+P`.
2. Chọn frame hoặc layer, rồi nói với Claude: "check frame này", "audit component đang chọn", "sửa chỗ này cho …".
3. Sau mỗi lượt sửa, đọc bảng `Layer · <tên file> · R<n>` trong chat, hoặc bấm từng dòng trên bảng trong Figma.
4. Có gì không chạy thì gõ `/aid:setup`. Claude dò lại và chỉ chỗ thiếu.

---

## Cập nhật

Có bản mới thì nói với Claude "cập nhật pack AID", hoặc chạy:

```bash
claude plugin marketplace update aid
```

```bash
claude plugin update aid@aid
```

Sau đó mở session mới và gõ `/aid:setup` để chép lại plugin Figma bản mới (nếu có).

---

## Đã cài bản cũ?

**Bản cài từ thư mục giải nén** (trước đây gửi dạng thư mục `student-pack`): marketplace cũ cũng tên `aid`, nên phải gỡ nó trước rồi mới thêm được bản GitHub.

```bash
claude plugin marketplace remove aid
```

Sau đó cài lại theo [Bước 1](#bước-1--cài-pack). Thư mục `student-pack` cũ xoá được sau khi cài xong.

**Bản `aid-figma`** (pack cũ, nay đã gộp vào pack này): gỡ nó trước bằng `claude plugin uninstall aid-figma@aid`, rồi làm như trên.

Không quen dùng terminal thì nói với Claude: "gỡ pack AID cũ rồi cài lại từ GitHub `uxfoundation-vn/aid-skills`".

---

## Gặp lỗi

| Dấu hiệu | Cách xử lý |
|---|---|
| Bảng trên Figma báo đỏ **"Chưa nối được Claude"** | Server trên máy chưa chạy (thường do vừa khởi động máy). Nhờ Claude làm bất kỳ việc gì với Figma, server sẽ tự bật và bảng nối lại sau 1 giây |
| Claude báo **"Chưa file nào mở plugin"** | Chạy plugin "Lâyơ ở mố?" trong file Figma. Chưa import plugin thì gõ `/aid:setup` |
| Tool `figma-desktop` lỗi kết nối | Figma desktop đang tắt, hoặc chưa bật desktop MCP server trong Dev Mode. Gõ `/aid:setup` |
| `use_figma` báo cần đăng nhập | Gõ `/mcp`, chọn `figma`, rồi Authenticate |
| File hiện dạng `local:<tên>` | File chưa lưu lên Figma cloud. Lưu lên cloud thì Claude mới sửa được |
| Audit báo cần quyền edit | Duplicate file về drafts của bạn rồi gửi link bản duplicate |
| `ds-audit` chuyên sâu không chạy | Máy chưa có Node 18+. Gõ `/aid:setup`. Trong lúc đó vẫn chạy được tầng cơ bản |

---

## Pack làm gì trên máy bạn

Đọc code trước khi cài nếu bạn muốn. Pack chỉ làm những việc sau:

- **Server `claude-nav`** chỉ nghe trên máy bạn (`127.0.0.1:3847`). Hook `SessionStart` bật server mỗi khi mở session Claude Code.
- **Plugin Figma "Lâyơ ở mố?"** chỉ gọi tới server trên máy, không gửi dữ liệu ra ngoài.
- **Crawler của `ds-audit-sources`** chỉ đọc trang component.gallery. Cache ghi vào `.aid/` trong thư mục đang làm việc.
- **Script đọc/ghi Figma** (`ds-token/*.js`) chạy qua `use_figma`. Script ghi luôn có chế độ chạy thử và không bao giờ xoá biến.

---

## Cấu trúc repo

```
.claude-plugin/marketplace.json     khai báo marketplace "aid"
plugins/aid/
├── .claude-plugin/plugin.json      khai báo plugin "aid" (version)
├── hooks/                          hook SessionStart bật server claude-nav
└── skills/
    ├── setup/
    ├── figma-desktop/              nav.py + plugin Figma "Lâyơ ở mố?"
    ├── init-project/               to_md.py chuyển tài liệu sang .md
    ├── ds-audit/                   skill tổng
    ├── ds-audit-*/                 5 skill con + ds-audit-sources (crawl.mjs)
    ├── ds-token/                   skill tổng + script đọc/ghi/gắn Variables
    ├── ds-token-build/             khung, trục, scale.py, preset Tailwind/Radix
    └── ds-token-audit/             5 phần audit
```

**Phát hành bản mới:** sửa skill, **tăng `version`** trong `plugins/aid/.claude-plugin/plugin.json`, rồi push lên `main`. Không tăng version thì máy học viên sẽ không nhận bản mới khi chạy `claude plugin update`.

---

## Dành cho Claude

- Repo này là Claude Code plugin marketplace tên `aid`, chứa plugin `aid`.
- **Cài:**
  1. `claude plugin marketplace add uxfoundation-vn/aid-skills`
  2. `claude plugin install aid@aid` (phạm vi user)

  Không có lệnh `claude` trong PATH thì dùng binary của app (biến `CLAUDE_CODE_EXECPATH`).
- **Cập nhật:**
  1. `claude plugin marketplace update aid`
  2. `claude plugin update aid@aid`
- **Máy đã có marketplace `aid` trỏ tới thư mục trên máy** (bản cũ): lệnh `marketplace add` sẽ báo lỗi source không khớp. Làm theo thứ tự:
  1. `claude plugin marketplace remove aid`
  2. `claude plugin marketplace add uxfoundation-vn/aid-skills`
  3. `claude plugin install aid@aid`

  Máy còn plugin `aid-figma@aid` thì `claude plugin uninstall aid-figma@aid` trước bước 1.
- Cài xong thì dặn người dùng mở session mới và gõ `/aid:setup`. Các bước còn lại nằm trong skill đó, đừng làm trước ở đây.
