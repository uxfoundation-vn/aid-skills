---
name: figma-desktop
description: Làm việc với Figma trên Figma desktop — đọc layer đang chọn làm ngữ cảnh, bảng layer đã sửa R<n> (plugin "Lâyơ ở mố?", nav.py), báo cáo sau khi sửa. Dùng TRƯỚC mọi việc đụng tới Figma: khi người dùng nhắc tới frame / màn / layer / node / component, nói "cái này", "frame này", "sửa chỗ này", "check frame này", gõ "bảng", "mở bảng R3", "mở 2", hoặc trước khi gọi use_figma.
---

# Làm việc với Figma (desktop + plugin "Lâyơ ở mố?")

Người dùng thiết kế trên app Figma desktop. Skill này giúp Claude biết họ đang chọn gì, và cho họ một bảng ngay trong Figma để bấm tới đúng layer Claude vừa sửa.

## Công cụ
- **Plugin Figma "Lâyơ ở mố?"** (development plugin, code ở `figma-plugin/` cạnh file này; người dùng import bản chép ra bằng `nav.py setup`). Người dùng chạy ở từng file (Plugins → Development → Lâyơ ở mố?). Mỗi giây plugin gửi selection lên server trên máy và hiện bảng layer đã sửa của đúng file đó.
- **`nav.py`**: `scripts/nav.py` trong thư mục skill này, chạy bằng Python 3 có trên máy (tên lệnh tuỳ máy: `python3`, `python`, `py`…). Server localhost 3847 + lệnh cho session. Lệnh nào cũng tự bật server nếu chưa chạy. `nav.py --help` xem lệnh. Dưới đây viết tắt là `nav.py`.
- **Đọc sâu / sửa**: MCP `figma-desktop` (đọc tab đang mở, không cần fileKey: `get_metadata`, `get_screenshot`, `get_design_context`, `get_variable_defs`) và `use_figma` của MCP Figma (plugin `figma`, cần fileKey; load skill `figma-use` trước khi gọi).

## Layer đang chọn = ngữ cảnh
- Prompt về Figma mà không có link ("cái này", "frame này", "sửa chỗ này", "check frame này"): chạy `nav.py sel` trước. Lệnh in ra các file đang mở plugin, file vừa đổi selection gần nhất đứng đầu: tên file · fileKey · trang · id / loại / tên từng layer đang chọn. Selection trễ tối đa 1 giây.
- Plugin không mở ở file nào (hoặc file đầu danh sách "đã đóng" từ lâu): dùng `get_metadata` của `figma-desktop` không truyền nodeId, nó đọc selection của tab đang mở. Cách này không cho fileKey; cần sửa bằng `use_figma` thì xin người dùng link file, hoặc nhắc họ chạy plugin "Lâyơ ở mố?".
- Layer đang chọn NHIỀU KHẢ NĂNG là chủ đề, nhưng có thể sai (họ còn để chọn từ trước). Luôn nói ngay câu đầu mình hiểu chủ đề là layer nào (tên + file), để họ sửa nếu sai.
- Người dùng gửi link, hoặc prompt nêu rõ thứ khác, thì theo đó, không theo selection.
- Không chọn gì, hoặc thứ đang chọn không khớp với prompt, thì hỏi trước khi sửa.
- Cần nhìn: `get_screenshot` của `figma-desktop` với nodeId lấy từ `nav.py sel`.

## Sửa Figma
- Sửa bằng `use_figma` (load skill `figma-use` trước). Nó chạy ngoài editor của người dùng: không mở được ruột instance của component từ library ngoài, không đọc được collection remote bị ẩn, `selection` luôn rỗng (vì thế mới cần `nav.py sel`). Quét library ngoài / biến remote mà thấy "sạch" thì nói rõ giới hạn này, đừng khẳng định chắc.
- Sửa lớn (nhiều frame, xoá, đổi cấu trúc): nói trước sẽ sửa gì, chờ người dùng đồng ý, nhắc họ lưu version (File → Save to version history) trước.
- Sửa thẳng vào layer cũ, không nhân bản frame rồi dựng lại bên cạnh, trừ khi người dùng bảo.
- Sửa xong thì nhảy tới frame vừa sửa: `nav.py go <fileKey> <id>`.

## Bảng layer đã sửa (cách người dùng theo dõi)
- Mỗi câu trả lời có sửa hoặc nhắc tới layer Figma cụ thể (kể cả chỉ hỏi, đề xuất, danh sách quét) đều push lên bảng rồi kết thúc bằng log:
  - Tiêu đề `Layer · <tên file> · R<n>` (n = mã do push trả về).
  - Bảng markdown cột `#`, tên layer, việc đã làm. Số thứ tự khớp với số trên bảng trong Figma.
  - Không dán link Figma trong chat (mở ra browser). Ghi "mở bảng R<n>" để người dùng mở lại lượt đó.
- Push: `nav.py push <fileKey> "<tiêu đề lượt ngắn>" '<json>' --who "<tên session>"`
  - json là mảng `[["id","label"], …]`. Dòng `[null, "Nhóm A · Nút"]` là tiêu đề nhóm, dùng khi muốn gom layer theo đầu việc.
  - Tên session: nếu có tool `get_session` thì lấy title của "self"; không thì dùng tên thư mục project. Chỉ cần `--who` ở lần push đầu của session.
  - Lệnh in ra `R<n>`. Có thêm câu "plugin chưa mở ở file này" thì nhắc người dùng chạy plugin "Lâyơ ở mố?" ở file đó.
- Các layer sửa đều nằm trong một frame lớn (một màn, một slide) thì chỉ push frame lớn đó, một dòng, ghi thay đổi bên trong ở ô "việc đã làm".
- Bảng ăn theo file (fileKey). Mỗi session push vào là một nhóm riêng với R1–R3 xoay vòng (lượt thứ 4 dùng lại R1); nhiều session cùng sửa một file thì bảng có bấy nhiêu nhóm, session push mới nhất nằm trên. Mỗi session có mũi tên thu/mở (mở = xuống, thu = lên) và nút thùng rác xoá session khỏi bảng (bấm 2 lần mới xoá). Bảng giữ tối đa 3 session mỗi file, mỗi session 3 Round, cửa sổ cao theo nội dung. Session cũ tự rơi khỏi bảng sau 7 ngày không push hoặc khi file có hơn 3 session.
- Bảng có nút thu nhỏ; có lượt mới lúc đang thu thì hiện chấm xanh.
- Lệnh tắt trong chat:
  - "bảng" / "mở bảng": `nav.py open <fileKey> <R lượt mới nhất của session này>` (xem bằng `nav.py ls <fileKey>`).
  - "mở bảng R3": `nav.py open <fileKey> R3`.
  - "mở 2" hoặc "mở <tên layer>": `nav.py go <fileKey> <id>`.
  - fileKey lấy từ lượt push gần nhất của session, hoặc từ `nav.py sel` khi người dùng vừa chọn ở file khác.

## Báo cáo sau khi sửa
- KHÔNG chép lại nội dung đã viết lên Figma vào chat, người dùng đọc trên Figma.
- Chat chỉ 1–2 câu tóm tắt đã làm gì, cộng điểm cần người dùng quyết (nếu có), rồi tới bảng Layer · R<n>.

## Lỗi hay gặp
- Bảng trên Figma báo đỏ "Chưa nối được Claude": server `localhost:3847` chưa chạy (thường do vừa khởi động máy). Chạy `nav.py ensure`, bảng tự nối lại trong 1 giây.
- `nav.py sel` báo "Chưa file nào mở plugin": người dùng chưa chạy plugin, hoặc chưa import → chạy skill `setup` của pack này (`/aid:setup`).
- Tool `figma-desktop` lỗi kết nối: Figma desktop chưa bật desktop MCP server (trong Dev Mode), app Figma đang tắt, hoặc chưa cài MCP → chạy skill `setup`.
- fileKey dạng `local:<tên>`: file chưa lưu lên Figma cloud, `use_figma` không sửa được. Nhắc người dùng lưu file lên cloud.
- `use_figma` báo cần đăng nhập: gõ `/mcp`, chọn `figma` → Authenticate.
