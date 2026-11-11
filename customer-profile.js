(() => {
const $=id=>document.getElementById(id),S=Sales,fmt=n=>new Intl.NumberFormat(`en-US`,{maximumFractionDigits:0}).format(n),esc=s=>String(s??``).replace(/[&<>"']/g,c=>({[`&`]:`&amp;`,[`<`]:`&lt;`,[`>`]:`&gt;`,[`"`]:`&quot;`,[`'`]:`&#39;`})[c]);
function calculate(company,ownRows,customer,from,to,context){
 const portfolio=new Set(),selectedItems=new Set(),clientOwn=[];
 for(const row of ownRows){
  if(!context.matchesPortfolio(row))continue;
  portfolio.add(row.item);
  if(!context.matchesItem(row))continue;
  selectedItems.add(row.item);
  if(row.customer===customer&&row.date<=to)clientOwn.push(row);
 }
 const inPeriod=row=>row.date>=from&&row.date<=to&&(!context.months.size||context.months.has(row.month));
 const own=clientOwn.filter(inPeriod);
 const exclusions=context.otherExclusion||portfolio;
 const otherValue=S.sum(company.filter(row=>row.customer===customer&&context.matchesArea(row)&&inPeriod(row)&&!exclusions.has(row.item)));
 const firstSelectedMonth=[...context.months].filter(month=>month>=from.slice(0,7)&&month<=to.slice(0,7)).sort()[0];
 const historyEnd=firstSelectedMonth&&firstSelectedMonth>from.slice(0,7)?`${firstSelectedMonth}-01`:from;
 const previous=clientOwn.filter(row=>row.date<historyEnd);
 const previousUnits=new Map(S.aggregate(previous,`item`,`units`));
 const currentUnits=new Map(S.aggregate(own,`item`,`units`));
 const values=new Map(S.aggregate(own,`item`));
 const products=[...selectedItems].sort((a,b)=>a.localeCompare(b)).map(item=>({
  item,units:currentUnits.get(item)||0,value:values.get(item)||0,
  status:(currentUnits.get(item)||0)>0?`active`:(previousUnits.get(item)||0)>0?`stopped`:`missing`
 }));
 const last=own.reduce((latest,row)=>row.units>0&&row.value>0&&row.date>latest?row.date:latest,``);
 return {own,otherValue,net:S.sum(own),units:S.sum(own,`units`),last,products};
}
window.CustomerProfileMath={calculate};
window.CustomerProfiles={init({rows,ownRows,latest,getContext}){
 let customer,context,chart,page=1,model,opener,profilePeriod=`custom`;
 const dialog=$(`customerProfile`),from=$(`profileFrom`),to=$(`profileTo`);
 const date=d=>d?d.split(`-`).reverse().join(`/`):`—`;
 function renderTable(){const sorted=[...model.own].sort((a,b)=>b.date.localeCompare(a.date)),pages=Math.max(1,Math.ceil(sorted.length/25));page=Math.min(page,pages);$(`profileRows`).innerHTML=sorted.slice((page-1)*25,page*25).map(r=>`<tr><td data-label="Date">${date(r.date)}</td><td data-label="Item">${esc(r.item)}</td><td data-label="Net sales">${fmt(r.value)}</td><td data-label="Units">${fmt(r.units)}</td></tr>`).join(``);$(`profilePage`).textContent=`${page} / ${pages}`;$(`profilePrev`).disabled=page<=1;$(`profileNext`).disabled=page>=pages;$(`profileMovementsCount`).textContent=`${fmt(sorted.length)} transactions`}
 function render(){for(const [id,period] of [[`profileMonth`,`month`],[`profileYear`,`year`]]){$(id).classList.toggle(`active`,profilePeriod===period);$(id).setAttribute(`aria-pressed`,`${profilePeriod===period}`)}if(!from.value||!to.value||from.value>to.value){$(`profileStatus`).textContent=`Select a valid date range.`;return}$(`profileStatus`).textContent=``;page=1;model=calculate(rows,ownRows,customer,from.value,to.value,context);KpiCounter.set(`profileNet`,model.net);if(model.products.length===1||new Set(model.own.map(r=>r.item)).size===1)KpiCounter.set(`profileUnits`,model.units);else KpiCounter.text(`profileUnits`,`Please select one SKU`);$(`profileLast`).textContent=date(model.last);KpiCounter.set(`profileOther`,model.otherValue);
 for(const [status,id] of [[`active`,`profileActive`],[`stopped`,`profileStopped`],[`missing`,`profileMissing`]]){const list=model.products.filter(p=>p.status===status),host=$(id);host.replaceChildren();if(!list.length){host.textContent=`No items found.`;continue}for(const product of list){const entry=document.createElement(`div`);entry.className=`profile-product`;const title=document.createElement(`strong`);title.textContent=product.item;entry.append(title);if(status===`active`){const text=document.createElement(`span`);text.textContent=`Net sales ${fmt(product.value)} · Units ${fmt(product.units)}`;entry.append(text)}host.append(entry)}}
 const daily=from.value.slice(0,7)===to.value.slice(0,7);const months=new Map();for(let d=new Date(`${daily?from.value:`${from.value.slice(0,7)}-01`}T00:00:00Z`);S.iso(d)<=to.value;daily?d.setUTCDate(d.getUTCDate()+1):d.setUTCMonth(d.getUTCMonth()+1)){const iso=S.iso(d);if(!context.months.size||context.months.has(iso.slice(0,7)))months.set(iso.slice(0,daily?10:7),0);}for(const r of model.own){const key=daily?r.date:r.month;months.set(key,(months.get(key)||0)+r.value)}$(`profileTrend`).closest(`.panel`).querySelector(`h2`).textContent=daily?`Daily sales of your items · ${from.value.slice(5,7)}-${from.value.slice(0,4)}`:`Monthly sales of your items`;if(chart)chart.destroy();chart=new Chart($(`profileTrend`),{type:`line`,data:{labels:[...months.keys()].map(value=>daily?value.slice(8,10):`${value.slice(5,7)}-${value.slice(0,4)}`),datasets:[{label:`Net sales`,data:[...months.values()],borderColor:`#099999`,backgroundColor:`#09999915`,fill:true,tension:.3,pointRadius:3}]},options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:65,left:14,right:22}},animation:matchMedia(`(prefers-reduced-motion: reduce)`).matches?false:{duration:600},plugins:{legend:{display:false},tooltip:{titleFont:{size:14,weight:`700`},bodyFont:{size:14},padding:12}},scales:{y:{beginAtZero:true,ticks:{font:{size:matchMedia(`(max-width:680px)`).matches?12:14},padding:8}},x:{offset:months.size===1,grid:{display:false},ticks:{autoSkip:false,minRotation:!daily&&months.size>12?65:0,maxRotation:daily?0:90,font:{size:matchMedia(`(max-width:680px)`).matches?12:14},padding:8}}}}});PremiumTooltip.bind(chart,{rows:model.own,key:daily?`date`:`month`,keys:[...months.keys()],titles:[...months.keys()].map(value=>daily?value.split(`-`).reverse().join(`-`):`${value.slice(5,7)}-${value.slice(0,4)}`),period:`${date(from.value)} — ${date(to.value)}`});renderTable();
 }
 document.addEventListener(`click`,event=>{const target=event.target.closest(`[data-profile-customer]`);if(!target)return;const id=target.dataset.profileCustomer;const inherited=getContext(target);if(!inherited)return;const client=rows.find(r=>r.customer===id&&inherited.matchesArea(r));if(!client)return;context=inherited;opener=target;customer=id;$(`profileName`).textContent=client.customerName;from.value=context.from||`${latest.slice(0,4)}-01-01`;to.value=context.to||latest;$(`profileArea`).textContent=[...new Set(rows.filter(r=>r.customer===id&&context.matchesArea(r)).map(r=>r.area))].join(`, `);profilePeriod=from.value===`${latest.slice(0,7)}-01`&&to.value===latest?`month`:from.value===`${latest.slice(0,4)}-01-01`&&(to.value===latest||to.value===`${latest.slice(0,4)}-12-31`)?`year`:`custom`;dialog.showModal();document.body.classList.add(`profile-open`);render();$(`profileClose`).focus()});
 $(`profileClose`).onclick=()=>dialog.close();dialog.addEventListener(`close`,()=>{document.body.classList.remove(`profile-open`);if(chart){chart.destroy();chart=null}opener?.focus()});dialog.addEventListener(`click`,e=>{if(e.target===dialog)dialog.close()});from.onchange=to.onchange=()=>{profilePeriod=`custom`;render()};$(`profileYear`).onclick=()=>{profilePeriod=`year`;from.value=`${latest.slice(0,4)}-01-01`;to.value=latest;render()};$(`profileMonth`).onclick=()=>{profilePeriod=`month`;from.value=`${latest.slice(0,7)}-01`;to.value=latest;render()};$(`profilePrev`).onclick=()=>{page--;renderTable()};$(`profileNext`).onclick=()=>{page++;renderTable()};
}};
})();
