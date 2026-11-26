/* BRC V38 - isolated private Cloudflare Worker candidate, NOT DEPLOYED.
   Requires NEW dedicated KV binding BRC_V38_KV.
   Secrets: V38_LOGIN, V38_SESSION, V38_UPLOAD (independent random 256-bit values).
   Never connect to production BRC Worker, KV or Access policies. */
const VENUES=['桐生','戸田','江戸川','平和島','多摩川','浜名湖','蒲郡','常滑','津','三国','びわこ','住之江','尼崎','鳴門','丸亀','児島','宮島','徳山','下関','若松','芦屋','福岡','唐津','大村'];
const METHODS=['逃げ','差し','まくり','まくり差し','抜き','恵まれ'];
const HEADERS={'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'};
const STYLE='*{box-sizing:border-box}body{font:14px system-ui,-apple-system,sans-serif;color:#20384b;margin:0;background:#f2f6fa}header{background:#183f5d;color:white;padding:15px}h1{margin:0;font-size:20px}main{max-width:860px;margin:12px auto;padding:0 10px}section{background:white;border-radius:9px;padding:15px;margin-bottom:12px}h2{font-size:17px}h3{font-size:13px;background:#eaf2fa;padding:9px;margin:0}label{font-size:12px;display:block}input,select,button{font:inherit;border:1px solid #b5c8d7;border-radius:6px;padding:10px;min-height:42px;max-width:100%}button{border:0;background:#165d92;color:white;margin:7px 0}.filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:9px}.filters label>*{width:100%;margin-top:5px}.scroll{overflow-x:auto}table{width:100%;min-width:330px;border-collapse:collapse;font-size:12px}th,td{padding:8px 5px;border-bottom:1px solid #e5ecf2;text-align:right}th:first-child,td:first-child{text-align:left}.group{border:1px solid #d8e4ee;border-radius:8px;overflow:hidden;margin:12px 0}.muted{font-size:12px;color:#5e7182;line-height:1.7}small{color:#708b9c;display:block;font-size:10px}';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function response(text,code=200,type='text/html; charset=utf-8',extra={}){return new Response(text,{status:code,headers:{...HEADERS,'Content-Type':type,...extra}});}
function json(obj,code=200){return response(JSON.stringify(obj),code,'application/json; charset=utf-8');}
function page(body){return '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>BRC V38 非公開分析</title><link rel="stylesheet" href="/style.css"></head><body><header><h1>BRC スマホ分析 V38</h1><small>認証付き・独立した展開別分析</small></header><main>'+body+'</main></body></html>';}
const sha=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
const eq=(a,b)=>a.length===b.length&&a.reduce((v,x,i)=>v|(x^b[i]),0)===0;
async function same(a,b){return eq(await sha(String(a)),await sha(String(b)));}
const hex=b=>Array.from(b).map(x=>x.toString(16).padStart(2,'0')).join('');
async function sign(secret,text){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),'HMAC',false,['sign']);return hex(new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(text))));}
async function loggedIn(req,env){const token=/(?:^|;\s*)brc_v38=([^;]+)/.exec(req.headers.get('Cookie')||'')?.[1];if(!token)return false;const [time,nonce,digest,...more]=token.split('.');if(more.length||!/^\d{13}$/.test(time||'')||!/^[a-f0-9-]{36}$/.test(nonce||'')||!/^[0-9a-f]{64}$/.test(digest||''))return false;const diff=Date.now()-Number(time);if(diff<0||diff>43200000)return false;return same(digest,await sign(env.V38_SESSION,time+'.'+nonce));}
function valid(d){if(!d||!VENUES.includes(d.venue)||!Number.isInteger(d.race)||d.race<1||d.race>12||!Number.isInteger(d.minimum)||d.minimum<0||!/^\d{4}-\d\d-\d\d$/.test(d.date||'')||!/^\d{4}-\d\d-\d\d$/.test(d.asof||'')||d.asof>=d.date||d.cutoff_exclusive!==d.date)return false;
 if(!Array.isArray(d.players)||d.players.length!==6||!Array.isArray(d.methods)||d.methods.length!==6||!METHODS.every(m=>d.methods.includes(m))||!Array.isArray(d.rows)||d.rows.length!==216)return false;
 const players=new Map(d.players.map(p=>[p.lane,p]));if(players.size!==6||![1,2,3,4,5,6].every(n=>players.has(n)))return false;
 const unique=new Set(d.players.map(p=>p.toban));if(unique.size!==6)return false;const keys=new Set();
 for(const r of d.rows){const p=players.get(r.lane);if(!p||r.toban!==p.toban||r.name!==p.name||r.course!==r.lane||!Number.isInteger(r.winner_course)||r.winner_course<1||r.winner_course>6||!METHODS.includes(r.method))return false;
 if(![r.n,r.n1,r.n2,r.n3,r.top3_count,r.base_starts].every(x=>Number.isSafeInteger(x)&&x>=0)||r.n>r.base_starts||r.n1+r.n2+r.n3>r.n||r.top3_count!==r.n1+r.n2+r.n3)return false;
 const hide=d.minimum>0&&r.base_starts<d.minimum;if(hide||r.n===0){if(r.rate2!==null||r.rate3!==null||r.rate_top3!==null)return false;}else{const pct=n=>Math.floor((n*100+Math.floor(r.n/2))/r.n);if(r.rate2!==pct(r.n2)||r.rate3!==pct(r.n3)||r.rate_top3!==pct(r.top3_count))return false;}
 const key=r.lane+'|'+r.winner_course+'|'+r.method;if(keys.has(key))return false;keys.add(key);}
 return keys.size===216;
}
const select=(name,values,selected)=>'<select name="'+esc(name)+'">'+values.map(x=>'<option value="'+esc(x)+'"'+(String(x)===String(selected)?' selected':'')+'>'+esc(x)+'</option>').join('')+'</select>';
function login(error=false){return page('<section><h2>本人確認</h2><form method="post" action="/login"><label>アクセス用パスフレーズ<br><input type="password" name="password" autocomplete="current-password" required maxlength="500"></label><p><button type="submit">ログイン</button></p></form>'+(error?'<p>認証できませんでした。</p>':'')+'</section>');}
function format(data,w,method){let html='';for(const m of (method==='すべて'?METHODS:[method])){html+='<div class="group"><h3>勝者'+esc(w)+'コース｜'+esc(m)+'</h3><div class="scroll"><table><thead><tr><th>選手</th><th>該当N</th><th>2着率</th><th>3着率</th><th>3連対</th></tr></thead><tbody>';
 for(const r of data.rows.filter(x=>x.winner_course===w&&x.method===m).sort((a,b)=>a.lane-b.lane)){const pct=x=>r.course===w||x===null?'—':esc(x)+'%';html+='<tr><td>'+esc(r.lane)+'号艇 '+esc(r.name)+'<small>'+esc(r.status)+'</small></td><td>'+esc(r.n)+'</td><td>'+pct(r.rate2)+'</td><td>'+pct(r.rate3)+'</td><td>'+pct(r.rate_top3)+'</td></tr>';}
 html+='</tbody></table></div></div>';}return html;
}
function layout(index,selectItem,w,m,data){const days=[...new Set(index.map(x=>x.date))].sort().reverse(),v=[...new Set(index.map(x=>x.venue))],r=[...new Set(index.map(x=>x.race))].sort((a,b)=>a-b);
 let body='<section><h2>開催日・会場・レース</h2><form method="get" action="/"><div class="filters">';
 for(const item of [['date',days,selectItem.date],['venue',v,selectItem.venue],['race',r,selectItem.race],['winner',[1,2,3,4,5,6],w],['method',[...METHODS,'すべて'],m]])body+='<label>'+esc(({date:'開催日',venue:'会場',race:'レース',winner:'勝者コース',method:'決まり手'})[item[0]])+select(...item)+'</label>';
 body+='</div><button type="submit">分析を表示</button></form></section><section>';
 if(data){body+='<h2>'+esc(data.date)+' '+esc(data.venue)+' '+esc(data.race)+'R</h2><p class="muted">集計期間：'+esc(data.period)+'｜履歴：'+esc(data.asof)+'まで｜該当：216行</p>'+format(data,w,m);}
 else body+='<p class="muted">この開催日・会場・レースは未同期です。別の組み合わせを選ぶと表示できます。</p>';
 body+='<p class="muted">過去実績であり予測値ではありません。標本数の少ない着率は参考値です。</p><form method="post" action="/logout"><button type="submit">ログアウト</button></form></section>';return page(body);
}
export default {async fetch(req,env){if(!env.V38_LOGIN||!env.V38_SESSION||!env.V38_UPLOAD||!env.BRC_V38_KV)return json({error:'not_configured'},503);
 const url=new URL(req.url),p=url.pathname;
 if(req.method==='GET'&&p==='/style.css')return response(STYLE,200,'text/css; charset=utf-8');
 if(req.method==='POST'&&p==='/login'){const body=await req.text();if(body.length>2000)return response(login(true),400);const pass=new URLSearchParams(body).get('password')||'';if(!await same(pass,env.V38_LOGIN))return response(login(true),401);
 const time=String(Date.now()),nonce=crypto.randomUUID(),token=time+'.'+nonce+'.'+await sign(env.V38_SESSION,time+'.'+nonce);return response('',303,'text/plain',{'Location':'/','Set-Cookie':'brc_v38='+token+'; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200'});}
 if(req.method==='POST'&&p==='/logout')return response('',303,'text/plain',{'Location':'/','Set-Cookie':'brc_v38=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'});
 if(req.method==='PUT'&&p==='/api/upload'){const auth=req.headers.get('Authorization')||'';if(!auth.startsWith('Bearer ')||!await same(auth.slice(7),env.V38_UPLOAD))return json({error:'unauthorized'},401);
 const raw=await req.text();if(new TextEncoder().encode(raw).byteLength>200000)return json({error:'too_large'},413);
 let data;try{data=JSON.parse(raw);}catch(e){return json({error:'bad_json'},400);}if(!valid(data))return json({error:'invalid_schema'},422);
 const key='race:'+data.date+':'+VENUES.indexOf(data.venue)+':'+data.race;await env.BRC_V38_KV.put(key,JSON.stringify(data));
 const index=JSON.parse(await env.BRC_V38_KV.get('index')||'[]');if(!index.some(x=>x.date===data.date&&x.venue===data.venue&&x.race===data.race))index.push({date:data.date,venue:data.venue,race:data.race});await env.BRC_V38_KV.put('index',JSON.stringify(index.slice(-900)));
 return json({ok:true,rows:216});}
 if(!await loggedIn(req,env))return response(login(false),401);
 if(req.method==='GET'&&p==='/'){const index=JSON.parse(await env.BRC_V38_KV.get('index')||'[]');const latest=index.slice().sort((a,b)=>b.date.localeCompare(a.date)||a.race-b.race)[0];if(!latest)return response(page('<section>同期済みデータはまだありません。</section>'));
 const item={date:url.searchParams.get('date')||latest.date,venue:url.searchParams.get('venue')||latest.venue,race:Number(url.searchParams.get('race')||latest.race)},w=Number(url.searchParams.get('winner')||1),m=url.searchParams.get('method')||METHODS[0];
 if(!/^\d{4}-\d\d-\d\d$/.test(item.date)||!VENUES.includes(item.venue)||!Number.isInteger(item.race)||item.race<1||item.race>12||!Number.isInteger(w)||w<1||w>6||![...METHODS,'すべて'].includes(m))return json({error:'invalid_params'},400);
 const raw=await env.BRC_V38_KV.get('race:'+item.date+':'+VENUES.indexOf(item.venue)+':'+item.race);const data=raw?JSON.parse(raw):null;return response(layout(index,item,w,m,data),200,'text/html; charset=utf-8',{'Content-Security-Policy':"default-src 'none'; style-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"});}
 return json({error:'not_found'},404);
}};
