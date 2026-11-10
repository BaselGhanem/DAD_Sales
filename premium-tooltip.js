(() => {
 const roots=new Map(),format=n=>new Intl.NumberFormat(`en-US`,{maximumFractionDigits:2}).format(n),escape=s=>String(s??``).replace(/[&<>"']/g,c=>({[`&`]:`&amp;`,[`<`]:`&lt;`,[`>`]:`&gt;`,[`"`]:`&quot;`,[`'`]:`&#39;`})[c]);
 const hide=()=>{for(const box of roots.values()){box.hidden=true;box.setAttribute(`aria-hidden`,`true`)}};
 function summarize(rows,total){const m=Sales.metrics(rows);return {...m,transactions:rows.length,share:total>0?m.net/total*100:null}}
 function bind(chart,{rows,key,keys,titles,period}){const groups=new Map();for(const r of rows){const value=typeof key===`function`?key(r):r[key];if(!groups.has(value))groups.set(value,[]);groups.get(value).push(r)}const total=Sales.sum(rows);chart.$premiumTooltip={titles:titles||chart.data.labels,period,points:keys.map(value=>summarize(groups.get(value)||[],total))}}
 function external({chart,tooltip}){
  if(!tooltip.opacity||!tooltip.dataPoints?.length){hide();return}
  const index=tooltip.dataPoints[0].dataIndex,meta=chart.$premiumTooltip,point=meta?.points[index];
  if(!point)return;
  const root=chart.canvas.closest(`dialog`)||document.body;let box=roots.get(root);
  if(!box){box=document.createElement(`div`);box.className=`premium-chart-tooltip`;box.setAttribute(`role`,`tooltip`);root.append(box);roots.set(root,box)}
  for(const other of roots.values())if(other!==box)other.hidden=true;
  box.innerHTML=`<div class="pct-heading"><span>SALES INSIGHT</span><span class="pct-period">${escape(meta.period||``)}</span></div><div class="pct-title">${escape(meta.titles[index])}</div><div class="pct-hero"><span>Net sales</span><strong>${format(point.net)}</strong></div><div class="pct-grid"><div><span>Net units</span><strong>${format(point.units)}</strong></div><div><span>Active customers</span><strong>${format(point.customers)}</strong></div><div><span>Items sold</span><strong>${format(point.items)}</strong></div><div><span>Transactions</span><strong>${format(point.transactions)}</strong></div></div>${point.share!==null?`<div class="pct-share"><span>Share of filtered sales</span><strong>${format(point.share)}%</strong></div>`:``}`;
  box.hidden=false;box.setAttribute(`aria-hidden`,`false`);
  const canvas=chart.canvas.getBoundingClientRect(),anchorX=canvas.left+tooltip.caretX,anchorY=canvas.top+tooltip.caretY,bounds=box.getBoundingClientRect(),gap=14,margin=10;
  let x=anchorX+gap;if(x+bounds.width>innerWidth-margin)x=anchorX-bounds.width-gap;x=Math.max(margin,Math.min(innerWidth-bounds.width-margin,x));
  let y=anchorY-bounds.height/2;y=Math.max(margin,Math.min(innerHeight-bounds.height-margin,y));box.style.left=`${x}px`;box.style.top=`${y}px`;
 }
 Chart.defaults.plugins.tooltip.enabled=false;Chart.defaults.plugins.tooltip.external=external;
 Chart.register({id:`premiumTooltipCleanup`,afterDestroy:hide});
 window.addEventListener(`scroll`,hide,true);window.addEventListener(`resize`,hide);document.addEventListener(`keydown`,event=>{if(event.key===`Escape`)hide()});
 window.PremiumTooltip={bind,summarize,hide};
})();
