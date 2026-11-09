// ds-token · write.js — ghi kế hoạch vào Figma Variables. Không bao giờ xoá biến hay collection.
// Dán nguyên đoạn vào use_figma. Luôn chạy DRY_RUN = true trước, đưa bảng thay đổi cho người dùng duyệt, rồi mới chạy false.
// Kế hoạch lớn (trên ~300 biến) thì chia nhiều lần gọi, mỗi lần một collection; collection được alias tới phải ghi trước.
//
// PLAN:
//   collections: [{ name, modes: ['Light', 'Dark'], hidden?: bool }]
//   variables:   [{ collection, name, type: 'COLOR'|'FLOAT'|'STRING'|'BOOLEAN',
//                   scopes: ['FRAME_FILL', ...]   // [] = ẩn khỏi picker
//                   hidden?: bool, description?: string,
//                   values: { '<tên mode>': '#3b82f6' | '#3b82f680' | 12 | 'Inter' | true | { alias: '<Collection>:<tên biến>' } } }]
const DRY_RUN = true;
const PLAN = { collections: [], variables: [] };

const h2 = v => Math.round(v * 255).toString(16).padStart(2, '0');
const hex = (c, a = 1) => '#' + h2(c.r) + h2(c.g) + h2(c.b) + (a < 1 ? h2(a) : '');
const parseHex = s => {
  const m = s.replace('#', '');
  const n = i => parseInt(m.slice(i, i + 2), 16) / 255;
  return { r: n(0), g: n(2), b: n(4), a: m.length === 8 ? n(6) : 1 };
};

const report = { dryRun: DRY_RUN, collections: [], create: [], update: [], same: 0, errors: [] };
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const colByName = new Map(cols.map(c => [c.name, c]));
const existing = new Map();
for (const v of await figma.variables.getLocalVariablesAsync()) {
  const c = cols.find(x => x.id === v.variableCollectionId);
  existing.set(`${c.name}:${v.name}`, v);
}

// 1. Collection và mode
for (const pc of PLAN.collections) {
  let c = colByName.get(pc.name);
  if (!c) {
    report.collections.push({ name: pc.name, action: 'create', modes: pc.modes });
    if (DRY_RUN) continue;
    c = figma.variables.createVariableCollection(pc.name);
    c.renameMode(c.modes[0].modeId, pc.modes[0]);
    colByName.set(pc.name, c);
  }
  const missing = pc.modes.filter(m => !c.modes.some(x => x.name === m));
  if (missing.length) report.collections.push({ name: pc.name, action: 'addModes', modes: missing });
  if (!DRY_RUN) {
    for (const m of missing) {
      try { c.addMode(m); } catch (err) { report.errors.push({ collection: pc.name, mode: m, error: String(err) + ' (gói Figma giới hạn số mode?)' }); }
    }
    if (pc.hidden != null) c.hiddenFromPublishing = pc.hidden;
  }
}

// 2. So sánh
async function fmtExisting(val) {
  if (val && typeof val === 'object' && val.type === 'VARIABLE_ALIAS') {
    const t = await figma.variables.getVariableByIdAsync(val.id);
    if (!t) return 'MISSING';
    const tc = await figma.variables.getVariableCollectionByIdAsync(t.variableCollectionId);
    return `alias:${tc.name}:${t.name}`;
  }
  if (val && typeof val === 'object' && 'r' in val) return hex(val, val.a == null ? 1 : val.a);
  return String(val);
}
const fmtPlan = val => (val && typeof val === 'object' && val.alias) ? `alias:${val.alias}` : (typeof val === 'string' && val.startsWith('#')) ? hex(parseHex(val), parseHex(val).a) : String(val);

const todo = [];
for (const pv of PLAN.variables) {
  const key = `${pv.collection}:${pv.name}`;
  const v = existing.get(key);
  if (!v) { report.create.push(key); todo.push({ pv, v: null }); continue; }
  if (v.resolvedType !== pv.type) { report.errors.push({ variable: key, error: `đang là ${v.resolvedType}, kế hoạch là ${pv.type}. Không đổi kiểu, cần người dùng quyết` }); continue; }
  const c = colByName.get(pv.collection);
  const changes = [];
  for (const [mName, val] of Object.entries(pv.values || {})) {
    const m = c.modes.find(x => x.name === mName);
    const before = m ? await fmtExisting(v.valuesByMode[m.modeId]) : '(mode mới)';
    const after = fmtPlan(val);
    if (before !== after) changes.push({ mode: mName, before, after });
  }
  if (pv.scopes && JSON.stringify([...v.scopes].sort()) !== JSON.stringify([...pv.scopes].sort())) changes.push({ scopes: { before: v.scopes, after: pv.scopes } });
  if (pv.hidden != null && v.hiddenFromPublishing !== pv.hidden) changes.push({ hidden: pv.hidden });
  if (pv.description != null && v.description !== pv.description) changes.push({ description: pv.description });
  if (changes.length) { report.update.push({ variable: key, changes }); todo.push({ pv, v }); } else report.same++;
}

// 3. Ghi
if (!DRY_RUN) {
  for (const t of todo) {
    if (t.v) continue;
    try {
      t.v = figma.variables.createVariable(t.pv.name, colByName.get(t.pv.collection), t.pv.type);
      existing.set(`${t.pv.collection}:${t.pv.name}`, t.v);
    } catch (err) { report.errors.push({ variable: `${t.pv.collection}:${t.pv.name}`, error: String(err) }); }
  }
  for (const { pv, v } of todo) {
    if (!v) continue;
    const key = `${pv.collection}:${pv.name}`;
    try {
      const c = colByName.get(pv.collection);
      for (const [mName, val] of Object.entries(pv.values || {})) {
        const m = c.modes.find(x => x.name === mName);
        if (!m) { report.errors.push({ variable: key, error: `không có mode ${mName}` }); continue; }
        let value = val;
        if (val && typeof val === 'object' && val.alias) {
          const target = existing.get(val.alias);
          if (!target) { report.errors.push({ variable: key, error: `alias tới ${val.alias} không tồn tại` }); continue; }
          value = figma.variables.createVariableAlias(target);
        } else if (pv.type === 'COLOR') value = parseHex(val);
        v.setValueForMode(m.modeId, value);
      }
      if (pv.scopes) v.scopes = pv.scopes;
      if (pv.hidden != null) v.hiddenFromPublishing = pv.hidden;
      if (pv.description != null) v.description = pv.description;
    } catch (err) { report.errors.push({ variable: key, error: String(err) }); }
  }
}
return report;
