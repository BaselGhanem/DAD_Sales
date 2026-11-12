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
 const companySales=company.filter(row=>row.customer===customer&&context.matchesArea(row)&&inPeriod(row));
 const other=companySales.filter(row=>!exclusions.has(row.item));
 const otherValue=S.sum(other);
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
 return {own,other,companySales,otherValue,net:S.sum(own),units:S.sum(own,`units`),last,products};
}
window.CustomerProfileMath={calculate};
window.CustomerProfiles={init({rows,ownRows,latest,getContext,missingOnly=false}){
 let customer,context,inheritedContext,chart,page=1,otherPage=1,model,opener,profilePeriod=`custom`;
 const dialog=$(`customerProfile`),from=$(`profileFrom`),to=$(`profileTo`);
 const date=d=>d?d.split(`-`).reverse().join(`/`):`—`;
 const otherDetails=$(`profileOtherDetails`);
 const sortTransactions=rows=>[...rows].sort((a,b)=>b.date.localeCompare(a.date));
 function renderTransactions(rows,currentPage,{body,pageLabel,prev,next,count}){
  const pages=Math.max(1,Math.ceil(rows.length/25));
  currentPage=Math.max(1,Math.min(currentPage,pages));
  $(body).innerHTML=rows.slice((currentPage-1)*25,currentPage*25).map(r=>`<tr><td data-label="Date">${date(r.date)}</td><td data-label="Item">${esc(r.item)}</td><td data-label="Net sales">${fmt(r.value)}</td><td data-label="Units">${fmt(r.units)}</td></tr>`).join(``);
  $(pageLabel).textContent=`${currentPage} / ${pages}`;
  $(prev).disabled=currentPage<=1;
  $(next).disabled=currentPage>=pages;
  $(count).textContent=`${fmt(rows.length)} transactions`;
  return currentPage;
 }
 function renderTable(){
  page=renderTransactions(sortTransactions(model.own),page,{body:`profileRows`,pageLabel:`profilePage`,prev:`profilePrev`,next:`profileNext`,count:`profileMovementsCount`});
 }
 function renderOtherTable(){
  otherPage=renderTransactions(sortTransactions(model.other),otherPage,{body:`profileOtherRows`,pageLabel:`profileOtherPage`,prev:`profileOtherPrev`,next:`profileOtherNext`,count:`profileOtherCount`});
 }
 function renderOtherDetails(){
  if(!otherDetails)return;
  const units=new Map(S.aggregate(model.other,`item`,`units`));
  $(`profileOtherItems`).innerHTML=S.aggregate(model.other,`item`).map(([item,value])=>
   `<tr><td data-label="Item">${esc(item)}</td><td data-label="Net sales">${fmt(value)}</td><td data-label="Units">${fmt(units.get(item)??0)}</td></tr>`
  ).join(``);
  $(`profileOtherEmpty`).hidden=model.other.length>0;
  $(`profileOtherTables`).hidden=!model.other.length;
  renderOtherTable();
 }
 const unrestricted={months:new Set(),matchesPortfolio:()=>true,matchesItem:()=>true,matchesArea:()=>true};
 function missingProducts(customer,from,to,scope){
  const items=new Set(ownRows.filter(row=>scope.matchesPortfolio(row)&&scope.matchesItem(row)).map(row=>row.item));
  const firstMonth=[...scope.months].filter(month=>month>=from.slice(0,7)&&month<=to.slice(0,7)).sort()[0];
  const historyEnd=firstMonth&&firstMonth>from.slice(0,7)?`${firstMonth}-01`:from;
  const relevant=rows.filter(row=>row.customer===customer&&items.has(row.item)&&scope.matchesArea(row));
  const current=new Map(S.aggregate(relevant.filter(row=>row.date>=from&&row.date<=to&&(!scope.months.size||scope.months.has(row.month))),`item`,`units`));
  const history=new Map(S.aggregate(relevant.filter(row=>row.date<historyEnd),`item`,`units`));
  return [...items].filter(item=>(current.get(item)||0)<=0&&(history.get(item)||0)<=0).sort((a,b)=>a.localeCompare(b)).map(item=>({item}));
 }
 function render(){for(const [id,period] of [[`profileMonth`,`month`],[`profileYear`,`year`]]){$(id).classList.toggle(`active`,profilePeriod===period);$(id).setAttribute(`aria-pressed`,`${profilePeriod===period}`)}if(!from.value||!to.value||from.value>to.value){$(`profileStatus`).textContent=`Select a valid date range.`;return}$(`profileStatus`).textContent=``;page=otherPage=1;model=calculate(rows,ownRows,customer,from.value,to.value,context);KpiCounter.set(`profileNet`,model.net);if(model.products.length===1||new Set(model.own.map(r=>r.item)).size===1)KpiCounter.set(`profileUnits`,model.units);else KpiCounter.text(`profileUnits`,`Please select one SKU`);$(`profileLast`).textContent=date(model.last);KpiCounter.set(`profileOther`,model.otherValue);renderOtherDetails();
 for(const [status,id] of [[`active`,`profileActive`],[`stopped`,`profileStopped`],[`missing`,`profileMissing`]]){const list=status===`missing`?missingProducts(customer,from.value,to.value,inheritedContext):model.products.filter(p=>p.status===status),host=$(id);host.replaceChildren();if(!list.length){host.textContent=`No items found.`;continue}for(const product of list){const entry=document.createElement(`div`);entry.className=`profile-product`;const title=document.createElement(`strong`);title.textContent=product.item;entry.append(title);if(status===`active`){const text=document.createElement(`span`);text.textContent=`Net sales ${fmt(product.value)} · Units ${fmt(product.units)}`;entry.append(text)}host.append(entry)}}
  renderTrend();
  renderTable();
 }
 function renderTrend(){
  const start=from.value,end=to.value,daily=start.slice(0,7)===end.slice(0,7);
  const keys=[];
  const cursor=new Date(`${daily?start:`${start.slice(0,7)}-01`}T00:00:00Z`);
  for(;S.iso(cursor)<=end;daily?cursor.setUTCDate(cursor.getUTCDate()+1):cursor.setUTCMonth(cursor.getUTCMonth()+1)){
   const iso=S.iso(cursor);
   if(!context.months.size||context.months.has(iso.slice(0,7)))keys.push(iso.slice(0,daily?10:7));
  }
  const metric=daily?`date`:`month`;
  const ownByPeriod=new Map(S.aggregate(model.own,metric));
  const companyByPeriod=new Map(S.aggregate(model.companySales,metric));
  const canvas=$(`profileTrend`);
  canvas.closest(`.panel`).querySelector(`h2`).textContent=daily?`Daily sales · ${start.slice(5,7)}-${start.slice(0,4)}`:`Monthly sales`;
  if(chart)chart.destroy();
  const mobile=matchMedia(`(max-width:680px)`).matches;
  chart=new Chart(canvas,{
   type:`line`,
   data:{
    labels:keys.map(value=>daily?value.slice(8,10):`${value.slice(5,7)}-${value.slice(0,4)}`),
    datasets:[
     {label:`Your items`,data:keys.map(key=>ownByPeriod.get(key)??0),borderColor:`#099999`,backgroundColor:`#09999915`,order:1,fill:true,tension:.3,pointRadius:3},
     {label:`Company total`,data:keys.map(key=>companyByPeriod.get(key)??0),borderColor:`#6557a6`,backgroundColor:`#6557a610`,order:2,fill:true,tension:.3,pointRadius:3,valueLabelColor:`#6557a6`,avoidLabelOverlapWith:0}
    ]
   },
   options:{
    responsive:true,maintainAspectRatio:false,interaction:{mode:`index`,intersect:false},
    layout:{padding:{top:36,left:14,right:22}},
    animation:matchMedia(`(prefers-reduced-motion: reduce)`).matches?false:{duration:600},
    plugins:{
     legend:{display:true,labels:{usePointStyle:true,boxWidth:10,font:{size:mobile?12:14}}},
     tooltip:{enabled:true,external:null,titleFont:{size:14,weight:`700`},bodyFont:{size:14},padding:12}
    },
    scales:{
     y:{beginAtZero:true,ticks:{font:{size:mobile?12:14},padding:8}},
     x:{offset:keys.length===1,grid:{display:false},ticks:{autoSkip:false,minRotation:!daily&&keys.length>12?65:0,maxRotation:daily?0:90,font:{size:mobile?12:14},padding:8}}
    }
   }
  });
 }
 document.addEventListener(`click`,event=>{const target=event.target.closest(`[data-profile-customer]`);if(!target)return;const id=target.dataset.profileCustomer;const inherited=getContext(target);if(!inherited)return;const client=rows.find(r=>r.customer===id&&inherited.matchesArea(r));if(!client)return;inheritedContext=inherited;context=missingOnly?unrestricted:inherited;opener=target;customer=id;$(`profileName`).textContent=client.customerName;from.value=inherited.from||`${latest.slice(0,4)}-01-01`;to.value=inherited.to||latest;$(`profileArea`).textContent=[...new Set(rows.filter(r=>r.customer===id&&context.matchesArea(r)).map(r=>r.area))].join(`, `);profilePeriod=from.value===`${latest.slice(0,7)}-01`&&to.value===latest?`month`:from.value===`${latest.slice(0,4)}-01-01`&&(to.value===latest||to.value===`${latest.slice(0,4)}-12-31`)?`year`:`custom`;dialog.showModal();document.body.classList.add(`profile-open`);render();$(`profileClose`).focus()});
 $(`profileClose`).onclick=()=>dialog.close();dialog.addEventListener(`close`,()=>{document.body.classList.remove(`profile-open`);if(chart){chart.destroy();chart=null}opener?.focus()});dialog.addEventListener(`click`,e=>{if(e.target===dialog)dialog.close()});from.onchange=to.onchange=()=>{profilePeriod=`custom`;render()};$(`profileYear`).onclick=()=>{profilePeriod=`year`;from.value=`${latest.slice(0,4)}-01-01`;to.value=latest;render()};$(`profileMonth`).onclick=()=>{profilePeriod=`month`;from.value=`${latest.slice(0,7)}-01`;to.value=latest;render()};$(`profilePrev`).onclick=()=>{page--;renderTable()};$(`profileNext`).onclick=()=>{page++;renderTable()};
 if(otherDetails){
  $(`profileOtherPrev`).onclick=()=>{otherPage--;renderOtherTable()};
  $(`profileOtherNext`).onclick=()=>{otherPage++;renderOtherTable()};
 }
}};
})();
