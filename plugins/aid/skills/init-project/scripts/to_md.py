#!/usr/bin/env python3
"""Chuyển hàng loạt tài liệu (.pdf, .docx, .doc, .rtf, .txt) ở thư mục dự án sang .md.

Cách chạy:  python3 to_md.py <thư-mục-dự-án>
- Chỉ quét file nằm ngay trong thư mục (không đi sâu vào thư mục con).
- Ghi bản .md vào <thư-mục-dự-án>/_md/ (cùng tên file gốc), rồi dời file gốc vào <thư-mục-dự-án>/sources/
  (giữ nguyên tên, không sửa nội dung). File lỗi không chuyển được thì để nguyên chỗ cũ.
- In ra JSON: mỗi file một dòng tóm tắt (số trang, số ký tự, vài dòng đầu) để AI phân loại
  mà không phải đọc cả file.
Chỉ dùng thư viện có sẵn của Python. PDF: dùng pypdf nếu đã cài, không thì dùng PDFKit có sẵn trên macOS.
"""
import json, os, re, shutil, subprocess, sys, zipfile
from xml.etree import ElementTree as ET

EXTS = {".pdf", ".docx", ".doc", ".rtf", ".txt"}
PREVIEW_LINES = 15


def pdf_pages(path):
    try:
        from pypdf import PdfReader  # type: ignore
        return [(p.extract_text() or "") for p in PdfReader(path).pages]
    except ImportError:
        pass
    if sys.platform == "darwin":
        jxa = (
            'ObjC.import("PDFKit");'
            'var d=$.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(%s));'
            'var out=[];for(var i=0;i<d.pageCount;i++){var s=d.pageAtIndex(i).string;out.push(s?s.js:"")}'
            'JSON.stringify(out)'
        ) % json.dumps(os.path.abspath(path))
        r = subprocess.run(["osascript", "-l", "JavaScript", "-e", jxa], capture_output=True, text=True)
        if r.returncode == 0:
            return json.loads(r.stdout)
        raise RuntimeError(r.stderr.strip())
    raise RuntimeError("Chưa đọc được PDF: chạy `pip install pypdf` rồi chạy lại.")


def docx_text(path):
    ns = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    def para(p):
        style = p.find(f"{ns}pPr/{ns}pStyle")
        text = "".join(t.text or "" for t in p.iter(ns + "t")).strip()
        val = style.get(ns + "val", "") if style is not None else ""
        m = re.search(r"(\d)$", val)
        if text and "eading" in val and m:
            text = "#" * min(int(m.group(1)), 6) + " " + text
        return text

    lines = []
    body = root.find(ns + "body")
    for block in list(body if body is not None else root):
        if block.tag == ns + "p":
            text = para(block)
            if text:
                lines.append(text)
        elif block.tag == ns + "tbl":
            rows = []
            for tr in block.findall(ns + "tr"):
                cells = [" ".join(filter(None, (para(p) for p in tc.iter(ns + "p")))).replace("|", "/")
                         for tc in tr.findall(ns + "tc")]
                rows.append("| " + " | ".join(cells) + " |")
            if rows:
                n = rows[0].count(" | ") + 1
                lines.append("\n".join(rows[:1] + ["|" + "---|" * n] + rows[1:]))
    return "\n\n".join(lines)


def textutil(path):
    r = subprocess.run(["textutil", "-convert", "txt", "-stdout", path], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip())
    return r.stdout


def convert(path):
    ext = os.path.splitext(path)[1].lower()
    if ext == ".pdf":
        pages = pdf_pages(path)
        body = "\n\n".join(f"<!-- trang {i + 1} -->\n{p.strip()}" for i, p in enumerate(pages))
        return body, len(pages)
    if ext == ".docx":
        return docx_text(path), None
    if ext in (".doc", ".rtf") and sys.platform == "darwin":
        return textutil(path), None
    if ext == ".txt":
        with open(path, encoding="utf-8", errors="replace") as f:
            return f.read(), None
    raise RuntimeError(f"Chưa hỗ trợ {ext} trên máy này.")


def main():
    root = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
    out_dir = os.path.join(root, "_md")
    src_dir = os.path.join(root, "sources")
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(src_dir, exist_ok=True)
    report, used = [], set()
    for name in sorted(os.listdir(root)):
        path = os.path.join(root, name)
        if not os.path.isfile(path) or os.path.splitext(name)[1].lower() not in EXTS:
            continue
        item = {"file": name}
        try:
            text, pages = convert(path)
            stem, ext = os.path.splitext(name)
            md_name = stem + ".md"
            if md_name in used:
                md_name = f"{stem} ({ext[1:]}).md"
            used.add(md_name)
            with open(os.path.join(out_dir, md_name), "w", encoding="utf-8") as f:
                f.write(f"> **Đọc file này khi** [AI điền]. Nguồn: `sources/{name}`\n\n{text.strip()}\n")
            shutil.move(path, os.path.join(src_dir, name))
            nonempty = [l.strip() for l in text.splitlines() if l.strip() and not l.startswith("<!--")]
            item.update(md=f"_md/{md_name}", source=f"sources/{name}", pages=pages, chars=len(text),
                        preview=nonempty[:PREVIEW_LINES],
                        warn="Gần như không có chữ, có thể là PDF scan: AI cần đọc trực tiếp file gốc"
                        if pages and len(text.strip()) / pages < 30 else None)
        except Exception as e:  # noqa: BLE001
            item["error"] = str(e)
        report.append(item)
    print(json.dumps(report, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
