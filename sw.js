const CACHE = `dad-sales-shell-v7-english`;
const SHELL = [`./kpi-counter.js`,`./kpi-cards.css`,`./selection.css`,`./supervisor.html`,`./credentials.js`,`./data-refresh.js`,`./customer-profile.js`,`./customer-profile.css`,`./opportunities.js`,`./index.html`,`./representative.html`,`./styles.css`,`./dashboard.css`,`./mobile.css`,`./pwa.js`,`./analytics.js`,`./dashboard.js`,`./chart-labels.js`,`./parser.worker.js`,`./app.js`,`./vendor/chart.umd.min.js`,`./vendor/xlsx.full.min.js`];
self.addEventListener(`install`, event => {event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener(`activate`,event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(`dad-sales-shell-`)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener(`fetch`,event=>{
 const url=new URL(event.request.url);
 if(event.request.method!==`GET`||url.origin!==self.location.origin)return;
 const relative=url.pathname.slice(new URL(self.registration.scope).pathname.length);
 if(!SHELL.some(path=>path.slice(2)===relative)&&relative!==``)return;
 event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)))}return response}).catch(async()=>{const cache=await caches.open(CACHE);return await cache.match(event.request)||await cache.match(event.request,{ignoreSearch:true})||Response.error()}));
});
