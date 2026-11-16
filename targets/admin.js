import {fetchTargets} from "./source.js";

const status = document.getElementById(`check-status`);
const button = document.getElementById(`check-workbook`);
const table = document.getElementById(`issue-table`);
const body = document.getElementById(`issues`);

async function check() {
  button.disabled = true;
  table.hidden = true;
  body.replaceChildren();
  status.textContent = `Checking the published workbook…`;
  try {
    const data = await fetchTargets();
    if (!data) status.textContent = `No workbook has been published at data/target.xlsx yet.`;
    else if (!data.issues.length) status.textContent = `All checks passed. ${data.rows.length.toLocaleString()} target rows are ready.`;
    else {
      status.textContent = `${data.issues.length.toLocaleString()} issues found. Correct the workbook and publish it again.`;
      const fragment = document.createDocumentFragment();
      for (const {row, field, detail} of data.issues) {
        const tr = document.createElement(`tr`);
        for (const value of [row ?? `—`, field, detail]) tr.insertCell().textContent = value;
        fragment.append(tr);
      }
      body.append(fragment);
      table.hidden = false;
    }
  } catch (error) {
    status.textContent = error.message || `Unable to check the workbook.`;
  } finally {
    button.disabled = false;
  }
}

button.onclick = check;
check();
