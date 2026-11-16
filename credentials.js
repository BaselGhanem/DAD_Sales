(() => {
 const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest(`SHA-256`,new TextEncoder().encode(value)))).map(v=>v.toString(16).padStart(2,`0`)).join(``);
 function parseRows(text){
  text=text.replace(/^\uFEFF/,``);const rows=[];let row=[],cell=``,quoted=false,line=1,start=1;
  for(let i=0;i<text.length;i++){const c=text[i];if(c===`"`){if(quoted&&text[i+1]===`"`){cell+=`"`;i++}else quoted=!quoted}
   else if(c===`,`&&!quoted){row.push(cell);cell=``}
   else if((c===`\n`||c===`\r`)&&!quoted){if(c===`\r`&&text[i+1]===`\n`)i++;row.push(cell);if(row.some(v=>v.trim()))rows.push({cells:row,line:start});row=[];cell=``;start=++line}
   else {cell+=c;if(c===`\n`||c===`\r`&&text[i+1]!==`\n`)line++;}
  }
  if(quoted)throw Object.assign(Error(`CSV quotation error`),{row:start,field:`CSV`});row.push(cell);if(row.some(v=>v.trim()))rows.push({cells:row,line:start});
  const header=rows.shift();
  const headers=(header?.cells||[]).map(h=>h.trim());
  for(const h of [`Username`,`Medical Representative`,`PIN`]){
   if(!headers.includes(h))throw Object.assign(Error(`Missing credential column: ${h}`),{row:header?.line||1,field:h});
  }
  return rows.map(({cells,line})=>({line,record:Object.fromEntries(headers.map((h,i)=>[h,(cells[i]||``).trim()]))}));
 }
 const parse = text => parseRows(text).map(({record})=>record);
 async function read(){
  const response=await fetch(`credentials.csv?fresh=${Date.now()}`,{cache:`no-store`});
  if(!response.ok)throw Error(`Unable to download credentials.csv (${response.status}).`);
  return response.text();
 }
 function inspect(text){
  const issues=[],users=[],ids=new Map(),names=new Map();
  let records;
  try{records=parseRows(text)}catch(error){
   return {users,issues:[{row:error.row,field:error.field,detail:error.message}],readable:false};
  }
  for(const {line,record} of records){
   const id=record.Username,name=record[`Medical Representative`],pin=record.PIN,role=record.Role||`rep`,team=record.Team||``;
   const identity=JSON.stringify([role,team,name]);
   const issue=(field,detail)=>issues.push({row:line,field,detail});
   if(!id)issue(`Username`,`Username is required.`);
   else if(ids.has(id))issue(`Username`,`Duplicate username "${id}" (first used on row ${ids.get(id)}).`);
   else ids.set(id,line);
   if(!name)issue(`Medical Representative`,`Representative name is required.`);
   else if(names.has(identity))issue(`Medical Representative`,`Duplicate account for "${name}" with the same role and team (first used on row ${names.get(identity)}).`);
   else names.set(identity,line);
   if(!/^\d{4}$/.test(pin))issue(`PIN`,`PIN must contain exactly four digits.`);
   if(![`rep`,`supervisor`,`chronic`,`anti-infective`,`country-manager`].includes(role))issue(`Role`,`Unrecognized role "${role}".`);
   if(![`rep`,`country-manager`].includes(role)&&!team)issue(`Team`,`Team is required for this role.`);
   if(role===`supervisor`&&team.includes(`|`))issue(`Team`,`A supervisor must have exactly one team.`);
   users.push({id,name,pin,role,team,enabled:true});
  }
  return {users,issues,readable:true};
 }
 async function audit(){
  const {users,issues,readable}=inspect(await read());
  return {users:users.map(({name,role,enabled})=>({name,role,enabled})),issues,readable};
 }
 async function load(){
  const {users,issues}=inspect(await read());
  if(issues.length)throw Error(`credentials.csv row ${issues[0].row} · ${issues[0].field}: ${issues[0].detail}`);
  return {users:await Promise.all(users.map(async ({pin,...user})=>{
   const {id,name,role,team}=user;
   return {...user,teams:role===`rep`?[]:team.split(`|`).map(value=>value.trim()).filter(Boolean),passwordHash:await hash(`${id}:${pin}`),authVersion:await hash(role===`rep`?`${id}:${name}:${pin}`:`${id}:${name}:${pin}:${role}:${team}`)};
  }))};
 }
 const valid=(user,session)=>!!user&&session?.authVersion===user.authVersion;
 window.Credentials={parse,load,audit,valid};
})();
