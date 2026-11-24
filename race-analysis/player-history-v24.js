// BRC V24: national player history by registration number (2025-11-17..2026-11-16).
// Historical aggregate only. Not forecasts, odds, lane outcomes or venue-specific stats.
(() => {
  'use strict';
  const DATE_FROM = '2025-11-17', DATE_TO = '2026-11-16';
  const main = document.querySelector('main');
  const details = document.getElementById('details');
  const dateInput = document.getElementById('date');
  if (!main || !details || !dateInput || document.getElementById('brc-v24-players')) return;

  const section = document.createElement('section');
  section.id = 'brc-v24-players';
  section.setAttribute('aria-label', 'BRC 直近1年選手別全国着率');
  section.innerHTML =
    '<h2>V24｜このレースの6選手・全国着率</h2>' +
    '<p class="v24-note">選手の<strong>登録番号</strong>とBRCの保存済みレース結果を照合。2025年11月17日〜2026年11月16日の全国・全進入コース合算です。' +
    '<strong>枠番別・進入コース別・当地成績・予測確率ではありません。</strong></p>' +
    '<p id="v24-status" role="status" aria-live="polite">選手別データを読み込み中…</p>' +
    '<div class="v24-scroller"><table><thead><tr><th>枠</th><th>選手（登録番号）</th><th>出走数</th><th>1着率</th><th>2着率</th><th>3着率</th><th>3連対率</th></tr></thead>' +
    '<tbody id="v24-body"></tbody></table></div>' +
    '<p class="v24-note">着率＝当該着順数÷記録された出走数。データ最終日は2026年11月16日で固定。少数データは参考値です。' +
    '欠損時は「履歴なし」と表示し、0%とは扱いません。集計には開催日当日の結果を含めません。</p>' +
    '<button id="v24-csv" type="button" disabled>6選手の着率をCSV保存</button>';
  const style = document.createElement('style');
  style.textContent = '#brc-v24-players{border-top:3px solid #175d91}#brc-v24-players .v24-note{font-size:12px;color:#516b82;line-height:1.65}' +
    '#brc-v24-players #v24-status{font-size:12px;color:#1e5879}#brc-v24-players .v24-scroller{overflow-x:auto;border:1px solid #dae5ee;border-radius:7px}' +
    '#brc-v24-players table{width:100%;min-width:690px;border-collapse:collapse;font-variant-numeric:tabular-nums}' +
    '#brc-v24-players th,#brc-v24-players td{padding:9px 7px;border-bottom:1px solid #e5edf3;text-align:right;white-space:nowrap}' +
    '#brc-v24-players th:nth-child(2),#brc-v24-players td:nth-child(2){text-align:left}#brc-v24-players thead{background:#e9f1f8}' +
    '#brc-v24-players tbody tr:nth-child(even){background:#f7fafc}#brc-v24-players button{margin:12px 0 0}';
  document.head.append(style);
  main.insertBefore(section, document.getElementById('brc-v23-history') || main.querySelector('footer'));

  const body = document.getElementById('v24-body');
  const status = document.getElementById('v24-status');
  const csvButton = document.getElementById('v24-csv');
  let players = null;
  let csvRecords = [];
  let awaitingUpdate = false;

  const percent = (count, n) => n > 0 ? (100 * count / n).toFixed(1) + '%' : '—';
  const fmt = n => n.toLocaleString('ja-JP');
  function clear(message) { body.replaceChildren();csvRecords = []; csvButton.disabled = true; status.textContent=message; }

  function racersOnScreen() {
    const rows = details.querySelectorAll('table tbody tr');
    const found = [];
    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      const match = (cells[1]?.textContent || '').match(/\((\d{4,5})\)\s*$/);
      const lane = Number(cells[0]?.textContent.trim());
      if (!match || !Number.isInteger(lane) || lane < 1 || lane > 6) continue;
      found.push({lane,number:Number(match[1]),name:cells[1].textContent.trim()});
    }
    return found;
  }

  function render() {
    if (!players) return;
    if (awaitingUpdate) { clear('出走表の更新待ちです。'); return; }
    if (dateInput.value <= DATE_TO) { clear('選択した開催日には、集計基準日以降の結果が含まれるため選手別成績を表示しません。'); return; }
    const racers = racersOnScreen();
    if (racers.length !== 6 || new Set(racers.map(r=>r.number)).size !== 6) { clear('出走表が6艇分揃うと、登録番号で全国成績を照合します。'); return; }
    body.replaceChildren();csvRecords=[];
    let matched=0,small=0;
    for (const racer of racers) {
      const data=players.get(racer.number);
      const n=data?.[0]||0;
      if(n>0)matched++;
      if(n>0&&n<20)small++;
      const fields=[String(racer.lane),racer.name,n>0?fmt(n):'履歴なし',
        n?percent(data[1],n):'—',n?percent(data[2],n):'—',n?percent(data[3],n):'—',
        n?percent(data[1]+data[2]+data[3],n):'—'];
      const row=document.createElement('tr');
      for(const [i,value] of fields.entries()) {
        const cell=document.createElement('td');
        cell.textContent=i===2&&n>0&&n<20?value+' ※':value;
        row.append(cell);
      }
      body.append(row);
      csvRecords.push(fields);
    }
    csvButton.disabled=false;
    status.textContent='登録番号で '+matched+'/6選手を照合しました。対象：全国全コース合算・2026年11月16日まで。'+(small?' ※出走20回未満は参考値':'');
  }

  csvButton.addEventListener('click',()=>{
    if(csvButton.disabled||csvRecords.length!==6)return;
    const csvQuote = v => { let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
    const rows=[['枠番','選手（登録番号）','出走数','全国1着率','全国2着率','全国3着率','全国3連対率'], ...csvRecords];
    const content='\uFEFF'+rows.map(r=>r.map(csvQuote).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8;'}));
    const a=document.createElement('a');a.href=url;a.download='BRC_V24_全国選手別着率_20261116.csv';
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);
  });

  new MutationObserver(()=>{if(awaitingUpdate)awaitingUpdate=false;render();}).observe(details,{childList:true,subtree:true});
  dateInput.addEventListener('change',()=>{awaitingUpdate=true;clear('出走表の更新待ちです。');});
  document.getElementById('reload')?.addEventListener('click',()=>{awaitingUpdate=true;clear('出走表の更新待ちです。');});

  (async()=>{
    try{
      const response=await fetch('./player-totals-v24.b64',{cache:'no-store'});
      if(!response.ok)throw Error('HTTP '+response.status);
      const s=(await response.text()).trim();
      if(!/^[A-Za-z0-9+/]+={0,2}$/.test(s) || !('DecompressionStream' in window))throw Error('保存ファイルを展開できません');
      const compressed=Uint8Array.from(atob(s),c=>c.charCodeAt(0));
      const bytes=new Uint8Array(await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
      if(bytes.length!==11473 || String.fromCharCode(...bytes.slice(0,4))!=='BRC5')throw Error('保存ファイルの形式が異なります');
      const count=bytes[4]|(bytes[5]<<8);if(count!==1658)throw Error('保存ファイルの選手数が異なります');
      const map=new Map();let offset=6,previous=0;
      function variable(){let value=0, shift=0;while(true){if(offset>=bytes.length || shift>28)throw Error('集計データの破損');const b=bytes[offset++];value|=(b&127)<<shift;if(b<128)return value;shift+=7;}}
      for(let i=0;i<count;i++){
        if(offset+2>bytes.length)throw Error('選手登録番号の破損');
        const number=bytes[offset]|(bytes[offset+1]<<8);offset+=2;
        if(number<=previous)throw Error('選手登録番号の重複');previous=number;
        const records=[variable(),variable(),variable(),variable()];
        if(records.slice(1).reduce((a,b)=>a+b,0)>records[0])throw Error('着順集計の矛盾');
        map.set(number,records);
      }
      if(offset!==bytes.length)throw Error('データの末尾が一致しません');
      players=map;render();
    }catch(error){clear('選手別データを読み込めませんでした。既存の出走表と過去会場分析は引き続き利用できます。');console.warn('BRC V24 history not loaded',error);}
  })();
})();
// BRC V25: separate snapshot of 1..6 *actual entry course* rates, NOT a prediction.
(()=>{'use strict';
const main=document.querySelector('main'),details=document.getElementById('details'),date=document.getElementById('date');if(!main||!details||!date||document.getElementById('v25'))return;
const section=document.createElement('section');section.id='v25';section.innerHTML='<h2>V25｜6選手の進入コース別着率</h2><p class="small">保存済みの全国結果（2025年11月17日～2026年11月16日）。登録番号で照合した実際の進入コース別成績です。枠番別・当地限定・BRC予測ではありません。</p><p id="v25-status" role="status" aria-live="polite">選手別コース成績を読み込み中…</p><div id="v25-list"></div><button type="button" id="v25-csv" disabled>6選手・36行をCSV保存</button><p class="small">着率＝各コースでの当該着順数÷出走数。20走未満は参考値、0走は「履歴なし」。保存データは毎日更新されません。2026年11月16日以前の開催日では、未来の結果混入を避けるため非表示。</p>';
const anchor=document.getElementById('brc-v23-history')||main.querySelector('footer');if(anchor)main.insertBefore(section,anchor);else main.append(section);
const list=document.getElementById('v25-list'),status=document.getElementById('v25-status'),csv=document.getElementById('v25-csv');let source=null,selected=[],out=[],pending=false;
const pct=(n,t)=>t?(100*n/t).toFixed(1)+'%':'—';function clear(s){list.replaceChildren();status.textContent=s;csv.disabled=true;out=[];selected=[];}
function entries(){const ans=[];for(const tr of details.querySelectorAll('table tbody tr')){const cells=tr.querySelectorAll('td'),lane=Number(cells[0]?.textContent.trim()),m=cells[1]?.textContent.trim().match(/\((\d{4,5})\)\s*$/);if(Number.isInteger(lane)&&lane>=1&&lane<=6&&m)ans.push({lane,pid:Number(m[1]),name:cells[1].textContent.trim()});}return ans;}
function draw(){if(!source)return;if(pending){clear('出走表を更新中…');return;}if(date.value<='2026-11-16'){clear('選択した開催日は未来情報が混入するため表示しません。');return;}const ppl=entries();if(ppl.length!==6||new Set(ppl.map(p=>p.pid)).size!==6){clear('出走表が6艇分そろうと選手別コース成績を表示します。');return;}
list.replaceChildren();selected=ppl;out=[];let matched=0;
for(const p of ppl){const records=source.get(p.pid);if(records)matched++;const d=document.createElement('details');d.open=p.lane===1;const summary=document.createElement('summary');summary.textContent=p.lane+'号艇 '+p.name+(records?'':' （履歴なし）');d.append(summary);const wrap=document.createElement('div');wrap.style.overflowX='auto';const table=document.createElement('table');table.style.minWidth='560px';table.style.width='100%';table.style.borderCollapse='collapse';const head=document.createElement('tr');for(const name of ['進入','出走数','1着率','2着率','3着率','3連対率']){const th=document.createElement('th');th.textContent=name;head.append(th)}table.append(head);
for(let i=0;i<6;i++){const [n,a,b,c]=records?.[i]||[0,0,0,0];const fields=[String(i+1)+'コース',n?n.toLocaleString('ja-JP')+(n<20?' ※':''):'履歴なし',pct(a,n),pct(b,n),pct(c,n),pct(a+b+c,n)];const tr=document.createElement('tr');for(const v of fields){const td=document.createElement('td');td.textContent=v;td.style.padding='7px';td.style.borderBottom='1px solid #e6eef4';tr.append(td)}table.append(tr);out.push([p.lane,p.pid,p.name,i+1,n,a,b,c,pct(a,n),pct(b,n),pct(c,n),pct(a+b+c,n)])}wrap.append(table);d.append(wrap);d.style.margin='10px 0';list.append(d)}csv.disabled=false;status.textContent='登録番号で'+matched+'/6選手を照合。各選手をタップすると6コースの成績が開きます。';}
new MutationObserver(()=>{if(pending)pending=false;draw()}).observe(details,{childList:true,subtree:true});date.addEventListener('change',()=>{pending=true;clear('出走表を更新中…')});document.getElementById('reload')?.addEventListener('click',()=>{pending=true;clear('出走表を更新中…')});
csv.onclick=()=>{if(csv.disabled||out.length!==36)return;const quote=x=>{let s=String(x??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'},rows=[['枠','登録番号','選手','進入コース','出走数','1着数','2着数','3着数','1着率','2着率','3着率','3連対率'],...out],blob=new Blob(['\uFEFF'+rows.map(r=>r.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='BRC_V25_進入コース別着率_20261116.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500)};
(async()=>{try{const r=await fetch('./player-courses-v25.b64',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const text=(await r.text()).trim(),compressed=Uint8Array.from(atob(text),c=>c.charCodeAt(0)),bytes=new Uint8Array(await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());if(bytes.length!==43130||String.fromCharCode(...bytes.slice(0,4))!=='BR25')throw Error('データ形式不一致');const hash=await crypto.subtle.digest('SHA-256',bytes),hex=Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');if(hex!=='b9f3acd2921f6afee2690d83164a535f49049bb15d615fa846f2e03f239ccc1f')throw Error('データ照合不一致');let pos=6,total=0,prev=0;const count=bytes[4]+256*bytes[5];if(count!==1658)throw Error('選手数不一致');function vari(){let n=0,s=0;for(;;){if(pos>=bytes.length||s>28)throw Error('破損');const x=bytes[pos++];n|=(x&127)<<s;if(x<128)return n;s+=7}}const map=new Map();for(let i=0;i<count;i++){if(pos+2>bytes.length)throw Error('番号欠損');const pid=bytes[pos++]+bytes[pos++]*256;if(pid<=prev)throw Error('重複');prev=pid;const courses=[];for(let j=0;j<6;j++){const row=[vari(),vari(),vari(),vari()];if(row[1]+row[2]+row[3]>row[0])throw Error('着順数不正');total+=row[0];courses.push(row)}map.set(pid,courses)}if(pos!==bytes.length||total!==335062)throw Error('集計数不一致');source=map;draw();}catch(e){clear('進入コース別データを読み込めませんでした。V24の全国着率は引き続き利用できます。');console.warn('BRC V25',e)}})();
})();
