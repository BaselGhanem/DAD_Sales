/* Reload open dashboards when the published workbook version changes. */
(() => {
  let version = null;
  let checking = false;
  let reloading = false;
  let lastCheck = 0;
  const fingerprint = headers => {
    const etag = headers.get(`etag`);
    if (etag) return etag;
    const modified = headers.get(`last-modified`);
    return modified ? `${modified}:${headers.get(`content-length`) || ``}` : null;
  };
  const update = () => {
    if (reloading) return;
    reloading = true;
    const notice = document.createElement(`div`);
    notice.setAttribute(`role`, `status`);
    notice.dir = `ltr`;
    notice.textContent = `Updated data is available. Loading the latest version...`;
    Object.assign(notice.style, {position:`fixed`,inset:`0`,zIndex:`1000`,display:`grid`,placeItems:`center`,padding:`24px`,background:`#f4f8f9`,color:`#099999`,font:`700 17px/1.8 Segoe UI,Almarai,Arial,sans-serif`,textAlign:`center`});
    document.body.append(notice);
    const url = new URL(location.href);
    url.searchParams.set(`salesUpdate`, `${Date.now()}`);
    location.replace(url.href);
  };
  async function check(force = false) {
    if (checking || reloading || document.hidden || (!force && Date.now() - lastCheck < 120000)) return;
    checking = true;
    lastCheck = Date.now();
    try {
      const paths=[`data/Up.xlsx`,`credentials.csv`];
      const responses=await Promise.all(paths.map(path=>fetch(`${path}?versionCheck=${Date.now()}`,{method:`HEAD`,cache:`no-store`,signal:AbortSignal.timeout(12000)})));
      if(responses.some(response=>!response.ok))return;
      const fingerprints=responses.map(response=>fingerprint(response.headers));
      if(fingerprints.some(value=>!value))return;
      const next=JSON.stringify(fingerprints);
      if (version !== null && next !== version) { update(); return; }
      version = next;
    } catch { /* Retry automatically after connectivity returns. */ }
    finally { checking = false; }
  }
  check(true);
  setInterval(() => check(), 120000);
  document.addEventListener(`visibilitychange`, () => { if (!document.hidden) check(); });
  window.addEventListener(`focus`, () => check());
  window.addEventListener(`online`, () => check());
})();
