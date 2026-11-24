/* BRC V28: snapshot freshness and supported-period selector. No BRC data or task writes. */
(() => {
  'use strict';
  const main=document.querySelector('main'), venuePeriod=document.getElementById('v23-period');
  if(!main || document.getElementById('brc-v28-status'))return;

  const section=document.createElement('section');
  section.id='brc-v28-status';
  section.innerHTML=
    '<h2>V30｜集計期間・データ更新状況</h2>'+
    '<p id="v28-source-status" role="status" aria-live="polite">保存済みデータの最終日を確認中…</p>'+
    '<div class="v28-data-row"><label for="v28-venue-period">会場全体の過去コース成績 <select id="v28-venue-period">'+
    '<option value="1">直近1年</option><option value="2">2026年</option><option value="0">全期間</option></select></label>'+
    '<a id="v28-history" href="./history-venues.html">選択期間の24会場分析へ</a></div>'+
    '<p class="v28-note"><strong>選手個人の最新3期間はV30の欄をご覧ください。</strong>上の期間切替はV23の「会場全体の過去コース成績」だけを変更します。'+
    '最新の選手別3期間はV30で確認できます。</p>'+
    '<p class="v28-note">GitHub PagesではBRCの保存済み集計は自動更新されません。'+
    '当日出走表の外部API再取得とは別の仕組みです。</p>';
  const style=document.createElement('style');
  style.textContent=
    '#brc-v28-status{border-top:3px solid #4679a1}#brc-v28-status .v28-data-row{display:none!important}'+
    '#brc-v28-status .v28-data-row{display:flex;align-items:end;gap:14px;flex-wrap:wrap;margin:12px 0}'+
    '#brc-v28-status label{display:flex;flex-direction:column;gap:5px}'+
    '#brc-v28-status select{padding:9px;min-height:42px;max-width:100%}'+
    '#brc-v28-status .v28-data-row a{font-size:13px;margin-bottom:9px}'+
    '#brc-v28-status .v28-note{font-size:12px;line-height:1.65;color:#536d82}'+
    '#brc-v28-status #v28-source-status{background:#f1f5fa;padding:10px;border-radius:6px;line-height:1.55}';
  document.head.append(style);
  const anchor=document.getElementById('brc-v24-players')||document.getElementById('brc-v23-history')||main.querySelector('footer');
  if(anchor)main.insertBefore(section,anchor);else main.append(section);

  const status=document.getElementById('v28-source-status');
  const selector=document.getElementById('v28-venue-period');
  const history=document.getElementById('v28-history');
  const venue=document.getElementById('venue');
  let ready=false;

  function link(){
    const number=Number(venue?.value);
    history.href='./history-venues.html?venue='+((number>=1&&number<=24)?number:0)+'&period='+selector.value;
  }
  if(venuePeriod){
    selector.value=venuePeriod.value;
    selector.addEventListener('change',()=>{
      venuePeriod.value=selector.value;
      venuePeriod.dispatchEvent(new Event('change',{bubbles:true}));
      link();
    });
    venuePeriod.addEventListener('change',()=>{selector.value=venuePeriod.value;link();});
  } else {
    selector.disabled=true;
    status.textContent='会場別期間切替の画面が見つかりません。元の過去分析ページを利用してください。';
  }
  venue?.addEventListener('change',link);link();

  function jstToday(){
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const value=Object.fromEntries(parts.map(x=>[x.type,x.value]));
    return value.year+'-'+value.month+'-'+value.day;
  }
  const utcDay=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw Error('invalid_date');return Date.parse(s+'T00:00:00Z');};

  (async()=>{
    try {
      const response=await fetch('./v30-snapshot.json',{cache:'no-store'});
      if(!response.ok)throw Error('HTTP '+response.status);
      const data=await response.json();
      if(data.schema!=='BRC_RACE_ANALYSIS_SNAPSHOT_V1' ||
         data.racer_data?.races!==56023 ||
         data.racer_data?.players!==1664 ||
         data.racer_data?.boat_entries!==335549 ||
         data.racer_data?.through!=='2026-11-24' ||
         data.venue_data?.through!=='2026-11-16' ||
         data.auto_updates_enabled!==false)throw Error('unexpected_snapshot');
      const days=Math.round((utcDay(jstToday())-utcDay(data.racer_data.through))/86400000);
      status.textContent='選手別全国・当地データ：'+data.racer_data.from+'〜'+data.racer_data.through+
        '（56,023レース／1,664選手） ／ 最終集計日から'+Math.max(0,days)+'日経過。'+
        '独立照合：'+data.nationwide_venue_count_comparison.values_checked.toLocaleString('ja-JP')+'項目一致。'+
        'BRC選手別データの日次自動更新：未設定。';
      ready=true;
    } catch(e) {
      status.textContent='データ管理情報を確認できません。現在の選手別集計は2026年11月16日で固定です。表示内容を最新情報と誤認しないでください。';
      console.warn('BRC V28 manifest unavailable',e);
    }
  })();
})();