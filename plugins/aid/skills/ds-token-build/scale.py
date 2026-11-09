#!/usr/bin/env python3
"""Sinh thang màu primitive bằng OKLCH và kiểm tương phản. Không cần thư viện ngoài (Python 3.8+).

  python3 scale.py gen "#2F5BD3" --scale tailwind --family brand
  python3 scale.py gen "#2F5BD3" --scale radix --family brand
  python3 scale.py gen "#2F5BD3" --scale tailwind --family brand --plan > plan.json
  python3 scale.py preset tailwind --families blue,gray,red --plan
  python3 scale.py theme --brand "Brand 1=#2F5BD3" --brand "Brand 2=#E11D48" --anchor 600
  python3 scale.py contrast "#ffffff" "#2F5BD3"

--plan in ra phần `variables` theo định dạng PLAN của ds-token/write.js.
--pattern đặt tên biến, mặc định "{f}/{f}-{s}" (f = họ màu, s = bậc).
"""
import argparse
import json
import math
import os
import sys

# ---------- chuyển đổi màu ----------

def hex_to_rgb(h):
    h = h.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def rgb_to_hex(rgb):
    return "#" + "".join("%02x" % round(max(0.0, min(1.0, c)) * 255) for c in rgb)


def _lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _gam(c):
    return 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055


def _cbrt(x):
    return math.copysign(abs(x) ** (1 / 3), x)


def rgb_to_oklch(rgb):
    r, g, b = (_lin(c) for c in rgb)
    l = _cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    m = _cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    s = _cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
    A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
    B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    return L, math.hypot(A, B), math.degrees(math.atan2(B, A)) % 360


def oklch_to_rgb_raw(L, C, H):
    A, B = C * math.cos(math.radians(H)), C * math.sin(math.radians(H))
    l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
    m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
    s = (L - 0.0894841775 * A - 1.2914855480 * B) ** 3
    r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    b = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    return r, g, b


def oklch_to_rgb(L, C, H):
    """Giảm chroma tới khi lọt gam sRGB, giữ nguyên L và H."""
    lo, hi = 0.0, C
    rgb = oklch_to_rgb_raw(L, C, H)
    if all(-1e-4 <= c <= 1 + 1e-4 for c in rgb):
        return tuple(_gam(max(0.0, min(1.0, c))) for c in rgb)
    for _ in range(30):
        mid = (lo + hi) / 2
        if all(-1e-4 <= c <= 1 + 1e-4 for c in oklch_to_rgb_raw(L, mid, H)):
            lo = mid
        else:
            hi = mid
    return tuple(_gam(max(0.0, min(1.0, c))) for c in oklch_to_rgb_raw(L, lo, H))


def luminance(rgb):
    r, g, b = (_lin(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


# ---------- thang ----------
# L và tỉ lệ chroma (so với đỉnh) cho từng bậc, đo gần đúng từ bảng Tailwind v4 và Radix.
SCALES = {
    "tailwind": {
        "steps": ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
        "L": [0.971, 0.932, 0.882, 0.809, 0.707, 0.623, 0.546, 0.488, 0.424, 0.379, 0.282],
        "L_neutral": [0.985, 0.967, 0.928, 0.872, 0.707, 0.551, 0.446, 0.373, 0.278, 0.210, 0.130],
        "C": [0.06, 0.13, 0.24, 0.47, 0.67, 0.87, 1.0, 0.99, 0.81, 0.60, 0.37],
    },
    "50-900": {
        "steps": ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"],
        "L": [0.971, 0.932, 0.882, 0.809, 0.707, 0.623, 0.546, 0.488, 0.424, 0.340],
        "L_neutral": [0.985, 0.967, 0.928, 0.872, 0.707, 0.551, 0.446, 0.373, 0.278, 0.180],
        "C": [0.06, 0.13, 0.24, 0.47, 0.67, 0.87, 1.0, 0.99, 0.81, 0.55],
    },
    # Radix: bậc 9 luôn là đúng màu nhập vào, bậc 10 là hover của bậc 9.
    "radix": {
        "steps": [str(i) for i in range(1, 13)],
        "L": [0.993, 0.982, 0.958, 0.930, 0.900, 0.862, 0.806, 0.735, None, None, 0.550, 0.320],
        "C": [0.03, 0.08, 0.17, 0.27, 0.37, 0.45, 0.55, 0.70, 1.0, 1.0, 0.85, 0.55],
        "anchor": "9", "hover": -0.035,
    },
    "radix-dark": {
        "steps": [str(i) for i in range(1, 13)],
        "L": [0.178, 0.205, 0.255, 0.295, 0.335, 0.385, 0.450, 0.530, None, None, 0.780, 0.930],
        "C": [0.12, 0.15, 0.30, 0.42, 0.50, 0.55, 0.60, 0.70, 1.0, 1.0, 0.75, 0.30],
        "anchor": "9", "hover": 0.04,
    },
}
WHITE, BLACK = (1.0, 1.0, 1.0), (0.0, 0.0, 0.0)


def _stretch(vals, last):
    """Kéo dãy vals (đơn điệu) sao cho phần tử đầu giữ nguyên, phần tử cuối thành `last`."""
    first, old_last = vals[0], vals[-1]
    if old_last == first:
        return [first] * len(vals)
    return [first + (v - first) * (last - first) / (old_last - first) for v in vals]


def gen_scale(hex_in, scale, anchor=None):
    spec = SCALES[scale]
    rgb_in = hex_to_rgb(hex_in)
    L0, C0, H0 = rgb_to_oklch(rgb_in)
    neutral = C0 < 0.03
    steps, Cf = spec["steps"], spec["C"]
    Ls = list(spec.get("L_neutral") if neutral and "L_neutral" in spec else spec["L"])

    if "anchor" in spec:
        ai = steps.index(spec["anchor"])
        light = spec["hover"] < 0
        Ls[ai], Ls[ai + 1] = L0, L0 + spec["hover"]
        if light:
            if Ls[ai - 1] <= L0 + 0.03:
                Ls[:ai] = _stretch(Ls[:ai], L0 + 0.03)
            Ls[ai + 2] = min(Ls[ai + 2], L0 - 0.08)
            Ls[ai + 3] = min(Ls[ai + 3], Ls[ai + 2] - 0.18)
        else:
            if Ls[ai - 1] >= L0 - 0.03:
                Ls[:ai] = _stretch(Ls[:ai], L0 - 0.03)
            Ls[ai + 2] = max(Ls[ai + 2], L0 + 0.10)
            Ls[ai + 3] = min(0.98, max(Ls[ai + 3], Ls[ai + 2] + 0.10))
    else:
        if anchor is not None:
            if anchor not in steps:
                sys.exit("Bậc %s không có trong thang %s" % (anchor, scale))
            ai = steps.index(anchor)
            # Giữ hai đầu thang, kéo đoạn giữa để bậc neo đúng bằng độ sáng màu nhập.
            upper, lower = Ls[:ai + 1], Ls[ai:]
            if ai > 0:
                Ls[:ai + 1] = _stretch(upper, L0)
            if ai < len(Ls) - 1:
                Ls[ai:] = list(reversed(_stretch(list(reversed(lower)), L0)))
        else:
            ai = min(range(len(Ls)), key=lambda i: abs(Ls[i] - L0))
        Ls[ai] = L0
    peak = C0 / Cf[ai] if Cf[ai] else C0

    out = []
    for i, s in enumerate(steps):
        if i == ai:
            rgb = rgb_in
        else:
            rgb = oklch_to_rgb(Ls[i], peak * Cf[i], H0)
        L, C, H = rgb_to_oklch(rgb)
        cw, cb = contrast(rgb, WHITE), contrast(rgb, BLACK)
        out.append({
            "step": s, "hex": rgb_to_hex(rgb), "anchor": i == ai,
            "oklch": "oklch(%.3f %.3f %.1f)" % (L, C, H),
            "contrast_white": round(cw, 2), "contrast_black": round(cb, 2),
        })

    warnings = []
    for i in range(1, len(out)):
        prev, cur = rgb_to_oklch(hex_to_rgb(out[i - 1]["hex"]))[0], rgb_to_oklch(hex_to_rgb(out[i]["hex"]))[0]
        down = scale != "radix-dark"
        if (down and cur >= prev) or (not down and cur <= prev):
            warnings.append("Bậc %s và %s không tăng/giảm đều độ sáng (màu nhập quá sáng hoặc quá tối cho vị trí này)" % (out[i - 1]["step"], out[i]["step"]))
    # Mốc tương phản: bậc dùng làm chữ phải đạt AA trên nền sáng.
    text_step = {"tailwind": "600", "50-900": "600", "radix": "11"}.get(scale)
    if text_step:
        row = next(r for r in out if r["step"] == text_step)
        if row["contrast_white"] < 4.5:
            warnings.append("Bậc %s (bậc hay dùng cho chữ) chỉ đạt %.2f:1 trên nền trắng, chưa đủ AA 4.5:1" % (text_step, row["contrast_white"]))
    return {"input": hex_in, "scale": scale, "neutral": neutral, "anchor_step": steps[ai], "steps": out, "warnings": warnings}


def read_preset_md(path):
    """Đọc mọi bảng markdown có cột đầu là 'Họ': mỗi dòng một họ màu, mỗi cột một bậc."""
    data, steps = {}, None
    with open(path, encoding="utf-8") as f:
        for line in f:
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if not line.lstrip().startswith("|"):
                steps = None
            elif cells[0] == "Họ":
                steps = cells[1:]
            elif steps and not set(cells[0]) <= set("-: "):
                data[cells[0]] = dict(zip(steps, cells[1:]))
    return data


def to_plan(family, rows, collection, mode, pattern):
    # Họ "base" (trắng, đen) không có bậc: đặt tên base/white, base/black.
    return [{
        "collection": collection, "name": "base/" + r["step"] if family == "base" else pattern.format(f=family, s=r["step"]), "type": "COLOR",
        "scopes": [], "hidden": True, "values": {mode: r["hex"]},
    } for r in rows]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    g = sub.add_parser("gen", help="sinh thang từ một màu")
    g.add_argument("hex")
    g.add_argument("--scale", default="tailwind", choices=["tailwind", "50-900", "radix"])
    g.add_argument("--family", default="brand")
    g.add_argument("--anchor", help="ép màu nhập nằm ở bậc này (ví dụ 500). Mặc định: bậc có độ sáng gần nhất. Thang radix luôn neo ở 9")

    p = sub.add_parser("preset", help="lấy thang từ presets/<tên>.json")
    p.add_argument("name", choices=["tailwind", "radix"])
    p.add_argument("--families", default="", help="danh sách họ màu, cách nhau dấu phẩy; trống = tất cả")

    for x in (g, p):
        x.add_argument("--plan", action="store_true", help="in PLAN variables cho write.js")
        x.add_argument("--collection", default="Primitive")
        x.add_argument("--mode", default="Value")
        x.add_argument("--pattern", default="{f}/{f}-{s}")

    t = sub.add_parser("theme", help="thang brand cho collection Theme, mỗi brand một mode (luôn in PLAN)")
    t.add_argument("--brand", action="append", required=True, help='"Tên mode=#hex", lặp lại cho từng brand')
    t.add_argument("--scale", default="tailwind", choices=["tailwind", "50-900"])
    t.add_argument("--anchor")
    t.add_argument("--family", default="primary", help="tên họ trong Theme")
    t.add_argument("--collection", default="Theme")
    t.add_argument("--pattern", default="{f}/{f}-{s}")
    t.add_argument("--alias-primitive", metavar="COLLECTION", help="ghi thang từng brand vào Primitive rồi để Theme alias tới; bỏ trống = Theme ghi thẳng giá trị")
    t.add_argument("--primitive-mode", default="Value")

    n = sub.add_parser("nearest", help="token có màu gần nhất với một mã màu (khoảng cách OKLab)")
    n.add_argument("hex")
    n.add_argument("candidates", nargs="+", help='"tên=#hex", truyền các token đã lọc đúng scope')
    n.add_argument("--top", type=int, default=3)

    c = sub.add_parser("contrast", help="tỉ lệ tương phản giữa 2 màu")
    c.add_argument("a")
    c.add_argument("b")

    a = ap.parse_args()

    if a.cmd == "contrast":
        r = contrast(hex_to_rgb(a.a), hex_to_rgb(a.b))
        print(json.dumps({"ratio": round(r, 2), "AA_text": r >= 4.5, "AA_large_text_or_ui": r >= 3, "AAA_text": r >= 7}))
        return

    if a.cmd == "nearest":
        def lab(h):
            L, C, H = rgb_to_oklch(hex_to_rgb(h))
            return L, C * math.cos(math.radians(H)), C * math.sin(math.radians(H))
        x = lab(a.hex)
        rows = []
        for cand in a.candidates:
            name, _, hx = cand.rpartition("=")
            y = lab(hx)
            rows.append({"token": name, "hex": hx, "distance": round(math.dist(x, y), 4)})
        rows.sort(key=lambda r: r["distance"])
        # < 0.02 gần như trùng; 0.02–0.06 gần; > 0.06 khác hẳn, nên hỏi người dùng.
        for r in rows:
            r["match"] = "trùng" if r["distance"] < 0.02 else "gần" if r["distance"] < 0.06 else "khác"
        print(json.dumps(rows[:a.top], ensure_ascii=False))
        return

    if a.cmd == "theme":
        theme, prim, warns = {}, [], {}
        for spec in a.brand:
            mode, _, hx = spec.partition("=")
            res = gen_scale(hx.strip(), a.scale, a.anchor)
            if res["warnings"]:
                warns[mode] = res["warnings"]
            slug = "".join(ch if ch.isalnum() else "-" for ch in mode.strip().lower()).strip("-")
            for r in res["steps"]:
                name = a.pattern.format(f=a.family, s=r["step"])
                if a.alias_primitive:
                    pname = a.pattern.format(f=slug, s=r["step"])
                    prim.append({"collection": a.alias_primitive, "name": pname, "type": "COLOR", "scopes": [], "hidden": True, "values": {a.primitive_mode: r["hex"]}})
                    val = {"alias": "%s:%s" % (a.alias_primitive, pname)}
                else:
                    val = r["hex"]
                theme.setdefault(name, {"collection": a.collection, "name": name, "type": "COLOR", "scopes": [], "hidden": True, "values": {}})["values"][mode.strip()] = val
        print(json.dumps({"variables": prim + list(theme.values()), "warnings": warns}, ensure_ascii=False, indent=1))
        return

    if a.cmd == "gen":
        results = {a.family: gen_scale(a.hex, a.scale, a.anchor)}
        if a.scale == "radix":
            results[a.family + "-dark"] = gen_scale(a.hex, "radix-dark")
    else:
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "presets", a.name + ".md")
        if not os.path.exists(path):
            sys.exit("Chưa có %s. Xem mục 'Bảng có sẵn' trong SKILL.md." % path)
        data = read_preset_md(path)
        want = [x.strip() for x in a.families.split(",") if x.strip()] or list(data)
        missing = [x for x in want if x not in data]
        if missing:
            sys.exit("Không có họ màu: %s. Có: %s" % (", ".join(missing), ", ".join(data)))
        results = {f: {"steps": [{"step": s, "hex": h} for s, h in data[f].items()]} for f in want}

    if a.plan:
        plan = []
        for fam, res in results.items():
            plan += to_plan(fam, res["steps"], a.collection, a.mode, a.pattern)
        print(json.dumps(plan, ensure_ascii=False, indent=1))
    else:
        print(json.dumps(results, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
