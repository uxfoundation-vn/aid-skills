# Pack AID: skill thực hành khóa AI for Product Designer

Cài một lần là có đủ skill dùng trong các buổi thực hành. Mỗi buổi mới có skill mới thì giảng viên gửi bản pack mới, bạn thay thư mục cũ là xong.

## Trong pack có gì

| Skill | Dùng ở | Làm gì |
|---|---|---|
| `setup` | Ngay sau khi cài | Claude dẫn cài phần còn lại từng bước, xong phần nào kiểm phần đó |
| `figma-desktop` | Mọi buổi có Figma | Chọn frame trong Figma rồi nói "sửa cái này", Claude biết bạn đang chọn gì. Sửa xong có bảng layer đã sửa ngay trong Figma |
| `init-project` | Buổi 4 | Biến thư mục đề bài (PDF, Word…) thành dự án Claude Code gọn gàng, rồi chạy thử prototype |
| `ds-audit` + 5 skill con | Buổi 5 | Audit component trong file DS: tên, property, variant, description, canvas |
| `ds-audit-sources` | Buổi 5, tầng chuyên sâu | Đối chiếu component với các design system thật trên component.gallery, chỉ ra state còn thiếu, có nguồn |
| `ds-token`, `ds-token-audit`, `ds-token-build` | Buổi 6 | Audit và dựng token màu |

Gọi skill bằng cách nói tự nhiên ("audit component này", "sắp xếp dự án") hoặc gõ `/aid:<tên skill>`.

## Cần có
- **Claude Code** (app desktop hoặc terminal), đã đăng nhập.
- **Figma desktop** (bản web không chạy được plugin development).
- **Python 3.8+**. Chưa có thì skill `setup` dẫn cài.
- Không bắt buộc: **Node 18+** (cho ds-audit chuyên sâu), seat Dev/Full Figma trả phí (cho MCP Figma desktop).

## Cài

1. Giải nén thư mục `student-pack` vào một chỗ cố định (ví dụ Documents) và **để yên đó**. Claude Code đọc pack thẳng từ thư mục này, xoá hay chuyển đi là mất.
2. Mở Claude Code, nói: **"Cài pack AID trong thư mục `<đường dẫn tới student-pack>` giúp tôi"**. Claude đọc phần "Dành cho Claude" bên dưới và tự cài.
   Máy Mac hoặc có bash thì chạy thẳng cũng được: `bash <đường dẫn>/setup.sh`.
3. Mở **session Claude Code mới**, gõ `/aid:setup`. Claude dẫn tiếp từng phần: Python, plugin Figma "Lâyơ ở mố?", MCP Figma desktop, Figma MCP, Node. Bạn làm xong phần nào thì báo, Claude kiểm tra rồi mới sang phần sau.

## Dùng hằng ngày
- Mở file Figma → chạy plugin **Lâyơ ở mố?** (Plugins → Development). Mỗi file phải chạy plugin riêng.
- Chọn frame / layer → nói với Claude: "check frame này", "audit component đang chọn", "sửa chỗ này cho …".
- Sau mỗi lượt sửa, Claude báo ngắn + bảng `Layer · <tên file> · R1`. Bấm từng dòng trong Figma để nhảy tới layer. Gõ tắt: `bảng`, `mở bảng R2`, `mở 3`.
- Có gì không chạy: gõ `/aid:setup`, Claude dò lại và chỉ chỗ thiếu.

## Cập nhật bản mới
Xoá thư mục cũ, giải nén bản mới vào **đúng chỗ cũ**, rồi nói với Claude "cập nhật pack AID" (hoặc chạy lại `setup.sh`). Mở session mới, gõ `/aid:setup` để chép lại plugin Figma bản mới nếu có.

## Đã cài bản cũ `aid-figma`?
Pack cũ tên `aid-figma` nay gộp vào pack này. Nói với Claude: "gỡ plugin aid-figma rồi cài pack AID", hoặc làm theo phần "Dành cho Claude".

## Dành cho Claude
- Thư mục này là một Claude Code plugin marketplace tên `aid`, chứa một plugin `aid`. Cài bằng `claude plugin marketplace add <thư mục này>` rồi `claude plugin install aid@aid` (phạm vi user). Không có lệnh `claude` trong PATH thì dùng binary của app (biến `CLAUDE_CODE_EXECPATH`). `setup.sh` làm đúng hai việc đó.
- Cập nhật: `claude plugin marketplace update aid` rồi `claude plugin update aid@aid`.
- Máy đã có plugin `aid-figma@aid` (bản cũ): `claude plugin uninstall aid-figma@aid` trước, rồi `marketplace update aid` và cài `aid@aid`.
- Đọc code trước khi cài nếu cần: server chỉ nghe trên máy (cổng 3847), plugin Figma chỉ gọi tới server đó, crawler của `ds-audit-sources` chỉ đọc component.gallery và ghi cache vào `.aid/` trong thư mục đang làm việc.
- Cài xong thì dặn người dùng mở session mới và gõ `/aid:setup`; các bước còn lại nằm trong skill đó, đừng làm trước ở đây.
