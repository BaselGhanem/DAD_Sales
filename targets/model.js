export const year = 2026;
export const months = [`Jan`, `Feb`, `Mar`, `Apr`, `May`, `Jun`, `Jul`, `Aug`, `Sep`, `Oct`, `Nov`, `Dec`];
export const headers = [`Team`, `Medreps`, `Item Desc`, `Area`, `Percentage`, ...months];
export const workbookPath = `data/target.xlsx`;
const blank = value => value == null || (typeof value === `string` && !value.trim());
const name = value => typeof value === `string` ? value.trim() : ``;
const areaKey = value => name(value).replace(/^(?:الأردن|الاردن)\s*[-–—]\s*/, ``);
const isOther = value => /^[اأآإ]خرين$/.test(areaKey(value));
const key = (...parts) => JSON.stringify(parts);
const validNumber = value => typeof value === `number` && Number.isFinite(value) && value >= 0;

export function readTargets(sheet, xlsx, references) {
  const issues = [];
  const rows = [];
  const issue = (row, field, detail) => issues.push({row, field, detail});
  if (!sheet) {
    issue(null, `Area`, `Required worksheet is missing.`);
    return {rows, issues};
  }
  const input = xlsx.utils.sheet_to_json(sheet, {header: 1, defval: null, blankrows: true, raw: true, range: 0});
  const columns = input[0] || [];
  headers.forEach((header, index) => {
    if (columns[index] !== header) issue(1, header, `Expected ${header} in column ${xlsx.utils.encode_col(index)}.`);
  });
  if (issues.length) return {rows, issues};
  const regions = new Set(references.areas.map(areaKey));
  const seen = new Map();
  const percentages = new Map();
  input.slice(1).forEach((cells, index) => {
    const row = index + 2;
    const values = headers.map((_, col) => cells[col]);
    const excelErrors = headers.filter((_, col) => sheet[xlsx.utils.encode_cell({r: index + 1, c: col})]?.t === `e`);
    if (values.every(blank) && !excelErrors.length) return;
    for (const header of excelErrors) issue(row, header, `Excel formula error.`);
    const [, repCell, itemCell, areaCell, rate, ...targets] = values;
    const rep = name(repCell), item = name(itemCell), area = areaKey(areaCell);
    if (!rep || (references.reps && !references.reps.has(rep))) issue(row, `Medreps`, rep ? `Unknown representative: ${rep}` : `Enter a representative name.`);
    if (!item || !references.items.has(item)) issue(row, `Item Desc`, item ? `Unknown item: ${item}` : `Enter an item name.`);
    if (!area || !regions.has(area) || isOther(area)) issue(row, `Area`, area ? `Invalid target area: ${area}` : `Enter an area name.`);
    if (!validNumber(rate) || rate > 1) issue(row, `Percentage`, `Enter an Excel percentage from 0% to 100%.`);
    if (rep && item && area) {
      const identity = key(rep, item, area);
      if (seen.has(identity)) issue(row, `Area`, `Duplicate representative, item and area (first appears on row ${seen.get(identity)}).`);
      else seen.set(identity, row);
    }
    targets.forEach((value, month) => {
      if (!blank(value) && !validNumber(value)) issue(row, months[month], `Enter a nonnegative target in JOD or leave the cell blank.`);
    });
    if (item) {
      const totals = percentages.get(item) || {row, rate: 0};
      if (validNumber(rate) && rate <= 1) totals.rate += rate;
      percentages.set(item, totals);
    }
    rows.push({rep, item, area, rate, targets: targets.map(value => blank(value) ? 0 : value)});
  });
  if (!rows.length) issue(null, `Area`, `Enter at least one target row.`);
  for (const [item, entry] of percentages) {
    if (Math.abs(entry.rate - 1) > 0.0000005) issue(entry.row, `Percentage`, `${item} totals ${Number((entry.rate * 100).toFixed(6))}%; expected 100%.`);
  }
  return {rows, issues};
}

export function buildComparison(targets, sales, representative) {
  const direct = new Map(), other = new Map(), uploaded = new Set();
  const add = (map, identity, value) => map.set(identity, (map.get(identity) || 0) + value);
  for (const {rep, item, area, month, value} of sales) {
    if (!month.startsWith(`${year}-`)) continue;
    const index = Number(month.slice(5)) - 1;
    uploaded.add(index);
    if (isOther(area)) add(other, key(index, item), value);
    else if (rep === representative) add(direct, key(index, item, areaKey(area)), value);
  }
  const entries = targets.filter(row => row.rep === representative).flatMap(row =>
    row.targets.flatMap((target, index) => target > 0 ? [{
      index, target, item: row.item, area: row.area,
      sales: (direct.get(key(index, row.item, row.area)) || 0) + (other.get(key(index, row.item)) || 0) * row.rate
    }] : [])
  );
  return {entries, uploaded, lastMonth: Math.max(-1, ...uploaded)};
}

export function summarize(entries, uploaded, from, to) {
  const rows = [];
  let sales = 0, target = 0, eligibleTarget = 0;
  for (let index = from; index <= to; index++) {
    const selected = entries.filter(entry => entry.index === index);
    if (!selected.length) continue;
    const actual = selected.reduce((sum, entry) => sum + entry.sales, 0);
    const goal = selected.reduce((sum, entry) => sum + entry.target, 0);
    const ready = uploaded.has(index);
    rows.push({label: months[index], sales: actual, target: goal, achievement: ready ? actual / goal : null});
    sales += actual;
    target += goal;
    if (ready) eligibleTarget += goal;
  }
  return {rows, total: {label: `Grand Total`, sales, target, achievement: eligibleTarget ? sales / eligibleTarget : null}};
}
