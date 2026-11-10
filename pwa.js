(() => {
let prompt;
const standalone = () => matchMedia(`(display-mode: standalone)`).matches || navigator.standalone;
const button = document.createElement(`button`);
button.type = `button`; button.className = `install-button`; button.textContent = `Install app`; button.hidden = standalone();
const dialog = document.createElement(`dialog`); dialog.className = `install-dialog`; dialog.dir = `ltr`;
const title = document.createElement(`h2`); title.textContent = `Install DAD Sales`;
const text = document.createElement(`p`);
const close = document.createElement(`button`); close.textContent = `Done`; close.onclick = () => dialog.close();
dialog.append(title, text, close); document.body.append(button, dialog);
window.addEventListener(`beforeinstallprompt`, event => {event.preventDefault(); prompt = event; if(!standalone()) button.hidden = false;});
button.onclick = async () => {
 if(prompt){const current=prompt; prompt=null; await current.prompt(); const result=await current.userChoice; if(result.outcome===`accepted`)button.hidden=true; return;}
 text.textContent = /iPad|iPhone|iPod/.test(navigator.userAgent) ? `Open this website in Safari, tap Share, then Add to Home Screen.` : `From your browser menu, select Install app or Add to Home Screen. If unavailable, allow the page to finish loading, then try again in Chrome or Edge`;
 dialog.showModal();
};
window.addEventListener(`appinstalled`,()=>{button.hidden=true;prompt=null});
if(`serviceWorker` in navigator){
 const controlledAtStart=!!navigator.serviceWorker.controller;let refreshing=false;
 navigator.serviceWorker.addEventListener(`controllerchange`,()=>{if(controlledAtStart&&!refreshing){refreshing=true;location.reload()}});
 const register=()=>navigator.serviceWorker.register(`./sw.js`,{updateViaCache:`none`}).then(registration=>registration.update()).catch(()=>{});
 if(document.readyState===`complete`)register();else window.addEventListener(`load`,register,{once:true});
}
document.querySelectorAll(`.mobile-nav [data-section]`).forEach(item=>item.onclick=()=>{
 document.getElementById(item.dataset.section)?.scrollIntoView({behavior:matchMedia(`(prefers-reduced-motion: reduce)`).matches?`auto`:`smooth`,block:`start`});
 document.querySelectorAll(`.mobile-nav button`).forEach(b=>b.classList.toggle(`active`,b===item));
});
})();