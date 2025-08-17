<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<title>ゆいきちナビ</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
:root{
  --accent:#1e90ff;--accent-2:#ff8c00;--ok:#2ecc71;--danger:#e74c3c;--ink:#111;--bg:#f7f9fc;
  --panel-w:380px;--shadow:0 12px 30px rgba(0,0,0,.12);
}
html,body{height:100%;margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,"Noto Sans JP",sans-serif;background:var(--bg);color:var(--ink)}
#app{height:100%;display:flex;flex-direction:column}

/* ==== ヘッダー（折りたたみ可能な検索バー） ==== */
header{position:relative;z-index:1600;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.06)}
header details{max-width:1400px;margin:0 auto;padding:6px 10px}
header summary{font-weight:700;cursor:pointer;list-style:none}
header summary::-webkit-details-marker{display:none}
header .controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px}
header input{padding:9px;border:1px solid #e2e8f0;border-radius:10px;min-width:220px}
header button{padding:9px 12px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;cursor:pointer}
.mode-btn.active{background:var(--accent);color:#fff;border-color:var(--accent)}

/* ==== 地図周り ==== */
#map-wrap{position:relative;flex:1;min-height:420px}
#map{position:absolute;inset:0}

/* 右サイド（候補/詳細） */
aside.sidebar{position:absolute;right:12px;top:12px;z-index:1400;background:#fff;padding:12px;border-radius:12px;box-shadow:var(--shadow);width:var(--panel-w);max-height:70vh;overflow:auto}
.sidebar.hidden{display:none}
.route-item{padding:8px;border-radius:10px;border:1px solid #eee;margin-bottom:6px;cursor:pointer}
.route-item.selected{background:var(--accent);color:#fff;border-color:var(--accent);font-weight:700}
.turn-step{padding:6px;border-bottom:1px dashed #eee}

/* HUD（左上 / 半分サイズ） */
.hud{position:absolute;left:12px;top:12px;z-index:1500;background:rgba(255,255,255,.95);padding:8px 10px;border-radius:12px;box-shadow:var(--shadow);min-width:200px;font-size:12px}
.hud .row{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
.hud .key{font-size:11px;color:#667085}
.hud .val{font-weight:700}

/* ステータス/コンパス */
#status{position:absolute;left:12px;bottom:12px;z-index:1500;background:rgba(255,255,255,.95);padding:8px 10px;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,.12)}
.compass{position:absolute;right:12px;bottom:12px;z-index:1500;background:rgba(255,255,255,.95);padding:8px;border-radius:50%;width:44px;height:44px;display:grid;place-items:center;box-shadow:0 6px 18px rgba(0,0,0,.12)}
.rotateable{transition:transform 120ms ease}

/* ルートステップ下部シート */
#route-steps{position:absolute;left:12px;right:12px;bottom:12px;background:rgba(255,255,255,.98);max-height:40%;overflow:auto;padding:12px;border-radius:12px;display:none;z-index:1501}
#route-steps ol{padding-left:18px;margin:6px 0}
#route-steps li[data-idx]{cursor:pointer;padding:6px;border-radius:6px}
#route-steps li[data-idx]:hover{background:#f0f8ff}

/* 地図内補助ボタン */
.expand-map-btn{position:absolute;right:74px;top:12px;z-index:1500;background:#fff;border-radius:8px;padding:6px 10px;border:1px solid #ddd;box-shadow:0 6px 18px rgba(0,0,0,.12);cursor:pointer}

/* デバッグコンソール */
#debug{position:absolute;right:12px;bottom:70px;width:min(42vw,520px);max-height:32vh;overflow:auto;background:#0b1220;color:#e6edf3;border-radius:10px;box-shadow:var(--shadow);padding:8px 10px;font:12px ui-monospace,SFMono-Regular,Menlo,monospace;z-index:1500;display:none}
#debug .head{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
#debug pre{white-space:pre-wrap;word-break:break-word;margin:0}

/* 吹き出し（ステップ案内） */
.bubble{background:var(--accent);color:#fff;padding:4px 6px;border-radius:6px;font-size:12px;box-shadow:0 4px 12px rgba(0,0,0,.2)}
.bubble.start{background:var(--ok)}
.bubble.end{background:var(--danger)}

/* レスポンシブ */
@media(max-width:900px){
  :root{--panel-w:92vw}
  aside.sidebar{right:4vw;top:auto;bottom:12px;max-height:46vh}
}
</style>
</head>
<body>
<div id="app">
  <!-- 折りたたみ検索バー（ヘッダー） -->
  <header>
    <details id="search-details" open>
      <summary>🔎 検索パネル（クリックで開閉）</summary>
      <div class="controls" role="search">
        <input id="from" placeholder="出発地（住所 / 緯度,経度 / 現在地）" />
        <input id="to" placeholder="目的地（住所 / 緯度,経度 / 地図クリック）" />
        <button id="swap" title="入れ替え">⇄ 入れ替え</button>
        <div id="modes">
          <button class="mode-btn active" data-mode="driving" id="m-driv">車</button>
          <button class="mode-btn" data-mode="foot" id="m-foot">徒歩</button>
          <button class="mode-btn" data-mode="bike" id="m-bike">自転車</button>
        </div>
        <button id="search">検索</button>
        <button id="set-from-map">地図で出発</button>
        <button id="set-to-map">地図で目的</button>
        <button id="start-nav">ナビ開始</button>
        <button id="stop-nav" disabled>ナビ停止</button>
        <button id="btn-reroute" title="現在地からリールート">リールート</button>
        <button id="btn-history">履歴</button>
        <button id="btn-debug">デバッグ</button>
      </div>
    </details>
  </header>

  <div id="map-wrap">
    <div id="map" aria-label="地図">地図を読み込み中…</div>

    <!-- HUD（左上 / 小さめ） -->
    <div class="hud" aria-live="polite" id="hud">
      <div class="row"><span class="key">合計距離</span><span class="val" id="hud-total-dist">—</span><span class="key">合計時間</span><span class="val" id="hud-total-time">—</span></div>
      <div class="row"><span class="key">残り距離</span><span class="val" id="hud-rem-dist">—</span><span class="key">到着まで</span><span class="val" id="hud-rem-time">—</span></div>
      <div class="row" style="gap:6px">
        <label style="font-size:11px"><input type="checkbox" id="chk-follow" checked> 追尾</label>
        <label style="font-size:11px;margin-left:8px"><input type="checkbox" id="chk-rotate" checked> コンパス回転</label>
      </div>
      <div class="row" style="font-size:11px;color:#667085" id="hud-next">次の案内 — —</div>
    </div>

    <!-- 右サイド（候補/詳細） -->
    <aside id="sidebar" class="sidebar" aria-live="polite">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-weight:700;margin-bottom:6px">ルート候補</div>
        <button id="hide-sidebar" title="閉じる" style="background:transparent;border:none;cursor:pointer">✕</button>
      </div>
      <div id="route-list" class="route-list small">— 検索して下さい —</div>
      <div style="font-weight:700;margin-top:8px">ルート詳細</div>
      <div id="turns" style="margin-top:6px">— ルートを選択してください —</div>
    </aside>

    <button id="expand-map" class="expand-map-btn" title="パネルを隠して地図を拡大">地図を大きく</button>

    <div class="compass"><div id="compass-needle">🧭</div></div>
    <div id="status">状態: 初期化中</div>

    <div id="route-steps"></div>

    <!-- デバッグコンソール -->
    <div id="debug">
      <div class="head"><strong>🪵 Debug Console</strong><div><button id="debug-clear">クリア</button></div></div>
      <pre id="debug-log"></pre>
    </div>
  </div>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js"></script>
<script>
(function(){
  // ====== 状態/定数 ======
  const state = {
    map:null, markers:{},
    routes:[], selected:-1, routeLayers:[], progressLayer:null,
    nav:false, lastSnapIdx:0, follow:true, rotate:true,
    heading:0, lastHeadingTs:0, setMode:'driving', mapClickMode:null,
    history:[],
    lastRerouteTs:0, rerouteLog:[]
  };
  const SPEED_KMH={ foot:4.8, bike:16, driving:42 };
  const els={
    details:document.getElementById('search-details'),
    from:document.getElementById('from'), to:document.getElementById('to'), swap:document.getElementById('swap'),
    modes:document.getElementById('modes'), search:document.getElementById('search'), setFromMap:document.getElementById('set-from-map'), setToMap:document.getElementById('set-to-map'),
    startNav:document.getElementById('start-nav'), stopNav:document.getElementById('stop-nav'), reroute:document.getElementById('btn-reroute'),
    routeList:document.getElementById('route-list'), turns:document.getElementById('turns'),
    status:document.getElementById('status'),
    hudTotalDist:document.getElementById('hud-total-dist'), hudTotalTime:document.getElementById('hud-total-time'),
    hudRemDist:document.getElementById('hud-rem-dist'), hudRemTime:document.getElementById('hud-rem-time'), hudNext:document.getElementById('hud-next'),
    chkFollow:document.getElementById('chk-follow'), chkRotate:document.getElementById('chk-rotate'),
    sidebar:document.getElementById('sidebar'), hideSidebarBtn:document.getElementById('hide-sidebar'),
    expandMapBtn:document.getElementById('expand-map'),
    routeSteps:document.getElementById('route-steps'),
    compass:document.getElementById('compass-needle'),
    debug:document.getElementById('debug'), debugLog:document.getElementById('debug-log'), debugClear:document.getElementById('debug-clear'),
    historyBtn:document.getElementById('btn-history')
  };

  // ====== ユーティリティ ======
  function log(...a){ const txt=a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' '); els.debugLog.textContent += `\n${new Date().toLocaleTimeString()} ${txt}`; els.debugLog.scrollTop = els.debugLog.scrollHeight; }
  function setStatus(msg,isErr){ els.status.textContent='状態: '+msg; els.status.style.color=isErr?'#e11d48':'#111'; log('[status]',msg); }
  function formatDist(m){ return m>=1000? (m/1000).toFixed(2)+' km':Math.round(m)+' m'; }
  function formatDuration(sec){ if(sec===0) return '0分'; if(!sec && sec!==0) return '-'; const s=Math.round(sec); const h=Math.floor(s/3600); const m=Math.round((s%3600)/60); return h>0?`${h}時間${m}分`:`${m}分`; }
  function etaSeconds(distanceMeters, mode){ const v=SPEED_KMH[mode]||42; return (distanceMeters/1000)/v*3600; }
  function speak(text){ try{ const u=new SpeechSynthesisUtterance(text); u.lang='ja-JP'; speechSynthesis.speak(u);}catch(e){}}
  function parseLatLon(q){ if(!q) return null; const m=q.trim().match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/); if(m) return {lat:parseFloat(m[1]), lon:parseFloat(m[2]), display_name:`${parseFloat(m[1]).toFixed(5)},${parseFloat(m[2]).toFixed(5)}`}; return null; }

  function ensureMarker(name){ if(state.markers[name]) return state.markers[name]; const m=L.marker(state.map.getCenter()).addTo(state.map); state.markers[name]=m; return m; }
  function setFrom(loc){ state.from=loc; els.from.value=loc.display_name||`${loc.lat.toFixed?.(5)||loc.lat},${loc.lon.toFixed?.(5)||loc.lon}`; ensureMarker('from').setLatLng([loc.lat,loc.lon]).bindPopup('出発').openPopup(); }
  function setTo(loc){ state.to=loc; els.to.value=loc.display_name||`${loc.lat.toFixed?.(5)||loc.lat},${loc.lon.toFixed?.(5)||loc.lon}`; ensureMarker('to').setLatLng([loc.lat,loc.lon]).bindPopup('目的地').openPopup(); }

  // ====== 地図初期化 ======
  const map=L.map('map',{center:[35.681236,139.767125],zoom:13,zoomControl:true});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
  state.map=map;

  // ====== ジオコーディング / 経路検索 ======
  async function geocode(q){
    const parsed=parseLatLon(q); if(parsed) return parsed;
    const url='https://nominatim.openstreetmap.org/search?format=json&limit=1&q='+encodeURIComponent(q);
    try{ const res=await fetch(url,{headers:{'Accept-Language':'ja'}}); if(!res.ok) throw new Error('HTTP '+res.status); const j=await res.json(); if(j&&j[0]) return {lat:+j[0].lat, lon:+j[0].lon, display_name:j[0].display_name}; }catch(e){ log('geocode fail',e.message); }
    return null;
  }
  async function fetchRoutes(from,to,mode){
    const profile = mode==='driving'?'driving':(mode==='foot'?'foot':'bicycle');
    const url=`https://router.project-osrm.org/route/v1/${profile}/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
    try{ const res=await fetch(url); if(!res.ok) throw new Error('HTTP '+res.status); const j=await res.json(); if(j&&j.code==='Ok') return j.routes; }catch(e){ log('route fail',e.message); }
    return null;
  }

  // ====== ルート描画・候補 ======
  function clearRouteLayers(){ state.routeLayers.forEach(l=>{ try{ map.removeLayer(l);}catch{} }); state.routeLayers=[]; if(state.progressLayer){ try{ map.removeLayer(state.progressLayer);}catch{} state.progressLayer=null; }
  }
  function jpInstruction(step){
    if(!step||!step.maneuver) return '直進';
    const m=step.maneuver; const type=m.type||''; const mod=m.modifier||''; const name=step.name?`（${step.name}）`:'';
    const roundaboutExit=(m.exit?`${m.exit} 番目の出口`:'');
    const dir=(x=>({'left':'左折','slight left':'やや左','sharp left':'大きく左','right':'右折','slight right':'やや右','sharp right':'大きく右','straight':'直進','uturn':'Uターン'}[x]||''))(mod);
    let text='';
    switch(type){
      case 'depart': text='出発'; break;
      case 'arrive': text='目的地に到着'; break;
      case 'turn': text=dir||'曲がる'; break;
      case 'new name': text='道なり'; break;
      case 'merge': text='合流'; break;
      case 'on ramp': text='入口から進入'; break;
      case 'off ramp': text='出口で出る'; break;
      case 'roundabout': case 'rotary': text=`環状交差点で${roundaboutExit||'目的の出口'}へ`; break;
      case 'roundabout turn': text=`環状交差点で${dir}`; break;
      case 'fork': text=`分岐で${dir}`; break;
      case 'end of road': text=`突き当たりで${dir}`; break;
      case 'continue': text='直進'; break;
      case 'use lane': text='車線に従う'; break;
      default: text='進む';
    }
    return `${text}${name}`.trim();
  }
  function drawRoutes(routes){
    clearRouteLayers(); if(!routes) return;
    routes.forEach((r,i)=>{
      const line=L.geoJSON(r.geometry,{color:i===state.selected? '#1e90ff':'#888',weight:i===state.selected?7:5,opacity:i===state.selected?0.95:0.6}).addTo(map);
      state.routeLayers.push(line);
      // ステップ吹き出しマーカー
      (r.legs?.[0]?.steps||[]).forEach((s,idx)=>{
        if(!s.maneuver||!s.maneuver.location) return;
        const [lon,lat]=s.maneuver.location;
        const cls = idx===0? 'bubble start' : (s.maneuver.type==='arrive'?'bubble end':'bubble');
        const marker=L.marker([lat,lon],{icon:L.divIcon({className:'',html:`<div class="${cls}">${jpInstruction(s)}</div>`})}).addTo(map);
        state.routeLayers.push(marker);
      });
    });
    if(state.selected>=0 && routes[state.selected]) map.fitBounds(L.geoJSON(routes[state.selected].geometry).getBounds(),{padding:[40,40]});
  }
  function updateRouteList(routes){
    els.routeList.innerHTML=''; if(!routes) return;
    routes.forEach((r,i)=>{
      const div=document.createElement('div');
      div.className='route-item'+(i===state.selected?' selected':'');
      div.textContent=`${formatDist(r.distance)} / ${formatDuration(r.duration)}`;
      div.addEventListener('click',()=>{ state.selected=i; drawRoutes(state.routes); updateRouteList(state.routes); showTurnSteps(state.routes[i]); });
      els.routeList.appendChild(div);
    });
  }
  function showTurnSteps(route){
    els.turns.innerHTML=''; if(!route) return;
    const steps=route.legs?.[0]?.steps||[];
    steps.forEach((s,idx)=>{
      const div=document.createElement('div');
      div.className='turn-step';
      div.textContent=`${idx+1}. ${jpInstruction(s)} (${formatDist(s.distance)}, ${formatDuration(s.duration)})`;
      div.addEventListener('click',()=>{
        const [lon,lat]=s.maneuver.location; map.panTo([lat,lon]);
      });
      els.turns.appendChild(div);
    });
    // 下部シートにも一覧を表示
    const items=steps.map((s,i)=>`<li data-idx="${i}"><strong>${jpInstruction(s)}</strong> <span class="small">${formatDist(s.distance)}, ${formatDuration(s.duration)}</span></li>`).join('');
    els.routeSteps.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><strong>ルート案内</strong><button id="close-steps" style="background:transparent;border:none;cursor:pointer">閉じる</button></div><ol>${items}</ol>`;
    els.routeSteps.style.display='block';
    els.routeSteps.querySelector('#close-steps').addEventListener('click',()=>{ els.routeSteps.style.display='none'; });
    els.routeSteps.querySelectorAll('li[data-idx]').forEach(li=>{
      li.addEventListener('click',()=>{ const i=+li.dataset.idx; const s=steps[i]; if(!s) return; const [lon,lat]=s.maneuver.location; map.panTo([lat,lon]); });
    });
  }

  // ====== 検索実行 ======
  async function doSearch(opts={saveHistory:true}){
    setStatus('検索中…');
    let from=state.from||await geocode(els.from.value); if(!from){ setStatus('出発地を認識できません',true); return; }
    let to=state.to||await geocode(els.to.value); if(!to){ setStatus('目的地を認識できません',true); return; }
    setFrom(from); setTo(to);
    const routes=await fetchRoutes(from,to,state.setMode||'driving');
    if(!routes||routes.length===0){ setStatus('ルート取得に失敗',true); return; }
    state.routes=routes; state.selected=0; drawRoutes(routes); updateRouteList(routes); showTurnSteps(routes[0]);
    // HUD update
    els.hudTotalDist.textContent=formatDist(routes[0].distance);
    els.hudTotalTime.textContent=formatDuration(routes[0].duration);
    els.hudRemDist.textContent=formatDist(routes[0].distance);
    els.hudRemTime.textContent=formatDuration(routes[0].duration);
    setStatus('ルート取得完了');
    // 履歴保存
    if(opts.saveHistory){ pushHistory({from:els.from.value,to:els.to.value,mode:state.setMode,ts:Date.now()}); }
  }

  // ====== 履歴 ======
  function loadHistory(){ try{ state.history = JSON.parse(localStorage.getItem('ykn_history')||'[]'); }catch{ state.history=[]; } }
  function saveHistory(){ try{ localStorage.setItem('ykn_history', JSON.stringify(state.history.slice(-100))); }catch{} }
  function pushHistory(entry){ loadHistory(); state.history.push(entry); saveHistory(); }
  function showHistory(){ loadHistory(); if(state.history.length===0){ alert('履歴はまだありません'); return; } const items=state.history.slice().reverse().map(h=>`<li data-from="${h.from}" data-to="${h.to}" data-mode="${h.mode}">${new Date(h.ts).toLocaleString()} — ${h.from} → ${h.to} [${h.mode}]</li>`).join(''); const win=window.open('', '_blank','width=360,height=480'); win.document.write(`<h3>検索履歴</h3><ul style="line-height:1.6">${items}</ul><script>document.querySelectorAll('li').forEach(li=>li.addEventListener('click',()=>{ opener.postMessage({type:'ykn-history',from:li.dataset.from,to:li.dataset.to,mode:li.dataset.mode},'*'); window.close(); }));<\/script>`); }
  window.addEventListener('message',(ev)=>{ if(ev.data&&ev.data.type==='ykn-history'){ els.from.value=ev.data.from; els.to.value=ev.data.to; state.setMode=ev.data.mode; doSearch({saveHistory:false}); } });

  // ====== 現在地・コンパス ======
  function setCurrentMarker(lat,lon,bearing){
    const html=`<div class="rotateable" style="width:22px;height:22px;border-radius:50%;background:#1e90ff;border:2px solid #fff;box-shadow:0 0 0 2px rgba(30,144,255,0.25)"></div>`;
    if(!state.markers.cur){ state.markers.cur=L.marker([lat,lon],{title:'現在地', icon:L.divIcon({html,className:'',iconSize:[22,22]})}).addTo(map); }
    state.markers.cur.setLatLng([lat,lon]);
    try{ const el=state.markers.cur.getElement().querySelector('.rotateable'); if(el) el.style.transform=`rotate(${bearing||0}deg)`;}catch(e){}
  }
  if(navigator.geolocation) navigator.geolocation.watchPosition(pos=>{
    const lat=pos.coords.latitude, lon=pos.coords.longitude;
    setCurrentMarker(lat,lon,state.heading);
    if(state.follow) map.panTo([lat,lon]);
  },err=>{ log('geo err',err.code,err.message); }, {enableHighAccuracy:true,maximumAge:2000,timeout:8000});

  function norm360(deg){ if(typeof deg!=='number' || Number.isNaN(deg)) return 0; return (deg%360+360)%360; }
  function initOrientation(){
    function handle(e){ let heading=null; if(typeof e.webkitCompassHeading==='number'){ heading=e.webkitCompassHeading; } else if(typeof e.alpha==='number'){ heading=360-e.alpha; }
      if(heading!==null){ const screenAngle=(screen.orientation&&typeof screen.orientation.angle==='number')?screen.orientation.angle:(typeof window.orientation==='number'?window.orientation:0); const corrected=norm360(heading+screenAngle); state.heading=corrected; state.lastHeadingTs=Date.now(); els.compass.style.transform=`rotate(${corrected}deg)`; } }
    if(window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission==='function'){
      document.body.addEventListener('click', function once(){ DeviceOrientationEvent.requestPermission().then(s=>{ if(s==='granted'){ window.addEventListener('deviceorientation',handle,{passive:true}); } }); document.body.removeEventListener('click',once); },{once:true});
    }else if(window.DeviceOrientationEvent){ window.addEventListener('deviceorientation',handle,{passive:true}); }
  }
  initOrientation();

  // ====== ナビ（簡易シミュレーション + リールート） ======
  function getActiveCoords(){ const r=state.routes[state.selected]; return r? r.geometry.coordinates.map(c=>[c[1],c[0]]):[]; }
  function distanceMeters(a,b){ return turf.distance(turf.point([a[1],a[0]]),turf.point([b[1],b[0]]),{units:'meters'}); }

  function startNav(){ if(!state.routes.length){ setStatus('先にルート検索をしてください',true); return; } if(state.nav) return; state.nav=true; state.lastSnapIdx=0; els.startNav.disabled=true; els.stopNav.disabled=false; speak('ナビを開始します'); simulateNav(); }
  function stopNav(){ state.nav=false; els.startNav.disabled=false; els.stopNav.disabled=true; setStatus('ナビ停止'); speak('ナビを停止しました'); }

  function simulateNav(){
    if(!state.nav) return;
    const route=state.routes[state.selected]; if(!route) return;
    const coords=getActiveCoords(); if(state.lastSnapIdx>=coords.length){ setStatus('到着しました'); speak('目的地に到着しました'); return; }
    const pos=coords[state.lastSnapIdx]; map.panTo(pos,{animate:true,duration:0.5}); setCurrentMarker(pos[0],pos[1],state.heading);
    // 残り距離/時間
    let rem=0; for(let i=state.lastSnapIdx;i<coords.length-1;i++){ rem+=distanceMeters(coords[i],coords[i+1]); }
    els.hudRemDist.textContent=formatDist(rem); els.hudRemTime.textContent=formatDuration(etaSeconds(rem,state.setMode));
    const step=route.legs[0].steps[state.lastSnapIdx]; if(step){ const inst=jpInstruction(step); els.hudNext.textContent='次: '+inst; if(state.lastSnapIdx===0 || step.maneuver.type!=='continue') speak(inst); }
    state.lastSnapIdx++; setTimeout(simulateNav,1200);
  }

  async function rerouteFromCurrent(){
    if(!state.markers.cur){ setStatus('現在地が取得できません',true); return; }
    const latlng=state.markers.cur.getLatLng(); const from={lat:latlng.lat,lon:latlng.lng,display_name:'現在地'}; const to=state.to||parseLatLon(els.to.value)||await geocode(els.to.value);
    if(!to){ setStatus('目的地を再解決できません',true); return; }
    setStatus('リールート中…'); const routes=await fetchRoutes(from,to,state.setMode||'driving');
    if(routes&&routes.length){ state.routes=routes; state.selected=0; drawRoutes(routes); updateRouteList(routes); showTurnSteps(routes[0]); setStatus('リールート完了'); state.rerouteLog.push({ts:Date.now(),lat:latlng.lat,lon:latlng.lng}); }
    else setStatus('リールート失敗',true);
  }

  // ====== イベント ======
  els.search.addEventListener('click',()=>doSearch());
  els.swap.addEventListener('click',()=>{ const a=els.from.value; els.from.value=els.to.value; els.to.value=a; });
  els.setFromMap.addEventListener('click',()=>{ state.mapClickMode='from'; setStatus('地図をタップして出発地を設定'); });
  els.setToMap.addEventListener('click',()=>{ state.mapClickMode='to'; setStatus('地図をタップして目的地を設定'); });
  map.on('click',e=>{ if(state.mapClickMode==='from'){ setFrom({lat:e.latlng.lat,lon:e.latlng.lng,display_name:`${e.latlng.lat.toFixed(5)},${e.latlng.lng.toFixed(5)}`}); state.mapClickMode=null; } else if(state.mapClickMode==='to'){ setTo({lat:e.latlng.lat,lon:e.latlng.lng,display_name:`${e.latlng.lat.toFixed(5)},${e.latlng.lng.toFixed(5)}`}); state.mapClickMode=null; } });
  document.querySelectorAll('.mode-btn').forEach(btn=>btn.addEventListener('click',()=>{ document.querySelectorAll('.mode-btn').forEach(x=>x.classList.remove('active')); btn.classList.add('active'); state.setMode=btn.dataset.mode; setStatus('移動モード: '+state.setMode); }));
  els.startNav.addEventListener('click',startNav);
  els.stopNav.addEventListener('click',stopNav);
  els.reroute.addEventListener('click',rerouteFromCurrent);
  els.chkFollow.addEventListener('change',e=>state.follow=e.target.checked);
  els.chkRotate.addEventListener('change',e=>state.rotate=e.target.checked);
  els.expandMapBtn.addEventListener('click',()=>{
    // ヘッダー/サイドバーを隠して地図を広く
    const opened = !els.sidebar.classList.contains('hidden') || els.details.open;
    els.sidebar.classList.toggle('hidden', opened);
    els.details.open = !opened ? true : false; // 一度閉じる
    if(opened){ els.expandMapBtn.textContent='コントロール表示'; els.details.open=false; }
    else { els.expandMapBtn.textContent='地図を大きく'; els.details.open=true; }
    setTimeout(()=>map.invalidateSize(),260);
  });
  els.hideSidebarBtn.addEventListener('click',()=>{ els.sidebar.classList.add('hidden'); });
  els.historyBtn.addEventListener('click',showHistory);
  document.getElementById('btn-debug').addEventListener('click',()=>{ els.debug.style.display = (els.debug.style.display==='none'||!els.debug.style.display)?'block':'none'; });
  els.debugClear.addEventListener('click',()=>{ els.debugLog.textContent=''; });

  // ====== 初期化完了 ======
  loadHistory();
  setStatus('初期化完了 — 検索して下さい');
  setTimeout(()=>map.invalidateSize(),300);
})();
</script>
</body>
</html>
