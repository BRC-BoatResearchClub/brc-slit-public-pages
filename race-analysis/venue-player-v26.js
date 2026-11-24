/* BRC V26: venue-specific, actual-entry-course historical counts. Non-predictive snapshot. */
(()=>{'use strict';
const main=document.querySelector('main'),details=document.getElementById('details'),date=document.getElementById('date'),venue=document.getElementById('venue');
if(!main||!details||!date||!venue||document.getElementById('brc-v26'))return;
const section=document.createElement('section');section.id='brc-v26';
section.innerHTML='<h2>V27｜当地の記録確認・6選手の進入コース別着率</h2><p class="small">全国24会場を対象に、<strong>その会場で実際に進入したコース</strong>ごとの過去成績を登録番号で照合します。集計期間：2025年11月17日〜2026年11月16日。予測・当日成績ではありません。</p><p id="v26-status" role="status" aria-live="polite">当地コース別成績を読み込み中…</p><p id="v27-verify" class="small" role="status">V25全国データとの独立照合：準備中</p><div id="v26-list"></div><button id="v26-csv" type="button" disabled>6選手・当地36コース行をCSV保存</button><p class="small">出走20回未満の数値は少数標本の参考値です。各コース出走0回は「当該コース0走」、選手の当地出走が0回なら「当地0走」と表示します。全国出走数とは区別します。過去開催日（2026年11月16日以前）では未来情報混入を防ぐため非表示です。<strong>保存済みデータは毎日自動更新されません。</strong></p>';
const anchor=document.getElementById('brc-v23-history')||main.querySelector('footer');if(anchor)main.insertBefore(section,anchor);else main.append(section);
const list=document.getElementById('v26-list'),status=document.getElementById('v26-status'),csv=document.getElementById('v26-csv'),audit=document.getElementById('v27-verify');
let byVenue=null,nationalCounts=new Map(),out=[],pending=false,lastKey='';
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
for(const p of racers){const c=byVenue.get(v)?.get(p.pid),local=c?c.reduce((sum,r)=>sum+r[0],0):0,national=nationalCounts.get(p.pid)||0;if(local>0)found++;
const d=document.createElement('details');d.open=p.lane===1;
const sum=document.createElement('summary');sum.textContent=p.lane+'号艇 '+p.name+'（当地'+local.toLocaleString('ja-JP')+'走／全国'+national.toLocaleString('ja-JP')+'走）'+(local?'':national?' ※当地0走':' ※対象期間の全国記録なし');d.append(sum);
const scroll=document.createElement('div');scroll.style.overflowX='auto';const table=document.createElement('table');table.style.minWidth='550px';table.style.width='100%';const head=document.createElement('tr');
for(const h of ['進入','出走数','1着率','2着率','3着率','3連対率']){const th=document.createElement('th');th.textContent=h;head.append(th)}table.append(head);
for(let i=0;i<6;i++){const [n,a,b,e]=c?.[i]||[0,0,0,0];if(n>0&&n<20)small++;
const cells=[String(i+1)+'コース',n?n.toLocaleString('ja-JP')+(n<20?' ※':''):'当該コース0走',pct(a,n),pct(b,n),pct(e,n),pct(a+b+e,n)];
const tr=document.createElement('tr');for(const text of cells){const td=document.createElement('td');td.textContent=text;td.style.padding='8px';td.style.borderBottom='1px solid #e1ebf2';tr.append(td)}table.append(tr);
out.push([p.lane,p.pid,p.name,v,i+1,n,a,b,e,pct(a,n),pct(b,n),pct(e,n),pct(a+b+e,n)]);}
scroll.append(table);d.append(scroll);d.style.margin='10px 0';list.append(d)}
csv.disabled=false;status.textContent='当地の記録がある選手 '+found+'/6人。選手をタップすると進入6コースの着率が開きます。'+(small?'（※は少数標本）':'');}
new MutationObserver(()=>{if(pending)pending=false;render()}).observe(details,{childList:true,subtree:true});
venue.addEventListener('change',()=>{pending=true;clear('会場の出走表を切替中です。新しい6艇が揃うまで表示を保留します。')});
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

// Independently compare the venue×player×course aggregate against the V25 national per-course archive.
// This comparison is performed on the viewer's device and does not send player information anywhere.
const aggregate=new Map();
for(const map of venueMap.values())for(const [pid,courses] of map){
  let dst=aggregate.get(pid);
  if(!dst){dst=Array.from({length:6},()=>[0,0,0,0]);aggregate.set(pid,dst);}
  for(let c=0;c<6;c++)for(let k=0;k<4;k++)dst[c][k]+=courses[c][k];
}
nationalCounts=new Map(Array.from(aggregate,([pid,courses])=>[pid,courses.reduce((sum,row)=>sum+row[0],0)]));
byVenue=venueMap;render();
audit.textContent='V27 独立照合：V25の全国コース別データと1,658選手を比較中…';
(async()=>{try{
  const res=await fetch('./player-courses-v25.b64',{cache:'no-store'});
  if(!res.ok)throw Error('HTTP '+res.status);
  const base=(await res.text()).trim();
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(base))throw Error('データ形式エラー');
  const compressed=Uint8Array.from(atob(base),c=>c.charCodeAt(0));
  const raw25=new Uint8Array(await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  if(raw25.length!==43130||String.fromCharCode(...raw25.slice(0,4))!=='BR25')throw Error('V25データ形式エラー');
  const digest=await crypto.subtle.digest('SHA-256',raw25);
  const sha=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  if(sha!=='b9f3acd2921f6afee2690d83164a535f49049bb15d615fa846f2e03f239ccc1f')throw Error('V25データ照合不一致');
  const count=raw25[4]+raw25[5]*256;
  if(count!==1658||aggregate.size!==1658)throw Error('比較対象選手数の不一致');
  let offset=6,seen=0,issues=0,previous=0;
  function vari(){let n=0,shift=0;for(;;){if(offset>=raw25.length||shift>28)throw Error('V25データ破損');const x=raw25[offset++];n|=(x&127)<<shift;if(x<128)return n;shift+=7;}}
  for(let i=0;i<count;i++){
    if(offset+2>raw25.length)throw Error('V25選手登録番号欠落');
    const pid=raw25[offset++]+raw25[offset++]*256;
    if(pid<=previous)throw Error('V25登録番号の重複');
    previous=pid;
    const compared=aggregate.get(pid);
    if(!compared)issues++;
    for(let c=0;c<6;c++)for(let k=0;k<4;k++){
      const value=vari();if(compared&&value!==compared[c][k])issues++;
      seen++;
    }
  }
  if(offset!==raw25.length)throw Error('V25データ末尾不一致');
  if(issues){byVenue=null;clear('V25とV26の独立照合に不一致があるため当地成績を安全停止しました。');audit.textContent='V27 独立照合：不一致（'+issues+'件）。数値を非表示にしました。';return;}
  audit.textContent='V27 独立照合PASS：1,658選手×6コース、出走数・1～3着数 '+seen.toLocaleString('ja-JP')+'項目一致。';
}catch(error){
  audit.textContent='V27 独立照合未完了（通信・ブラウザーなど）。V26データ自体の件数・ハッシュ確認は済んでいます。';
  console.warn('BRC V27 compare unavailable:',error);
}})();
}catch(e){clear('当地コース別成績は現在読み込めません。既存のV24・V25の分析は引き続き利用できます。');console.warn('BRC V26',e);}})();
})();