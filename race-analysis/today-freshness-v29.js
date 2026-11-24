/* BRC V29 - date and freshness watchdog for the public non-official race-program API. */
(()=>{'use strict';
const date=document.getElementById('date'),reload=document.getElementById('reload'),updated=document.getElementById('updated'),status=document.getElementById('status'),main=document.querySelector('main');
if(!date||!reload||!updated||!status||!main||document.getElementById('brc-today-freshness-v29'))return;
const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const t=()=>new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
const explicit=new URLSearchParams(location.search).has('date');let manuallySelected=explicit,requestAt=0,lastDate='',lastStatus='';
const panel=document.createElement('section');panel.id='brc-today-freshness-v29';
panel.innerHTML='<h2>当日の出走表・更新確認</h2><p id="brc-today-check" role="status" aria-live="polite">出走表の取得状況を確認中…</p><p class="small">出走表は非公式公開APIから取得します。過去の選手成績（V24〜V28）は別データであり、最終集計日は2026年11月16日です。出走表が取得できないときは公式サイトで確認してください。</p>';
const css=document.createElement('style');css.textContent='#brc-today-freshness-v29{border-top:3px solid #4679a1}#brc-today-check{background:#f1f5fa;border-radius:6px;padding:10px;line-height:1.6}';document.head.append(css);
const anchor=document.getElementById('brc-periods-v28')||document.getElementById('brc-v28-status')||main.querySelector('footer');if(anchor)main.insertBefore(panel,anchor);else main.append(panel);
const output=document.getElementById('brc-today-check');
date.addEventListener('change',()=>{manuallySelected=true;update();});
function update(){
 const now=today(),chosen=date.value,printed=updated.textContent||'',msg=status.textContent||'';
 const accepted=printed.startsWith('取得時刻：')&&!msg.includes('取得できません')&&!msg.includes('取得しています');
 const age=requestAt?Math.round((Date.now()-requestAt)/60000):null;
 const pieces=['本日：'+now,'出走表の選択日：'+(chosen||'未設定')];
 if(chosen!==now)pieces.push('現在は当日以外を選択中');
 if(msg.includes('取得できません')||printed.includes('取得失敗'))pieces.push('公開APIの取得失敗。最新情報は公式出走表で確認');
 else if(accepted){pieces.push('公開API取得済み：'+printed.replace('取得時刻：',''));if(age!==null&&age>=20)pieces.push('再取得の確認が必要');}
 else pieces.push('公開APIからの取得を確認中');
 output.textContent=pieces.join(' ／ ');lastDate=chosen;lastStatus=printed;
}
function resume(){
 const now=today();date.max=now;
 if(!manuallySelected&&date.value!==now){
   date.value=now;
   // Explicitly trigger the original V22 date-loading callback, not a second API client.
   date.dispatchEvent(new Event('change',{bubbles:true}));
   manuallySelected=false;
   requestAt=Date.now();
   output.textContent='JSTの新しい開催日 '+now+' へ切替。公開APIを再取得中…';
   return;
 }
 if(date.value===now&&!reload.disabled){
   const stamp=updated.textContent||'';
   if((stamp!==lastStatus||date.value!==lastDate)||Date.now()-requestAt>5*60*1000){
     requestAt=Date.now();reload.click();
   }
 }
 update();
}
const observer=new MutationObserver(()=>{update();});observer.observe(status,{subtree:true,childList:true,characterData:true});observer.observe(updated,{subtree:true,childList:true,characterData:true});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')resume();});
window.addEventListener('pageshow',e=>{if(e.persisted)resume();});
window.addEventListener('focus',resume);
setInterval(()=>{if(document.visibilityState==='visible')resume()},60000);
update();
})();