importScripts(`vendor/xlsx.full.min.js`);
self.onmessage=async({data})=>{try{
 const response=await fetch(`data/Up.xlsx?fresh=${Date.now()}`,{cache:`no-store`});if(!response.ok)throw Error(`Unable to load the sales workbook (${response.status})`);
 const wb=XLSX.read(await response.arrayBuffer(),{type:`array`});if(!wb.Sheets.Data)throw Error(`The sales workbook must contain the sheet Data`);
 const sheet=XLSX.utils.sheet_to_json(wb.Sheets.Data,{defval:``});if(!sheet.length)throw Error(`Sheet Data is empty`);
 for(const key of [`MR`,`Cust No`,`Cust Name`,`Area Name`,`Transaction Date`,`Team`,`Item Name`,`Product Group`,`Value`,`Units`])if(!(key in sheet[0]))throw Error(`Missing required column: ${key}`);
 const output=[],company=[];let latest=``,earliest=`9999-12-31`;
 for(const r of sheet){let date;const v=r[`Transaction Date`];if(typeof v===`number`){const d=XLSX.SSF.parse_date_code(v);if(d)date=`${d.y}-${String(d.m).padStart(2,`0`)}-${String(d.d).padStart(2,`0`)}`}else{const text=String(v||``).trim();if(/^\d{4}-\d{2}-\d{2}/.test(text))date=text.slice(0,10);else{const p=text.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);if(p)date=`${p[3]}-${p[2].padStart(2,`0`)}-${p[1].padStart(2,`0`)}`}}
 if(!date||!Number.isFinite(Date.parse(date)))throw Error(`The sales workbook contains an invalid date.`);if(date>latest)latest=date;if(date<earliest)earliest=date;
 const value=Number(r.Value),units=Number(r.Units);if(!Number.isFinite(value)||!Number.isFinite(units))throw Error(`The sales workbook contains an invalid number.`);
 const projected={rep:String(r.MR).trim(),customer:String(r[`Cust No`]).trim(),customerName:String(r[`Cust Name`]).trim(),area:String(r[`Area Name`]).trim(),team:String(r.Team).trim(),group:String(r[`Product Group`]).trim(),item:String(r[`Item Name`]).trim(),date,month:date.slice(0,7),value,units};company.push(projected);if(data.role===`chronic`||data.role===`anti-infective`?Array.isArray(data.teams)&&data.teams.includes(projected.team):data.role===`supervisor`?!!data.team&&projected.team===data.team:projected.rep===data.name)output.push(projected)}
 const regions=new Set(output.map(r=>r.area));const opportunityRows=company.filter(r=>regions.has(r.area));self.postMessage({rows:output,opportunityRows,latest,earliest});
}catch(error){self.postMessage({error:error.message||`Unable to read the sales workbook.`})}};
