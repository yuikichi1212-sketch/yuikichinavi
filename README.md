<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<title>ゆいきちナビ</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
:root{--accent:#1e90ff;--bg:#f7f9fc;--ink:#111}
html,body{height:100%;margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,'Noto Sans JP',sans-serif;background:var(--bg);color:var(--ink)}
#app{height:100%;display:flex;flex-direction:column}
header{display:flex;gap:8px;align-items:center;padding:8px;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,0.06);flex-wrap:wrap;z-index:2000;position:relative}
header h1{margin:0;font-size:16px}
.controls{display:flex;gap:8px;align-items:center;flex:1;flex-wrap:wrap}
.controls input{padding:8px;border:1px solid #ddd;border-radius:8px;width:220px}
.controls button{padding:10px 12px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer;margin-bottom:4px;}
.controls .mode-btn{padding:7px 10px;border-radius:8px}
.controls .mode-btn.active{background:var(--accent);color:#fff;border-color:var(--accent)}
#map{flex:1;min-height:420px;position:relative}
aside.sidebar{position:absolute;right:12px;top:72px;z-index:1400;background:#fff;padding:12px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.12);width:360px;max-height:70vh;overflow:auto}
.route-item{padding:8px;border-radius:8px;border:1px solid #eee;margin-bottom:6px;cursor:pointer}
.route-item.selected{background:var(--accent);color:#fff;border-color:var(--accent);font-weight:700}
.turn-step{padding:6px;border-bottom:1px dashed #eee}
#status{position:absolute;left:12px;bottom:110px;z-index:1500;background:rgba(255,255,255,0.97);padding:8px;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,0.12)}
.small{font-size:12px;color:#666}
.hud{position:absolute;left:12px;top:12px;z-index:1500;background:rgba(255,255,255,0.96);padding:8px 10px;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,0.12);min-width:180px;}
.hud .row{display:flex;justify-content:space-between;gap:8px;margin-bottom:6px}
.hud .key{font-size:11px;color:#777}
.hud .val{font-weight:700;font-size:13px}
.compass{position:absolute;right:12px;bottom:12px;z-index:1500;background:rgba(255,255,255,0.95);padding:8px;border-radius:50%;width:44px;height:44px;display:grid;place-items:center;box-shadow:0 6px 18px rgba(0,0,0,0.12)}
.compass > div{transition:transform 150ms ease}
.leaflet-tooltip.turn-label{font-size:12px;padding:2px 6px;background:rgba(255,255,255,0.95);border:1px solid #ccc;border-radius:6px;white-space:nowrap}
.leaflet-tooltip.turn-label.highlight{background:var(--accent);color:#fff;border-color:var(--accent);font-weight:700;transform:scale(1.08)}
.step-marker-small{font-size:12px;padding:2px 6px;border-radius:6px}
.fullscreen{position:fixed;inset:0;z-index:9999}
@media(max-width:800px){
  aside.sidebar{position:static;width:100%;max-height:220px;border-radius:0}
  .hud{top:auto;bottom:120px}
  .controls{flex-direction:column;gap:6px}
  .controls input{width:100%}
}
</style>
</head>
<body>
<div id="app">
<header>
  <h1>ゆいきちナビ</h1>
  <div class="controls" role="search">
    <input id="from" placeholder="出発地（緯度,経度 または 空欄で現在地）" />
    <input id="to" placeholder="目的地（緯度,経度 / 地図で設定可能）" />
    <button id="swap">⇄ 入れ替え</button>
    <div id="modes">
      <button class="mode-btn active" data-mode="driving">車</button>
      <button class="mode-btn" data-mode="foot">徒歩</button>
      <button class="mode-btn" data-mode="bike">自転車</button>
    </div>
    <button id="search">検索</button>
    <button id="set-from-map">地図で出発地</button>
    <button id="set-to-map">地図で目的地</button>
    <button id="use-cur">現在地→出発</button>
    <button id="start-nav">ナビ開始</button>
    <button id="stop-nav" disabled>ナビ停止</button>
    <button id="fs">⛶ 全画面</button>
  </div>
</header>

<div id="map"></div>

<div class="hud" aria-live="polite">
  <div class="row"><div class="key">合計距離</div><div class="val" id="hud-total-dist">—</div></div>
  <div class="row"><div class="key">合計時間</div><div class="val" id="hud-total-time">—</div></div>
  <div class="row"><div class="key">残り距離</div><div class="val" id="hud-rem-dist">—</div></div>
  <div class="row"><div class="key">到着まで</div><div class="val" id="hud-rem-time">—</div></div>
  <div class="row"><div class="key">次の案内</div><div class="val" id="hud-next">—</div></div>
</div>

<aside class="sidebar" aria-live="polite">
  <div style="font-weight:700;margin-bottom:6px">ルート詳細</div>
  <div id="turns" style="margin-top:6px">— ルートを検索してください —</div>
</aside>

<div class="compass"><div id="compass-needle">🧭</div></div>
<div id="status">状態: 初期化中</div>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js"></script>
<script>
/* ---------- 初期設定 ---------- */
const map = L.map('map',{zoomControl:true}).setView([35.6812,139.7671],14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors'}).addTo(map);

let state = {
  from: null,
  to: null,
  mode: 'driving',
  route: null,
  routeLayer: null,
  stepMarkers: [], // {marker, stepIndex}
  steps: [],
  nav: false,
  watchId: null,
  nextStepIndex: 0,
  lastSpokenIndex: -1,
  follow: true,
  highlightRadius: 25 // m
};

// Speech
const synth = window.speechSynthesis;
function speak(text){
  if(!synth) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP';
  synth.cancel();
  synth.speak(u);
}

/* ---------- ヘルパー ---------- */
function setStatus(msg, err=false){ const el=document.getElementById('status'); el.textContent='状態: '+msg; el.style.color=err?'#b00':'#000'; console.log('[status]',msg); }
function formatDist(m){ return m>=1000? (m/1000).toFixed(2)+' km' : Math.round(m)+' m'; }
function formatTime(sec){ if(!sec && sec!==0) return '-'; const s=Math.round(sec); const h=Math.floor(s/3600); const m=Math.round((s%3600)/60); return h>0?`${h}時間${m}分`:`${m}分`; }
function parseLatLng(input){
  if(!input) return null;
  const parts = input.split(',').map(x=>x.trim());
  if(parts.length>=2 && !isNaN(parts[0]) && !isNaN(parts[1])) return [parseFloat(parts[0]), parseFloat(parts[1])];
  return null;
}

/* ---------- UI イベント ---------- */
// mode buttons
document.querySelectorAll('.mode-btn').forEach(btn=>{
  btn.addEventListener('click', ()=> {
    document.querySelectorAll('.mode-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.mode;
    setStatus('移動モード: '+state.mode);
  });
});

// map click set from/to
let mapClickMode = null;
map.on('click', e=>{
  if(mapClickMode==='from'){
    const lat=e.latlng.lat, lng=e.latlng.lng;
    document.getElementById('from').value = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    mapClickMode=null;
    setStatus('出発地を地図から設定しました');
  } else if(mapClickMode==='to'){
    const lat=e.latlng.lat, lng=e.latlng.lng;
    document.getElementById('to').value = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    mapClickMode=null;
    setStatus('目的地を地図から設定しました');
  }
});
document.getElementById('set-from-map').addEventListener('click', ()=>{ mapClickMode='from'; setStatus('地図をタップして出発地を指定'); });
document.getElementById('set-to-map').addEventListener('click', ()=>{ mapClickMode='to'; setStatus('地図をタップして目的地を指定'); });

// swap
document.getElementById('swap').addEventListener('click', ()=>{
  const f=document.getElementById('from').value, t=document.getElementById('to').value;
  document.getElementById('from').value = t; document.getElementById('to').value = f;
  setStatus('出発地と目的地を入れ替えました');
});

// use current location as from
document.getElementById('use-cur').addEventListener('click', ()=>{
  if(!navigator.geolocation){ alert('この端末は位置情報を提供できません'); return; }
  navigator.geolocation.getCurrentPosition(pos=>{
    const lat=pos.coords.latitude, lng=pos.coords.longitude;
    document.getElementById('from').value = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    map.setView([lat,lng],15);
    L.circleMarker([lat,lng],{radius:6,color:'#1e90ff',fill:true,fillOpacity:0.9}).addTo(map).bindPopup('現在地');
    setStatus('現在地を出発地に設定しました');
  }, err=> setStatus('現在地取得失敗', true));
});

// fullscreen
document.getElementById('fs').addEventListener('click', ()=>{
  document.getElementById('app').classList.toggle('fullscreen');
  setTimeout(()=>map.invalidateSize(),300);
});

/* ---------- ルート取得（OSRM） ---------- */
async function fetchRoute(fromLatLng, toLatLng, mode='driving'){
  // OSRM profile mapping: driving, foot, bike -> driving, foot, bicycle
  const profile = mode==='foot'?'foot':(mode==='bike'?'bicycle':'driving');
  const url = `https://router.project-osrm.org/route/v1/${profile}/${fromLatLng[1]},${fromLatLng[0]};${toLatLng[1]},${toLatLng[0]}?overview=full&geometries=geojson&steps=true&alternatives=false`;
  setStatus('ルート取得中…');
  const resp = await fetch(url);
  if(!resp.ok) throw new Error('HTTP '+resp.status);
  const data = await resp.json();
  if(!data.routes || !data.routes.length) throw new Error('route not found');
  return data.routes[0];
}

/* ---------- ルート表示 & ターンラベル作成 ---------- */
function clearRoute(){
  if(state.routeLayer){ map.removeLayer(state.routeLayer); state.routeLayer=null; }
  state.stepMarkers.forEach(o=>{ try{ map.removeLayer(o.marker); }catch{} });
  state.stepMarkers = [];
  state.steps = [];
  state.route = null;
  state.nextStepIndex = 0;
  state.lastSpokenIndex = -1;
  document.getElementById('turns').innerHTML = '';
}

function showRoute(route){
  clearRoute();
  state.route = route;
  state.routeLayer = L.geoJSON(route.geometry, {color:'#1e90ff', weight:5, opacity:0.85}).addTo(map);
  map.fitBounds(state.routeLayer.getBounds(), {padding:[40,40]});

  // gather steps
  const steps = [];
  route.legs.forEach(leg=>{
    leg.steps.forEach(step => steps.push(step));
  });
  state.steps = steps;

  // draw small markers + turn labels, build turns list
  const turnsEl = document.getElementById('turns');
  turnsEl.innerHTML = '';
  steps.forEach((s, idx)=>{
    const [lon, lat] = s.maneuver.location;
    const tooltip = L.marker([lat,lon], {
      icon: L.divIcon({className: 'step-marker-small', html: `<div>${s.maneuver.instruction}</div>`, iconSize: null})
    }).addTo(map);
    // attach a tooltip for styling (we'll use a tooltip instead of permanent tooltip to allow styling)
    tooltip.bindTooltip(s.maneuver.instruction, {permanent:true, direction:'top', className:'turn-label'}).openTooltip();
    state.stepMarkers.push({marker: tooltip, idx});
    // list item
    const li = document.createElement('div'); li.className='turn-step';
    li.textContent = `${idx+1}. ${s.maneuver.instruction} (${formatDist(s.distance)}, ${formatTime(s.duration)})`;
    turnsEl.appendChild(li);
  });

  // HUD total
  document.getElementById('hud-total-dist').textContent = formatDist(route.distance);
  document.getElementById('hud-total-time').textContent = formatTime(route.duration);
  setStatus('ルート取得完了');
}

/* ---------- 最寄りステップ検索（turf） ---------- */
function findNearestOnRoute(ptLngLat){
  // returns object {index, distanceToStepMeters, step}
  if(!state.route) return null;
  const line = state.route.geometry;
  const pt = turf.point([ptLngLat[1], ptLngLat[0]]);
  // nearest point on the entire route line
  const snapped = turf.nearestPointOnLine(line, pt, {units:'meters'});
  const snappedCoord = snapped.geometry.coordinates; // [lng,lat]
  // find nearest step by comparing to step maneuver locations
  let bestIdx = 0, bestDist = Infinity;
  state.steps.forEach((st, i)=>{
    const [lon,lat] = st.maneuver.location;
    const d = turf.distance(turf.point([lon,lat]), turf.point(snappedCoord),'meters');
    if(d < bestDist){ bestDist = d; bestIdx = i; }
  });
  return {index: bestIdx, distanceToStepMeters: bestDist, snappedCoord};
}

/* ---------- ナビ進行（GPSウォッチ） ---------- */
function startNav(){
  if(!state.route){ alert('ルートを先に取得してください'); return; }
  if(!navigator.geolocation){ alert('位置情報にアクセスできません'); return; }
  if(state.nav) return;
  state.nav = true;
  document.getElementById('start-nav').disabled = true;
  document.getElementById('stop-nav').disabled = false;
  setStatus('ナビ開始');

  // watchPosition
  state.watchId = navigator.geolocation.watchPosition(pos=>{
    const lat = pos.coords.latitude, lng = pos.coords.longitude;
    // show current position marker (replace previous)
    if(!state._curMarker){
      state._curMarker = L.marker([lat,lng], {icon: L.divIcon({className:'marker-heading'})}).addTo(map);
    } else {
      state._curMarker.setLatLng([lat,lng]);
    }
    if(state.follow) map.panTo([lat,lng], {animate:true});

    // compute nearest step on route
    const near = findNearestOnRoute([lat,lng]);
    if(!near) return;
    // remaining distance/time: sum distances from nearest step to end + distance from current position to that step
    const idx = near.index;
    // distance from current position to step
    const toStep = turf.distance(turf.point([lng,lat]), turf.point([state.steps[idx].maneuver.location[0], state.steps[idx].maneuver.location[1]]),'meters');
    // sum distances of subsequent steps
    let remDist = toStep;
    let remTime = 0;
    for(let i=idx;i<state.steps.length;i++){ remDist += state.steps[i].distance; remTime += state.steps[i].duration; }
    // update HUD
    document.getElementById('hud-rem-dist').textContent = formatDist(remDist);
    document.getElementById('hud-rem-time').textContent = formatTime(remTime);
    document.getElementById('hud-next').textContent = state.steps[idx].maneuver.instruction;

    // highlight current next step marker
    highlightStep(idx);

    // speak when close enough and not spoken recently
    const threshold = state.highlightRadius; // meters
    if(toStep <= threshold && state.lastSpokenIndex !== idx){
      // speak
      speak(`次は ${state.steps[idx].maneuver.instruction}。${Math.round(toStep)}メートル先です。`);
      state.lastSpokenIndex = idx;
      // advance nextStepIndex if possible
      if(idx < state.steps.length - 1) state.nextStepIndex = idx + 1;
    }
  }, err=>{
    console.warn('watchPosition error', err);
    setStatus('GPS取得エラー', true);
  }, {enableHighAccuracy:true, maximumAge:1000, timeout:5000});
}

function stopNav(){
  if(!state.nav) return;
  if(state.watchId) navigator.geolocation.clearWatch(state.watchId);
  state.watchId = null;
  state.nav = false;
  document.getElementById('start-nav').disabled = false;
  document.getElementById('stop-nav').disabled = true;
  setStatus('ナビ停止');
  // clear highlights
  highlightStep(-1);
}

/* ---------- ハイライト処理 ---------- */
function highlightStep(idx){
  state.stepMarkers.forEach(o=>{
    const tooltipEl = o.marker.getElement?.(); // marker DOM
    // find tooltip DOM element (Leaflet creates separate tooltip DOM)
    const tip = o.marker._tooltip? o.marker._tooltip._contentNode : null;
    if(o.idx === idx){
      // add highlight class on tooltip element if exists
      if(tip) tip.classList.add('highlight');
      // try change marker icon style (scale)
      try{ o.marker.getElement().style.transform = 'scale(1.08)'; }catch(e){}
    } else {
      if(tip) tip.classList.remove('highlight');
      try{ o.marker.getElement().style.transform = 'scale(1)'; }catch(e){}
    }
  });
}

/* ---------- 検索ボタン動作 ---------- */
document.getElementById('search').addEventListener('click', async ()=>{
  try{
    setStatus('検索処理開始');
    // parse inputs
    let fromInput = document.getElementById('from').value.trim();
    let toInput = document.getElementById('to').value.trim();
    let fromLatLng = parseLatLng(fromInput);
    let toLatLng = parseLatLng(toInput);

    // if from is empty use current position
    if(!fromLatLng){
      if(navigator.geolocation){
        setStatus('現在地取得中…');
        const pos = await new Promise((res,rej)=> navigator.geolocation.getCurrentPosition(res, rej, {enableHighAccuracy:true,timeout:8000}));
        fromLatLng = [pos.coords.latitude, pos.coords.longitude];
        document.getElementById('from').value = `${fromLatLng[0].toFixed(6)},${fromLatLng[1].toFixed(6)}`;
      } else throw new Error('現在地が取得できません');
    }
    if(!toLatLng) throw new Error('目的地を入力してください');

    state.from = fromLatLng; state.to = toLatLng;
    const route = await fetchRoute(fromLatLng, toLatLng, state.mode);
    showRoute(route);
    // reset nav state
    if(state.nav) stopNav();
  }catch(err){
    console.error(err);
    setStatus('ルート取得に失敗しました', true);
    alert('ルート取得に失敗しました。入力やネットワークを確認してください。');
  }
});

/* ---------- start/stop nav buttons ---------- */
document.getElementById('start-nav').addEventListener('click', ()=> startNav());
document.getElementById('stop-nav').addEventListener('click', ()=> stopNav());

/* ---------- compass (device orientation) ---------- */
if(window.DeviceOrientationEvent){
  window.addEventListener('deviceorientationabsolute', e=>{
    const alpha = e.alpha ?? e.webkitCompassHeading ?? null;
    if(alpha !== null){
      document.getElementById('compass-needle').style.transform = `rotate(${alpha}deg)`;
      // rotate current marker to heading (if exists)
      if(state._curMarker && state._curMarker.getElement()){
        try{ state._curMarker.getElement().style.transform = `rotate(${alpha}deg)`; }catch(e){}
      }
    }
  }, true);
  // fallback
  window.addEventListener('deviceorientation', e=>{
    const alpha = e.alpha ?? null;
    if(alpha !== null){
      document.getElementById('compass-needle').style.transform = `rotate(${alpha}deg)`;
    }
  }, true);
}

/* ---------- map resize fix for mobile ---------- */
function fixMapSize(){ setTimeout(()=>map.invalidateSize(),200); }
window.addEventListener('resize', fixMapSize);
window.addEventListener('orientationchange', fixMapSize);

/* ---------- initial UI state ---------- */
setStatus('準備完了');

</script>
</body>
</html>
