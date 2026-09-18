/* No install button. Native install prompt is requested on the first eligible
 * user gesture after beforeinstallprompt. Browsers control availability. */
'use strict';
let installEvent=null,installBusy=false;
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
window.addEventListener('beforeinstallprompt',event=>{
 event.preventDefault();if(standalone())return;installEvent=event;
 // Browser requires user activation; trigger from the next ordinary interaction.
});
async function tryInstall(event){
 if(!event.isTrusted||!installEvent||installBusy||standalone())return;
 let last=0;try{last=Number(localStorage.getItem('kk2-install-dismissed')||0);}catch(e){}
 if(Date.now()-last<7*86400000)return;
 installBusy=true;const prompt=installEvent;installEvent=null;
 try{await prompt.prompt();const result=await prompt.userChoice;if(result.outcome==='dismissed')try{localStorage.setItem('kk2-install-dismissed',String(Date.now()));}catch(e){}}
 catch(e){/* Wait for a new browser-provided event; an event can only prompt once. */}
 finally{installBusy=false;}
}
document.addEventListener('click',tryInstall,{capture:true});
document.addEventListener('keydown',event=>{if(event.key==='Enter')tryInstall(event);},{capture:true});
window.addEventListener('appinstalled',()=>{installEvent=null;});
if('serviceWorker' in navigator&&window.isSecureContext){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{if(typeof toast==='function')toast('Mode offline belum aktif. Periksa HTTPS dan file service worker.');}));}
