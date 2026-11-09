/* Pure sales calculations shared by UI and verification. No bonus fields. */
(function(root){
const iso=d=>new Date(d).toISOString().slice(0,10);
const sum=(rows,key=`value`)=>rows.reduce((total,r)=>total+r[key],0);
const aggregate=(rows,key,metric=`value`)=>{const m=new Map();for(const r of rows)m.set(r[key],(m.get(r[key])||0)+r[metric]);return [...m].sort((a,b)=>b[1]-a[1])};
const match=(r,filters,except=``)=>Object.entries(filters).every(([k,s])=>k===except||!s.size||s.has(r[k]));
const subset=(rows,from,to,filters={})=>rows.filter(r=>r.date>=from&&r.date<=to&&match(r,filters));
const shiftMonth=(date,n)=>{const d=new Date(`${date}T00:00:00Z`),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return iso(d)};
const metrics=rows=>({net:sum(rows),units:sum(rows,`units`),customers:aggregate(rows,`customer`).filter(x=>x[1]>0).length,items:aggregate(rows,`item`,`units`).filter(x=>x[1]>0).length});
root.Sales={iso,sum,aggregate,match,subset,shiftMonth,metrics};
if(typeof module!==`undefined`)module.exports=root.Sales;
})(typeof window!==`undefined`?window:globalThis);
