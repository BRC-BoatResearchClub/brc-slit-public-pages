/* V32: National vs local six-player comparison, V30 historical entered-course data */
(()=>{'use strict';
const main=document.querySelector('main'),details=document.getElementById('details'),date=document.getElementById('date'),venue=document.getElementById('venue');if(!main||!details||!date||!venue||document.getElementById('brc-v32'))return;
const periods={LAST1Y:['period-last1y-v30.b64',640912,56023,335549,1664,24913,135311,2,'72ed853ae5e777d563fc516ab2f3aef7d1954472cd3caedd8e7d786be0ad32b1'],Y2026:['period-2026-v30.b64',604020,50437,302093,1661,23550,127451,1,'1daa79ad410898abb090a29cefeb554e8462c7383efc0bf133673f4cb4c523fc'],ALL:['period-all-v30.b64',1286361,622291,3727002,2196,47566,273963,0,'a5613cd6ecd9940a3d90a4e7f654ca6b882ff74dece52f52cfe29170fa994c1e']};
const el=document.createElement('section');el.id='brc-v32';el.innerHTML='<h2>V32｜当日6選手・全国／当地の詳細比較</h2><p class="small">PC版の6選手一覧を参考にした表示。枠番と同じ番号の<strong>過去の実進入コース</strong>での着率を比較します。当日の進入予想・事前1着率ではありません。</p><div class="v32-controls"><label>集計期間<select id="v32-period"><option value="LAST1Y">直近1年</option><option value="Y2026">2026年</option><option value="ALL">全期間</option></select></label><label>表示<select id="v32-view"><option value="all">全国＋当地（横スクロール）</option><option value="national">全国4項目</option><option value="local">当地4項目</option><option value="delta">当地−全国4項目</option></select></label></div><p id="v32-status" role="status">保存済み成績を照合中…</p><div class="v32-scroll"><table><thead><tr id="v32-head"><th>選手</th><th>全国N</th><th>全国1着</th><th>全国2着</th><th>全国3着</th><th>全国3連対</th><th>当地N</th><th>当地1着</th><th>当地2着</th><th>当地3着</th><th>当地3連対</th></tr></thead><tbody id="v32-rows"></tbody></table></div><p class="small" id="v32-note"></p><button id="v32-csv" disabled type="button">6選手の比較をCSV保存</button><p class="small">全国・当地の各1〜3着率と3連対率を同じ6選手で比較します。※Nが20未満は少数標本、N=0は「—」で0%と区別。差分は当地−全国（pt）で、優劣や予測の根拠ではありません。枠番と同じ番号の過去の実進入コースだけを集計（枠別集計ではありません）。最終結果日2026-11-24。2026-11-24以前の開催日では未来情報混入防止のため非表示。ST・決まり手・展開データは含みません。</p>';
const style=document.createElement('style');style.textContent='#brc-v32{border-top:3px solid #225c89}#brc-v32 .v32-controls{display:flex;gap:14px;flex-wrap:wrap;margin:10px 0}#brc-v32 label{display:flex;flex-direction:column;font-size:12px;gap:5px}#brc-v32 select{padding:8px;min-height:42px}#brc-v32 .v32-scroll{overflow-x:auto;border:1px solid #dfe8f1;border-radius:7px}#brc-v32 table{border-collapse:collapse;min-width:1020px;width:100%;font-size:12px}#brc-v32 th,#brc-v32 td{padding:8px;border-bottom:1px solid #dfe8f1;white-space:nowrap;text-align:right}#brc-v32 th:first-child,#brc-v32 td:first-child{text-align:left;position:sticky;left:0;z-index:1;background:#f8fbfe;min-width:128px}#brc-v32 thead th{background:#e8f0f7}#brc-v32 #v32-status{padding:9px;background:#f0f5fa;border-radius:6px;font-size:12px}#brc-v32 .plus{color:#00744a;font-weight:bold}#brc-v32 .minus{color:#b32b38;font-weight:bold}#brc-v32 .lane{display:inline-block;min-width:22px;text-align:center;padding:3px 0;border-radius:4px;margin-right:5px;font-weight:bold}';document.head.append(style);
const anchor=document.getElementById('brc-periods-v28')||document.getElementById('brc-v28-status')||document.getElementById('brc-v24-players')||main.querySelector('footer');if(anchor)main.insertBefore(el,anchor);else main.append(el);
const psel=document.getElementById('v32-period'),view=document.getElementById('v32-view'),body=document.getElementById('v32-rows'),status=document.getElementById('v32-status'),note=document.getElementById('v32-note'),csv=document.getElementById('v32-csv');
const cache=new Map(),blank=()=>Array.from({length:6},()=>[0,0,0,0]);let current=null,seq=0,waiting=false,csvData=[];
function clear(s){current=null;body.replaceChildren();csv.disabled=true;csvData=[];status.textContent=s;note.textContent='';}
function players(){let a=[];for(const tr of details.querySelectorAll('table tbody tr')){const t=tr.querySelectorAll('td'),lane=Number(t[0]?.textContent.trim()),name=t[1]?.textContent.trim()||'',m=name.match(/\((\d{4,5})\)\s*$/);if(lane>=1&&lane<=6&&m)a.push({lane,pid:Number(m[1]),name:name.replace(/\s*\(\d{4,5}\)\s*$/,'')});}return a.sort((x,y)=>x.lane-y.lane);}
function variable(raw,state){let n=0,s=0;for(;;){if(state.i>=raw.length||s>28)throw Error('VARINT');let x=raw[state.i++];n|=(x&127)<<s;if(x<128)return n;s+=7;}}
async function load(key){
 if(cache.has(key))return cache.get(key);const c=periods[key],r=await fetch('./'+c[0],{cache:'no-store'});if(!r.ok)throw Error('FETCH');
 const b=(await r.text()).trim();if(!/^[A-Za-z0-9+/]+={0,2}$/.test(b))throw Error('BASE64');
 const gz=Uint8Array.from(atob(b),x=>x.charCodeAt(0));const raw=new Uint8Array(await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
 if(raw.length!==c[1]||String.fromCharCode(...raw.slice(0,4))!=='BRP8')throw Error('HEADER');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',raw)),x=>x.toString(16).padStart(2,'0')).join('');if(hash!==c[8])throw Error('HASH');
 const view=new DataView(raw.buffer,raw.byteOffset,raw.byteLength);if(raw[4]!==c[7]||view.getUint32(5,true)!==c[2]||view.getUint32(9,true)!==c[3]||view.getUint16(13,true)!==c[4]||raw[15]!==24)throw Error('META');
 const local=new Map(),national=new Map(),pos={i:16};let pairs=0,rows=0,starts=0,pv=0,pp=0;
 while(pos.i<raw.length){if(pos.i+4>raw.length)throw Error('TRUNC');const v=raw[pos.i++],pid=raw[pos.i++]+256*raw[pos.i++],mask=raw[pos.i++];if(v<1||v>24||mask<1||mask>63||v<pv||(v===pv&&pid<=pp))throw Error('ORDER');pv=v;pp=pid;pairs++;
 if(!local.has(v))local.set(v,new Map());let lc=blank();local.get(v).set(pid,lc);if(!national.has(pid))national.set(pid,blank());let nc=national.get(pid);
 for(let i=0;i<6;i++)if(mask&(1<<i)){const x=[variable(raw,pos),variable(raw,pos),variable(raw,pos),variable(raw,pos)];if(x[0]<1||x[1]+x[2]+x[3]>x[0])throw Error('COUNT');lc[i]=x;for(let k=0;k<4;k++)nc[i][k]+=x[k];rows++;starts+=x[0];}}
 if(pairs!==c[5]||rows!==c[6]||starts!==c[3]||national.size!==c[4]||local.size!==24)throw Error('TOTAL');
 const data={local,national};cache.set(key,data);return data;
}
const rate=(r,m)=>r[0]?(m===4?(r[1]+r[2]+r[3]):r[m])*100/r[0]:null,formatted=n=>n===null?'—':n.toFixed(1)+'%';
function draw(){if(!current)return;body.replaceChildren();csvData=[];let localCount=0;
const {six,v,data,key}=current,mode=view.value,columns=mode==='all'?['選手','全国N','全国1着','全国2着','全国3着','全国3連対','当地N','当地1着','当地2着','当地3着','当地3連対']:mode==='national'?['選手','全国N','1着率','2着率','3着率','3連対率']:mode==='local'?['選手','当地N','1着率','2着率','3着率','3連対率']:['選手','全国N','当地N','1着差','2着差','3着差','3連対差'];
const heading=document.getElementById('v32-head');heading.replaceChildren();for(const text of columns){const th=document.createElement('th');th.textContent=text;heading.append(th)}
const table=heading.closest('table');table.style.minWidth=mode==='all'?'1020px':mode==='delta'?'620px':'580px';
const num=x=>x?x.toLocaleString('ja-JP')+(x<20?' ※':''):'0';
const four=r=>[1,2,3,4].map(i=>rate(r,i));
const diffText=d=>d===null?'—':(d>0?'+':'')+d.toFixed(1)+'pt';
for(const p of six){
 const a=data.national.get(p.pid)?.[p.lane-1]||[0,0,0,0],b=data.local.get(v)?.get(p.pid)?.[p.lane-1]||[0,0,0,0];
 if(b[0])localCount++;
 const ar=four(a),br=four(b),delta=ar.map((r,i)=>r===null||br[i]===null?null:br[i]-r);
 const tr=document.createElement('tr'),first=document.createElement('td'),badge=document.createElement('span');
 badge.className='lane';badge.textContent=String(p.lane);const bg=['#ffffff','#151515','#e10c27','#006cb7','#ffe200','#089653'][p.lane-1];badge.style.background=bg;badge.style.color=[2,3,4,6].includes(p.lane)?'#fff':'#111';first.append(badge,document.createTextNode(p.name));tr.append(first);
 const vals=mode==='all'?[num(a[0]),...ar.map(formatted),num(b[0]),...br.map(formatted)]:mode==='national'?[num(a[0]),...ar.map(formatted)]:mode==='local'?[num(b[0]),...br.map(formatted)]:[num(a[0]),num(b[0]),...delta.map(diffText)];
 vals.forEach((value,i)=>{const td=document.createElement('td');td.textContent=value;
 if(mode==='delta'&&i>=2&&delta[i-2]!==null)td.className=delta[i-2]>0?'plus':delta[i-2]<0?'minus':'';
 tr.append(td)});body.append(tr);
 csvData.push([key,v,p.lane,p.pid,p.name,...a,...b,...ar.map(formatted),...br.map(formatted),...delta.map(diffText)]);
}
status.textContent='同一の出走条件で6選手を比較／'+psel.options[psel.selectedIndex].text+'／2026-11-24までの保存済み実績';
note.textContent='当地で該当の進入コースに出走した履歴がある選手：'+localCount+'/6人。表は'+(mode==='all'?'左右にスクロールできます。':mode==='delta'?'4種類の差分（pt）です。':mode==='local'?'当地の数値です。':'全国の数値です。');
csv.disabled=false;
}
async function render(){const id=++seq;clear('集計中…');if(date.value<='2026-11-24'){clear('この開催日は未来の結果を含むため、選手比較を表示しません。');return;}if(waiting){clear('出走表を取得中…');return;}const six=players(),v=Number(venue.value);if(six.length!==6||new Set(six.map(x=>x.pid)).size!==6||!(v>=1&&v<=24)){clear('出走表が6選手揃うと表示します。');return;}try{const data=await load(psel.value);if(id!==seq)return;current={six,v,data,key:psel.value};draw();}catch(e){if(id!==seq)return;clear('データの検証に失敗したため表示していません。');console.warn('BRC V32',e);}}
psel.addEventListener('change',render);view.addEventListener('change',draw);
venue.addEventListener('change',()=>{waiting=true;clear('会場の切替中…')});date.addEventListener('change',()=>{waiting=true;clear('開催日を切替中…')});document.getElementById('reload')?.addEventListener('click',()=>{waiting=true;clear('出走表の再取得中…')});
new MutationObserver(()=>{waiting=false;render()}).observe(details,{subtree:true,childList:true});
csv.onclick=()=>{if(csv.disabled||csvData.length!==6)return;
const head=['期間','会場','枠','登録番号','選手','全国N','全国1着数','全国2着数','全国3着数','当地N','当地1着数','当地2着数','当地3着数','全国1着率','全国2着率','全国3着率','全国3連対率','当地1着率','当地2着率','当地3着率','当地3連対率','1着率差pt','2着率差pt','3着率差pt','3連対率差pt'];
const q=x=>{let s=String(x??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
const output='\uFEFF'+[head,...csvData].map(x=>x.map(q).join(',')).join('\r\n');
const url=URL.createObjectURL(new Blob([output],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='BRC_V32_6選手_全国当地_詳細比較.csv';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
};
render();
})();