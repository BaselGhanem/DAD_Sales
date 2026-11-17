(() => {
 const S=Sales;
 const number=new Intl.NumberFormat(`en-US`,{maximumFractionDigits:0});
 const rate=new Intl.NumberFormat(`en-US`,{style:`percent`,maximumFractionDigits:1,signDisplay:`negative`});
 const quantity=value=>value===null?`—`:number.format(value);
 const percent=({bonus,units})=>{
  const value=S.bonusRate(bonus,units);
  return value===null?`—`:rate.format(value);
 };
 const empty={units:0,bonus:0};
 const escape=value=>String(value).replace(/[&<>"']/g,char=>({[`&`]:`&amp;`,[`<`]:`&lt;`,[`>`]:`&gt;`,[`"`]:`&quot;`,[`'`]:`&#39;`})[char]);

 function card(anchor,id){
  const article=document.createElement(`article`);
  article.className=`bonus-kpi`;
  article.innerHTML=`<span>Bonus</span><strong id="${id}"></strong><small>Units</small><p></p>`;
  const adjacent=anchor.closest(`article`);
  adjacent.parentElement.classList.add(`has-bonus`);
  adjacent.after(article);
  return article;
 }

 function updateCard(article,total=empty){
  const amount=article.querySelector(`strong`);
  if(total.bonus===null)KpiCounter.text(amount.id,`—`);
  else KpiCounter.set(amount.id,total.bonus);
  article.querySelector(`p`).textContent=`${percent(total)} of Net Units`;
  article.title=`Net Units: ${quantity(total.units)}`;
 }

 function cells(total){
  return `<td data-label="Net Units">${quantity(total.units)}</td>
   <td data-label="Bonus Units">${quantity(total.bonus)}<small class="bonus-mobile-rate">${percent(total)}</small></td>
   <td class="bonus-rate" data-label="Bonus %">${percent(total)}</td>`;
 }

 function table(label){
  return `<table aria-label="${label}"><thead><tr><th scope="col">${label}</th>
   <th scope="col">Net Units</th><th scope="col">Bonus Units</th><th scope="col">Bonus %</th>
   </tr></thead><tbody></tbody><tfoot></tfoot></table>`;
 }

 function createItemTable(){
  const panel=document.createElement(`section`);
  panel.className=`panel bonus-panel`;
  panel.innerHTML=`
   <div class="section-head"><h2>Bonus by item</h2></div>
   <div class="bonus-controls">
    <label>Sort by<select data-sort><option value="bonus">Bonus Units</option><option value="rate">Bonus %</option></select></label>
   </div>
   <p class="bonus-empty" hidden>No transactions match your filters.</p>
   <div class="bonus-table"></div>
   <div class="pagination"><button type="button" data-prev>Previous</button><span></span><button type="button" data-next>Next</button></div>
   <section class="bonus-detail" hidden><div class="section-head"><h3></h3><button type="button">Close</button></div><div class="bonus-table">${table(`Customer`)}</div><div class="pagination"><button type="button" data-prev>Previous</button><span></span><button type="button" data-next>Next</button></div></section>`;
  const sort=panel.querySelector(`[data-sort]`);
  const host=panel.querySelector(`.bonus-table`);
  const paging=panel.querySelector(`.pagination`);
  const details=panel.querySelector(`.bonus-detail`);
  const size=15;
  let source=[],totals=[],page=1,detailPage=1,opener,customers=[],itemTotal;

  function paginate(nav,index,length,render){
   const pages=Math.max(1,Math.ceil(length/size));
   nav.hidden=pages===1;
   nav.querySelector(`span`).textContent=`${index} / ${pages}`;
   const prev=nav.querySelector(`[data-prev]`);
   const next=nav.querySelector(`[data-next]`);
   prev.disabled=index===1;
   next.disabled=index===pages;
   prev.onclick=()=>render(index-1);
   next.onclick=()=>render(index+1);
  }

  function showCustomers(index){
   detailPage=index;
   details.querySelector(`tbody`).innerHTML=customers.slice((index-1)*size,index*size)
    .map(customer=>`<tr><th scope="row">${escape(customer.label)}</th>${cells(customer)}</tr>`).join(``);
   details.querySelector(`tfoot`).innerHTML=`<tr><th scope="row">Total</th>${cells(itemTotal)}</tr>`;
   paginate(details.querySelector(`.pagination`),detailPage,customers.length,showCustomers);
  }

  function closeDetails(){
   if(details.hidden)return;
   details.hidden=true;
   opener?.setAttribute(`aria-expanded`,`false`);
  }

  function openItem(button,item){
   closeDetails();
   opener=button;
   button.setAttribute(`aria-expanded`,`true`);
   const transactions=source.filter(row=>row.item===item.name);
   const names=new Map(transactions.map(row=>[row.customer,row.customerName]));
   customers=S.bonusSummary(transactions,`customer`).map(customer=>({...customer,label:names.get(customer.name)}))
    .sort((a,b)=>(b.bonus??-Infinity)-(a.bonus??-Infinity)||a.label.localeCompare(b.label));
   itemTotal=item;
   details.querySelector(`h3`).textContent=item.name;
   details.hidden=false;
   showCustomers(1);
   details.querySelector(`.section-head button`).focus();
  }

  function showPage(index){
   closeDetails();
   page=index;
   const visible=totals.slice((page-1)*size,page*size);
   host.querySelector(`tbody`).innerHTML=visible.map(total=>`<tr><th scope="row"><button type="button" class="customer-link" aria-expanded="false">${escape(total.name)}</button></th>${cells(total)}</tr>`).join(``);
   host.querySelectorAll(`button`).forEach((button,i)=>button.onclick=()=>openItem(button,visible[i]));
   paginate(paging,page,totals.length,showPage);
  }

  function render(data){
   source=data;
   const metric=sort.value===`rate`?total=>S.bonusRate(total.bonus,total.units):total=>total.bonus;
   totals=S.bonusSummary(source,`item`).sort((a,b)=>(metric(b)??-Infinity)-(metric(a)??-Infinity)||a.name.localeCompare(b.name));
   host.innerHTML=table(`Item`);
   panel.querySelector(`.bonus-empty`).hidden=source.length>0;
   host.hidden=!source.length;
   host.querySelector(`tfoot`).innerHTML=`<tr><th scope="row">Total</th>${cells(S.bonusSummary(source)[0]??empty)}</tr>`;
   showPage(1);
  }

  sort.onchange=()=>render(source);
  details.querySelector(`.section-head button`).onclick=()=>{
   closeDetails();
   opener?.focus();
  };
  return {panel,render};
 }

 window.BonusView={card,updateCard,quantity,percent,init(){
  const overview=card(document.getElementById(`units`),`bonusUnits`);
  const products=createItemTable();
  document.getElementById(`charts`).before(products.panel);
  return {render(rows){
   updateCard(overview,S.bonusSummary(rows)[0]);
   products.render(rows);
  }};
 }};
})();
