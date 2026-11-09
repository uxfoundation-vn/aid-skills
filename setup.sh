#!/bin/bash
# Cài pack AID vào Claude Code. Chạy: bash setup.sh
# Giữ nguyên thư mục này sau khi cài: Claude Code đọc pack thẳng từ đây.
# Plugin Figma, các MCP và công cụ phụ do skill /aid:setup dẫn cài tiếp, từng bước.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE="$(command -v claude || echo "$CLAUDE_CODE_EXECPATH")"
[ -x "$CLAUDE" ] || { echo "Không thấy lệnh claude. Mở Claude Code và nhờ Claude cài pack (xem README)."; exit 1; }

"$CLAUDE" plugin marketplace add "$DIR" || "$CLAUDE" plugin marketplace update aid
"$CLAUDE" plugin install aid@aid
echo "Xong. Mở session Claude Code mới, gõ /aid:setup để Claude dẫn cài tiếp từng bước."
