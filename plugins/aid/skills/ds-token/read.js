// ds-token · read.js — đọc Variables và binding của layer. CHỈ ĐỌC.
// Dán nguyên đoạn vào use_figma.
// ROOT_IDS: id component / frame / page cần quét layer. Để [] nếu chỉ cần đọc Variables.
// Mỗi lần gọi chỉ quét layer của một page; nhiều page thì gọi song song, lần đầu để READ_VARS = true, các lần sau false.
// Kết quả:
//   collections: [{ name, modes, hidden, count }]
//   variables:   [{ collection, name, type, scopes, hidden, values: { mode: '#hex' | số | '→ Coll:tên' },
//                   resolved: { mode: { chain: ['Coll:tên', …], final: '#hex' | số | 'MISSING' | 'CYCLE' | 'EMPTY' } } }]
//   layers:      [{ id, name, type, comp, e: [{ p: thuộc tính, t: scope cần, v: 'Coll:tên' | raw: giá trị | style: tên style }] }]
const ROOT_IDS = [];
const READ_VARS = true;
const LAYERS_LIMIT = 3000;

const h2 = v => Math.round(v * 255).toString(16).padStart(2, '0');
const hex = (c, a = 1) => '#' + h2(c.r) + h2(c.g) + h2(c.b) + (a < 1 ? h2(a) : '');
const colCache = new Map();
const varCache = new Map();

async function getCol(id) {
  if (!colCache.has(id)) colCache.set(id, await figma.variables.getVariableCollectionByIdAsync(id));
  return colCache.get(id);
}
async function colName(id) {
  const c = await getCol(id);
  return c ? c.name : '?';
}
// Lần theo alias tới giá trị cuối. Sang collection khác thì dùng mode cùng tên nếu có, không thì mode mặc định.
async function resolve(v, modeId) {
  const chain = [];
  const seen = new Set([v.id]);
  let cur = v, mid = modeId;
  for (let i = 0; i < 12; i++) {
    const val = cur.valuesByMode[mid];
    if (val === undefined || val === null) return { chain, final: 'EMPTY' };
    if (!(val && typeof val === 'object' && val.type === 'VARIABLE_ALIAS')) return { chain, final: await fmt(val) };
    const t = await figma.variables.getVariableByIdAsync(val.id);
    if (!t) { chain.push(`MISSING:${val.id}`); return { chain, final: 'MISSING' }; }
    chain.push(await ref(t.id));
    if (seen.has(t.id)) return { chain, final: 'CYCLE' };
    seen.add(t.id);
    const fromCol = await getCol(cur.variableCollectionId), toCol = await getCol(t.variableCollectionId);
    const mName = fromCol && fromCol.modes.find(m => m.modeId === mid);
    const same = toCol && mName && toCol.modes.find(m => m.name === mName.name);
    mid = same ? same.modeId : toCol.defaultModeId;
    cur = t;
  }
  return { chain, final: 'TOO_DEEP' };
}
async function ref(id) {
  if (!varCache.has(id)) {
    const v = await figma.variables.getVariableByIdAsync(id);
    varCache.set(id, v ? `${v.remote ? '[lib] ' : ''}${await colName(v.variableCollectionId)}:${v.name}` : `MISSING:${id}`);
  }
  return varCache.get(id);
}
async function fmt(val) {
  if (val && typeof val === 'object' && val.type === 'VARIABLE_ALIAS') return '→ ' + await ref(val.id);
  if (val && typeof val === 'object' && 'r' in val) return hex(val, val.a == null ? 1 : val.a);
  return val;
}
const ids = x => !x ? [] : Array.isArray(x) ? x.map(a => a.id) : [x.id];

const out = {};

if (READ_VARS) {
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  out.collections = cols.map(c => ({ id: c.id, name: c.name, modes: c.modes.map(m => m.name), hidden: c.hiddenFromPublishing, count: c.variableIds.length }));
  out.variables = [];
  for (const v of await figma.variables.getLocalVariablesAsync()) {
    const c = cols.find(x => x.id === v.variableCollectionId);
    const values = {}, resolved = {};
    for (const m of c.modes) {
      values[m.name] = await fmt(v.valuesByMode[m.modeId]);
      const r = await resolve(v, m.modeId);
      if (r.chain.length) resolved[m.name] = r; // chỉ ghi khi có alias
      else if (r.final === 'EMPTY') resolved[m.name] = r;
    }
    out.variables.push({ id: v.id, collection: c.name, name: v.name, type: v.resolvedType, scopes: v.scopes, hidden: v.hiddenFromPublishing, description: v.description || '', values, resolved });
  }
}

// ---- layer ----
function walk(n, list) {
  list.push(n);
  if (n.type === 'INSTANCE') return; // layer trong instance được kiểm ở main component
  if ('children' in n) for (const c of n.children) walk(c, list);
}
const FRAMEISH = ['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE', 'SECTION'];
const fillTarget = n => n.type === 'TEXT' ? 'TEXT_FILL' : FRAMEISH.includes(n.type) ? 'FRAME_FILL' : 'SHAPE_FILL';
function ownerOf(n) {
  let comp = null;
  for (let p = n; p && p.type !== 'PAGE'; p = p.parent) {
    if (p.type === 'COMPONENT_SET') return p.name;
    if (p.type === 'COMPONENT' && !comp) comp = p.name;
  }
  return comp;
}

async function paintEntries(list, prop, target, push) {
  if (!Array.isArray(list)) return;
  for (const p of list) {
    if (p.visible === false) continue;
    if (p.type !== 'SOLID') { push({ p: prop, t: target, other: p.type }); continue; }
    const a = p.boundVariables && p.boundVariables.color;
    if (a) push({ p: prop, t: target, v: await ref(a.id) });
    else push({ p: prop, t: target, raw: hex(p.color, p.opacity == null ? 1 : p.opacity) });
  }
}

if (ROOT_IDS.length) {
  out.layers = [];
  let truncated = false;
  for (const rid of ROOT_IDS) {
    const root = await figma.getNodeByIdAsync(rid);
    if (!root) { out.layers.push({ id: rid, missing: true }); continue; }
    let pg = root; while (pg.type !== 'PAGE') pg = pg.parent;
    if (figma.currentPage !== pg) await figma.setCurrentPageAsync(pg);
    const nodes = [];
    if (root.type === 'PAGE') for (const c of root.children) walk(c, nodes); else walk(root, nodes);

    for (const n of nodes) {
      if (out.layers.length >= LAYERS_LIMIT) { truncated = true; break; }
      const e = [];
      const push = x => e.push(x);
      const B = n.boundVariables || {};

      if ('fills' in n) {
        if (typeof n.fillStyleId === 'string' && n.fillStyleId) {
          const s = await figma.getStyleByIdAsync(n.fillStyleId);
          push({ p: 'fill', t: fillTarget(n), style: s ? s.name : '?' });
        } else if (n.fills === figma.mixed && n.type === 'TEXT') {
          for (const seg of n.getStyledTextSegments(['fills'])) await paintEntries(seg.fills, 'fill', 'TEXT_FILL', push);
        } else await paintEntries(n.fills, 'fill', fillTarget(n), push);
      }
      if ('strokes' in n && Array.isArray(n.strokes) && n.strokes.length) {
        await paintEntries(n.strokes, 'stroke', 'STROKE_COLOR', push);
        for (const f of ['strokeWeight', 'strokeTopWeight']) for (const id of ids(B[f])) push({ p: 'strokeWeight', t: 'STROKE_FLOAT', v: await ref(id) });
      }
      if ('effects' in n) for (const ef of n.effects) {
        if (ef.visible === false || !ef.color) continue;
        const a = ef.boundVariables && ef.boundVariables.color;
        push(a ? { p: 'effect', t: 'EFFECT_COLOR', v: await ref(a.id) } : { p: 'effect', t: 'EFFECT_COLOR', raw: hex(ef.color, ef.color.a) });
      }
      if ('topLeftRadius' in n) {
        const seen = new Set();
        for (const f of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) {
          const id = ids(B[f])[0];
          const key = id ? 'v' + id : 'r' + n[f];
          if (seen.has(key)) continue; seen.add(key);
          if (id) push({ p: 'radius', t: 'CORNER_RADIUS', v: await ref(id) });
          else if (n[f] > 0) push({ p: 'radius', t: 'CORNER_RADIUS', raw: n[f] });
        }
      }
      if ('layoutMode' in n && n.layoutMode !== 'NONE') {
        for (const f of ['itemSpacing', 'counterAxisSpacing', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']) {
          const id = ids(B[f])[0];
          if (id) push({ p: f, t: 'GAP', v: await ref(id) });
          else if (typeof n[f] === 'number' && n[f] > 0) push({ p: f, t: 'GAP', raw: n[f] });
        }
      }
      for (const f of ['width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight']) for (const id of ids(B[f])) push({ p: f, t: 'WIDTH_HEIGHT', v: await ref(id) });
      for (const id of ids(B.opacity)) push({ p: 'opacity', t: 'OPACITY', v: await ref(id) });
      if (n.type === 'TEXT') {
        const T = { fontFamily: 'FONT_FAMILY', fontStyle: 'FONT_STYLE', fontWeight: 'FONT_WEIGHT', fontSize: 'FONT_SIZE', lineHeight: 'LINE_HEIGHT', letterSpacing: 'LETTER_SPACING' };
        for (const [f, t] of Object.entries(T)) for (const id of ids(B[f])) push({ p: f, t, v: await ref(id) });
        if (n.textStyleId && typeof n.textStyleId === 'string') {
          const s = await figma.getStyleByIdAsync(n.textStyleId);
          push({ p: 'textStyle', style: s ? s.name : '?' });
        } else if (!ids(B.fontSize).length && typeof n.fontSize === 'number') push({ p: 'fontSize', t: 'FONT_SIZE', raw: n.fontSize });
      }
      if (e.length) out.layers.push({ id: n.id, name: n.name, type: n.type, comp: ownerOf(n), e });
    }
  }
  out.truncated = truncated;
}
return out;
