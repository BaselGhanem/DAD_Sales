import {readTargets, workbookPath, year} from "./model.js";

function loadSales(entry) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(`parser.worker.js?v=annual_archive_2`);
    const finish = (callback, data) => {
      clearTimeout(timeout);
      worker.terminate();
      callback(data);
    };
    const timeout = setTimeout(() => finish(reject, Error(`Sales data loading timed out.`)), 90000);
    worker.onerror = () => finish(reject, Error(`Unable to start the sales reader.`));
    worker.onmessage = ({data}) => data.error ? finish(reject, Error(data.error)) : finish(resolve, data);
    worker.postMessage({...entry, role: `country-manager`});
  });
}

async function salesSources() {
  const [active, archives] = await Promise.all([loadSales(), SalesYears.available()]);
  const activeYear = Number(active.latest.slice(0, 4));
  const required = archives.filter(entry => Number(entry.year) < activeYear);
  if (activeYear > year && !required.some(entry => Number(entry.year) === year)) {
    required.push({year: String(year), path: `data/archive/Sales-${year}.xlsx`});
  }
  const archived = await Promise.all(required.map(loadSales));
  return [active, ...archived].flatMap(source => source.rows);
}

export async function fetchTargets(accounts) {
  const response = await fetch(workbookPath, {cache: `no-store`, signal: AbortSignal.timeout(30000)});
  if (response.status === 404) return null;
  if (!response.ok) throw Error(`Unable to download the target workbook (${response.status}).`);
  const [bytes, areas, sales, config] = await Promise.all([
    response.arrayBuffer(),
    fetch(`targets/areas.json`).then(result => {
      if (!result.ok) throw Error(`Unable to load the approved areas.`);
      return result.json();
    }),
    salesSources(),
    accounts || Credentials.load()
  ]);
  const workbook = XLSX.read(bytes, {type: `array`});
  const references = {
    reps: config.readable === false ? null : new Set(config.users.filter(user => user.role === `rep` && user.enabled).map(user => user.name)),
    items: new Set(sales.map(row => row.item)),
    areas
  };
  return {...readTargets(workbook.Sheets.Area, XLSX, references), sales};
}
