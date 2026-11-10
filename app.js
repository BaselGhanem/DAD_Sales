(() => {
  const $ = id => document.getElementById(id);
  const SESSION_KEY = `dad_sales_session_v1`;
  const TITLES = {rep:`Representative sign in`,supervisor:`Supervisor sign in`,chronic:`Business Unit Chronic`,[`anti-infective`]:`Business Unit Anti Infective`};
  let config; let role = ``; let trigger; let busy = false;
  const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest(`SHA-256`,new TextEncoder().encode(value)))).map(v=>v.toString(16).padStart(2,`0`)).join(``);
  const normalizePIN = value => value.replace(/[\u0660-\u0669]/g,c=>`${c.charCodeAt(0)-1632}`).replace(/[\u06f0-\u06f9]/g,c=>`${c.charCodeAt(0)-1776}`);
  const storage = {get(key){try{return localStorage.getItem(key)||sessionStorage.getItem(key)}catch{return null}},clear(){try{localStorage.removeItem(SESSION_KEY);sessionStorage.removeItem(SESSION_KEY)}catch{}},save(value,remember){try{this.clear();(remember?localStorage:sessionStorage).setItem(SESSION_KEY,JSON.stringify(value));return true}catch{return false}}};
  const view = id => { for(const key of [`roles`,`auth`,`success`]) $(key).hidden=key!==id; };
  const showSuccess = user => {if(user.role===`chronic`||user.role===`anti-infective`){window.location.replace(user.role===`chronic`?`business-unit-chronic.html`:`business-unit-anti-infective.html`);return;}if(user.role === `supervisor`){window.location.replace(`supervisor.html`);return;}if(user.role === `rep`){window.location.replace(`representative.html`);return;}view(`success`); $(`welcome`).textContent=`Welcome ${user.name}`; $(`welcome`).tabIndex=-1;$(`welcome`).focus();};
  const passwordOnly = () => [`chronic`,`anti-infective`].includes(role);
  const available = () => config?.users.filter(user=>user.enabled && user.role===role) || [];
  const syncUsername = () => { $(`credentialUsername`).value = $(`username`).value; };
  $(`username`).addEventListener(`change`, syncUsername);
  for(const event of [`input`,`change`])$(`credentialUsername`).addEventListener(event,()=>{const value=$(`credentialUsername`).value;if([...$(`username`).options].some(option=>option.value===value))$(`username`).value=value;});

  const populate = () => {
    const select=$(`username`);select.replaceChildren(new Option(`Select your name`,``));
    for(const user of available()) select.add(new Option(user.role===`supervisor`?`${user.name} — ${user.team}`:user.name,user.id));
    const unit=passwordOnly();const accounts=available();const enabled=unit?accounts.length===1:accounts.length>0;
    select.hidden=unit;select.required=!unit;document.querySelector(`label[for="username"]`).hidden=unit;
    if(unit&&enabled)select.value=accounts[0].id;
    syncUsername();select.disabled=!enabled;$(`password`).disabled=!enabled;$(`submit`).disabled=!enabled;
    $(`message`).textContent=!config?`Unable to load accounts. Refresh to try again.`:!enabled?`Accounts for this role are not available yet.`:``;
  };
  document.querySelectorAll(`[data-role]`).forEach(button=>button.addEventListener(`click`,()=>{
    trigger=button;role=button.dataset.role;$(`login`).reset();$(`password`).type=`password`;$(`toggle`).textContent=`Show`;$(`toggle`).setAttribute(`aria-pressed`,`false`);
    $(`auth-title`).textContent=TITLES[role];populate();view(`auth`);if(passwordOnly()&&!$(`password`).disabled)$(`password`).focus();else $(`back`).focus();
  }));
  $(`back`).addEventListener(`click`,()=>{view(`roles`);$(`login`).reset();trigger?.focus()});
  $(`toggle`).addEventListener(`click`,()=>{const visible=$(`password`).type===`password`;$(`password`).type=visible?`text`:`password`;$(`toggle`).textContent=visible?`Hide`:`Show`;$(`toggle`).setAttribute(`aria-pressed`,`${visible}`);$(`toggle`).setAttribute(`aria-label`,visible?`Hide password`:`Show password`)});
  $(`login`).addEventListener(`submit`,async event=>{
    event.preventDefault();if(busy)return;busy=true;$(`submit`).disabled=true;$(`submit`).textContent=`Signing in...`;$(`message`).textContent=``;
    try{
      const chosen=$(`username`).value;config=await Credentials.load();const accounts=available();const user=passwordOnly()?(accounts.length===1?accounts[0]:null):accounts.find(u=>u.id===chosen);if(passwordOnly()&&user)$(`username`).value=user.id;syncUsername();const pin=normalizePIN($(`password`).value);
      if(!user || !/^\d{4}$/.test(pin) || await hash(`${user.id}:${pin}`)!==user.passwordHash){$(`message`).textContent=passwordOnly()?`Incorrect password.`:`Incorrect username or password.`;$(`password`).value=``;$(`password`).focus();return;}
      const session={id:user.id,role:user.role,authVersion:user.authVersion,savedAt:Date.now(),expiresAt:Date.now()+($(`remember`).checked?30:1)*86400000};
      if(!storage.save(session,$(`remember`).checked)){$(`message`).textContent=`Allow browser storage to continue.`;return;}
      $(`password`).value=``;showSuccess(user);
    }catch{$(`message`).textContent=`Unable to sign in. Please try again.`}
    finally{busy=false;$(`submit`).disabled=passwordOnly()?available().length!==1:available().length===0;$(`submit`).textContent=`Sign in`}
  });
  $(`logout`).addEventListener(`click`,()=>{storage.clear();view(`roles`);document.querySelector(`[data-role]`).focus()});
  const loaderStarted = performance.now();
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function finishLoading(){
    await wait(Math.max(0, 900 - (performance.now() - loaderStarted)));
    const loader = $(`loader`);
    $(`app`).inert = false;
    document.body.classList.add(`app-ready`);
    loader.classList.add(`out`);
    await wait(matchMedia(`(prefers-reduced-motion: reduce)`).matches ? 0 : 380);
    loader.hidden = true;
  }
  async function init(){
    try{config=await Credentials.load();
      const value=storage.get(SESSION_KEY);if(value){try{const session=JSON.parse(value);const user=config.users.find(u=>u.enabled&&u.id===session.id&&u.role===session.role);if(Credentials.valid(user,session)&&Number.isFinite(session.expiresAt)&&session.expiresAt>Date.now()&&session.savedAt<=Date.now())showSuccess(user);else storage.clear()}catch{storage.clear()}}
    }catch{config=null;}
    finally{await finishLoading();}
  }
  init();
  setInterval(async()=>{if(document.hidden||busy)return;try{const selected=$(`username`).value;config=await Credentials.load();if(role){populate();if(available().some(u=>u.id===selected))$(`username`).value=selected;syncUsername()}}catch{}},600000);
})();
