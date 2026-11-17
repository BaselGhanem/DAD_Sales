const archiveCache = `dad-sales-annual-workbooks-v1`;
const normalizeArea = value => String(value).trim().replace(/^(?:الأردن|الاردن)\s*[-–—]\s*/, ``);

async function readWorkbook({path = `data/Up.xlsx`, version, year}) {
 const url = new URL(path, self.location.href);
 if(version)url.searchParams.set(`archiveVersion`,version);
 let cache;
 if(version){try{cache=await caches.open(archiveCache)}catch{}}
 const cached=cache&&await cache.match(url).catch(()=>null);
 const response=cached||await fetch(url,{cache:`no-cache`,signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error(`Unable to load the sales workbook (${response.status})`);
 const copy=cache&&!cached?response.clone():null;
 const bytes=await response.arrayBuffer();
 if(version&&!cached){
  const header=new TextEncoder().encode(`blob ${bytes.byteLength}\0`);
  const blob=new Uint8Array(header.length+bytes.byteLength);
  blob.set(header);
  blob.set(new Uint8Array(bytes),header.length);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest(`SHA-1`,blob)),value=>value.toString(16).padStart(2,`0`)).join(``);
  if(hash!==version)throw Error(`The newest sales archive has not been published yet.`);
 }
 if(typeof XLSX===`undefined`)importScripts(`vendor/xlsx.full.min.js`);
 return {workbook:XLSX.read(bytes,{type:`array`,dense:true}),cache,copy,url,year};
}

self.onmessage=async({data})=>{try{
 const {workbook:wb,cache,copy,url,year}=await readWorkbook(data);
 if(!wb.Sheets.Data)throw Error(`The sales workbook must contain the sheet Data`);
 const sheet=XLSX.utils.sheet_to_json(wb.Sheets.Data,{defval:``});if(!sheet.length)throw Error(`Sheet Data is empty`);
 for(const key of [`MR`,`Cust No`,`Cust Name`,`Area Name`,`Transaction Date`,`Team`,`Item Name`,`Product Group`,`Value`,`Units`])if(!(key in sheet[0]))throw Error(`Missing required column: ${key}`);
 const output=[],company=[],years=new Set();
 const leadership=[`supervisor`,`chronic`,`anti-infective`,`country-manager`].includes(data.role);
 let latest=``,earliest=`9999-12-31`;
 for(const r of sheet){let date;const v=r[`Transaction Date`];if(typeof v===`number`){const d=XLSX.SSF.parse_date_code(v);if(d)date=`${d.y}-${String(d.m).padStart(2,`0`)}-${String(d.d).padStart(2,`0`)}`}else{const text=String(v||``).trim();if(/^\d{4}-\d{2}-\d{2}/.test(text))date=text.slice(0,10);else{const p=text.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);if(p)date=`${p[3]}-${p[2].padStart(2,`0`)}-${p[1].padStart(2,`0`)}`}}
 const timestamp=Date.parse(date);
 if(!date||!Number.isFinite(timestamp)||new Date(timestamp).toISOString().slice(0,10)!==date)throw Error(`The sales workbook contains an invalid date.`);years.add(date.slice(0,4));if(date>latest)latest=date;if(date<earliest)earliest=date;
 const value=Number(r.Value),units=Number(r.Units);if(String(r.Value).trim()===``||String(r.Units).trim()===``||!Number.isFinite(value)||!Number.isFinite(units))throw Error(`The sales workbook contains an invalid number.`);
 if(!String(r[`Cust No`]).trim())throw Error(`The sales workbook contains a transaction without a customer code.`);
 const projected={rep:String(r.MR).trim(),customer:String(r[`Cust No`]).trim(),customerName:String(r[`Cust Name`]).trim(),area:normalizeArea(r[`Area Name`]),team:String(r.Team).trim(),group:String(r[`Product Group`]).trim(),item:String(r[`Item Name`]).trim(),date,month:date.slice(0,7),value,units};
 if(leadership){
  const bonus=Number(r.Bonus);
  projected.bonus=Number.isFinite(bonus)?bonus:null;
 }
 company.push(projected);if(data.role===`country-manager`|| (data.role===`chronic`||data.role===`anti-infective`?Array.isArray(data.teams)&&data.teams.includes(projected.team):data.role===`supervisor`?!!data.team&&projected.team===data.team:projected.rep===data.name))output.push(projected);
 }
 if(years.size!==1||(year&&!years.has(year)))throw Error(`The workbook must contain only sales from its assigned year.`);
 if(copy){
  try{
   await cache.put(url,copy);
   const keys=await cache.keys();
   await Promise.all(keys.filter(key=>new URL(key.url).pathname===url.pathname&&key.url!==url.href).map(key=>cache.delete(key)));
  }catch{}
 }
 const regions=new Set(output.map(r=>r.area));const opportunityRows=data.role===`country-manager`?output:company.filter(r=>regions.has(r.area));self.postMessage({rows:output,opportunityRows,latest,earliest});
}catch(error){self.postMessage({error:error.message||`Unable to read the sales workbook.`})}};
