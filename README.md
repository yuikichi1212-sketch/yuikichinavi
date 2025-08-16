<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<title>ゆいきちナビ（完全版・モバイル最適＋フルスクリーン対応）</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
:root{--accent:#1e90ff;--bg:#f7f9fc;--ink:#111;--header-h:64px;--vh:1vh}
html,body{height:100%;margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,'Noto Sans JP',sans-serif;background:var(--bg);color:var(--ink)}
/* 100vhのiOS対策 */
body{height:calc(var(--vh)*100)}
#app{height:100%;position:relative;overflow:hidden}
/* ヘッダー（非フルスク時は表示／フルスク時は自動で隠す） */
header{position:absolute;top:env(safe-area-inset-top);left:env(safe-area-inset-left);right:env(safe-area-inset-right);z-index:2000;display:flex;gap:8px;align-items:center;padding:8px;background:#fff;border-radius:12px;box-shadow:0 6px 22px rgba(0,0,0,0.12);flex-wrap:wrap;max-width:calc(100% - 24px)}
header h1{margin:0;font-size:16px;white-space:nowrap}
.controls{display:flex;gap:8px;align-items:center;flex:1;flex-wrap:wrap}
.controls input{padding:8px;border:1px solid #ddd;border-radius:8px;width:min(260px,38vw)}
.controls button{padding:10px 12px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer}
.controls .mode-btn{padding:7px 10px;border-radius:8px}
.controls .mode-btn.active{background:var(--accent);color:#fff;border-color:var(--accent)}
/* 地図は常に全面。上にUIをオーバーレイ */
#map{position:absolute;inset:0}
/* 右側サイドバー */
aside.sidebar{position:absolute;right:12px;top:calc(var(--header-h) + 16px + env(safe-area-inset-top));z-index:1400;background:#fff;padding:12px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.14);width:360px;max-height:70vh;overflow:auto}
.route-item{padding:8px;border-radius:8px;border:1px solid #eee;margin-bottom:6px;cursor:pointer}
.route-item.selected{background:var(--accent);color:#fff;border-color:var(--accent);font-weight:700}
.turn-step{padding:6px;border-bottom:1px dashed #eee}
#status{position:absolute;left:12px;bottom:calc(90px + env(safe-area-inset-bottom));z-index:1500;background:rgba(255,255,255,0.95);padding:8px 10px;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,0.12)}
.small{font-size:12px;color:#666}
/* HUD：左上・半分サイズ／ヘッダー高に追従。フルスク時は角に吸着 */
.hud{position:absolute;left:12px;top:calc(var(--header-h) + 12px + env(safe-area-inset-top));z-index:1500;background:rgba(255,255,255,0.96);padding:8px 10px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.12);min-width:220px;transform-origin:top left;transform:scale(0.66)}
.hud .row{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
.hud .key{font-size:12px;color:#777}
.hud .val{font-weight:700}
/* フルスクトグルボタン */
.fullscreen-btn{position:absolute;right:12px;top:calc(var(--header-h) + 12px + env(safe-area-inset-top));z-index:1500;background:var(--accent);color:#fff;border:none;border-radius:10px;padding:10px 12px;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,0.18)}
/* コンパス */
.compass{position:absolute;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:1500;background:rgba(255,255,255,0.95);padding:8px;border-radius:50%;width:44px;height:44px;display:grid;place-items:center;box-shadow:0 6px 18px rgba(0,0,0,0.12)}
.compass > div{transform-origin:center center}
.rotateable{transition:transform 120ms ease}
.marker-heading{width:22px;height:22px;border-radius:50%;background:#1e90ff;border:2px solid #fff;box-shadow:0 0 0 2px rgba(30,144,255,0.25)}
.marker-heading::after{content:"";position:absolute;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:10px solid #1e90ff;top:-8px;left:5px;transform-origin:center}
.turn-marker div{pointer-events:auto}
/* 進行方向・信号などの注釈 */
.step-label{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:2px 6px;font-size:12px;box-shadow:0 6px 16px rgba(0,0,0,0.12);white-space:nowrap}
.step-label .ico{margin-right:4px}
/* モバイル：サイドバーを下部に。ヘッダーをコンパクトに。*/
@media(max-width:820px){
  header{left:8px;right:8px}
  aside.sidebar{position:static;left:0;right:0;top:auto;bottom:0;width:100%;max-height:38vh;border-radius:12px 12px 0 0}
  .hud{top:auto;bottom:calc(120px + env(safe-area-inset-bottom))}
}
/* フルスクリーン時のレイアウト調整 */
body.fullscreen header{display:none}
body.fullscreen .hud{top:calc(12px + env(safe-area-inset-top))}
body.fullscreen .fullscreen-btn{top:calc(12px + env(safe-area-inset-top))}
</style>
</head>
<body>
<div id="app">
<header>
  <h1>ゆいきちナビ</h1>
  <div class="controls" role="search">
    <input id="from" placeholder="出発地（住所 / 緯度,経度 / 現在地）" />
    <input id="to" placeholder="目的地（住所 / 緯度,経度 / 地図クリック）" />
    <button id="use-cur">現在地→出発</button>
    <button id="swap">⇄ 入れ替え</button>
    <div id="modes">
      <button class="mode-btn active" data-mode="driving" id="m-driv"> 車</button>
      <button class="mode-btn" data-mode="foot" id="m-foot"> 徒歩</button>
      <button class="mode-btn" data-mode="bike" id="m-bike"> 自転車</button>
    </div>
    <button id="search">検索</button>
    <button id="set-from-map">地図をタップして出発地セット</button>
    <button id="set-to-map">地図をタップして目的地セット</button>
    <button id="start-nav" class="primary">ゆいきちナビ開始</button>
    <button id="stop-nav" disabled>ゆいきちナビ停止</button>
  </div>
</header>

<div id="map" aria-label="地図">地図を読み込み中…</div>

<!-- 左上ミニHUD（縮小表示） -->
<div class="hud" aria-live="polite">
  <div class="row"><span class="key">合計距離</span><span class="val" id="hud-total-dist">—</span><span class="key">合計時間</span><span class="val" id="hud-total-time">—</span></div>
  <div class="row"><span class="key">残り距離</span><span class="val" id="hud-rem-dist">—</span><span class="key">到着まで</span><span class="val" id="hud-rem-time">—</span></div>
  <div class="row small" id="hud-next">次の案内 — —</div>
  <label class="small"><input type="checkbox" id="chk-follow" checked> 追尾</label>
  <label class="small" style="margin-left:5px"><input type="checkbox" id="chk-rotate" checked> コンパス回転</label>
</div>

<!-- 右側：候補とターンバイターン -->
<aside class="sidebar" aria-live="polite">
  <div style="font-weight:700;margin-bottom:6px">ルート候補</div>
  <div id="route-list" class="route-list small">— 検索して下さい —</div>
  <div style="font-weight:700;margin-top:8px">ルート詳細</div>
  <div id="turns" style="margin-top:6px">— ルートを選択してください —</div>
</aside>

<!-- フルスクトグル -->
<button class="fullscreen-btn" id="btn-fs">⛶ 全画面</button>

<!-- コンパス -->
<div class="compass"><div id="compass-needle">🧭</div></div>
<div id="status">状態: 初期化中</div>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js"></script>
<script>
// ====== 可変100vh（iOS/Safari対策） ======
function setVhVar(){ const vh=window.innerHeight*0.01; document.documentElement.style.setProperty('--vh', vh+'px'); }
setVhVar(); window.addEventListener('resize', setVhVar); window.addEventListener('orientationchange', setVhVar);

if(window._ykNavV6){console.warn('初期化済み');}else{window._ykNavV6=true;(function(){
  const app = window._navComplete = {state:{map:null,markers:{},routes:[],routeLayers:[],progressLayer:null,selected:-1,nav:false,watchId:null,heading:0,lastHeadingTs:0,setMode:'driving',mapClickMode:null,useDummy:false,lastRerouteTs:0,follow:true,rotate:true,lastSnapIdx:0, stepLayer:null}};

  const els={
    from:document.getElementById('from'), to:document.getElementById('to'), swap:document.getElementById('swap'),
    modes:document.getElementById('modes'), search:document.getElementById('search'), setFromMap:document.getElementById('set-from-map'),
    setToMap:document.getElementById('set-to-map'), routeList:document.getElementById('route-list'), turns:document.getElementById('turns'),
    status:document.getElementById('status'), startNav:document.getElementById('start-nav'), stopNav:document.getElementById('stop-nav'),
    hudTotalDist:document.getElementById('hud-total-dist'), hudTotalTime:document.getElementById('hud-total-time'),
    hudRemDist:document.getElementById('hud-rem-dist'), hudRemTime:document.getElementById('hud-rem-time'),
    hudNext:document.getElementById('hud-next'), chkFollow:document.getElementById('chk-follow'), chkRotate:document.getElementById('chk-rotate'),
    compass:document.getElementById('compass-needle'), useCur:document.getElementById('use-cur'), btnFs:document.getElementById('btn-fs')
  };

  function setStatus(msg,isErr){ els.status.textContent='状態: '+msg; els.status.style.color=isErr?'red':'black'; console.log('[nav]',msg);} 
  function formatDist(m){ return m>=1000? (m/1000).toFixed(2)+' km':Math.round(m)+' m';}
  function formatDuration(sec){ if(!sec && sec!==0) return '-'; const s=Math.round(sec); const h=Math.floor(s/3600); const m=Math.round((s%3600)/60); return h>0?`${h}時間${m}分`:`${m}分`; }

  function jpInstruction(step){
    if(!step||!step.maneuver) return '直進'; const m=step.maneuver; const type=m.type||''; const mod=m.modifier||''; const name=step.name? `（${step.name}）` : '';
    const roundaboutExit = (m.exit? `${m.exit} 番目の出口` : '');
    const dir = (x=>({'left':'左方向','slight left':'やや左方向','sharp left':'大きく左方向','right':'右方向','slight right':'やや右方向','sharp right':'大きく右方向','straight':'直進','uturn':'Uターン'}[x]||''))(mod);
    let text=''; switch(type){
      case 'depart': text='出発'; break;
      case 'arrive': text='目的地に到着'; break;
      case 'turn': text=dir||'曲がる'; break;
      case 'new name': text='道なりに進む'; break;
      case 'merge': text='合流'; break;
      case 'on ramp': text='入口から進入'; break;
      case 'off ramp': text='出口で出る'; break;
      case 'roundabout': case 'rotary': text = `環状交差点で${roundaboutExit||'目的の出口'}へ`; break;
      case 'roundabout turn': text = `環状交差点で${dir}`; break;
      case 'fork': text=`分岐で${dir}`; break;
      case 'end of road': text=`突き当たりで${dir}`; break;
      case 'continue': text='直進'; break;
      case 'use lane': text='車線に従う'; break;
      default: text='進む';
    }
    const hasSignal = !!(step.intersections||[]).find(ix=>ix.traffic_signal);
    return `${text}${name}${hasSignal?'（信号あり）':''}`.trim();
  }

  function stepIcon(step){
    const type=step?.maneuver?.type; const mod=step?.maneuver?.modifier;
    const hasSignal = !!(step?.intersections||[]).find(ix=>ix.traffic_signal);
    const dirIcoMap={left:'↰','slight left':'↖','sharp left':'⤶',right:'↱','slight right':'↗','sharp right':'⤷',straight:'↑',uturn:'⤺'};
    const turnIco = dirIcoMap[mod||'straight']||'↑';
    if(type==='arrive') return '🏁';
    if(hasSignal) return '🚦';
    if(type==='roundabout'||type==='rotary') return '🛝';
    if(type==='fork') return '⤴︎';
    if(type==='merge') return '⤵︎';
    if(type==='turn'||type==='continue'||type==='end of road'||type==='new name') return turnIco;
    return '⬚';
  }

  // ====== 地図初期化 ======
  function initMap(){
    if(app.state.map) return app.state.map;
    const map=L.map('map',{center:[35.681236,139.767125],zoom:5});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19, attribution:'© OpenStreetMap contributors'}).addTo(map);
    app.state.map=map;
    map.on('click',e=>{
      if(app.state.mapClickMode==='from'){ setFrom({lat:e.latlng.lat, lon:e.latlng.lng, display_name:`${e.latlng.lat.toFixed(5)},${e.latlng.lng.toFixed(5)}`}); app.state.mapClickMode=null; setStatus('地図で出発地を設定しました'); }
      else if(app.state.mapClickMode==='to'){ setTo({lat:e.latlng.lat, lon:e.latlng.lng, display_name:`${e.latlng.lat.toFixed(5)},${e.latlng.lng.toFixed(5)}`}); app.state.mapClickMode=null; setStatus('地図で目的地を設定しました'); }
    });
    return map;
  }
  const map = initMap();

  // ヘッダー高さ→CSS変数
  function updateHeaderHeight(){
    const h=document.querySelector('header');
    const hh=h?.getBoundingClientRect().height||64;
    document.documentElement.style.setProperty('--header-h', hh+'px');
    setTimeout(()=>map.invalidateSize(),50);
  }
  window.addEventListener('resize', updateHeaderHeight);
  window.addEventListener('load', updateHeaderHeight);
  setTimeout(updateHeaderHeight, 80);

  function ensureMarker(name){ if(app.state.markers[name]) return app.state.markers[name]; const m=L.marker(map.getCenter()).addTo(map); app.state.markers[name]=m; return m; }
  function setFrom(loc){ app.state.from=loc; els.from.value=loc.display_name||`${loc.lat.toFixed(5)},${loc.lon.toFixed(5)}`; const m=ensureMarker('from'); m.setLatLng([loc.lat,loc.lon]).bindPopup('出発').openPopup(); }
  function setTo(loc){ app.state.to=loc; els.to.value=loc.display_name||`${loc.lat.toFixed(5)},${loc.lon.toFixed(5)}`; const m=ensureMarker('to'); m.setLatLng([loc.lat,loc.lon]).bindPopup('目的地').openPopup(); }

  function setCurrentMarker(lat,lon,bearing){
    const html=`<div class="marker-heading rotateable" style="position:relative;"></div>`;
    if(!app.state.markers.cur){ app.state.markers.cur=L.marker([lat,lon],{title:'現在地', icon:L.divIcon({html,className:'',iconSize:[22,22]})}).addTo(map); }
    app.state.markers.cur.setLatLng([lat,lon]);
    try{ const el=app.state.markers.cur.getElement().querySelector('.rotateable'); if(el) el.style.transform=`rotate(${bearing||0}deg)`;}catch(e){}
  }

  function parseLatLon(q){ if(!q) return null; const m=q.trim().match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/); if(m) return {lat:parseFloat(m[1]), lon:parseFloat(m[2]), display_name:`${parseFloat(m[1]).toFixed(5)},${parseFloat(m[2]).toFixed(5)}`}; return null; }
  async function geocode(q){ const parsed=parseLatLon(q); if(parsed) return parsed; const url='https://nominatim.openstreetmap.org/search?format=json&limit=5&q='+encodeURIComponent(q); try{ const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(),8000); const res=await fetch(url,{signal:ctrl.signal, headers:{'Accept-Language':'ja'}}); clearTimeout(t); if(!res.ok) throw new Error('HTTP '+res.status); const j=await res.json(); if(j&&j.length>0) return {lat:parseFloat(j[0].lat), lon:parseFloat(j[0].lon), display_name:j[0].display_name}; return null;}catch(e){console.warn('geocode fail',e); return null;} }

  // ====== ルート取得（リトライ＆フォールバック） ======
  const OSRM_BASES={
    driving:['https://router.project-osrm.org','https://routing.openstreetmap.de/routed-car'],
    foot:['https://router.project-osrm.org','https://routing.openstreetmap.de/routed-foot'],
    bike:['https://router.project-osrm.org','https://routing.openstreetmap.de/routed-bicycle']
  };

  async function fetchWithRetry(urls, timeoutMs=12000){
    for(const url of urls){
      try{
        const ctrl=new AbortController();
        const id=setTimeout(()=>ctrl.abort(), timeoutMs);
        const res=await fetch(url,{signal:ctrl.signal,mode:'cors'});
        clearTimeout(id);
        if(res.ok){ return await res.json(); }
      }catch(e){ console.warn('route fetch fail', url, e); }
    }
    throw new Error('all route backends failed');
  }

  async function fetchRoutes(from,to,mode){
    const profile = mode==='driving'?'driving':mode==='foot'?'foot':'bike';
    const bases = OSRM_BASES[profile]||OSRM_BASES.driving;
    const urls = bases.map(base=>{
      const p = base.includes('routing.openstreetmap.de') ? (profile==='bike'?'bicycle':profile) : (profile==='bike'?'bicycle':profile);
      const baseUrl = base.includes('routing.openstreetmap.de') ? `${base}/route/v1` : `${base}/route/v1`;
      return `${baseUrl}/${p}/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
    });
    const j = await fetchWithRetry(urls);
    if(j&&j.code==='Ok'&&j.routes&&j.routes.length>0) return j.routes; 
    return null;
  }

  const SPEED_KMH={ foot:4.8, bike:16, driving:42 };
  function etaSeconds(distanceMeters, mode){ const v=SPEED_KMH[mode]||42; return (distanceMeters/1000)/v*3600; }

  function clearStepLayer(){ if(app.state.stepLayer){ try{ map.removeLayer(app.state.stepLayer);}catch{}; app.state.stepLayer=null; } }
  function clearRouteLayers(){ app.state.routeLayers.forEach(l=>{try{map.removeLayer(l);}catch{} }); if(app.state.progressLayer){try{map.removeLayer(app.state.progressLayer);}catch{}; app.state.progressLayer=null;} app.state.routeLayers=[]; }

  function drawRoutes(routes){
    clearRouteLayers();
    if(!routes) return;
    const varAccent = getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#1e90ff';
    routes.forEach((r,i)=>{
      const line=L.geoJSON(r.geometry,{style:{color:i===app.state.selected?varAccent.trim():'#9aa4b2',weight:i===app.state.selected?7:5,opacity:i===app.state.selected?0.9:0.6}}).addTo(map);
      app.state.routeLayers.push(line);
    });
    if(app.state.selected>=0 && routes[app.state.selected]){
      const b=L.geoJSON(routes[app.state.selected].geometry).getBounds();
      map.fitBounds(b,{padding:[40,40]});
      els.hudTotalDist.textContent=formatDist(routes[app.state.selected].distance);
      els.hudTotalTime.textContent=formatDuration(routes[app.state.selected].duration);
    }
  }

  function updateRouteList(routes){
    els.routeList.innerHTML=''; if(!routes) return; routes.forEach((r,i)=>{
      const div=document.createElement('div'); div.className='route-item'+(i===app.state.selected?' selected':''); div.textContent=`${formatDist(r.distance)} / ${formatDuration(r.duration)}`; div.addEventListener('click',()=>{ app.state.selected=i; drawRoutes(app.state.routes); updateRouteList(app.state.routes); showTurnSteps(app.state.routes[i]); }); els.routeList.appendChild(div);
    });
  }

  function showTurnSteps(route){
    els.turns.innerHTML=''; if(!route) return;
    route.legs[0].steps.forEach((s,idx)=>{
      const div=document.createElement('div'); div.className='turn-step'; div.textContent=`${idx+1}. ${jpInstruction(s)} (${formatDist(s.distance)}, ${formatDuration(s.duration)})`;
      els.turns.appendChild(div);
    });
  }

  function makeStepAnnotations(route){
    clearStepLayer();
    if(!route) return;
    const g=L.layerGroup();
    route.legs[0].steps.forEach((s)=>{
      if(!s.maneuver||!s.maneuver.location) return;
      const [lon,lat]=s.maneuver.location;
      const ico=stepIcon(s);
      const html=`<div class=\"step-label\"><span class=\"ico\">${ico}</span>${jpInstruction(s)}</div>`;
      L.marker([lat,lon],{icon:L.divIcon({className:'',html,iconSize:null})}).addTo(g);
    });
    g.addTo(map); app.state.stepLayer=g;
  }

  async function doSearch(){
    setStatus('検索中…');
    let from=app.state.from||await geocode(els.from.value); if(!from){ setStatus('出発地を認識できません',true); return; }
    let to=app.state.to||await geocode(els.to.value); if(!to){ setStatus('目的地を認識できません',true); return; }
    setFrom(from); setTo(to);
    const mode=app.state.setMode||'driving';
    try{
      const routes=await fetchRoutes(from,to,mode);
      if(!routes){ setStatus('ルート取得に失敗',true); return; }
      app.state.routes=routes; app.state.selected=0; drawRoutes(routes); updateRouteList(routes); showTurnSteps(routes[0]);
      setStatus('ルート取得完了');
    }catch(e){ setStatus('ルート取得に失敗（通信不安定）',true); }
  }

  els.search.addEventListener('click',doSearch);
  els.swap.addEventListener('click',()=>{ const f=els.from.value; els.from.value=els.to.value; els.to.value=f; const tmp=app.state.from; app.state.from=app.state.to; app.state.to=tmp; });
  els.useCur.addEventListener('click',()=>{
    if(app.state.markers.cur){ const ll=app.state.markers.cur.getLatLng(); setFrom({lat:ll.lat, lon:ll.lng, display_name:`現在地(${ll.lat.toFixed(5)},${ll.lng.toFixed(5)})`}); setStatus('現在地を出発地に設定'); }
    else setStatus('現在地がまだ取得できていません',true);
  });

  els.setFromMap.addEventListener('click',()=>{ app.state.mapClickMode='from'; setStatus('地図をタップして出発地を指定') });
  els.setToMap.addEventListener('click',()=>{ app.state.mapClickMode='to'; setStatus('地図をタップして目的地を指定') });

  els.modes.querySelectorAll('.mode-btn').forEach(b=>{
    b.addEventListener('click',()=>{ els.modes.querySelectorAll('.mode-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); app.state.setMode=b.dataset.mode; });
  });

  // ====== ナビ簡易シミュレーション ======
  els.startNav.addEventListener('click',()=>{
    if(!app.state.routes||app.state.routes.length===0){ setStatus('ルートがありません',true); return; }
    app.state.nav=true; els.startNav.disabled=true; els.stopNav.disabled=false; setStatus('ナビ開始');
    app.state.lastSnapIdx=0;
    makeStepAnnotations(app.state.routes[app.state.selected]);
    simulateNav();
    try{ if('wakeLock' in navigator){ navigator.wakeLock.request('screen').catch(()=>{}); } }catch{}
  });

  els.stopNav.addEventListener('click',()=>{ app.state.nav=false; els.startNav.disabled=false; els.stopNav.disabled=true; setStatus('ナビ停止'); clearStepLayer(); });

  function simulateNav(){
    if(!app.state.nav) return;
    const route=app.state.routes[app.state.selected]; if(!route) return;
    const coords=route.geometry.coordinates.map(c=>[c[1],c[0]]);
    if(app.state.lastSnapIdx>=coords.length) { setStatus('到着しました'); return; }
    const pos=coords[app.state.lastSnapIdx]; setCurrentMarker(pos[0],pos[1],app.state.heading);
    if(app.state.follow) map.panTo(pos,{animate:true});
    // 残距離
    let remainingDist=0; for(let i=app.state.lastSnapIdx;i<coords.length-1;i++){ const a=coords[i], b=coords[i+1]; remainingDist += turf.distance(turf.point([a[1],a[0]]), turf.point([b[1],b[0]]), {units:'meters'}); }
    els.hudRemDist.textContent=formatDist(remainingDist);
    els.hudRemTime.textContent=formatDuration(etaSeconds(remainingDist,app.state.setMode));
    const nextStep=route.legs[0].steps.find(s=>{ const loc=s.maneuver?.location; if(!loc) return false; const [lon,lat]=loc; const d=turf.distance(turf.point([lon,lat]), turf.point([pos[1],pos[0]]), {units:'meters'}); return d>0; });
    els.hudNext.textContent=nextStep?`次: ${jpInstruction(nextStep)} (${formatDist(nextStep.distance)}, ${formatDuration(nextStep.duration)})`:'次の案内 — —';
    app.state.lastSnapIdx++; setTimeout(simulateNav,1200);
  }

  // ====== HUDチェックボックス ======
  els.chkFollow.addEventListener('change',()=>{ app.state.follow=els.chkFollow.checked; });
  els.chkRotate.addEventListener('change',()=>{ app.state.rotate=els.chkRotate.checked; });

  // ====== 位置・方位 ======
  if(navigator.geolocation) navigator.geolocation.watchPosition(pos=>{
    const lat=pos.coords.latitude, lon=pos.coords.longitude;
    setCurrentMarker(lat,lon,app.state.heading);
    if(app.state.follow) map.panTo([lat,lon]);
  },e=>{console.warn('geo error',e);}, {enableHighAccuracy:true,maximumAge:1000,timeout:5000});

  if(window.DeviceOrientationEvent) window.addEventListener('deviceorientation',e=>{
    const alpha=e.alpha||0; app.state.heading=alpha;
    if(app.state.rotate){ els.compass.style.transform=`rotate(${-alpha}deg)`; }
  });

  // ====== フルスクリーン切替 ======
  function onFsChange(){ const fs = !!document.fullscreenElement; document.body.classList.toggle('fullscreen', fs); els.btnFs.textContent = fs ? '⤢ 解除' : '⛶ 全画面'; setTimeout(()=>map.invalidateSize(),120); }
  els.btnFs.addEventListener('click',()=>{
    const elem=document.getElementById('app');
    if(!document.fullscreenElement){ elem.requestFullscreen?.(); }
    else{ document.exitFullscreen?.(); }
  });
  document.addEventListener('fullscreenchange', onFsChange);

  // ダブルタップでフルスク（モバイルUX）
  let lastTap=0; document.getElementById('map').addEventListener('touchend',()=>{ const now=Date.now(); if(now-lastTap<300){ els.btnFs.click(); } lastTap=now; },{passive:true});

  // 画面回転時・サイズ変更時に地図調整
  ['resize','orientationchange'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(()=>map.invalidateSize(),120)));
})();}
</script>
</body>
</html>
