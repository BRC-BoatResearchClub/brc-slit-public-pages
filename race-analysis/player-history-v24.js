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