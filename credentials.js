(() => {
 const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest(`SHA-256`,new TextEncoder().encode(value)))).map(v=>v.toString(16).padStart(2,`0`)).join(``);
 function parse(text){
  text=text.replace(/^\uFEFF/,``);const rows=[];let row=[],cell=``,quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c===`"`){if(quoted&&text[i+1]===`"`){cell+=`"`;i++}else quoted=!quoted}
   else if(c===`,`&&!quoted){row.push(cell);cell=``}
   else if((c===`\n`||c===`\r`)&&!quoted){if(c===`\r`&&text[i+1]===`\n`)i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell=``}
   else cell+=c;
  }
  if(quoted)throw Error(`CSV quotation error`);row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
  const headers=(rows.shift()||[]).map(h=>h.trim());for(const h of [`Username`,`Medical Representative`,`PIN`])if(!headers.includes(h))throw Error(`Missing credential column: ${h}`);
  return rows.map(cells=>Object.fromEntries(headers.map((h,i)=>[h,(cells[i]||``).trim()])));
 }
 async function load(){
  const response=await fetch(`credentials.csv?fresh=${Date.now()}`,{cache:`no-store`});if(!response.ok)throw Error(`credentials`);
  const records=parse(await response.text()),ids=new Set(),names=new Set();const users=[];
  for(const row of records){const id=row.Username,name=row[`Medical Representative`],pin=row.PIN;
   if(!id||!name||!/^\d{4}$/.test(pin)||ids.has(id)||names.has(name))throw Error(`Invalid or duplicate credential record`);
   ids.add(id);names.add(name);users.push({id,name,role:`rep`,enabled:true,passwordHash:await hash(`${id}:${pin}`),authVersion:await hash(`${id}:${name}:${pin}`)});
  }
  return {users};
 }
 const valid=(user,session)=>!!user&&session?.authVersion===user.authVersion;
 window.Credentials={parse,load,valid};
})();
