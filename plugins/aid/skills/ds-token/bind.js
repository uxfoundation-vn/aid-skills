// ds-token · bind.js — gắn biến vào layer theo danh sách đã được người dùng duyệt.
// Dán nguyên đoạn vào use_figma. Chạy DRY_RUN = true trước. Chỉ dùng khi người dùng bảo rõ "gắn đi" / "sửa đi".
// Kiểm scope trước khi gắn (rule S5): API của Figma không chặn gắn sai scope, script này chặn thay.
// Chỉ gắn trên main component hoặc layer thường. Layer nằm trong instance sẽ bị bỏ qua (gắn ở đó là tạo override).
//
// BINDINGS: [{ id: '12:34', p: 'fill', index: 0, v: 'Semantic:bg/bg-primary' }]
//   p: fill | stroke | effect | radius | itemSpacing | counterAxisSpacing | paddingLeft | paddingRight | paddingTop | paddingBottom
//      | width | height | strokeWeight | opacity | fontSize | fontFamily | fontWeight | lineHeight | letterSpacing
//   index: vị trí paint/effect trong danh sách (mặc định 0), chỉ dùng cho fill, stroke, effect
const DRY_RUN = true;
const BINDINGS = [];

const FRAMEISH = ['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE', 'SECTION'];
const NUM = { itemSpacing: 'GAP', counterAxisSpacing: 'GAP', paddingLeft: 'GAP', paddingRight: 'GAP', paddingTop: 'GAP', paddingBottom: 'GAP',
  width: 'WIDTH_HEIGHT', height: 'WIDTH_HEIGHT', opacity: 'OPACITY', fontSize: 'FONT_SIZE', fontFamily: 'FONT_FAMILY',
  fontWeight: 'FONT_WEIGHT', lineHeight: 'LINE_HEIGHT', letterSpacing: 'LETTER_SPACING' };
function target(n, p) {
  if (p === 'fill') return n.type === 'TEXT' ? 'TEXT_FILL' : FRAMEISH.includes(n.type) ? 'FRAME_FILL' : 'SHAPE_FILL';
  if (p === 'stroke') return 'STROKE_COLOR';
  if (p === 'effect') return 'EFFECT_COLOR';
  if (p === 'radius') return 'CORNER_RADIUS';
  if (p === 'strokeWeight') return 'STROKE_FLOAT';
  return NUM[p];
}
function scopeOk(scopes, t) {
  if (scopes.includes('ALL_SCOPES') || scopes.includes(t)) return true;
  return scopes.includes('ALL_FILLS') && ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL'].includes(t);
}
function insideInstance(n) {
  for (let p = n.parent; p && p.type !== 'PAGE'; p = p.parent) if (p.type === 'INSTANCE') return true;
  return false;
}

const cols = await figma.variables.getLocalVariableCollectionsAsync();
const byKey = new Map();
for (const v of await figma.variables.getLocalVariablesAsync()) {
  const c = cols.find(x => x.id === v.variableCollectionId);
  byKey.set(`${c.name}:${v.name}`, v);
}

const report = { dryRun: DRY_RUN, ok: [], skipped: [] };
for (const b of BINDINGS) {
  const tag = `${b.id} ${b.p} → ${b.v}`;
  const n = await figma.getNodeByIdAsync(b.id);
  const v = byKey.get(b.v);
  if (!n) { report.skipped.push({ b: tag, why: 'không thấy node' }); continue; }
  if (!v) { report.skipped.push({ b: tag, why: 'không thấy biến' }); continue; }
  if (insideInstance(n)) { report.skipped.push({ b: tag, why: 'layer nằm trong instance, gắn ở main component' }); continue; }
  const t = target(n, b.p);
  if (!t) { report.skipped.push({ b: tag, why: 'thuộc tính không hỗ trợ' }); continue; }
  if (!scopeOk(v.scopes, t)) { report.skipped.push({ b: tag, why: `sai scope: biến mở ${v.scopes.join(', ') || '(rỗng)'}, chỗ này cần ${t}` }); continue; }
  if (DRY_RUN) { report.ok.push(tag); continue; }

  try {
    let pg = n; while (pg.type !== 'PAGE') pg = pg.parent;
    if (figma.currentPage !== pg) await figma.setCurrentPageAsync(pg);
    const i = b.index || 0;
    if (b.p === 'fill' || b.p === 'stroke') {
      const key = b.p === 'fill' ? 'fills' : 'strokes';
      const list = [...n[key]];
      if (!list[i] || list[i].type !== 'SOLID') throw new Error(`không có paint SOLID ở vị trí ${i}`);
      list[i] = figma.variables.setBoundVariableForPaint(list[i], 'color', v);
      n[key] = list;
    } else if (b.p === 'effect') {
      const list = [...n.effects];
      if (!list[i] || !list[i].color) throw new Error(`không có effect có màu ở vị trí ${i}`);
      list[i] = figma.variables.setBoundVariableForEffect(list[i], 'color', v);
      n.effects = list;
    } else if (b.p === 'radius') {
      for (const f of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) n.setBoundVariable(f, v);
    } else if (b.p === 'strokeWeight') {
      if ('strokeTopWeight' in n) for (const f of ['strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight']) n.setBoundVariable(f, v);
      else n.setBoundVariable('strokeWeight', v);
    } else {
      if (n.type === 'TEXT' && n.fontName !== figma.mixed) await figma.loadFontAsync(n.fontName);
      n.setBoundVariable(b.p, v);
    }
    report.ok.push(tag);
  } catch (err) { report.skipped.push({ b: tag, why: String(err) }); }
}
return report;
