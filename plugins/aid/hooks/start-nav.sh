#!/bin/bash
# SessionStart: bật server claude-nav ngầm để plugin Figma nối được ngay. Không bao giờ chặn session.
NAV="$(dirname "$0")/../skills/figma-desktop/scripts/nav.py"
for p in python3 python py; do
  command -v "$p" >/dev/null 2>&1 || continue
  # macOS chưa cài command line tools: /usr/bin/python3 chỉ là stub, gọi vào sẽ bật hộp thoại cài mỗi session.
  [ "$(uname)" = Darwin ] && [ "$(command -v "$p")" = /usr/bin/python3 ] && ! xcode-select -p >/dev/null 2>&1 && continue
  # Bỏ qua lối tắt Microsoft Store và Python 2.
  "$p" -c 'import sys; sys.exit(sys.version_info < (3, 8))' >/dev/null 2>&1 || continue
  ("$p" "$NAV" ensure >/dev/null 2>&1 &)
  break
done
exit 0
