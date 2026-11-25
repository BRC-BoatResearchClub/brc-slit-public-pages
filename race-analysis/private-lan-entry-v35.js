/* BRC V35: public-page entry for a private LAN-only preview. No private payload is fetched or stored in GitHub Pages. */
(()=>{'use strict';
if(document.getElementById('brc-lan-entry-v35'))return;
const main=document.querySelector('main');if(!main)return;
const section=document.createElement('section');section.id='brc-lan-entry-v35';
section.innerHTML='<h2>非公開｜PC版の事前1着率を見る</h2>'+
'<p class="brc-v35-note">PC内のV34.1プレビューを、同じ信頼できるWi-Fiのスマホから開くための入口です。<strong>事前1着率は公開サイトに保存されていません。</strong></p>'+
'<form id="brc-v35-form" autocomplete="off">'+
'<label>PCに表示されたLANアドレス<input id="brc-v35-ip" type="text" inputmode="decimal" placeholder="例：192.168.1.10" spellcheck="false" autocomplete="off" required></label>'+
'<label>接続ポート<input id="brc-v35-port" type="number" min="1024" max="65535" value="8766" required></label>'+
'<button id="brc-v35-open" type="submit">PCの非公開画面へ移動</button></form>'+
'<p id="brc-v35-message" role="status" aria-live="polite"></p>'+
'<p class="brc-v35-note">先にPC側でV34.1の <code>--serve</code> を起動してください。移動先でPCに表示された8桁のコードを入力します。<strong>この画面にはアクセスコードを入力しないでください。</strong> 403が出た場合はPCの診断表示（PIN_MISMATCH・ORIGIN_MISMATCHなど）を確認してください。LANのHTTP通信は暗号化されません。</p>';
const style=document.createElement('style');style.textContent='#brc-lan-entry-v35{margin:12px 0;background:#f1f7fb;border:2px solid #276b93;border-radius:10px;padding:14px;color:#193b50}#brc-lan-entry-v35 h2{font-size:17px;line-height:1.3;margin:0 0 9px;color:#114868}#brc-lan-entry-v35 .brc-v35-note{font-size:12px;line-height:1.65;margin:9px 0;color:#35576b}#brc-v35-form{display:flex;flex-wrap:wrap;gap:9px;align-items:end}#brc-v35-form label{display:flex;flex-direction:column;font-size:12px;gap:4px;flex:2 1 180px}#brc-v35-form label:nth-child(2){flex:0 1 96px}#brc-v35-form input{width:100%;border:1px solid #aebfcc;border-radius:6px;background:#fff;font-size:15px;min-height:42px;padding:8px;color:#18394d}#brc-v35-open{min-height:42px;padding:9px 13px;border:0;border-radius:7px;color:#fff;background:#125c89;font-weight:700;cursor:pointer}#brc-v35-message{font-size:13px;font-weight:600;color:#9d2b36;min-height:0}#brc-lan-entry-v35 code{font-size:11px}';
document.head.append(style);main.prepend(section);
const form=document.getElementById('brc-v35-form'),ip=document.getElementById('brc-v35-ip'),port=document.getElementById('brc-v35-port'),message=document.getElementById('brc-v35-message');
function privateIpv4(s){if(typeof s!=='string'||!/^([0-9]{1,3}\.){3}[0-9]{1,3}$/.test(s))return false;const n=s.split('.').map(Number);if(n.some((x,i)=>x>255||(s.split('.')[i].length>1&&s.split('.')[i][0]==='0')))return false;return n[0]===10||(n[0]===172&&n[1]>=16&&n[1]<=31)||(n[0]===192&&n[1]===168);}
form.addEventListener('submit',e=>{e.preventDefault();const address=ip.value.trim(),p=Number(port.value);message.textContent='';
if(!privateIpv4(address)){message.textContent='PCのプライベートIPv4アドレス（例：192.168.1.10）を入力してください。';return;}
if(!Number.isInteger(p)||p<1024||p>65535){message.textContent='ポート番号は1024〜65535を指定してください。';return;}
const target='http://'+address+':'+p+'/';message.textContent='PC内の非公開画面へ移動します。認証コードは移動先で入力してください。';
window.location.assign(target);
});
})();