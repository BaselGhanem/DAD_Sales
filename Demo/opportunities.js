(() => {
const $=id=>document.getElementById(id),S=Sales,n=n=>new Intl.NumberFormat(`en-US`,{maximumFractionDigits:0}).format(n),escape=s=>String(s??``).replace(/[&<>"']/g,c=>({[`&`]:`&amp;`,[`<`]:`&lt;`,[`>`]:`&gt;`,[`"`]:`&quot;`,[`'`]:`&#39;`})[c]);
function territoryScope(ownRows,teams,reps){const scoped=ownRows.filter(r=>(!teams.size||teams.has(r.team))&&(!reps.size||reps.has(r.rep)));return {ownRows:scoped,items:[...new Set(scoped.map(r=>r.item))],areas:new Set(scoped.map(r=>r.area))};}
function compute(rows,owned,selected,areas,from,to){
 const wanted=new Set(selected.length?selected:owned),customers=new Map();
 for(const r of rows){if(r.date<from||r.date>to||(areas.size&&!areas.has(r.area)))continue;let c=customers.get(r.customer);if(!c){c={customer:r.customer,name:r.customerName,areas:new Set(),last:``,otherValue:0,otherItems:new Map(),target:new Map()};customers.set(r.customer,c)}c.areas.add(r.area);
 if(wanted.has(r.item))c.target.set(r.item,(c.target.get(r.item)||0)+r.units);
 // Other products are the complement of the selected item scope.
 if(!wanted.has(r.item)){c.otherValue+=r.value;c.otherItems.set(r.item,(c.otherItems.get(r.item)||0)+r.units);if(r.units>0&&r.date>c.last)c.last=r.date}
 }
 return [...customers.values()].filter(c=>c.otherValue>0&&[...c.otherItems.values()].some(units=>units>0)&&[...c.target.values()].every(units=>units<=0)).sort((a,b)=>b.otherValue-a.otherValue);
}

function priorities(rows,owned,selected,areas,from,to){
 const wanted=selected.length?selected:owned,clients=new Map();
 for(const r of rows){if(r.date<from||r.date>to||(areas.size&&!areas.has(r.area)))continue;
 let c=clients.get(r.customer);if(!c){c={customer:r.customer,name:r.customerName,areas:new Set(),last:``,companyNet:0,units:new Map()};clients.set(r.customer,c)}
 c.areas.add(r.area);c.companyNet+=r.value;c.units.set(r.item,(c.units.get(r.item)||0)+r.units);if(r.units>0&&r.value>0&&r.date>c.last)c.last=r.date;
 }
 return [...clients.values()].map(c=>({...c,missing:wanted.filter(item=>(c.units.get(item)||0)<=0)})).filter(c=>c.companyNet>0&&c.missing.length>0).sort((a,b)=>b.companyNet-a.companyNet||b.missing.length-a.missing.length||a.name.localeCompare(b.name,`en`));
}
window.OpportunityMath={compute,priorities,territoryScope};
window.SalesOpportunities={init({rows,ownRows,latest}){
 let profileContext;
 const owned=[...new Set(ownRows.map(r=>r.item))].sort((a,b)=>a.localeCompare(b)),allAreas=[...new Set(ownRows.map(r=>r.area))].sort((a,b)=>a.localeCompare(b,`en`));let selectedUnits=new Set(),selectedSupervisors=new Set(),selectedTeams=new Set(),selectedReps=new Set(),allowedItems=new Set(owned),priorityMode=false,areas=new Set(),selectedItems=new Set(),periodMode=`year`,page=1,current=[];const from=$(`oppFrom`),to=$(`oppTo`),item=$(`oppItem`);
 const group=$(`oppGroup`),query=$(`oppCustomerSearch`),minValue=$(`oppMinValue`),maxValue=$(`oppMaxValue`),minMissing=$(`oppMinMissing`);
 for(const value of [...new Set(ownRows.map(r=>r.group))].sort((a,b)=>a.localeCompare(b)))group.add(new Option(value,value));
 for(const value of owned)item.add(new Option(value,value));
 const itemOptions=$(`oppItemOptions`);
 for(const value of [``,...owned]){const label=document.createElement(`label`),box=document.createElement(`input`);box.type=`checkbox`;box.value=value;box.checked=!value;box.onchange=()=>{if(!value)selectedItems.clear();else if(box.checked)selectedItems.add(value);else selectedItems.delete(value);render()};const title=value||`All my items`;label.dataset.search=title.toLocaleLowerCase();label.append(box,document.createTextNode(title));itemOptions.append(label)}
 $(`oppItemSearch`).oninput=e=>{for(const label of itemOptions.children)label.hidden=!label.dataset.search.includes(e.target.value.toLocaleLowerCase())||(!!label.querySelector(`input`).value&&!allowedItems.has(label.querySelector(`input`).value))};

 from.value=`${latest.slice(0,4)}-01-01`;to.value=`${latest.slice(0,4)}-12-31`;

 function picker(prefix,values,selected,allLabel){
  const host=$(`${prefix}Options`),search=$(`${prefix}Search`);host.replaceChildren();
  $(`${prefix}Title`).textContent=selected.size===1?[...selected][0]:selected.size?`${selected.size} selected`:allLabel;
  for(const value of values){const label=document.createElement(`label`),box=document.createElement(`input`);box.type=`checkbox`;box.value=value;box.checked=selected.has(value);label.dataset.search=value.toLocaleLowerCase();label.hidden=!label.dataset.search.includes(search.value.toLocaleLowerCase());box.onchange=()=>{box.checked?selected.add(value):selected.delete(value);render();for(const input of host.querySelectorAll(`input`))if(input.value===value)input.focus({preventScroll:true})};label.append(box,document.createTextNode(value));host.append(label)}
  if(!values.length)host.textContent=`No options available.`;
  search.oninput=()=>{for(const label of host.children)label.hidden=!label.dataset.search.includes(search.value.toLocaleLowerCase())};
 }
 const options=$(`oppAreas`);for(const value of allAreas){const label=document.createElement(`label`),box=document.createElement(`input`);box.type=`checkbox`;box.onchange=()=>{box.checked?areas.add(value):areas.delete(value);render()};label.append(box,document.createTextNode(value));label.dataset.search=value;options.append(label)}
 $(`oppAreaSearch`).oninput=e=>{const territory=territoryScope(countryScope(),selectedTeams,selectedReps);for(const label of options.children)label.hidden=!territory.areas.has(label.dataset.search)||!label.dataset.search.includes(e.target.value)};
 function table(){const pages=Math.max(1,Math.ceil(current.length/25));page=Math.min(page,pages);$(`oppRows`).innerHTML=current.slice((page-1)*25,page*25).map(c=>{const values=priorityMode?[c.name,[...c.areas].join(`, `),c.last?c.last.split(`-`).reverse().join(`/`):`—`,n(c.companyNet),c.missing.join(`, `)]:[c.name,[...c.areas].join(`, `),c.last?c.last.split(`-`).reverse().join(`/`):`—`,n(c.otherValue),n([...c.otherItems.values()].filter(v=>v>0).length)];const labels=priorityMode?[`Customer`,`Area`,`Last company purchase`,`Net company purchases`,`Your items to follow up`]:[`Customer`,`Area`,`Last purchase of other items`,`Net purchases of other items`,`Other items purchased`];return `<tr>${values.map((v,i)=>`<td data-label="${labels[i]}">${i===0?`<button type="button" class="customer-link" data-profile-customer="${escape(c.customer)}">${escape(v)}</button>`:escape(v)}</td>`).join(``)}</tr>`}).join(``);$(`oppPage`).textContent=`${page} / ${pages}`;$(`oppPrev`).disabled=page<=1;$(`oppNext`).disabled=page>=pages}
 const countryScope=()=>ownRows.filter(r=>(!selectedUnits.size||selectedUnits.has(r.businessUnit))&&(!selectedSupervisors.size||selectedSupervisors.has(r.supervisor)));
 function render(){if(!from.value||!to.value||from.value>to.value){$(`oppStatus`).textContent=`Select a valid date range.`;return}page=1;
 for(const [id,mode] of [[`oppMonth`,`month`],[`oppYear`,`year`]]){$(id).classList.toggle(`active`,periodMode===mode);$(id).setAttribute(`aria-pressed`,`${periodMode===mode}`)}
 if($(`oppUnitPicker`)){for(const value of [...selectedSupervisors])if(!ownRows.some(r=>(!selectedUnits.size||selectedUnits.has(r.businessUnit))&&r.supervisor===value))selectedSupervisors.delete(value);picker(`oppUnit`,[...new Set(ownRows.map(r=>r.businessUnit))].sort(),selectedUnits,`All business units`);picker(`oppSupervisor`,[...new Set(ownRows.filter(r=>!selectedUnits.size||selectedUnits.has(r.businessUnit)).map(r=>r.supervisor))].sort(),selectedSupervisors,`All supervisors`);}
 const hierarchyRows=countryScope();for(const value of [...selectedTeams])if(!hierarchyRows.some(r=>r.team===value))selectedTeams.delete(value);
 const availableReps=new Set(hierarchyRows.filter(r=>!selectedTeams.size||selectedTeams.has(r.team)).map(r=>r.rep));
 for(const value of [...selectedReps])if(!availableReps.has(value))selectedReps.delete(value);
 const territory=territoryScope(countryScope(),selectedTeams,selectedReps),scopedOwn=territory.ownRows;
 picker(`oppTeam`,[...new Set(hierarchyRows.filter(r=>!selectedReps.size||selectedReps.has(r.rep)).map(r=>r.team))].sort(),selectedTeams,`All teams`);
 picker(`oppRep`,[...availableReps].sort((a,b)=>a.localeCompare(b)),selectedReps,`All representatives`);
 for(const area of [...areas])if(!territory.areas.has(area))areas.delete(area);
 for(const label of options.children){label.hidden=!territory.areas.has(label.dataset.search)||!label.dataset.search.includes($(`oppAreaSearch`).value);label.querySelector(`input`).checked=areas.has(label.dataset.search)}
 const selectedGroup=group.value;group.replaceChildren(new Option(`All groups`,``));for(const value of [...new Set(scopedOwn.map(r=>r.group))].sort())group.add(new Option(value,value));if([...group.options].some(option=>option.value===selectedGroup))group.value=selectedGroup;
 const scopeItems=group.value?territory.items.filter(value=>scopedOwn.some(r=>r.item===value&&r.group===group.value)):territory.items;
 allowedItems=new Set(scopeItems);
 const companyScope=rows.filter(r=>territory.areas.has(r.area));
 for(const value of [...selectedItems])if(!scopeItems.includes(value))selectedItems.delete(value);
 const profileItems=new Set(selectedItems.size?selectedItems:scopeItems);
 const profileGroup=group.value,profileAreas=new Set(areas);
 const profilePortfolio=new Set(scopedOwn);
 profileContext={
  from:from.value,to:to.value,months:new Set(),
  matchesPortfolio:row=>profilePortfolio.has(row)&&(!profileAreas.size||profileAreas.has(row.area)),
  matchesItem:row=>profileItems.has(row.item)&&(!profileGroup||row.group===profileGroup),
  matchesArea:row=>territory.areas.has(row.area)&&(!profileAreas.size||profileAreas.has(row.area)),
  otherExclusion:priorityMode?undefined:profileItems
 };
 const allowed=new Set(scopeItems);
 for(const label of itemOptions.children){const radio=label.querySelector(`input`);label.hidden=!!radio.value&&!allowed.has(radio.value)||!label.dataset.search.includes($(`oppItemSearch`).value.toLocaleLowerCase())}
 const low=minValue.value===``?0:Number(minValue.value),high=maxValue.value===``?Infinity:Number(maxValue.value);
 if(low>high){$(`oppStatus`).textContent=`Minimum purchases cannot exceed maximum purchases.`;return}
 current=scopeItems.length?(priorityMode?priorities:compute)(companyScope,territory.items,selectedItems.size?[...selectedItems]:scopeItems,areas,from.value,to.value):[];
 const search=query.value.trim().toLocaleLowerCase();
 current=current.filter(c=>{const value=priorityMode?c.companyNet:c.otherValue;return (!search||c.name.toLocaleLowerCase().includes(search)||c.customer.toLocaleLowerCase().includes(search))&&value>=low&&value<=high&&(!priorityMode||c.missing.length>=Math.max(1,Number(minMissing.value)||1))});
 $(`oppMissingField`).hidden=!priorityMode;$(`oppValueFilterHint`).textContent=priorityMode?`Purchase value: net company purchases`:`Purchase value: net purchases of other items`;
KpiCounter.set(`oppCount`,current.length);KpiCounter.set(`oppValue`,current.reduce((s,c)=>s+(priorityMode?c.companyNet:c.otherValue),0));$(`oppAreaTitle`).textContent=areas.size?`${areas.size} areas selected`:`All areas`;$(`oppItemTitle`).textContent=selectedItems.size===1?[...selectedItems][0]:selectedItems.size?`${selectedItems.size} items selected`:`All my items`;for(const box of itemOptions.querySelectorAll(`input`))box.checked=box.value?selectedItems.has(box.value):!selectedItems.size;const chips=$(`oppChips`);chips.replaceChildren();for(const [values,label] of [[selectedUnits,`Business unit`],[selectedSupervisors,`Supervisor`],[selectedTeams,`Team`],[selectedReps,`Representative`]])for(const value of values){const button=document.createElement(`button`);button.type=`button`;button.textContent=`${label}: ${value} ×`;button.onclick=()=>{values.delete(value);render()};chips.append(button)}for(const [control,label] of [[group,`Product group`],[query,`Customer`],[minValue,`Minimum purchases`],[maxValue,`Maximum purchases`],...(priorityMode?[[minMissing,`Minimum item count`]]:[])])if(control.value){const b=document.createElement(`button`);b.type=`button`;b.textContent=`${label}: ${control.value} ×`;b.onclick=()=>{control.value=``;render()};chips.append(b)}for(const area of areas){const b=document.createElement(`button`);b.type=`button`;b.textContent=`${area} ×`;b.onclick=()=>{areas.delete(area);for(const label of options.children)label.querySelector(`input`).checked=areas.has(label.dataset.search);render()};chips.append(b)}for(const value of selectedItems){const b=document.createElement(`button`);b.type=`button`;b.textContent=`${value} ×`;b.onclick=()=>{selectedItems.delete(value);render()};chips.append(b)}$(`oppStatus`).textContent=current.length?`${current.length} customers match this period and filters`:`No opportunities match this period and filters.`;const section=$(`opportunities`);section.querySelector(`.filters-panel h2`).textContent=priorityMode?`Follow-up priorities`:`Sales opportunities`;$(`oppCount`).previousElementSibling.textContent=priorityMode?`Customers to follow up`:`Opportunity customers`;$(`oppValue`).previousElementSibling.textContent=priorityMode?`Net company purchases`:`Net purchases of other items`;const headings=priorityMode?[`Customer`,`Area`,`Last company purchase`,`Net company purchases`,`Your items to follow up`]:[`Customer`,`Area`,`Last purchase of other items`,`Net purchases of other items`,`Other items purchased`];section.querySelectorAll(`thead th`).forEach((th,i)=>th.textContent=headings[i]);table()}
 for(const element of [group,minValue,maxValue,minMissing])element.onchange=render;for(const element of [from,to])element.onchange=()=>{periodMode=`custom`;render()};query.oninput=render;
 $(`oppMonth`).onclick=()=>{periodMode=`month`;from.value=`${latest.slice(0,7)}-01`;to.value=latest;render()};$(`oppYear`).onclick=()=>{periodMode=`year`;from.value=`${latest.slice(0,4)}-01-01`;to.value=`${latest.slice(0,4)}-12-31`;render()};$(`oppClear`).onclick=()=>{selectedUnits.clear();selectedSupervisors.clear();for(const id of [`oppUnitSearch`,`oppSupervisorSearch`])if($(id))$(id).value=``;selectedTeams.clear();selectedReps.clear();$(`oppTeamSearch`).value=``;$(`oppRepSearch`).value=``;areas.clear();selectedItems.clear();item.value=``;group.value=``;query.value=``;minValue.value=``;maxValue.value=``;minMissing.value=``;$(`oppAreaSearch`).value=``;$(`oppItemSearch`).value=``;for(const label of [...options.children,...itemOptions.children])label.hidden=false;for(const box of options.querySelectorAll(`input`))box.checked=false;render()};$(`oppPrev`).onclick=()=>{page--;table()};$(`oppNext`).onclick=()=>{page++;table()};
 function tab(name){const opportunity=name===`opportunities`||name===`priorities`;priorityMode=name===`priorities`;$(`salesView`).hidden=opportunity;$(`opportunities`).hidden=!opportunity;document.querySelectorAll(`[data-tab]`).forEach(b=>{const active=b.dataset.tab===name;b.classList.toggle(`active`,active);b.setAttribute(`aria-pressed`,`${active}`)});if(opportunity)render()}
 document.querySelectorAll(`[data-tab]`).forEach(b=>b.addEventListener(`click`,()=>tab(b.dataset.tab)));document.querySelectorAll(`.mobile-nav [data-section]`).forEach(b=>b.addEventListener(`click`,()=>tab(`sales`),true));
 return () => profileContext;
}};
})();
