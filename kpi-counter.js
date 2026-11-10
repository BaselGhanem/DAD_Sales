(() => {
 const state=new WeakMap(),pending=new Map();let scheduled=false;
 const format=(value,digits)=>new Intl.NumberFormat(`en-US`,{minimumFractionDigits:0,maximumFractionDigits:0}).format(value);
 function flush(){
  scheduled=false;
  for(const card of document.querySelectorAll(`.kpis article`)){
   if(card.classList.contains(`premium-kpi`)||!card.getClientRects().length)continue;
   const height=card.getBoundingClientRect().height;
   if(height>0){card.style.height=`${height}px`;card.classList.add(`premium-kpi`)}
  }
  for(const [element,value] of pending){
   const previous=state.get(element)||{value:0,frame:0};cancelAnimationFrame(previous.frame);
   const digits=0;
   if(element.getClientRects().length){element.style.removeProperty(`font-size`);let size=parseFloat(getComputedStyle(element).fontSize);while(element.scrollWidth>element.clientWidth&&size>20){size--;element.style.setProperty(`font-size`,`${size}px`,`important`)}}
   if(!element.getClientRects().length){element.textContent=format(value,digits);state.set(element,{value:previous.value,frame:0});continue}
   if(matchMedia(`(prefers-reduced-motion: reduce)`).matches){element.textContent=format(value,digits);state.set(element,{value,frame:0});continue}
   const start=performance.now(),from=previous.value;
   const frame=now=>{const progress=Math.min(1,(now-start)/430),eased=1-Math.pow(1-progress,3),current=from+(value-from)*eased;element.textContent=format(progress===1?value:digits?current:Math.round(current),digits);const record={value:current,frame:0};if(progress<1)record.frame=requestAnimationFrame(frame);else record.value=value;state.set(element,record)};
   state.set(element,{value:from,frame:requestAnimationFrame(frame)});
  }
  pending.clear();
 }
 window.KpiCounter={set(id,value){const element=document.getElementById(id);if(!element||!Number.isFinite(value))return;pending.set(element,value);element.textContent=format(value,Number.isInteger(value)?0:2);if(!scheduled){scheduled=true;queueMicrotask(flush)}}};
})();
