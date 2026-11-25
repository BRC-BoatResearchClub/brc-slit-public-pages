/* BRC V34.4: hide all legacy and snapshot panels until expanded; keep V32 overview and V29 freshness */
(()=>{'use strict';
const root=document.getElementById('brc-v32'),rows=document.getElementById('v32-rows'),period=document.getElementById('v32-period'),view=document.getElementById('v32-view');
if(!root||!rows||!period||!view||document.getElementById('brc-v34-card-view'))return;
const scroller=root.querySelector('.v32-scroll');if(!scroller)return;
const style=document.createElement('style');style.textContent=
'#brc-v32 .v34-switch{display:none;align-items:center;gap:6px;margin:12px 0}'+
'#brc-v32 .v34-switch button{border:1px solid #b5c9d9;background:#fff;border-radius:7px;padding:9px 14px;font-size:13px;min-height:42px;cursor:pointer}'+
'#brc-v32 .v34-switch button[aria-pressed="true"]{background:#204c73;color:white;border-color:#204c73;font-weight:700}'+
'#brc-v32 #brc-v34-card-view{display:none;gap:12px;margin:8px 0}'+
'#brc-v32 .v34-card{border:1px solid #d7e4ef;background:#fff;border-radius:11px;padding:12px;box-shadow:0 1px 2px #203e5b10}'+
'#brc-v32 .v34-card-head{display:flex;align-items:center;gap:9px;font-size:15px;font-weight:750}'+
'#brc-v32 .v34-lane{font-weight:800;width:27px;height:27px;display:inline-flex;align-items:center;justify-content:center;border:1px solid #0002;border-radius:5px;flex-shrink:0}'+
'#brc-v32 .v34-counts{display:flex;gap:8px;flex-wrap:wrap;margin:9px 0;color:#385672;font-size:12px}'+
'#brc-v32 .v34-counts span{padding:4px 8px;border-radius:5px;background:#edf4f9}'+
'#brc-v32 .v34-rates{width:100%;min-width:0!important;border-collapse:collapse;font-size:13px;table-layout:fixed}'+
'#brc-v32 .v34-rates th:first-child{position:static!important;min-width:0!important;background:transparent!important}'+
'#brc-v32 .v34-rates th,#brc-v32 .v34-rates td{text-align:right;border-top:1px solid #e7edf3;padding:6px 5px;white-space:nowrap}'+
'#brc-v32 .v34-rates th:first-child{text-align:left;color:#526a80;font-weight:500}'+
'#brc-v32 .v34-rates thead th{font-size:11px;color:#48627a}'+
'#brc-v32 .v34-rates .v34-first td{font-weight:750;font-size:16px;color:#143a5c}'+
'#brc-v32 .v34-note{font-size:12px;color:#536b7e;line-height:1.65;margin:10px 0}'+
'#brc-v32 .v34-loading{grid-column:1/-1;padding:15px;border:1px dashed #bdccdb;border-radius:7px;color:#536779;text-align:center}'+
'@media(max-width:760px){#brc-v32 .v34-switch{display:flex}#brc-v32:not(.v34-table-active) .v32-scroll{display:none!important}#brc-v32:not(.v34-table-active) #brc-v34-card-view{display:grid;grid-template-columns:1fr}#brc-v32:not(.v34-table-active) .v32-controls label:nth-child(2){display:none}#brc-v32 .v32-controls{display:flex;flex-wrap:wrap;gap:10px}#brc-v32 .v32-controls select{width:100%;max-width:100%}}'+
'@media(min-width:520px) and (max-width:760px){#brc-v32:not(.v34-table-active) #brc-v34-card-view{grid-template-columns:minmax(0,1fr)}}'+
'#brc-v32 .v34-card{padding:0;overflow:hidden}'+
'#brc-v32 .v34-card summary{list-style:none;cursor:pointer;display:grid;grid-template-columns:26px minmax(0,1fr) 63px 63px;align-items:center;gap:6px;padding:13px 9px}'+
'#brc-v32 .v34-card summary::-webkit-details-marker{display:none}'+
'#brc-v32 .v34-card summary:focus-visible{outline:2px solid #1969a5}'+
'#brc-v32 .v34-card .v34-card-head{font-size:13px}'+
'#brc-v32 .v34-player-name{min-width:0;overflow:hidden;text-overflow:ellipsis}'+
'#brc-v32 .v34-rate{font-size:15px;font-weight:750;color:#173b5d;text-align:right}'+
'#brc-v32 .v34-counts{padding:4px 10px 0}'+
'#brc-v32 .v34-compact-hdr{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1fr) 63px 63px;gap:6px;padding:0 9px;font-size:11px;font-weight:700;color:#4e677d}'+
'#brc-v32 .v34-compact-hdr span:not(:first-child){text-align:right}'+
'#brc-v32 .v34-card .v34-rates{border-top:1px solid #dfe8f1}'+
'@media(max-width:760px){body:not(.brc-v34-old-open) #brc-periods-v28,body:not(.brc-v34-old-open) #brc-v24-players,body:not(.brc-v34-old-open) #brc-v26,body:not(.brc-v34-old-open) #brc-v23-history,body:not(.brc-v34-old-open) #v25,body:not(.brc-v34-old-open) #brc-v28-status{display:none!important}#brc-v32 .v34-old-toggle{display:block!important}}'+
'#brc-v32 .v34-old-toggle{display:none;margin:12px 0 4px;min-height:42px;width:100%;text-align:center;border:1px solid #b4cadc;background:#f3f8fc;color:#17496f;border-radius:7px;font-weight:700;padding:10px;cursor:pointer}'+
'#brc-v32 .v34-choose-venue{display:inline-flex;min-height:40px;align-items:center;justify-content:center;margin:9px auto 0;padding:6px 14px;border:1px solid #adc3d6;background:#fff;color:#17496f;border-radius:7px;cursor:pointer}';
document.head.append(style);
const title=root.querySelector('h2');if(title)title.textContent='V34.4｜6選手の1着率一覧・詳細比較';
const toggle=document.createElement('div');toggle.className='v34-switch';toggle.setAttribute('role','group');toggle.setAttribute('aria-label','表示形式');
const cardBtn=document.createElement('button'),tableBtn=document.createElement('button');cardBtn.type=tableBtn.type='button';cardBtn.textContent='6選手一覧';tableBtn.textContent='表';toggle.append(cardBtn,tableBtn);root.insertBefore(toggle,scroller);
const cards=document.createElement('div');cards.id='brc-v34-card-view';cards.setAttribute('aria-label','6選手の全国・当地着率');scroller.after(cards);
const explain=document.createElement('p');explain.className='v34-note';explain.textContent='選手名の行をタップすると2・3着率と3連対率を開けます。2026年11月24日までの確定済み過去成績です。事前1着率・予測値は非公開データのため、この公開ページには含めません。全国・当地とも、枠番と同じ番号の過去の実進入コース成績です。';cards.after(explain);
let mode='cards',digest='';const metrics=['1着率','2着率','3着率','3連対率'];
function textNode(tag,cls,value){const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=value;return el;}
function setMode(next){mode=next;root.classList.toggle('v34-table-active',mode==='table');cardBtn.setAttribute('aria-pressed',String(mode==='cards'));tableBtn.setAttribute('aria-pressed',String(mode==='table'));if(mode==='cards'&&view.value!=='all'){view.value='all';view.dispatchEvent(new Event('change',{bubbles:true}));}update();}
cardBtn.addEventListener('click',()=>setMode('cards'));tableBtn.addEventListener('click',()=>setMode('table'));
function makeCard(x){
 const article=document.createElement('details');article.className='v34-card';const head=textNode('summary','v34-card-head',''),lane=textNode('span','v34-lane',x.lane);
 const colors=['#ffffff','#161c26','#d40028','#0473c2','#ffe000','#008d4a'],n=Number(x.lane);
 if(n>=1&&n<=6){lane.style.background=colors[n-1];lane.style.color=[2,3,4,6].includes(n)?'#fff':'#172433';}
 head.append(lane,textNode('span','v34-player-name',x.name),textNode('span','v34-rate',x.nat[0]),textNode('span','v34-rate',x.loc[0]));article.append(head);
 const counts=textNode('div','v34-counts','');counts.append(textNode('span','','全国 '+x.n+'走'),textNode('span','','当地 '+x.localN+'走'));article.append(counts);
 const table=document.createElement('table');table.className='v34-rates';const thead=document.createElement('thead'),h=document.createElement('tr');
 ['','全国','当地'].forEach(v=>h.append(textNode('th','',v)));thead.append(h);table.append(thead);
 const tbody=document.createElement('tbody');
 metrics.forEach((label,i)=>{const tr=document.createElement('tr');if(i===0)tr.className='v34-first';tr.append(textNode('th','',label),textNode('td','',x.nat[i]),textNode('td','',x.loc[i]));tbody.append(tr);});
 table.append(tbody);article.append(table);return article;
}
function update(){
 if(mode==='table')return;
 const rowsData=[...rows.querySelectorAll('tr')].map(tr=>[...tr.querySelectorAll('td')]);const data=[];
 for(const cells of rowsData){if(cells.length!==11)continue;
 const lane=cells[0].querySelector('.lane')?.textContent.trim()||'';
 const name=cells[0].textContent.replace(/^\s*[1-6]\s*/,'').trim();
 data.push({lane,name,n:cells[1].textContent.trim(),nat:cells.slice(2,6).map(e=>e.textContent.trim()),localN:cells[6].textContent.trim(),loc:cells.slice(7,11).map(e=>e.textContent.trim())});
 }
 const selected=document.getElementById('venue');
 const venueName=selected?.selectedOptions[0]?.textContent?.trim()||'選択した会場';
 const detail=document.getElementById('details');
 const status=detail?.textContent||'';
 const notFound=/取得できませんでした|出走表がありません|非開催|開催していません/.test(status);
 const signature=JSON.stringify([data,venueName,notFound]);
 if(signature===digest)return;digest=signature;cards.replaceChildren();
 if(data.length===6){const hdr=textNode('div','v34-compact-hdr','');['選手','全国1着','当地1着'].forEach(x=>hdr.append(textNode('span','',x)));cards.append(hdr);data.forEach(x=>cards.append(makeCard(x)));return;}
 const empty=textNode('div','v34-loading','');
 empty.append(textNode('p','',notFound?venueName+'：出走表がありません。開催中の会場を選択してください。':'選手の出走表を確認中です。6艇揃うと比較カードを表示します。'));
 const venueList=document.getElementById('venues');
 if(venueList){
  const button=textNode('button','v34-choose-venue','会場一覧から選ぶ');
  button.type='button';
  button.addEventListener('click',()=>venueList.scrollIntoView({behavior:'smooth',block:'center'}));
  empty.append(button);
 }
 cards.append(empty);
}
new MutationObserver(update).observe(rows,{subtree:true,childList:true,characterData:true});
const raceDetails=document.getElementById('details');
if(raceDetails)new MutationObserver(update).observe(raceDetails,{subtree:true,childList:true,characterData:true});
document.getElementById('venue')?.addEventListener('change',()=>{digest='';update()});
view.addEventListener('change',()=>{digest='';update()});period.addEventListener('change',()=>{digest='';update()});
const legacy=document.createElement('button');legacy.type='button';legacy.className='v34-old-toggle';
legacy.textContent='詳細分析・過去の集計を表示';legacy.setAttribute('aria-expanded','false');
legacy.addEventListener('click',()=>{const open=document.body.classList.toggle('brc-v34-old-open');legacy.setAttribute('aria-expanded',String(open));legacy.textContent=open?'詳細分析・過去の集計を閉じる':'詳細分析・過去の集計を表示';});
root.append(legacy);
setMode('cards');update();
})();