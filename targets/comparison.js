import {buildComparison, months, summarize} from "./model.js";
import {fetchTargets} from "./source.js";

const byId = id => document.getElementById(id);
const money = new Intl.NumberFormat(`en-JO`, {maximumFractionDigits: 0});
const ratio = new Intl.NumberFormat(`en-JO`, {style: `percent`, maximumFractionDigits: 0});
const achievement = value => value === null ? `—` : ratio.format(value);
const status = byId(`target-status`);

function tableRow({label, sales, target, achievement: ach}) {
  const row = document.createElement(`tr`);
  const heading = document.createElement(`th`);
  heading.scope = `row`;
  heading.textContent = label;
  row.append(heading);
  for (const value of [money.format(sales), money.format(target), achievement(ach)]) {
    const cell = row.insertCell();
    cell.textContent = value;
  }
  return row;
}

function setOptions(select, values, label) {
  const current = select.value;
  select.replaceChildren(new Option(label, ``), ...values.map(value => new Option(value, value)));
  if (values.includes(current)) select.value = current;
}

function setup({entries, uploaded, lastMonth}) {
  const from = byId(`period-from`), to = byId(`period-to`);
  const item = byId(`target-item`), area = byId(`target-area`);
  const ytd = byId(`ytd`);
  for (const select of [from, to]) months.forEach((month, index) => select.add(new Option(month, index)));
  const distinct = values => [...new Set(values)].sort((a,b) => a.localeCompare(b));

  function render(resetFilters = false) {
    const start = Number(from.value), end = Number(to.value);
    for (const option of to.options) option.disabled = Number(option.value) < start;
    if (resetFilters) {
      item.value = ``;
      area.value = ``;
    }
    const period = entries.filter(entry => entry.index >= start && entry.index <= end);
    setOptions(item, distinct(period.filter(row => !area.value || area.value === row.area).map(row => row.item)), `All items`);
    setOptions(area, distinct(period.filter(row => !item.value || item.value === row.item).map(row => row.area)), `All areas`);
    const selected = period.filter(row => (!item.value || row.item === item.value) && (!area.value || row.area === area.value));
    const {rows, total} = summarize(selected, uploaded, start, end);
    byId(`monthly-rows`).replaceChildren(...rows.map(tableRow));
    byId(`grand-total`).replaceChildren(tableRow(total));
    byId(`no-target`).hidden = rows.length > 0;
    byId(`sales-card`).textContent = money.format(total.sales);
    byId(`target-card`).textContent = money.format(total.target);
    byId(`achievement-card`).textContent = achievement(total.achievement);
    const selectedYtd = lastMonth >= 0 && start === 0 && end === lastMonth;
    ytd.classList.toggle(`active`, selectedYtd);
    ytd.setAttribute(`aria-pressed`, String(selectedYtd));
  }

  ytd.disabled = lastMonth < 0;
  ytd.onclick = () => {
    from.value = 0;
    to.value = lastMonth;
    render();
  };
  from.onchange = () => {
    if (Number(to.value) < Number(from.value)) to.value = from.value;
    render(true);
  };
  to.onchange = () => render(true);
  item.onchange = area.onchange = () => render();
  from.value = 0;
  to.value = lastMonth < 0 ? 11 : lastMonth;
  render();
  status.hidden = true;
  byId(`target-content`).hidden = false;
}

export async function loadComparison(accounts, user) {
  const data = await fetchTargets(accounts);
  if (!data) status.textContent = `Targets have not been uploaded yet.`;
  else if (data.issues.length) status.textContent = `Targets are awaiting correction. Please check with the administrator.`;
  else setup(buildComparison(data.rows, data.sales, user.name));
}
