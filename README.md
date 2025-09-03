<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>ゆいきちナビ — 名古屋市営地下鉄（完全版・API不要）</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html,body{height:100%;margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,"Noto Sans JP",sans-serif;}
  #app{height:100%;display:flex;flex-direction:column}
  header{background:#fff;padding:8px;box-shadow:0 1px 8px rgba(0,0,0,.06);z-index:2000}
  .bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .ipt{padding:8px 10px;border:1px solid #e6eef6;border-radius:8px;min-width:180px;background:#fff}
  .btn{padding:8px 10px;border-radius:8px;border:1px solid #dfe3ea;background:#fff;cursor:pointer}
  .btn.primary{background:#1e90ff;color:#fff;border-color:#1e90ff}
  #main{position:relative;flex:1}
  #map{position:absolute;inset:0;background:#eaeaea}
  aside{position:absolute;right:12px;top:12px;z-index:3000;background:#fff;padding:10px;border-radius:12px;width:320px;box-shadow:0 12px 30px rgba(0,0,0,.12);max-height:70vh;overflow:auto}
  .muted{color:#6b7280;font-size:13px}
  .legend{position:absolute;left:12px;top:12px;z-index:3000;background:rgba(255,255,255,0.98);padding:8px;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.08)}
  .legend .dot{width:12px;height:12px;display:inline-block;margin-right:6px;border-radius:3px;vertical-align:middle}
  .hud{position:absolute;left:12px;bottom:12px;z-index:3000;background:rgba(255,255,255,0.95);padding:8px;border-radius:8px;box-shadow:0 8px 20px rgba(0,0,0,.12)}
  .compass{position:absolute;right:12px;bottom:12px;z-index:3000;background:rgba(255,255,255,0.95);padding:8px;border-radius:50%;box-shadow:0 6px 18px rgba(0,0,0,.12)}
  /* user marker */
  .user-marker { width:32px; height:32px; display:grid; place-items:center; border-radius:50%; background:#1e90ff; color:#fff; border:3px solid #fff; box-shadow:0 0 0 4px rgba(30,144,255,.12); }
  .user-arrow { width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:14px solid #1e90ff; margin-top:-18px; }
  @media(max-width:900px){ aside{width:min(92vw,420px);top:auto;bottom:12px;max-height:46vh} }
</style>
</head>
<body>
  <div id="app">
    <header>
      <div class="bar">
        <div style="font-weight:800">ゆいきちナビ — 名古屋市営地下鉄（完全版）</div>
        <input id="from" class="ipt" placeholder="出発（現在地 / 駅名 / 緯度,経度）" />
        <input id="to" class="ipt" placeholder="目的（駅名 / 緯度,経度 / 地図クリック）" />
        <button id="search" class="btn primary">検索</button>
        <button id="startNav" class="btn">ナビ開始</button>
        <button id="stopNav" class="btn" disabled>停止</button>
      </div>
    </header>

    <div id="main">
      <div id="map">地図を読み込み中…</div>

      <div class="legend">
        <div><span class="dot" style="background:#1e90ff"></span> 地下鉄経路</div>
        <div><span class="dot" style="background:#ff5722"></span> 徒歩（ダミー）</div>
        <div><span class="dot" style="background:#2ecc71"></span> 進捗</div>
      </div>

      <aside aria-live="polite">
        <div style="font-weight:700">乗換案内（名古屋市営地下鉄）</div>
        <label style="display:block;margin-top:8px">出発駅</label>
        <select id="stationFrom" class="ipt"></select>
        <label style="display:block;margin-top:8px">到着駅</label>
        <select id="stationTo" class="ipt"></select>
        <label style="display:block;margin-top:8px" class="muted">最大乗換回数（未使用・将来対応）</label>
        <select id="maxTransfer" class="ipt"><option>3</option><option>2</option><option>1</option></select>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button id="searchTransit" class="btn primary" style="flex:1">地下鉄経路検索</button>
          <button id="nearestBtn" class="btn" style="flex:1">最寄駅</button>
        </div>
        <hr style="margin-top:8px"/>
        <div id="transitResult" class="muted">ここに乗換結果が表示されます。</div>
      </aside>

      <div class="hud" id="hud" aria-live="polite">
        <div><strong id="hudTotal">—</strong> <span class="muted">合計距離</span></div>
        <div><strong id="hudRem">—</strong> <span class="muted">残り</span></div>
        <div style="margin-top:6px" id="hudNext" class="muted">次の案内 —</div>
      </div>

      <div class="compass" id="compass">🧭</div>
    </div>
  </div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
/* ---------------------------------------------------------
   ゆいきちナビ — 完全版（実用重視・API不使用）
   - 地図表示（Leaflet）
   - 名古屋市営地下鉄の駅データ（主要駅）を内蔵
   - BFSで乗換検索
   - 現在地は常に画面中央（setViewで強制）
   - ナビ中は地図を回転（DeviceOrientation）するが中央は固定
   - 徒歩ルートは API 不使用のダミー直線補間
   --------------------------------------------------------- */

(function(){

// ======= 設定 =======
const CONF = {
  initialCenter: [35.170915, 136.881537], // 名古屋駅
  initialZoom: 14,
  rotateScale: 1.04,
  rotateSmooth: 0.18,
  headingSmooth: 0.12,
  walkSegmentMeters: 40 // 徒歩ダミー: 1点あたりの距離目安
};

// ======= 簡易駅データ（代表的な駅を各路線につき掲載） =======
// これはデモ用。必要ならすべての駅を追加できます。
const LINES = {
  "東山線": [
    ["藤が丘",35.199255,137.010112],
    ["本郷",35.176776,136.993805],
    ["一社",35.171509,136.975603],
    ["覚王山",35.161995,136.964458],
    ["池下",35.164522,136.958707],
    ["今池",35.165347,136.934541],
    ["千種",35.164483,136.937694],
    ["新栄町",35.167693,136.906629],
    ["栄",35.170915,136.907307],
    ["伏見",35.167975,136.897862],
    ["名古屋",35.170915,136.881537]
  ],
  "鶴舞線": [
    ["赤池",35.131984,137.010495],
    ["平針",35.146244,136.944214],
    ["八事",35.158000,136.942000],
    ["鶴舞",35.153613,136.913158],
    ["伏見",35.167975,136.897862],
    ["大曽根",35.196924,136.928315]
  ],
  "名城線": [
    ["名城公園",35.166721,136.916464],
    ["市役所",35.170000,136.900000],
    ["久屋大通",35.170810,136.910240],
    ["栄",35.170915,136.907307],
    ["金山",35.151798,136.907734],
    ["大曽根",35.196924,136.928315]
  ],
  "名港線": [
    ["金山",35.151798,136.907734],
    ["名古屋港",35.096310,136.865387]
  ],
  "桜通線": [
    ["久屋大通",35.170810,136.910240],
    ["丸の内",35.165079,136.900540],
    ["国際センター",35.170053,136.884083],
    ["桜山",35.146000,136.912000],
    ["今池",35.165347,136.934541]
  ],
  "上飯田線": [
    ["上飯田",35.178435,136.911819],
    ["平安通",35.204463,136.881132]
  ]
};

// Build station dictionary: name -> [lat, lon]
const STATIONS = {};
for(const ln in LINES){
  LINES[ln].forEach(item=>{
    const [name, lat, lon] = item;
    if(!STATIONS[name]) STATIONS[name] = [lat, lon];
  });
}

// ======= ユーティリティ =======
function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function norm360(d){ if(typeof d!=='number'||Number.isNaN(d)) return 0; return (d%360+360)%360; }
function shortestAngleDiff(a,b){ return ((b - a + 540) % 360) - 180; }
function easeAngle(a,b,alpha){ const d = shortestAngleDiff(a,b); return norm360(a + d*alpha); }
function haversineMeters(lat1, lon1, lat2, lon2){
  const R = 6371000;
  const toRad = x => x*Math.PI/180;
  const dLat = toRad(lat2-lat1), dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}
function formatDist(m){
  if(m==null) return '—';
  if(m>=1000) return (m/1000).toFixed(2)+' km';
  return Math.round(m)+' m';
}
// linear interpolation -> array of [lat,lon]
function linearInterpolate(aLat,aLon,bLat,bLon,segments){
  const out = [];
  for(let i=0;i<=segments;i++){
    const t = i/segments;
    out.push([ aLat + (bLat-aLat)*t, aLon + (bLon-aLon)*t ]);
  }
  return out;
}

// ======= アプリ状態 =======
const App = {
  map: null,
  mapPane: null,
  userMarker: null,
  userHeading: 0,
  headingSmoothed: 0,
  targetRotation: 0,
  appliedRotation: 0,
  rotationActive: false,
  follow: true,
  centerLock: true,
  rotate: true,
  navActive: false,
  watchId: null,
  stationGraph: null,
  currentRoute: null,
  routeLayer: null,
  walkLayers: [],
  progressLayer: null
};

// ======= 地図初期化 =======
function initMap(){
  App.map = L.map('map', { center: CONF.initialCenter, zoom: CONF.initialZoom, zoomControl:true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ attribution:'© OpenStreetMap contributors', maxZoom:19 }).addTo(App.map);
  App.mapPane = App.map.getPane('mapPane');

  // user marker (divIcon) with arrow
  const html = `<div class="user-marker" id="yui-user"><div class="user-arrow" id="yui-arrow"></div></div>`;
  App.userMarker = L.marker(CONF.initialCenter, { icon: L.divIcon({ html, className:'', iconSize:[32,32] }), interactive:false }).addTo(App.map);

  // plot stations
  for(const name in STATIONS){
    const [lat, lon] = STATIONS[name];
    L.circleMarker([lat,lon], { radius:5, fillColor:'#333', color:'#fff', weight:1, fillOpacity:0.95 })
      .bindTooltip(name, { direction:'top', offset:[0,-6] })
      .addTo(App.map);
  }

  // map click -> set to field
  App.map.on('click', e=>{
    qs('#to').value = e.latlng.lat.toFixed(6)+', '+e.latlng.lng.toFixed(6);
  });
}

// ======= Station graph (adjacency) build =======
function buildStationGraph(){
  const g = {};
  function addEdge(a,b){
    if(!g[a]) g[a]=new Set();
    if(!g[b]) g[b]=new Set();
    g[a].add(b); g[b].add(a);
  }
  for(const ln in LINES){
    const arr = LINES[ln].map(x=>x[0]);
    for(let i=0;i<arr.length;i++){
      if(i>0) addEdge(arr[i], arr[i-1]);
      if(i<arr.length-1) addEdge(arr[i], arr[i+1]);
    }
  }
  // convert to plain arrays
  const out = {};
  for(const k in g) out[k] = Array.from(g[k]);
  App.stationGraph = out;
  return out;
}

// BFS search for shortest station path (returns array of station names)
function bfsStationPath(start, goal){
  if(!App.stationGraph) buildStationGraph();
  if(!start || !goal) return null;
  if(start === goal) return [start];
  const q = [[start]];
  const seen = new Set([start]);
  while(q.length){
    const path = q.shift();
    const last = path[path.length-1];
    if(last === goal) return path;
    const neigh = App.stationGraph[last] || [];
    for(const n of neigh){
      if(!seen.has(n)){
        seen.add(n);
        q.push(path.concat([n]));
      }
    }
  }
  return null;
}

// find nearest station to lat/lon
function findNearestStation(lat, lon){
  let best = null, bestD = Infinity;
  for(const name in STATIONS){
    const [slat, slon] = STATIONS[name];
    const d = haversineMeters(lat, lon, slat, slon);
    if(d < bestD){ bestD = d; best = { name, lat:slat, lon:slon, dist:d }; }
  }
  return best;
}

// ======= draw functions =======
function clearAllRouteLayers(){
  if(App.routeLayer) { try{ App.map.removeLayer(App.routeLayer); }catch(e){} App.routeLayer=null; App.currentRoute=null; }
  App.walkLayers.forEach(l=>{ try{ App.map.removeLayer(l); }catch(e){} });
  App.walkLayers = [];
  if(App.progressLayer){ try{ App.map.removeLayer(App.progressLayer); }catch(e){} App.progressLayer=null; }
}

function drawStationRoute(stationPath){
  if(!stationPath || stationPath.length<2) return;
  const coords = stationPath.map(n => STATIONS[n]);
  if(App.routeLayer) try{ App.map.removeLayer(App.routeLayer); }catch(e){}
  App.routeLayer = L.polyline(coords, { color: '#1e90ff', weight:6, opacity:0.95 }).addTo(App.map);
  App.currentRoute = { type:'station', path:stationPath, coords };
  // fit bounds but center lock will recenter on next position update
  try{ App.map.fitBounds(App.routeLayer.getBounds()); }catch(e){}
}

function drawDummyWalk(aLat,aLon,bLat,bLon){
  const meters = haversineMeters(aLat,aLon,bLat,bLon);
  const segments = Math.max(3, Math.round(meters / CONF.walkSegmentMeters));
  const pts = linearInterpolate(aLat,aLon,bLat,bLon, segments);
  const poly = L.polyline(pts, { color:'#ff5722', weight:4, dashArray:'6,6', opacity:0.95 }).addTo(App.map);
  App.walkLayers.push(poly);
  return poly;
}

function updateProgressLayerByPosition(lat, lon){
  if(!App.currentRoute || App.currentRoute.type !== 'station') return;
  // compute nearest coordinate along route coords
  const coords = App.currentRoute.coords;
  let bestIdx = 0, bestD = Infinity;
  for(let i=0;i<coords.length;i++){
    const [cLat,cLon] = coords[i];
    const d = haversineMeters(lat, lon, cLat, cLon);
    if(d < bestD){ bestD = d; bestIdx = i; }
  }
  // build seg up to bestIdx
  const seg = coords.slice(0, bestIdx+1);
  if(App.progressLayer) App.progressLayer.setLatLngs(seg);
  else App.progressLayer = L.polyline(seg, { color:'#2ecc71', weight:8, opacity:0.9 }).addTo(App.map);
  qs('#hudNext').textContent = `最寄駅（経路中）: ${bestIdx+1} / ${coords.length} （約 ${Math.round(bestD)} m）`;
}

// ======= Orientation handling (DeviceOrientation) =======
function initOrientation(){
  function handle(e){
    let heading = null;
    if(typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)){
      heading = e.webkitCompassHeading;
    } else if(typeof e.alpha === 'number' && !Number.isNaN(e.alpha)){
      const screenAngle = (screen.orientation && typeof screen.orientation.angle === 'number') ? screen.orientation.angle : (typeof window.orientation === 'number' ? window.orientation : 0);
      heading = norm360(360 - e.alpha + screenAngle);
    }
    if(heading !== null) updateHeading(heading);
  }
  if(window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function'){
    // iOS: request on user gesture
    document.body.addEventListener('click', function once(){
      DeviceOrientationEvent.requestPermission().then(res=>{
        if(res === 'granted') window.addEventListener('deviceorientation', handle, { passive:true });
      }).catch(()=>{});
      document.body.removeEventListener('click', once);
    }, { once:true });
  } else if(window.DeviceOrientationEvent){
    window.addEventListener('deviceorientation', handle, { passive:true });
  }
}

function updateHeading(raw){
  App.userHeading = norm360(raw);
  App.headingSmoothed = (typeof App.headingSmoothed !== 'number') ? App.userHeading : easeAngle(App.headingSmoothed, App.userHeading, CONF.headingSmooth);
  // rotate arrow element
  const arrow = document.getElementById('yui-arrow');
  if(arrow) arrow.style.transform = `rotate(${App.headingSmoothed}deg)`;
  // set target rotation (map rotates opposite heading so forward is up)
  if(App.rotate && App.navActive){
    App.targetRotation = -App.headingSmoothed;
    setRotationActive(true);
  }
}

// rotation loop
function rotationLoop(){
  const cur = App.appliedRotation || 0, tgt = App.targetRotation || 0;
  const diff = shortestAngleDiff(cur, tgt);
  if(Math.abs(diff) > 0.2){
    App.appliedRotation = easeAngle(cur, tgt, CONF.rotateSmooth);
    applyMapRotation(App.appliedRotation);
  } else if(cur !== tgt){
    App.appliedRotation = tgt;
    applyMapRotation(App.appliedRotation);
  }
  requestAnimationFrame(rotationLoop);
}
function applyMapRotation(deg){
  const scale = App.rotationActive ? CONF.rotateScale : 1;
  if(App.mapPane) App.mapPane.style.transform = `rotate(${deg}deg) scale(${scale})`;
}
function setRotationActive(flag){
  App.rotationActive = !!flag;
  if(!App.rotationActive) App.targetRotation = 0;
  requestAnimationFrame(()=> App.map.invalidateSize());
}

// ======= Geolocation (watch) and center-lock enforcement =======
function startWatch(){
  if(!navigator.geolocation){ alert('このブラウザは位置情報に対応していません'); return; }
  if(App.watchId != null) try{ navigator.geolocation.clearWatch(App.watchId); }catch(e){}
  App.watchId = navigator.geolocation.watchPosition(onPosition, onPosErr, { enableHighAccuracy:true, maximumAge:1000, timeout:15000 });
}
function stopWatch(){
  if(App.watchId != null) try{ navigator.geolocation.clearWatch(App.watchId); }catch(e){}
  App.watchId = null;
}
function onPosition(p){
  const lat = p.coords.latitude, lon = p.coords.longitude;
  // update marker
  if(App.userMarker) App.userMarker.setLatLng([lat, lon]);
  // enforce center
  if(App.follow || App.centerLock){
    const z = clamp(App.map.getZoom(), 12, 19);
    App.map.setView([lat, lon], z, { animate:false });
  }
  // update progress if route exists
  updateProgressLayerByPosition(lat, lon);
}
function onPosErr(err){
  console.warn('位置取得エラー', err);
}

// ======= Input resolution (station name / coords / "現在地") =======
function parseLatLonString(s){
  if(!s) return null;
  const m = s.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if(m) return { lat: parseFloat(m[1]), lon: parseFloat(m[2]) };
  return null;
}
function resolveInput(str){
  if(!str) return null;
  const v = str.trim();
  if(v === '' ) return null;
  if(v === '現在地' || v === 'いま' || v.toLowerCase() === 'current'){
    const ll = App.userMarker.getLatLng();
    if(ll) return { lat: ll.lat, lon: ll.lng, station: null };
    return null;
  }
  if(STATIONS[v]) return { lat: STATIONS[v][0], lon: STATIONS[v][1], station: v };
  const parsed = parseLatLonString(v);
  if(parsed) return parsed;
  return null;
}

// ======= UI wiring =======
function populateStationSelects(){
  const names = Object.keys(STATIONS).sort((a,b)=>a.localeCompare(b,'ja'));
  const fromSel = qs('#stationFrom'), toSel = qs('#stationTo');
  fromSel.innerHTML = '<option value="">— 選択 —</option>'; toSel.innerHTML = '<option value="">— 選択 —</option>';
  names.forEach(n=>{ fromSel.innerHTML += `<option value="${n}">${n}</option>`; toSel.innerHTML += `<option value="${n}">${n}</option>`; });
}

function bindUI(){
  qs('#search').addEventListener('click', async ()=>{
    const fv = qs('#from').value.trim();
    const tv = qs('#to').value.trim();
    const from = resolveInput(fv);
    const to = resolveInput(tv);
    if(!from || !to){ alert('出発・目的地を指定して下さい（駅名 / 現在地 / 緯度,経度）'); return; }
    clearAllRouteLayers();

    // if both are exact station names -> station-station route
    if(from.station && to.station){
      const path = bfsStationPath(from.station, to.station);
      if(!path){ alert('経路が見つかりません'); return; }
      drawStationRoute(path);
      // draw dummy walk from current pos to start station (if not same)
      const userLL = App.userMarker.getLatLng();
      drawDummyWalk(userLL.lat, userLL.lng, STATIONS[path[0]][0], STATIONS[path[0]][1]);
      // update HUD total distance estimation (sum station distances)
      let total = 0;
      for(let i=0;i<path.length-1;i++){
        const a = STATIONS[path[i]], b = STATIONS[path[i+1]];
        total += haversineMeters(a[0],a[1],b[0],b[1]);
      }
      qs('#hudTotal').textContent = formatDist(total);
    } else {
      // mixed / coords: map each to nearest station, plan between them, and draw walking dummies
      const fromPt = from, toPt = to;
      const fromNearest = findNearestStation(fromPt.lat, fromPt.lon);
      const toNearest = findNearestStation(toPt.lat, toPt.lon);
      if(!fromNearest || !toNearest){ alert('最寄駅が特定できません'); return; }
      const path = bfsStationPath(fromNearest.name, toNearest.name);
      if(!path){ alert('駅間経路が見つかりません'); return; }
      drawStationRoute(path);
      // draw walk from fromPt -> fromNearest; toNearest -> toPt
      drawDummyWalk(fromPt.lat, fromPt.lon, fromNearest.lat, fromNearest.lon);
      drawDummyWalk(toNearest.lat, toNearest.lon, toPt.lat, toPt.lon);
      qs('#transitResult').innerHTML = `<div style="font-weight:700">最寄り駅換算経路</div><div class="muted">${fromNearest.name} → ${path.join(' → ')} → ${toNearest.name}</div>`;
    }
  });

  qs('#searchTransit').addEventListener('click', ()=>{
    const f = qs('#stationFrom').value, t = qs('#stationTo').value;
    if(!f || !t){ alert('駅を選んでください'); return; }
    clearAllRouteLayers();
    const path = bfsStationPath(f,t);
    if(!path){ alert('経路が見つかりません'); return; }
    drawStationRoute(path);
    // draw dummy walks from user's current location to start station, and a sample endpoint from end station
    const userLL = App.userMarker.getLatLng();
    drawDummyWalk(userLL.lat, userLL.lng, STATIONS[path[0]][0], STATIONS[path[0]][1]);
    const endLat = STATIONS[path[path.length-1]][0], endLon = STATIONS[path[path.length-1]][1];
    drawDummyWalk(endLat, endLon, endLat - 0.006, endLon); // arbitrary small offset demo
    qs('#transitResult').innerHTML = `<div style="font-weight:700">乗換経路</div><div class="muted">${path.join(' → ')}</div>`;
  });

  qs('#nearestBtn').addEventListener('click', ()=>{
    const ll = App.userMarker.getLatLng();
    const n = findNearestStation(ll.lat,ll.lng);
    if(n) alert(`最寄駅: ${n.name}（約 ${Math.round(n.dist)} m）`);
    else alert('最寄駅が見つかりませんでした');
  });

  qs('#startNav').addEventListener('click', ()=>{
    App.navActive = true;
    qs('#startNav').disabled = true;
    qs('#stopNav').disabled = false;
    setRotationActive(true);
    startWatch();
  });

  qs('#stopNav').addEventListener('click', ()=>{
    App.navActive = false;
    qs('#startNav').disabled = false;
    qs('#stopNav').disabled = true;
    setRotationActive(false);
    stopWatch();
  });

  // keyboard enter triggers search
  qs('#from').addEventListener('keydown', e=>{ if(e.key==='Enter') qs('#search').click(); });
  qs('#to').addEventListener('keydown', e=>{ if(e.key==='Enter') qs('#search').click(); });
}

// ======= bootstrap =======
function bootstrap(){
  initMap();
  buildStationGraph();
  populateStationSelects();
  bindUI();
  initOrientation();
  requestAnimationFrame(rotationLoop);
  console.log('ゆいきちナビ 初期化完了');
}

// small UI helper
function populateStationSelects(){
  const selFrom = qs('#stationFrom'), selTo = qs('#stationTo');
  selFrom.innerHTML = '<option value="">— 選択 —</option>';
  selTo.innerHTML = '<option value="">— 選択 —</option>';
  Object.keys(STATIONS).sort((a,b)=>a.localeCompare(b,'ja')).forEach(name=>{
    selFrom.innerHTML += `<option value="${name}">${name}</option>`;
    selTo.innerHTML += `<option value="${name}">${name}</option>`;
  });
}

// start
bootstrap();

})(); // end IIFE
</script>
</body>
</html>
