/* BRC V36 private local scenario reader; no network or storage. */
(()=>{'use strict';
const anchor=document.getElementById('brc-v32');
if(!anchor||document.getElementById('s36'))return;
const venues=['桐生','戸田','江戸川','平和島','多摩川','浜名湖','蒲郡','常滑','津','三国','びわこ','住之江','尼崎','鳴門','丸亀','児島','宮島','徳山','下関','若松','芦屋','福岡','唐津','大村'];
const methods=['逃げ','差し','まくり','まくり差し','抜き','恵まれ'];
const box=document.createElement('section');box.id='s36';
box.innerHTML='<h2>V36｜展開別2・3着率</h2><p>PC版の履歴分析JSONを端末内で読み込みます。GitHubにはデータをアップロードしません。</p><label>PC版の展開分析ファイル<input type="file" id="s36file" accept=".json,application/json"></label><p id="s36status" role="status">ファイルを選択してください。</p><div class="s36controls"><label>勝者コース<select id="s36win"><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option></select></label><label>決まり手<select id="s36method"><option>逃げ</option><option>差し</option><option>まくり</option><option>まくり差し</option><option>抜き</option><option>恵まれ</option><option value="ALL">すべて</option></select></label></div><div id="s36out"></div><p>枠は仮の進入コースです。勝者と同じコースの着率は比較対象外として「—」。該当0走は未算出、20走未満は参考値です。予測確率ではありません。</p>';
anchor.after(box);
const css=document.createElement('style');css.textContent='#s36{border-top:3px solid #286487;padding-top:14px;margin-top:16px}#s36>p{font-size:12px;line-height:1.6;color:#547083}#s36>label{display:block;padding:12px;border-radius:7px;background:#eef5fa;font-size:13px}#s36file{display:block;max-width:100%;margin-top:8px}#s36status{padding:10px;background:#f3f7fb;border-radius:7px}#s36 .s36controls{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0}#s36 .s36controls label{flex:1 1 130px;display:flex;flex-direction:column;gap:5px;font-size:12px}#s36 select{padding:9px;min-height:40px}#s36 .s36group{border:1px solid #d8e2ed;border-radius:7px;margin:12px 0;overflow:hidden}#s36 h3{font-size:13px;padding:9px;background:#edf4fa;margin:0}#s36 .s36scroll{overflow-x:auto}#s36 table{width:100%;min-width:320px;border-collapse:collapse;font-size:12px}#s36 th,#s36 td{padding:8px 5px;border-bottom:1px solid #e5edf3;text-align:right}#s36 th:first-child,#s36 td:first-child{text-align:left}#s36 small{font-size:10px;color:#73879a;display:block}';
document.head.append(css);
const status=document.getElementById('s36status'),out=document.getElementById('s36out'),date=document.getElementById('date'),venue=document.getElementById('venue'),win=document.getElementById('s36win'),meth=document.getElementById('s36method');
let data=null;const elem=(t,s)=>{const e=document.createElement(t);e.textContent=String(s);return e;};
function valid(d){
 if(!d||!venues.includes(d.venue)||!Number.isInteger(d.race)||d.race<1||d.race>12||!Array.isArray(d.players)||d.players.length!==6||!Array.isArray(d.rows)||d.rows.length!==216||!Array.isArray(d.methods)||d.methods.length!==6||!methods.every(m=>d.methods.includes(m)))return false;
 if(typeof d.date!=='string'||typeof d.asof!=='string'||!/^\d{4}-\d\d-\d\d$/.test(d.date)||!/^\d{4}-\d\d-\d\d$/.test(d.asof)||d.asof>=d.date||d.cutoff_exclusive!==d.date)return false;
 const ids=new Map(d.players.map(p=>[p.lane,p.toban]));if(ids.size!==6||!Array.from(ids.keys()).every(n=>Number.isInteger(n)&&n>=1&&n<=6))return false;
 const keys=new Set();
 for(const r of d.rows){
 if(!r||!ids.has(r.lane)||r.toban!==ids.get(r.lane)||r.course!==r.lane||!methods.includes(r.method)||!Number.isInteger(r.winner_course)||r.winner_course<1||r.winner_course>6)return false;
 if(![r.n,r.n1,r.n2,r.n3,r.top3_count,r.base_starts].every(v=>Number.isSafeInteger(v)&&v>=0)||r.n>r.base_starts||r.n1+r.n2+r.n3>r.n||r.top3_count!==r.n1+r.n2+r.n3)return false;
 const hidden=d.minimum>0&&r.base_starts<d.minimum;
 const pct=n=>Math.floor((n*100+Math.floor(r.n/2))/r.n);
 if(hidden||r.n===0){if([r.rate2,r.rate3,r.rate_top3].some(v=>v!==null))return false;}else if(r.rate2!==pct(r.n2)||r.rate3!==pct(r.n3)||r.rate_top3!==pct(r.top3_count))return false;
 const k=r.winner_course+'/'+r.method+'/'+r.lane;if(keys.has(k))return false;keys.add(k);
 }
 return keys.size===216;
}
function selectedRace(){return Number(document.querySelector('#races button[aria-pressed="true"]')?.textContent.match(/^(\d+)R/)?.[1]||0);}
function render(){
 out.replaceChildren();if(!data)return;
 if(date.value!==data.date||venues[Number(venue.value)-1]!==data.venue||selectedRace()!==data.race){status.textContent='検証済み：'+data.date+' '+data.venue+data.race+'R。画面で同じ日付・会場・レースを選ぶと結果を表示します。';return;}
 const w=Number(win.value),chosen=meth.value==='ALL'?methods:[meth.value];status.textContent='照合済み｜'+data.venue+data.race+'R｜履歴'+data.asof+'まで｜'+data.period;
 for(const method of chosen){
 const g=elem('div','');g.className='s36group';g.append(elem('h3','勝者'+w+'コース・'+method));const scroll=elem('div','');scroll.className='s36scroll';const table=document.createElement('table'),thead=document.createElement('thead'),tr=document.createElement('tr');
 ['選手','該当N','2着率','3着率','3連対'].forEach(t=>tr.append(elem('th',t)));thead.append(tr);table.append(thead);const body=document.createElement('tbody');
 for(const r of data.rows.filter(x=>x.winner_course===w&&x.method===method).sort((a,b)=>a.lane-b.lane)){
 const row=document.createElement('tr'),first=elem('td',r.lane+'号艇 '+r.name);first.append(elem('small',r.status));const f=v=>r.course===w||v===null?'—':v+'%';
 row.append(first,elem('td',r.n),elem('td',f(r.rate2)),elem('td',f(r.rate3)),elem('td',f(r.rate_top3)));body.append(row);
 }table.append(body);scroll.append(table);g.append(scroll);out.append(g);}
}
document.getElementById('s36file').addEventListener('change',async e=>{
 data=null;out.replaceChildren();const f=e.target.files?.[0];if(!f)return;
 try{if(f.size<1000||f.size>2000000)throw Error('SIZE');const parsed=JSON.parse(await f.text());if(!valid(parsed))throw Error('VALIDATION');data=parsed;render();}catch(e){status.textContent='データ形式・216行・着率の検証に失敗しました。正しいPC版JSONを選んでください。';}
 e.target.value='';
});
win.addEventListener('change',render);meth.addEventListener('change',render);date?.addEventListener('change',render);venue?.addEventListener('change',render);
const races=document.getElementById('races');if(races)new MutationObserver(()=>{if(data)render()}).observe(races,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-pressed']});
})();