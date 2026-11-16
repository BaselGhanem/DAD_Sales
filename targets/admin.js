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
    const accounts = await Credentials.audit().catch(error => ({
      users: [], readable: false, issues: [{field: `CSV`, detail: error.message}]
    }));
    const workbook = await fetchTargets(accounts).catch(error => ({
      issues: [{field: `Workbook`, detail: error.message}]
    }));
    const sources = [
      [`credentials.csv`, accounts.issues],
      [`target.xlsx`, workbook?.issues || []]
    ];
    const count = sources.reduce((total, [, issues]) => total + issues.length, 0);
    if (count) {
      status.textContent = `${count.toLocaleString()} issues found. Correct the listed files on GitHub and check again.`;
      const fragment = document.createDocumentFragment();
      for (const [file, issues] of sources) {
        for (const {row, field, detail} of issues) {
          const tr = document.createElement(`tr`);
          for (const value of [file, row ?? `—`, field, detail]) tr.insertCell().textContent = value;
          fragment.append(tr);
        }
      }
      body.append(fragment);
      table.hidden = false;
    } else if (!workbook) status.textContent = `No workbook has been published at data/target.xlsx yet.`;
    else status.textContent = `All checks passed. ${workbook.rows.length.toLocaleString()} target rows are ready.`;
  } catch (error) {
    status.textContent = error.message || `Unable to check the published files.`;
  } finally {
    button.disabled = false;
  }
}

button.onclick = check;
check();
