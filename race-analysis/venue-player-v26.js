/* BRC V26: venue-specific, actual-entry-course historical counts. Non-predictive snapshot. */
(()=>{'use strict';
const main=document.querySelector('main'),details=document.getElementById('details'),date=document.getElementById('date'),venue=document.getElementById('venue');
if(!main||!details||!date||!venue||document.getElementById('brc-v26'))return;
const section=document.createElement('section');section.id='brc-v26';
section.innerHTML='<h2>V26｜当日6選手の当地・進入コース別着率</h2><p class="small">全国24会場を対象に、<strong>その会場で実際に進入したコース</strong>ごとの過去成績を登録番号で照合します。集計期間：2025年11月17日〜2026年11月16日。予測・当日成績ではありません。</p><p id="v26-status" role="status" aria-live="polite">当地コース別成績を読み込み中…</p><div id="v26-list"></div><button id="v26-csv" type="button" disabled>6選手・当地36コース行をCSV保存</button><p class="small">出走20回未満の数値は少数標本の参考値です。出走0回は「履歴なし」として0%と区別します。過去開催日（2026年11月16日以前）では未来情報混入を防ぐため非表示です。<strong>保存済みデータは毎日自動更新されません。</strong></p>';
const anchor=document.getElementById('brc-v23-history')||main.querySelector('footer');if(anchor)main.insertBefore(section,anchor);else main.append(section);
const list=document.getElementById('v26-list'),status=document.getElementById('v26-status'),csv=document.getElementById('v26-csv');
let byVenue=null,out=[],pending=false,lastKey='';
const pct=(a,n)=>n?(100*a/n).toFixed(1)+'%':'—';
const clear=msg=>{list.replaceChildren();csv.disabled=true;out=[];status.textContent=msg;lastKey='';};
function current(){const r=[];for(const tr of details.querySelectorAll('table tbody tr')){
const cells=tr.querySelectorAll('td'),lane=Number(cells[0]?.textContent.trim()),m=cells[1]?.textContent.trim().match(/\((\d{4,5})\)\s*$/);
if(Number.isInteger(lane)&&lane>=1&&lane<=6&&m)r.push({lane,pid:Number(m[1]),name:cells[1].textContent.trim()});}return r;}
function render(){if(!byVenue)return;
if(pending){clear('出走表の更新を確認しています…');return;}
if(date.value<='2026-11-16'){clear('選択日より後の結果を含むため、この開催日の当地成績は表示しません。');return;}
const v=Number(venue.value),racers=current();
if(!Number.isInteger(v)||v<1||v>24||racers.length!==6||new Set(racers.map(r=>r.pid)).size!==6){clear('公開出走表が6艇分そろうと、当地コース別成績を表示します。');return;}
const key=String(v)+'/'+date.value+'/'+racers.map(r=>r.lane+':'+r.pid).join(',');if(key===lastKey)return;
lastKey=key;list.replaceChildren();out=[];let found=0,small=0;
for(const p of racers){const c=byVenue.get(v)?.get(p.pid);if(c)found++;
const d=document.createElement('details');d.open=p.lane===1;
const sum=document.createElement('summary');sum.textContent=p.lane+'号艇 '+p.name+(c?'':' （当地履歴なし）');d.append(sum);
const scroll=document.createElement('div');scroll.style.overflowX='auto';const table=document.createElement('table');table.style.minWidth='550px';table.style.width='100%';const head=document.createElement('tr');
for(const h of ['進入','出走数','1着率','2着率','3着率','3連対率']){const th=document.createElement('th');th.textContent=h;head.append(th)}table.append(head);
for(let i=0;i<6;i++){const [n,a,b,e]=c?.[i]||[0,0,0,0];if(n>0&&n<20)small++;
const cells=[String(i+1)+'コース',n?n.toLocaleString('ja-JP')+(n<20?' ※':''):'履歴なし',pct(a,n),pct(b,n),pct(e,n),pct(a+b+e,n)];
const tr=document.createElement('tr');for(const text of cells){const td=document.createElement('td');td.textContent=text;td.style.padding='8px';td.style.borderBottom='1px solid #e1ebf2';tr.append(td)}table.append(tr);
out.push([p.lane,p.pid,p.name,v,i+1,n,a,b,e,pct(a,n),pct(b,n),pct(e,n),pct(a+b+e,n)]);}
scroll.append(table);d.append(scroll);d.style.margin='10px 0';list.append(d)}
csv.disabled=false;status.textContent='当地の記録がある選手 '+found+'/6人。選手をタップすると進入6コースの着率が開きます。'+(small?'（※は少数標本）':'');}
new MutationObserver(()=>{if(pending)pending=false;render()}).observe(details,{childList:true,subtree:true});
venue.addEventListener('change',()=>{lastKey='';render()});
date.addEventListener('change',()=>{pending=true;clear('出走表を更新中…')});
document.getElementById('reload')?.addEventListener('click',()=>{pending=true;clear('出走表を更新中…')});
csv.onclick=()=>{if(csv.disabled||out.length!==36)return;
const header=['枠','登録番号','選手','会場番号','進入コース','出走数','1着数','2着数','3着数','1着率','2着率','3着率','3連対率'];
const quote=x=>{let s=String(x??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
const data='\uFEFF'+[header,...out].map(r=>r.map(quote).join(',')).join('\r\n');
const url=URL.createObjectURL(new Blob([data],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='BRC_V26_当地コース別着率_20261116.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);};
(async()=>{try{
const r=await fetch('./player-venue-courses-v26.b64',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);
const text=(await r.text()).trim();if(!/^[A-Za-z0-9+/]+={0,2}$/.test(text)||!('DecompressionStream' in window))throw Error('保存データの形式未対応');
const packed=Uint8Array.from(atob(text),c=>c.charCodeAt(0));const raw=new Uint8Array(await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
if(raw.length!==640638||String.fromCharCode(...raw.slice(0,4))!=='BR26')throw Error('形式検証に失敗');
const hash=await crypto.subtle.digest('SHA-256',raw),hex=Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
if(hex!=='75d2c8996c4d2e02678745d9d65f6e52b6e077bddc5e0985628e213856593a2b')throw Error('データの整合性が一致しません');
const pairs=raw[4]+raw[5]*256,count=raw[6]+raw[7]*256+raw[8]*65536+raw[9]*16777216;if(pairs!==24914||count!==335062)throw Error('レコード数が一致しません');
let offset=10,total=0,recorded=0,lastV=0,lastPid=0;const venueMap=new Map();
function variable(){let n=0,s=0;for(;;){if(offset>=raw.length||s>28)throw Error('データ破損');const b=raw[offset++];n|=(b&127)<<s;if(b<128)return n;s+=7;}}
for(let i=0;i<pairs;i++){if(offset+4>raw.length)throw Error('選手情報破損');const v=raw[offset++],pid=raw[offset++]+raw[offset++]*256,mask=raw[offset++];
if(v<1||v>24||(v<lastV||v===lastV&&pid<=lastPid)||mask<1||mask>63)throw Error('登録番号・会場番号の不一致');lastV=v;lastPid=pid;
const courses=Array.from({length:6},()=>[0,0,0,0]);for(let j=0;j<6;j++){if(mask&(1<<j)){const item=[variable(),variable(),variable(),variable()];if(item[0]<1||item[1]+item[2]+item[3]>item[0])throw Error('出走数と着順の矛盾');courses[j]=item;total+=item[0];recorded++;}}
if(!venueMap.has(v))venueMap.set(v,new Map());venueMap.get(v).set(pid,courses)}
if(offset!==raw.length||total!==335062||recorded!==135243||venueMap.size!==24)throw Error('合計照合に失敗');
byVenue=venueMap;render();
}catch(e){clear('当地コース別成績は現在読み込めません。既存のV24・V25の分析は引き続き利用できます。');console.warn('BRC V26',e);}})();
})();