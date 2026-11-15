(() => {
  const directory = `https://api.github.com/repos/BaselGhanem/DAD_Sales/contents/data/archive?ref=main`;
  const catalogKey = `dad-sales-archive-catalog`;

  async function catalog() {
    const response = await fetch(directory, {cache: `no-cache`, signal: AbortSignal.timeout(8000)});
    if (!response.ok && response.status !== 404) throw Error(`Unable to check sales archives`);
    const files = response.ok ? await response.json() : [];
    if (!Array.isArray(files)) throw Error(`Invalid sales archive directory`);
    const entries = files.flatMap(file => {
      const match = /^Sales-(\d{4})\.xlsx$/.exec(file.name);
      return file.type === `file` && match && /^[0-9a-f]{40}$/.test(file.sha)
        ? [{year: match[1], path: `data/archive/${file.name}`, version: file.sha}]
        : [];
    }).sort((a,b) => b.year.localeCompare(a.year));
    try { localStorage.setItem(catalogKey, JSON.stringify(entries)); } catch {}
    return entries;
  }

  async function available() {
    try { return await catalog(); }
    catch {
      try { return JSON.parse(localStorage.getItem(catalogKey)) || []; }
      catch { return []; }
    }
  }

  function bounds(years, year) {
    const {end} = years.get(year);
    return {start: `${year}-01-01`, end, month: `${end.slice(0,7)}-01`};
  }

  function picker(before, years, initial, onChange) {
    const label = document.createElement(`label`);
    label.className = `sales-year-picker`;
    label.textContent = `Sales year`;
    const select = document.createElement(`select`);
    for (const year of [...years.keys()].sort().reverse()) select.add(new Option(year, year));
    select.value = initial;
    select.onchange = () => onChange(select.value);
    label.append(select);
    before.prepend(label);
    return select;
  }

  const versionOf = entries => entries.map(({year,version}) => `${year}:${version}`).join(`|`);
  window.SalesYears = {catalog, available, bounds, picker, versionOf};
})();
