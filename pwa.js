(() => {
let prompt;
const standalone = () => matchMedia(`(display-mode: standalone)`).matches || navigator.standalone;
const button = document.createElement(`button`);
button.type = `button`; button.className = `install-button`; button.textContent = `تثبيت التطبيق`; button.hidden = standalone();
const dialog = document.createElement(`dialog`); dialog.className = `install-dialog`; dialog.dir = `rtl`;
const title = document.createElement(`h2`); title.textContent = `تثبيت DAD Sales`;
const text = document.createElement(`p`);
const close = document.createElement(`button`); close.textContent = `تمام`; close.onclick = () => dialog.close();
dialog.append(title, text, close); document.body.append(button, dialog);
window.addEventListener(`beforeinstallprompt`, event => {event.preventDefault(); prompt = event; if(!standalone()) button.hidden = false;});
button.onclick = async () => {
 if(prompt){const current=prompt; prompt=null; await current.prompt(); const result=await current.userChoice; if(result.outcome===`accepted`)button.hidden=true; return;}
 text.textContent = /iPad|iPhone|iPod/.test(navigator.userAgent) ? `افتح الموقع في Safari، اضغط مشاركة ثم اضافة الى الشاشة الرئيسية` : `من قائمة المتصفح اختر تثبيت التطبيق او اضافة الى الشاشة الرئيسية، اذا لم يظهر الخيار انتظر اكتمال تحميل الصفحة ثم اعد المحاولة في Chrome او Edge`;
 dialog.showModal();
};
window.addEventListener(`appinstalled`,()=>{button.hidden=true;prompt=null});
if(`serviceWorker` in navigator) window.addEventListener(`load`,()=>navigator.serviceWorker.register(`./sw.js`).catch(()=>{}));
document.querySelectorAll(`.mobile-nav [data-section]`).forEach(item=>item.onclick=()=>{
 document.getElementById(item.dataset.section)?.scrollIntoView({behavior:matchMedia(`(prefers-reduced-motion: reduce)`).matches?`auto`:`smooth`,block:`start`});
 document.querySelectorAll(`.mobile-nav button`).forEach(b=>b.classList.toggle(`active`,b===item));
});
})();