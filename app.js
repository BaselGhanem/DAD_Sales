(() => {
  const $ = id => document.getElementById(id);
  const SESSION_KEY = `dad_sales_session_v1`;
  const TITLES = {rep:`دخول المندوب الطبي`,supervisor:`دخول المشرف`,chronic:`Business Unit Chronic`,[`anti-infective`]:`Business Unit Anti Infective`};
  let config; let role = ``; let trigger; let busy = false;
  const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest(`SHA-256`,new TextEncoder().encode(value)))).map(v=>v.toString(16).padStart(2,`0`)).join(``);
  const normalizePIN = value => value.replace(/[٠-٩]/g,c=>`${c.charCodeAt(0)-1632}`).replace(/[۰-۹]/g,c=>`${c.charCodeAt(0)-1776}`);
  const storage = {get(key){try{return localStorage.getItem(key)||sessionStorage.getItem(key)}catch{return null}},clear(){try{localStorage.removeItem(SESSION_KEY);sessionStorage.removeItem(SESSION_KEY)}catch{}},save(value,remember){try{this.clear();(remember?localStorage:sessionStorage).setItem(SESSION_KEY,JSON.stringify(value));return true}catch{return false}}};
  const view = id => { for(const key of [`roles`,`auth`,`success`]) $(key).hidden=key!==id; };
  const showSuccess = user => {view(`success`); $(`welcome`).textContent=`اهلا ${user.name}`; $(`welcome`).tabIndex=-1;$(`welcome`).focus();};
  const available = () => config?.users.filter(user=>user.enabled && user.role===role) || [];
  const populate = () => {
    const select=$(`username`);select.replaceChildren(new Option(`اختر اسمك`,``));
    for(const user of available()) select.add(new Option(user.name,user.id));
    const enabled=available().length>0;
    select.disabled=!enabled;$(`password`).disabled=!enabled;$(`submit`).disabled=!enabled;
    $(`message`).textContent=!config?`تعذر تحميل الحسابات، حدث الصفحة للمحاولة مجددا`:!enabled?`حسابات هذا الدور غير مفعلة حاليا`:``;
  };
  document.querySelectorAll(`[data-role]`).forEach(button=>button.addEventListener(`click`,()=>{
    trigger=button;role=button.dataset.role;$(`login`).reset();$(`password`).type=`password`;$(`toggle`).textContent=`اظهار`;$(`toggle`).setAttribute(`aria-pressed`,`false`);
    $(`auth-title`).textContent=TITLES[role];populate();view(`auth`);$(`back`).focus();
  }));
  $(`back`).addEventListener(`click`,()=>{view(`roles`);$(`login`).reset();trigger?.focus()});
  $(`toggle`).addEventListener(`click`,()=>{const visible=$(`password`).type===`password`;$(`password`).type=visible?`text`:`password`;$(`toggle`).textContent=visible?`اخفاء`:`اظهار`;$(`toggle`).setAttribute(`aria-pressed`,`${visible}`);$(`toggle`).setAttribute(`aria-label`,visible?`اخفاء كلمة المرور`:`اظهار كلمة المرور`)});
  $(`login`).addEventListener(`submit`,async event=>{
    event.preventDefault();if(busy)return;busy=true;$(`submit`).disabled=true;$(`submit`).textContent=`جاري التحقق`;$(`message`).textContent=``;
    try{
      const user=available().find(u=>u.id===$(`username`).value);const pin=normalizePIN($(`password`).value);
      if(!user || !/^\d{4}$/.test(pin) || await hash(`${user.id}:${pin}`)!==user.passwordHash){$(`message`).textContent=`اسم المستخدم او كلمة المرور غير صحيحة`;$(`password`).value=``;$(`password`).focus();return;}
      const session={id:user.id,role:user.role,savedAt:Date.now(),expiresAt:Date.now()+($(`remember`).checked?30:1)*86400000};
      if(!storage.save(session,$(`remember`).checked)){$(`message`).textContent=`يرجى السماح بالتخزين في المتصفح للمتابعة`;return;}
      $(`password`).value=``;showSuccess(user);
    }catch{$(`message`).textContent=`تعذر تسجيل الدخول، يرجى المحاولة مجددا`}
    finally{busy=false;$(`submit`).disabled=available().length===0;$(`submit`).textContent=`تسجيل الدخول`}
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
    try{const response=await fetch(`accounts.json`,{cache:`no-store`});if(!response.ok)throw Error(`accounts`);config=await response.json();if(!Array.isArray(config.users))throw Error(`schema`);
      const value=storage.get(SESSION_KEY);if(value){try{const session=JSON.parse(value);const user=config.users.find(u=>u.enabled&&u.id===session.id&&u.role===session.role);if(user&&Number.isFinite(session.expiresAt)&&session.expiresAt>Date.now()&&session.savedAt<=Date.now())showSuccess(user);else storage.clear()}catch{storage.clear()}}
    }catch{config=null;}
    finally{await finishLoading();}
  }
  init();
})();
