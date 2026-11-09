#!/usr/bin/env node
/**
 * Prototype crawler cho component.gallery — kênh nguồn thứ 2 của workflow (cùng Mobbin).
 *
 * Site là Astro static, dữ liệu đã nằm sẵn trong HTML dưới dạng data-* attributes,
 * nên chỉ cần fetch + regex, không cần headless browser.
 *
 * Lịch sự với site — ràng buộc bắt buộc (chi tiết trong memory `component-gallery-crawler`):
 *  - UA trung thực, KHÔNG giả mạo browser, KHÔNG dùng tên ClaudeBot (site Disallow → 403 thật).
 *  - Delay giữa các request, cache lại để không fetch lặp.
 *  - Chỉ lưu metadata + text các section bài viết + link về nguồn gốc (use=reference),
 *    không mirror ảnh, luôn ghi credit "Nguồn: The Component Gallery" + link trang gốc.
 *  - Repo gốc inbn/component-gallery KHÔNG có LICENSE → chỉ dùng nội bộ research,
 *    không commit cache/ ra repo public; dùng dài hạn/định kỳ thì xin phép tác giả trước.
 *
 * Usage:
 *   node crawl.mjs list                      # lấy index 61 component + số example
 *   node crawl.mjs fetch accordion badge     # crawl từng component -> cache/<slug>.json
 *   node crawl.mjs fetch --all               # crawl toàn bộ (delay 1.5s/req)
 *   node crawl.mjs find chip                 # tra theo tên + tên gọi khác (Chip → trang Badge)
 *   node crawl.mjs find "text field" --all   # kéo đủ 60 trang rồi dò cả tên trong ví dụ
 *   node crawl.mjs to-data accordion         # xuất sample-output/cg-accordion.json (schema repo)
 *   node crawl.mjs to-data accordion --to-repo  # ghi thẳng vào ../data/
 *
 * Flags: --force (bỏ qua cache), --group-by name|tech (mặc định name), --limit N, --to-repo
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
// Bản trong pack AID: cache ghi vào thư mục đang làm việc (thư mục plugin bị thay khi cập nhật).
// Đổi chỗ bằng biến CG_CACHE_DIR.
const CACHE_DIR = process.env.CG_CACHE_DIR || path.join(process.cwd(), ".aid", "component-gallery");
const SAMPLE_DIR = path.join(ROOT, "sample-output");
const REPO_DATA_DIR = path.join(ROOT, "..", "data");
const BASE = "https://component.gallery";

const UA =
  "ComponentGalleryResearch/0.1 (personal design-research archive; +https://component.gallery/contribute)";
const DELAY_MS = 1500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.text();
}

/* ---------- parsing helpers (site render server-side, regex là đủ) ---------- */

const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

const stripTags = (s) => decode(s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim();

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m ? decode(m[1]) : null;
};

const splitList = (v) =>
  !v || v === "false" ? [] : v.split(",").map((s) => s.trim()).filter(Boolean);

/** HTML -> text dễ đọc: link giữ dạng "text (url)", code trong backticks, xuống dòng ở block tags. */
function htmlToText(html) {
  let s = html;
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "");
  // Link trước khi bỏ tag: giữ text + href (quan trọng cho section Resources)
  s = s.replace(/<a\s[^>]*?href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    const url = decode(href);
    if (!url || url.startsWith("#")) return text;
    return text ? `${text} (${url})` : `(${url})`;
  });
  s = s.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, c) => `\`${c.replace(/<[^>]+>/g, "").trim()}\``);
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/(p|li|h[1-6]|blockquote|pre|div|tr|dd|dt)>/gi, "\n");
  s = s.replace(/<li(?![a-z])[^>]*>/gi, "• ");
  // Tag regex cho phép ">" nằm trong giá trị attribute được quote (vd Tailwind `[&>*]:border`)
  s = s.replace(/<[a-zA-Z!/](?:"[^"]*"|'[^']*'|[^>"'])*>/g, " ");
  return decode(s)
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/** /components/ -> [{ slug, name, exampleCount }] */
function parseIndex(html) {
  const out = [];
  const seen = new Set();
  // Không scope theo <ul id="components"> vì card có <ul>/<li> lồng nhau (tag tech/features)
  // -> regex non-greedy sẽ bị cắt sớm. Thay vào đó lấy mọi <li data-name=…> có link /components/.
  for (const m of html.matchAll(/<li[^>]*data-name="[^"]*"[\s\S]*?href="\/components\/[^"]*"/g)) {
    const li = m[0];
    // Đoạn sau link (tới card kế) chứa dòng tên gọi khác
    const tail = html.slice(m.index + li.length, m.index + li.length + 3000).split(/<li[^>]*data-name=/)[0];
    const open = li.match(/<li[^>]*>/)[0];
    const name = attr(open, "data-name");
    const href = (li.match(/href="\/components\/([^"#?]+)"/) || [])[1];
    if (!name || !href || seen.has(href)) continue;
    seen.add(href);
    // Tên gọi khác nằm ở <p class="… italic"> ngay dưới tên (vd Badge → "Tag, Label, Chip")
    const aliasRaw = (tail.match(/<p[^>]*\bitalic\b[^>]*>([\s\S]*?)<\/p>/) || [])[1];
    out.push({
      slug: href.replace(/\/$/, ""),
      name,
      aliases: aliasRaw ? splitList(stripTags(aliasRaw)) : [],
      exampleCount: Number(attr(open, "data-example-count") ?? 0),
      url: `${BASE}/components/${href.replace(/\/$/, "")}/`,
    });
  }
  return out;
}

/** /components/<slug>/ -> component record */
function parseComponent(slug, html) {
  const title = stripTags((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [, ""])[1]);
  const aliases = splitList(
    stripTags((html.match(/<span data-other-names>([\s\S]*?)<\/span>/) || [, ""])[1])
  );
  const description =
    (html.match(/<meta name="description" content="([^"]*)"/) || [, ""])[1] &&
    decode((html.match(/<meta name="description" content="([^"]*)"/) || [, ""])[1]);
  const emoji = ((html.match(/<meta property="og:title" content="([^"]*)"/) || [, ""])[1].match(
    /^\P{L}+/u
  ) || [""])[0].trim();

  const examples = [];
  for (const li of html.match(/<li[^>]*data-component-name="[\s\S]*?<\/li>/g) ?? []) {
    const open = li.match(/<li[^>]*>/)[0];
    const img = (li.match(/<img[^>]*src="([^"]*)"/) || [])[1];
    examples.push({
      componentName: attr(open, "data-component-name"),
      designSystem: attr(open, "data-design-system-name"),
      url: attr(open, "data-component-url"),
      tech: splitList(attr(open, "data-tech")),
      features: splitList(attr(open, "data-features")),
      screenshot: img ? (img.startsWith("http") ? img : BASE + img) : null,
    });
  }

  // "name distribution" của site tính từ chính danh sách example -> derive lại
  const nameDist = {};
  for (const e of examples) nameDist[e.componentName] = (nameDist[e.componentName] ?? 0) + 1;

  // Nội dung prose thật của các section bài viết (chỉ ~12/61 component có, nằm trong repo
  // inbn/component-gallery). Ranh giới section = <h2> CÓ id (card trong Resources lồng <h2>
  // không id -> không được tính). Bỏ các section thuần data (examples, name-distribution);
  // `footnote-label` là heading sr-only của phần chân trang -> đổi key.
  const prose = {};
  const h2s = [...html.matchAll(/<h2\s[^>]*?\bid="([^"]+)"[^>]*>[\s\S]*?<\/h2>/g)];
  for (const [i, m] of h2s.entries()) {
    const id = m[1];
    if (id === "examples" || id === "name-distribution") continue;
    const start = m.index + m[0].length;
    const end = i + 1 < h2s.length ? h2s[i + 1].index : html.length;
    const text = htmlToText(html.slice(start, end));
    if (text) prose[id === "footnote-label" ? "footnotes" : id] = text;
  }

  return {
    slug,
    source: "component.gallery",
    sourceUrl: `${BASE}/components/${slug}/`,
    fetchedAt: new Date().toISOString().slice(0, 10),
    title,
    emoji,
    aliases,
    description,
    exampleCount: examples.length,
    nameDistribution: Object.fromEntries(
      Object.entries(nameDist).sort((a, b) => b[1] - a[1])
    ),
    techFacets: facet(examples, "tech"),
    featureFacets: facet(examples, "features"),
    prose,
    examples,
  };
}

function facet(examples, key) {
  const c = {};
  for (const e of examples) for (const v of e[key]) c[v] = (c[v] ?? 0) + 1;
  return Object.fromEntries(Object.entries(c).sort((a, b) => b[1] - a[1]));
}

/* ---------- commands ---------- */

async function cmdList() {
  const items = parseIndex(await get(`${BASE}/components/`));
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(
    path.join(CACHE_DIR, "_index.json"),
    JSON.stringify({ fetchedAt: new Date().toISOString().slice(0, 10), count: items.length, items }, null, 2)
  );
  console.log(`${items.length} components -> cache/_index.json`);
  for (const i of items) console.log(`  ${String(i.exampleCount).padStart(3)}  ${i.slug}`);
}

async function cmdFetch(slugs, { force, limit }) {
  await mkdir(CACHE_DIR, { recursive: true });
  if (slugs[0] === "--all") {
    const idxPath = path.join(CACHE_DIR, "_index.json");
    if (!existsSync(idxPath)) throw new Error("chạy `node crawl.mjs list` trước");
    slugs = JSON.parse(await readFile(idxPath, "utf8")).items.map((i) => i.slug);
  }
  if (limit) slugs = slugs.slice(0, limit);

  for (const [i, slug] of slugs.entries()) {
    const out = path.join(CACHE_DIR, `${slug}.json`);
    if (!force && existsSync(out)) {
      console.log(`skip (cached)  ${slug}`);
      continue;
    }
    const rec = parseComponent(slug, await get(`${BASE}/components/${slug}/`));
    await writeFile(out, JSON.stringify(rec, null, 2));
    console.log(
      `ok  ${slug}  — ${rec.exampleCount} examples, ${rec.aliases.length} aliases, ` +
        `${Object.keys(rec.nameDistribution).length} tên khác nhau` +
        (Object.keys(rec.prose).length
          ? `, prose: ${Object.keys(rec.prose).join(", ")}`
          : ", không có prose")
    );
    if (i < slugs.length - 1) await sleep(DELAY_MS);
  }
}

/**
 * find <tên>: tra component theo cả tên chính lẫn tên gọi khác.
 * component.gallery gộp nhiều thứ vào một trang (vd Chip nằm trong Badge), nên gõ slug
 * "chip" sẽ không thấy. Lệnh này:
 *  1. Dò tên + aliases trong _index.json (cũ chưa có aliases thì tự chạy lại list).
 *  2. Fetch (có cache) các trang khớp, lọc riêng examples có componentName chứa <tên>.
 *  3. Ghi cache/_find-<tên>.json để bước research đọc lại.
 */
async function cmdFind(term, { all }) {
  if (!term) throw new Error("cần tên, vd: node crawl.mjs find chip");
  const idxPath = path.join(CACHE_DIR, "_index.json");
  let idx = existsSync(idxPath) ? JSON.parse(await readFile(idxPath, "utf8")) : null;
  if (!idx || !idx.items.some((i) => Array.isArray(i.aliases))) {
    await cmdList();
    idx = JSON.parse(await readFile(idxPath, "utf8"));
  }
  // So khớp bỏ khoảng trắng/gạch/hoa thường/số nhiều: "Text field" = "TextField" = "text-fields"
  const norm = (s) => s.toLowerCase().replace(/[\s\-_]/g, "").replace(/s$/, "");
  const t = norm(term);
  const hit = (s) => !!s && norm(s).includes(t);

  // --all: kéo đủ mọi trang về cache trước (một lần, ~1.5s/trang), để dò được cả tên trong ví dụ
  if (all) await cmdFetch(idx.items.map((i) => i.slug), {});
  const cached = (slug) => existsSync(path.join(CACHE_DIR, `${slug}.json`));
  const load = async (slug) => JSON.parse(await readFile(path.join(CACHE_DIR, `${slug}.json`), "utf8"));

  // Tầng 1: tên chính + tên gọi khác ở trang danh sách. Tầng 2: tên trong ví dụ của các trang đã cache.
  const pages = [];
  for (const p of idx.items) {
    if (hit(p.name) || hit(p.slug)) pages.push({ p, matchedBy: "tên chính" });
    else if (p.aliases.some(hit)) pages.push({ p, matchedBy: "tên gọi khác" });
    else if (cached(p.slug) && Object.keys((await load(p.slug)).nameDistribution).some(hit))
      pages.push({ p, matchedBy: "tên trong ví dụ" });
  }

  const result = { term, fetchedAt: new Date().toISOString().slice(0, 10),
    scanned: all ? "đủ 60 trang" : `danh sách + ${idx.items.filter((i) => cached(i.slug)).length} trang đã cache`, pages: [] };
  for (const { p, matchedBy } of pages) {
    await cmdFetch([p.slug], {});
    const rec = await load(p.slug);
    const isMain = matchedBy === "tên chính";
    const matched = isMain ? rec.examples : rec.examples.filter((e) => hit(e.componentName));
    result.pages.push({
      slug: p.slug, name: p.name, aliases: p.aliases, matchedBy,
      totalExamples: rec.exampleCount,
      matchedExamples: matched,
      // Trang gộp: prose/guideline viết cho tên chính, không chắc đúng với <tên>
      warning: isMain ? null
        : `Trang "${p.name}" gộp nhiều loại. Chỉ dùng ${matched.length}/${rec.exampleCount} ví dụ tên "${term}"; prose/guideline của trang viết cho ${p.name}, đừng áp thẳng.`,
    });
  }
  await writeFile(path.join(CACHE_DIR, `_find-${t}.json`), JSON.stringify(result, null, 2));
  console.log(`\nđã dò: ${result.scanned}`);
  if (!pages.length)
    console.log(`không thấy "${term}".` + (all ? "" : " Chạy lại với --all để dò tên trong ví dụ của cả 60 trang."));
  for (const p of result.pages) {
    console.log(`\n${p.name} (${p.slug}) — khớp ${p.matchedBy}, ${p.matchedExamples.length}/${p.totalExamples} ví dụ`);
    if (p.warning) console.log(`  ⚠ ${p.warning}`);
    if (p.matchedBy !== "tên chính")
      for (const e of p.matchedExamples) console.log(`  · ${e.designSystem} — ${e.componentName}  ${e.url ?? ""}`);
  }
}

/** cache/<slug>.json -> data/cg-<slug>.json theo schema gallery của repo */
async function cmdToData(slug, { groupBy, toRepo }) {
  const rec = JSON.parse(await readFile(path.join(CACHE_DIR, `${slug}.json`), "utf8"));
  const withShot = rec.examples.filter((e) => e.screenshot);

  const groups = new Map();
  for (const e of withShot) {
    const keys = groupBy === "tech" ? (e.tech.length ? e.tech : ["Không rõ tech"]) : [e.componentName];
    for (const k of keys) {
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(e);
    }
  }

  const sections = [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([name, items]) => ({
      name: `${name} (${items.length})`,
      layout: "grid",
      items: items
        .sort((a, b) => a.designSystem.localeCompare(b.designSystem))
        .map((e) => ({
          app: e.designSystem,
          platform: "cg",
          image: e.screenshot,
          url: e.url,
          tech: e.tech,
          features: e.features,
        })),
    }));

  const doc = {
    slug: `cg-${slug}`,
    date: new Date().toISOString().slice(0, 10),
    category: "component",
    title: `UI Refs: ${rec.title} (Design Systems)`,
    subtitle:
      `Nguồn: The Component Gallery (component.gallery/components/${slug}) — ` +
      `${rec.exampleCount} component từ design system thật, nhóm theo ${groupBy === "tech" ? "tech stack" : "tên gọi"}. ` +
      (rec.aliases.length ? `Tên gọi khác: ${rec.aliases.join(", ")}. ` : "") +
      `Bấm link để mở docs gốc của design system.`,
    sections,
  };

  // Mặc định ghi vào sample-output/ để không lẫn vào pipeline data/ + index.html của repo.
  // Khi nào chốt tích hợp thật thì thêm --to-repo.
  const dir = toRepo ? REPO_DATA_DIR : SAMPLE_DIR;
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `cg-${slug}.json`), JSON.stringify(doc, null, 2));
  console.log(
    `-> ${toRepo ? "data" : "component-gallery/sample-output"}/cg-${slug}.json  (${sections.length} sections, ` +
      `${withShot.length}/${rec.exampleCount} items có screenshot)`
  );
}

/* ---------- main ---------- */

const argv = process.argv.slice(2);
const flags = {
  force: argv.includes("--force"),
  all: argv.includes("--all"),
  toRepo: argv.includes("--to-repo"),
  groupBy: (argv[argv.indexOf("--group-by") + 1] ?? "name").replace(/^--.*/, "name"),
  limit: argv.includes("--limit") ? Number(argv[argv.indexOf("--limit") + 1]) : 0,
};
const positional = argv.filter((a, i) => !a.startsWith("--") && !argv[i - 1]?.match(/^--(group-by|limit)$/));
const [cmd, ...rest] = positional;

try {
  if (cmd === "list") await cmdList();
  else if (cmd === "fetch") await cmdFetch(rest.length ? rest : ["--all"], flags);
  else if (cmd === "find") await cmdFind(rest.join(" "), flags);
  else if (cmd === "to-data") await cmdToData(rest[0], flags);
  else {
    console.log("commands: list | fetch <slug…|--all> | find <tên> | to-data <slug>");
    process.exit(1);
  }
} catch (err) {
  console.error("ERROR:", err.message);
  process.exit(1);
}
