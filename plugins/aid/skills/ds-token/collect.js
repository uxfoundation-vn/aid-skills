// ds-token · collect.js — gom giá trị đang dùng trong phạm vi ROOT_IDS. CHỈ ĐỌC.
// Dán nguyên đoạn vào use_figma. Thay ROOT_IDS bằng id page hoặc frame ('12:34').
// Mỗi lần gọi chỉ quét một page; nhiều page thì gọi song song, mỗi page một lần.
const ROOT_IDS = ['<id>'];
const SAMPLE = 3; // số id node mẫu giữ lại cho mỗi giá trị

const h2 = v => Math.round(v * 255).toString(16).padStart(2, '0');
const hex = (c, a = 1) => '#' + h2(c.r) + h2(c.g) + h2(c.b) + (a < 1 ? h2(a) : '');
const buckets = { color: {}, radius: {}, spacing: {}, fontSize: {}, strokeWeight: {} };
const styles = {};

function add(kind, key, node, where, bound) {
  const b = buckets[kind][key] || (buckets[kind][key] = { value: key, raw: 0, bound: 0, where: {}, sample: [] });
  bound ? b.bound++ : b.raw++;
  b.where[where] = (b.where[where] || 0) + 1;
  if (!bound && b.sample.length < SAMPLE) b.sample.push(node.id);
}

function walk(n, out) {
  out.push(n);
  if (n.type === 'INSTANCE') return; // layer trong instance thuộc về main component
  if ('children' in n) for (const c of n.children) walk(c, out);
}

const fillWhere = n => n.type === 'TEXT' ? 'text' : (['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE', 'SECTION'].includes(n.type) ? 'frame' : 'shape');

function paints(n, list, where) {
  if (!Array.isArray(list)) return;
  for (const p of list) {
    if (p.type !== 'SOLID' || p.visible === false) continue;
    add('color', hex(p.color, p.opacity == null ? 1 : p.opacity), n, where, !!(p.boundVariables && p.boundVariables.color));
  }
}

const bv = (n, f) => !!(n.boundVariables && n.boundVariables[f]);

for (const rid of ROOT_IDS) {
  const root = await figma.getNodeByIdAsync(rid);
  if (!root) continue;
  let pg = root; while (pg.type !== 'PAGE') pg = pg.parent;
  if (figma.currentPage !== pg) await figma.setCurrentPageAsync(pg);
  const nodes = [];
  if (root.type === 'PAGE') for (const c of root.children) walk(c, nodes); else walk(root, nodes);

  for (const n of nodes) {
    if (typeof n.fillStyleId === 'string' && n.fillStyleId) {
      const s = await figma.getStyleByIdAsync(n.fillStyleId);
      if (s) styles[s.name] = (styles[s.name] || 0) + 1;
    }
    if ('fills' in n) {
      if (n.fills === figma.mixed && n.type === 'TEXT') {
        for (const seg of n.getStyledTextSegments(['fills'])) paints(n, seg.fills, 'text');
      } else paints(n, n.fills, fillWhere(n));
    }
    if ('strokes' in n && Array.isArray(n.strokes) && n.strokes.some(s => s.visible !== false)) {
      paints(n, n.strokes, 'stroke');
      if (typeof n.strokeWeight === 'number' && n.strokeWeight > 0) add('strokeWeight', n.strokeWeight, n, 'stroke', bv(n, 'strokeWeight') || bv(n, 'strokeTopWeight'));
    }
    if ('effects' in n) for (const e of n.effects) {
      if (e.visible !== false && e.color) add('color', hex(e.color, e.color.a), n, 'effect', !!(e.boundVariables && e.boundVariables.color));
    }
    if ('topLeftRadius' in n) {
      const seen = new Set();
      for (const f of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) {
        const v = n[f];
        if (typeof v === 'number' && v > 0 && !seen.has(v)) { seen.add(v); add('radius', v, n, 'radius', bv(n, f)); }
      }
    }
    if ('layoutMode' in n && n.layoutMode !== 'NONE') {
      for (const f of ['itemSpacing', 'counterAxisSpacing', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']) {
        const v = n[f];
        if (typeof v === 'number' && v > 0) add('spacing', v, n, f.startsWith('padding') ? 'padding' : 'gap', bv(n, f));
      }
    }
    if (n.type === 'TEXT' && typeof n.fontSize === 'number') add('fontSize', n.fontSize, n, n.textStyleId ? 'textStyle' : 'raw', bv(n, 'fontSize'));
  }
}

const out = {};
for (const [k, b] of Object.entries(buckets)) {
  out[k] = Object.values(b).sort((x, y) => (y.raw + y.bound) - (x.raw + x.bound));
}
out.colorStyles = styles;
return out;
