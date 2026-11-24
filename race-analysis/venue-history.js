// BRC V23: public venue-wide historical rates alongside the daily program.
(() => {
  'use strict';
  const main = document.querySelector('main');
  const venueSelect = document.getElementById('venue');
  if (!main || !venueSelect || document.getElementById('brc-v23-history')) return;

  const section = document.createElement('section');
  section.id = 'brc-v23-history';
  section.setAttribute('aria-label', 'BRC保存済み会場別の過去成績');
  section.innerHTML =
    '<h2>V23｜この会場の過去コース別成績</h2>' +
    '<p class="v23-note">BRC保存済みの結果データから集計した<b>会場全体</b>のコース傾向です。上の出走表にいる選手個人の成績・当日予測・事前1着率ではありません。集計最終日：2026年11月16日。</p>' +
    '<div class="v23-bar"><label>集計期間 <select id="v23-period"><option value="1">直近1年</option><option value="0">全期間</option><option value="2">2026年</option></select></label><a id="v23-link" href="./history-venues.html">24会場の過去分析を詳しく見る</a></div>' +
    '<p id="v23-message" role="status" aria-live="polite">保存済みコース成績を読み込み中…</p>' +
    '<div class="v23-scroll"><table><thead><tr><th>コース</th><th>出走数</th><th>1着率</th><th>2着率</th><th>3着率</th><th>3連対率</th></tr></thead><tbody id="v23-body"></tbody></table></div>' +
    '<p class="v23-note">※ 実際の進入コースは枠番と異なる場合があります。保存済み結果には表示している開催日より後のレースが含まれる場合があるため、過去日に遡った予測成績の検証には使えません。</p>';

  const style = document.createElement('style');
  style.textContent = '#brc-v23-history .v23-note{font-size:12px;color:#526e85;line-height:1.6}#brc-v23-history .v23-bar{display:flex;gap:14px;align-items:end;flex-wrap:wrap;margin:12px 0}#brc-v23-history .v23-bar a{font-size:13px}#brc-v23-history .v23-scroll{overflow-x:auto;border:1px solid #dce5ed;border-radius:7px}#brc-v23-history table{width:100%;min-width:580px;border-collapse:collapse}#brc-v23-history th,#brc-v23-history td{text-align:right;border-bottom:1px solid #e6edf3;padding:10px}#brc-v23-history th:first-child,#brc-v23-history td:first-child{text-align:center}#brc-v23-history thead{background:#e9f1f8}#brc-v23-history #v23-message{font-size:12px;color:#466b87}';
  document.head.append(style);
  main.insertBefore(section, main.querySelector('footer'));

  const periodSelect = document.getElementById('v23-period');
  const message = document.getElementById('v23-message');
  const body = document.getElementById('v23-body');
  const fullLink = document.getElementById('v23-link');
  const fmt = n => Number(n).toLocaleString('ja-JP');
  const pct = (count, total) => total > 0 ? (count * 100 / total).toFixed(1) + '%' : '—';
  let aggregate = null;

  function render() {
    const venue = Number(venueSelect.value), period = Number(periodSelect.value);
    body.replaceChildren();
    fullLink.href = './history-venues.html?venue=' + venue + '&period=' + period;
    if (!aggregate) return;
    const item = aggregate.d?.[period]?.[venue];
    if (!Array.isArray(item) || !Array.isArray(item[1]) || item[1].length !== 6) {
      message.textContent = '選択した会場の保存済みデータがありません。';
      return;
    }
    message.textContent = (aggregate.v[venue-1] || '—') + ' ／ ' + aggregate.p[period] + ' ／ 対象' + fmt(item[0]) + 'レース（2026-11-16までの保存済み結果）';
    item[1].forEach((r, i) => {
      const tr = document.createElement('tr');
      [String(i+1), fmt(r[0]), pct(r[1],r[0]), pct(r[2],r[0]), pct(r[3],r[0]), pct(r[1]+r[2]+r[3],r[0])].forEach(value => {
        const td = document.createElement('td');
        td.textContent = value;
        tr.append(td);
      });
      body.append(tr);
    });
  }

  venueSelect.addEventListener('change', render);
  document.getElementById('venues')?.addEventListener('click', render);
  periodSelect.addEventListener('change', render);
  render();

  (async () => {
    try {
      const response = await fetch('./history-venues.html', {cache:'no-store'});
      if (!response.ok) throw Error('HTTP ' + response.status);
      const html = await response.text();
      const match = html.match(/atob\("([A-Za-z0-9+/=]+)"\)/);
      if (!match || !('DecompressionStream' in window)) throw Error('保存データの形式に対応していません');
      const bytes = Uint8Array.from(atob(match[1]), c => c.charCodeAt(0));
      const data = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json();
      if (!Array.isArray(data.v) || data.v.length !== 24 || !Array.isArray(data.d) || data.d.length !== 3) throw Error('保存データを検証できません');
      aggregate = data;
      render();
    } catch (e) {
      message.textContent = '過去コース成績を読み込めませんでした。過去分析のページを開いて確認してください。';
      console.warn('BRC V23 aggregate unavailable:', e);
    }
  })();
})();