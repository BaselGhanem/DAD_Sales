const CACHE = `dad-sales-shell-v15-portal`;
const SHELL = [`./portal-entry.css`,`./interface.css`,`./country-manager.html`,`./premium-tooltip.js`,`./premium-tooltip.css`,`./business-unit-chronic.html`,`./business-unit-anti-infective.html`,`./kpi-counter.js`,`./kpi-cards.css`,`./selection.css`,`./supervisor.html`,`./credentials.js`,`./data-refresh.js`,`./customer-profile.js`,`./customer-profile.css`,`./opportunities.js`,`./index.html`,`./representative.html`,`./styles.css`,`./dashboard.css`,`./mobile.css`,`./pwa.js`,`./analytics.js`,`./dashboard.js`,`./chart-labels.js`,`./parser.worker.js`,`./app.js`,`./vendor/chart.umd.min.js`,`./vendor/xlsx.full.min.js`,`./assets/country-manager-symbolic.webp`];
const vendors = [`vendor/chart.umd.min.js`, `vendor/xlsx.full.min.js`];

self.addEventListener(`install`, event => event.waitUntil(self.skipWaiting()));

self.addEventListener(`activate`, event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const previous = (await caches.keys()).filter(key => key.startsWith(`dad-sales-shell-`) && key !== CACHE);
    for (const path of vendors) {
      const url = new URL(path, self.registration.scope);
      for (const key of previous) {
        const response = await (await caches.open(key)).match(url);
        if (response) {
          await cache.put(url, response);
          break;
        }
      }
    }
    await Promise.all(previous.map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener(`fetch`, event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== `GET` || url.origin !== self.location.origin) return;
  const relative = url.pathname.slice(new URL(self.registration.scope).pathname.length);
  if (relative !== `` && !SHELL.includes(`./${relative}`)) return;

  const cacheFirst = vendors.includes(relative) || url.searchParams.has(`v`);
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if (cacheFirst && cached) return cached;
    try {
      const response = await fetch(request, {cache:cacheFirst ? `default` : `no-cache`});
      if (response.ok) {
        try { await cache.put(request, response.clone()); } catch { /* Storage may be unavailable. */ }
      }
      return response;
    } catch {
      return cached || await cache.match(request, {ignoreSearch:!cacheFirst}) || Response.error();
    }
  })());
});
