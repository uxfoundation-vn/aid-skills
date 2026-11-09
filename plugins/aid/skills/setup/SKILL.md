---
name: setup
description: Cài và kiểm tra pack AID — plugin Figma "Lâyơ ở mố?", server claude-nav, MCP Figma desktop, Figma MCP, Node cho ds-audit chuyên sâu — dẫn người dùng từng phần, xong phần nào xác nhận phần đó rồi mới đi tiếp. Dùng khi người dùng vừa cài pack, gõ "setup", "cài đặt", "cài figma", "kiểm tra pack", hoặc khi skill figma-desktop báo plugin/MCP chưa sẵn sàng.
---

# Setup pack AID

Pack gồm các skill: `figma-desktop`, `init-project`, bộ `ds-audit` (6 skill), bộ `ds-token` (3 skill). Gọi bằng tên skill hoặc `/aid:<tên>`.

Mục tiêu chính: người dùng chọn một frame trong Figma desktop, nói "sửa cái này", và Claude biết đó là frame nào, đọc được, sửa được, rồi đẩy danh sách layer đã sửa lên bảng trong Figma. Phần 6 là công cụ phụ cho vài skill.

Skill này mô tả **cần đạt cái gì** và **dấu hiệu đã đạt**. Lệnh cụ thể, đường dẫn, phím tắt, tên menu thì Claude tự chọn theo máy đang chạy (macOS / Windows / Linux, bản Figma, cách cài Python, thư mục Documents thật nằm đâu…). Gặp gì khác với mô tả ở đây thì tự xử lý hợp lý và nói ngắn cho người dùng biết đã làm gì.

## Cách dẫn
- Mở đầu: dò nhanh trạng thái máy, in bảng 6 phần bên dưới (✓ / chưa / không áp dụng). Phần nào đạt rồi thì bỏ qua.
- Mỗi lần chỉ dẫn một phần. Phần nào Claude tự làm được thì tự làm; phần cần người dùng bấm thì dặn theo đúng giao diện trên máy họ, đánh số thao tác, rồi hỏi xác nhận (AskUserQuestion nếu có) và **dừng chờ**.
- Người dùng báo xong thì Claude **tự kiểm tra** theo "Dấu hiệu đạt". Đạt mới báo ✓ và sang phần sau; chưa đạt thì tìm nguyên nhân, dặn lại.
- Cuối cùng in bảng tổng kết và nhắc cách dùng hằng ngày (chọn frame → "check frame này"; gõ `bảng`, `mở bảng R2`, `mở 3`).
- Không sửa code của pack để chữa cháy trên máy người dùng nếu chưa hỏi họ. Cần sửa thì nói rõ là bản vá tại máy, lần cập nhật pack sau sẽ mất, và nhắc họ báo lại người gửi pack.

## Thành phần của pack
- `nav.py` ở `../figma-desktop/scripts/` (tính từ thư mục skill này): server cục bộ cổng 3847 + lệnh cho Claude. Chạy bằng Python 3.8+ có trên máy (tên lệnh tuỳ máy). `nav.py --help` xem các lệnh. `nav.py setup [thư mục]` chép plugin Figma ra một thư mục cố định để import (mặc định `Documents/Claude Nav` trong thư mục người dùng).
- Plugin Figma ở `../figma-desktop/figma-plugin/`. Figma phải import từ bản chép ở chỗ cố định, vì thư mục pack có thể đổi khi cập nhật.
- Hook SessionStart của pack tự bật server mỗi khi mở session Claude Code (nếu tìm được Python).

## 1 · Python và server claude-nav
Cần: Python 3.8+ chạy được, server claude-nav đang chạy.
Dấu hiệu đạt: `nav.py ensure` in `ok`; trả lời ở `http://127.0.0.1:3847/` là `{"ok":true,"app":"claude-nav"}`.
Lưu ý:
- Máy chưa có Python thì dẫn người dùng cài theo cách hợp với máy họ. macOS: lần đầu gọi `python3` có thể bật hộp thoại cài command line tools. Windows: lệnh `python3` có thể chỉ là lối tắt mở Microsoft Store, không phải Python thật.
- Hook có thể không chạy được trên máy (không có bash, không tìm được Python). Không sao: lệnh `nav.py` nào cũng tự bật server. Báo người dùng rằng sau khi khởi động lại máy, cứ mở Claude Code và gọi bất kỳ việc gì với Figma là server lên.
- Cổng 3847 bị app khác chiếm thì tìm xem app nào, hỏi người dùng trước khi tắt nó.

## 2 · Plugin Figma "Lâyơ ở mố?"
Cần: plugin đã import vào **Figma desktop** (bản web không chạy được development plugin) và đang chạy ở file người dùng làm việc.
Claude làm: `nav.py setup` vào chỗ người dùng dễ tìm. Nếu Documents của họ được OneDrive / iCloud đồng bộ sang chỗ khác thì chọn thư mục họ thật sự thấy, và báo đường dẫn.
Người dùng làm: trong Figma desktop, mở một file → Plugins → Development → Import plugin from manifest… → chọn `manifest.json` vừa chép → chạy plugin "Lâyơ ở mố?" → chọn một frame. Phím chạy lại plugin vừa dùng tuỳ hệ điều hành (macOS `Cmd+Opt+P`, Windows `Ctrl+Alt+P`).
Dấu hiệu đạt: `nav.py sel` thấy file đó "đang mở" và đúng frame vừa chọn. Đọc lại cho người dùng: "Mình thấy bạn đang chọn <frame> trong <file>".
Lưu ý:
- Bảng trên Figma báo đỏ "Chưa nối được Claude" = plugin không gọi được server. Quay lại phần 1. Server ok mà vẫn đỏ thì có thể plugin đang chạy bản import cũ: chép lại rồi tắt, chạy lại plugin.
- File chưa lưu lên Figma cloud (file local, bản nháp mới) thì plugin không lấy được fileKey (`nav.py sel` hiện `local:<tên>`). Vẫn đọc được qua MCP Figma desktop, nhưng muốn sửa bằng `use_figma` thì phải lưu file lên cloud.

## 3 · MCP Figma desktop
Cần: Figma desktop bật desktop MCP server, và Claude Code có MCP trỏ tới nó.
Người dùng làm: trong Figma desktop vào Dev Mode, bật desktop MCP server (vị trí nút đổi theo bản Figma; thường ở panel Inspect, bản cũ ở Preferences). Cần seat Dev hoặc Full trên gói trả phí.
Claude làm: thêm MCP `figma-desktop` (HTTP, `http://127.0.0.1:3845/mcp`) ở phạm vi user bằng `claude mcp add`. Nếu không có lệnh `claude` trong PATH thì dùng binary của app (biến `CLAUDE_CODE_EXECPATH`).
Dấu hiệu đạt: `claude mcp list` báo `figma-desktop` Connected. Chỉ có tên mà không Connected thì chưa đạt: kiểm tra Figma đang mở, đã bật server, URL đúng (bản cũ dùng `/sse`, giờ là `/mcp`).
Lưu ý: không có seat trả phí thì đánh dấu "không áp dụng" và nói rõ mất gì: Claude không tự đọc cây layer / chụp ảnh frame được nữa, vẫn chọn layer được và sửa qua Figma MCP được.

## 4 · Figma MCP (để Claude sửa file)
Cần: plugin `figma@claude-plugins-official` đã cài, và MCP `figma` đã đăng nhập.
Claude làm: cài plugin nếu chưa có (thêm marketplace `anthropics/claude-plugins-official` nếu thiếu).
Người dùng làm: mở session Claude Code mới, gõ `/mcp` → `figma` → Authenticate, đăng nhập Figma trên trình duyệt. Rồi gõ lại `/aid:setup` ở session mới để đi tiếp.
Dấu hiệu đạt: `claude mcp list` báo `figma` Connected và session có tool `use_figma`. Đã cài plugin nhưng chưa đăng nhập thì **chưa** đạt.
Lưu ý: máy có MCP Figma khác (của bên thứ ba) thì nói cho người dùng biết; pack này dùng `figma-desktop` và `figma`.

## 5 · Công cụ phụ (không chặn các phần khác)
- **Node 18+**: cho `ds-audit` tầng chuyên sâu (tra component.gallery). Dấu hiệu đạt: `node --version` ≥ 18. Chưa có thì dẫn cài bản LTS theo máy. Không cài cũng được, chỉ mất tầng chuyên sâu.
- **pypdf**: cho `init-project` đọc file PDF. Dấu hiệu đạt: Python import được `pypdf`. Chưa có thì cài bằng pip của đúng Python ở phần 1. Không cài thì vẫn đọc được DOCX, PPTX, XLSX.

## 6 · Chạy thử
Người dùng chọn một frame ở file đang chạy plugin. Claude: `nav.py sel` → nói đang chọn gì → (nếu có MCP Figma desktop) chụp frame, tả một câu → push thử một lượt lên bảng (`nav.py push`, tiêu đề "Thử setup"). Người dùng bấm dòng trên bảng R1 trong Figma, Figma nhảy tới frame. Hỏi xác nhận.

Bảng tổng kết: Python + server · Plugin Lâyơ ở mố? · MCP figma-desktop · Figma MCP · Node + pypdf · Chạy thử.
