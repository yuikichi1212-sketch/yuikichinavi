<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<title>ゆいきちナビ — 地図回転＆名古屋地下鉄 乗換案内（長大版）</title>

<!-- Leaflet -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

<style>
  :root{
    --accent:#1e90ff; --bg:#f7f9fc; --ink:#111; --card:#fff; --muted:#6b7280;
  }
  html,body{ height:100%; margin:0; font-family: system-ui, -apple-system, "Noto Sans JP", Roboto, sans-serif; background:var(--bg); color:var(--ink); }
  #app{ height:100%; display:flex; flex-direction:column; }

  header.toolbar{
    background:var(--card); padding:8px; box-shadow:0 1px 8px rgba(0,0,0,.06); z-index:1600;
  }
  .bar{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
  .brand{ font-weight:800; margin-right:6px; font-size:18px; }
  .ipt{ padding:10px 12px; border-radius:10px; border:1px solid #e6eef6; min-width:200px; background:#fff; }
  .btn{ padding:8px 12px; border-radius:10px; border:1px solid #dfe3ea; background:#fff; cursor:pointer; }
  .btn.primary{ background:var(--accent); color:#fff; border-color:var(--accent); }

  #main{ position:relative; flex:1; }
  #map{ position:absolute; inset:0; }

  /* sidebar */
  .sidebar{
    position:absolute; right:12px; top:12px; z-index:1700;
    width:380px; max-height:72vh; overflow:auto; background:#fff; padding:10px; border-radius:12px;
    box-shadow: 0 12px 30px rgba(0,0,0,0.12);
  }
  .muted{ color:var(--muted); font-size:12px; }

  .hud{
    position:absolute; left:12px; bottom:12px; z-index:1700; background:rgba(255,255,255,0.95);
    padding:8px 10px; border-radius:10px; box-shadow:0 8px 20px rgba(0,0,0,.12);
  }

  .compass{ position:absolute; right:12px; bottom:12px; z-index:1700; background:rgba(255,255,255,0.95); padding:6px; border-radius:50%; box-shadow:0 6px 18px rgba(0,0,0,0.12); }

  /* user marker style */
  .marker-heading{ position:relative; width:28px; height:28px; border-radius:50%; background:var(--accent); border:2px solid #fff; box-shadow:0 0 0 2px rgba(30,144,255,.25); display:grid; place-items:center; color:#fff; font-weight:700; transform-origin:center center; }
  .arrow{ position:absolute; left:9px; top:-12px; width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:12px solid var(--accent); transform-origin:center; }

  /* route styles in legend */
  .legend{ position:absolute; left:12px; top:12px; z-index:1700; background:rgba(255,255,255,0.97); padding:8px; border-radius:8px; box-shadow:0 6px 18px rgba(0,0,0,0.08); font-size:13px; }
  .legend .dot{ width:12px; height:12px; display:inline-block; margin-right:6px; border-radius:3px; vertical-align:middle; }

  @media(max-width:900px){
    .sidebar{ width:min(92vw,420px); top:auto; bottom:12px; max-height:46vh; }
  }
</style>
</head>
<body>
  <div id="app">
    <header class="toolbar">
      <div class="bar">
        <div class="brand">ゆいきちナビ — 地図回転 + 乗換</div>
        <input id="from" class="ipt" placeholder="出発地（住所 / 緯度,経度 / 現在地）" />
        <input id="to" class="ipt" placeholder="到着地（住所 / 緯度,経度 / 地図クリック可）" />
        <button id="search" class="btn primary">検索・経路作成</button>
        <button id="start-nav" class="btn">ナビ開始</button>
        <button id="stop-nav" class="btn" disabled>停止</button>
      </div>
      <div class="bar" style="margin-top:6px">
        <div class="muted">移動モード:</div>
        <button class="btn mode-btn active" data-mode="driving" id="m-driv">車</button>
        <button class="btn mode-btn" data-mode="foot" id="m-foot">徒歩</button>
        <button class="btn mode-btn" data-mode="bike" id="m-bike">自転車</button>
        <span style="width:12px"></span>
        <label class="muted"><input type="checkbox" id="chk-follow" checked> 追尾（中央固定）</label>
        <label class="muted"><input type="checkbox" id="chk-rotate" checked> 地図回転</label>
        <label class="muted"><input type="checkbox" id="chk-centerlock" checked> センターロック</label>
      </div>
    </header>

    <div id="main">
      <div id="map"></div>

      <aside class="sidebar" id="sidebar" aria-live="polite">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:700">乗換案内</div>
          <div class="muted">— 名古屋地下鉄（簡易完全版）</div>
        </div>
        <div style="margin-top:8px">
          <label>出発駅（駅リストから選択）</label>
          <select id="station-from" class="ipt"></select>
          <label style="margin-top:8px">到着駅（駅リストから選択）</label>
          <select id="station-to" class="ipt"></select>
          <label style="margin-top:8px" class="muted">最大乗換回数</label>
          <select id="max-transfer" class="ipt">
            <option value="3">3回</option><option value="2">2回</option><option value="1">1回</option><option value="0">0回</option>
          </select>
          <div style="display:flex;gap:8px;margin-top:8px">
            <button id="search-transit" class="btn primary" style="flex:1">地下鉄経路を検索</button>
            <button id="nearest-station" class="btn" style="flex:1">現在地の最寄駅</button>
          </div>
        </div>

        <hr/>

        <div id="transit-result" class="muted">ここに乗換結果が表示されます。</div>
      </aside>

      <div class="legend">
        <div><span class="dot" style="background:#1e90ff"></span> 駅間（地下鉄）</div>
        <div><span class="dot" style="background:#ff5722"></span> 徒歩ルート（現在地→駅 / 駅→目的地）</div>
        <div><span class="dot" style="background:#2ecc71"></span> 進捗（通過済）</div>
      </div>

      <div class="hud" id="hud">
        <div><strong id="hud-total-dist">—</strong> <span class="muted">合計距離</span></div>
        <div><strong id="hud-rem-dist">—</strong> <span class="muted">残り</span></div>
        <div style="margin-top:6px" id="hud-next" class="muted">次の案内 —</div>
      </div>

      <div class="compass" id="compass" title="コンパス"></div>

    </div>
  </div>

  <!-- libs -->
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js"></script>

  <script>
  /* ===========================================================
     ゆいきちナビ — 大型長大ファイル版
     - 地図を回転（ナビ中）するが、現在地は常に中央に固定
     - 名古屋地下鉄（主要路線）データを内蔵、BFSで乗換検索
     - 現在地→最寄駅、到着駅→目的地 の徒歩ルートを OSRM(foot) で取得・表示（キー不要）
     - 各処理を細分化して冗長に記述（要求どおり無理やり長く）
  ============================================================ */

  // 再初期化防止フラグ
  if(window.__YK_LONG_INIT__){
    console.warn("Already initialized (YK_LONG).");
  } else {
    window.__YK_LONG_INIT__ = true;

    (function(){

      // =============================
      // 1) 設定（CFG） — ここだけいじれば挙動変わる
      // =============================
      const CFG = {
        TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        TILE_ATTR: '© OpenStreetMap contributors',
        INITIAL_CENTER: [35.170915, 136.881537], // 名古屋駅付近デフォルト
        INITIAL_ZOOM: 15,
        ROTATE_SCALE: 1.06,
        ROTATE_SMOOTH_ALPHA: 0.18,
        HEADING_SMOOTH_ALPHA: 0.10,
        SPEAK_NEXT_AT_METERS: 60,
        ROUTE_PROGRESS_COLOR: '#2ecc71',
        ROUTE_MAIN_COLOR: '#1e90ff',
        WALK_COLOR: '#ff5722',
        STATION_COLOR: '#333',
        OSRM_HOST: 'https://router.project-osrm.org',
      };

      // =============================
      // 2) アプリ状態（S） — 詳細に保持
      // =============================
      const S = {
        map: null,
        mapPane: null,
        userMarker: null,
        userIconHtml: null,
        headingRaw: 0,
        headingView: 0,
        targetMapRotation: 0,
        currentMapRotation: 0,
        rotationActive: false,
        follow: true,        // 追尾（中央固定）
        centerLock: true,    // センターロック
        rotate: true,        // 地図回転を許可するか
        nav: false,          // ナビ中フラグ
        watchId: null,       // geolocation watchId
        routes: [],          // OSRMから得たルート候補
        routeLayers: [],
        progressLayer: null,
        stations: {},        // 駅データ（下でセット）
        lines: {},           // 路線データ（下でセット）
        transitPath: null,   // 駅経路（配列）
        walkLayers: [],      // 歩行ルートレイヤー（配列）
        lastSnapIdx: 0,
        lastRerouteTs: 0,
        lastUserInteractTs: 0,
        prevPos: null,
        mapAnimRunning: false,
        // UI elements are cached below
        E: {}
      };

      // =============================
      // 3) ユーティリティ（小さいヘルパーを多数作る）
      // =============================
      function qs(sel){ return document.querySelector(sel); }
      function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }
      function log(){ console.log.apply(console, arguments); }
      function warn(){ console.warn.apply(console, arguments); }
      function nowMs(){ return Date.now(); }

      function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
      function norm360(d){ if(typeof d !== 'number' || Number.isNaN(d)) return 0; return (d%360+360)%360; }
      function shortestAngleDiff(a,b){ return ((b - a + 540) % 360) - 180; }
      function easeAngle(current, target, alpha){ const d = shortestAngleDiff(current,target); return norm360(current + d*alpha); }

      function formatDist(m){
        if(m == null) return '—';
        if(m >= 1000) return (m/1000).toFixed(2) + ' km';
        return Math.round(m) + ' m';
      }
      function formatTimeSec(sec){
        if(sec == null) return '—';
        const s = Math.round(sec), h = Math.floor(s/3600), m = Math.round((s%3600)/60);
        return h>0 ? `${h}時間${m}分` : `${m}分`;
      }

      // =============================
      // 4) 内蔵駅データ＋路線（名古屋地下鉄の一部をサンプルとして網羅）
      //    — 実運用ではCSV/DBからロードする想定だが、今回は一括で埋め込み
      // =============================
      (function initializeStationData(){
        // 今回は主要駅 + 代表的な路線を組み込む（必要なら追加して下さい）
        // フォーマット: S.stations['駅名'] = [lat, lon]
        const st = {
          "名古屋": [35.170915,136.881537],
          "伏見": [35.167975,136.897862],
          "栄": [35.170915,136.907307],
          "今池": [35.165347,136.934541],
          "本山": [35.158673,136.956401],
          "藤が丘": [35.199255,137.010112],
          "赤池": [35.131984,137.010495],
          "原": [35.157281,136.981787],
          "平針": [35.146244,136.944214],
          "豊田市": [35.083158,137.156188],
          "上小田井": [35.179935,136.845703],
          "金山": [35.151798,136.907734],
          "大曽根": [35.196924,136.928315],
          "名古屋港": [35.096310,136.865387],
          "新瑞橋":[35.129989,136.912449],
          "金山総合駅":[35.147708,136.906343],
          "名城公園":[35.166721,136.916464],
          // 必要に応じて追加...
        };
        S.stations = st;

        // 路線データ：路線名 -> 駅順の配列
        const lines = {
          "東山線": ["藤が丘","本山","今池","栄","伏見","名古屋","上小田井"],
          "鶴舞線": ["赤池","藤が丘","伏見","大曽根"],
          "名城線": ["名城公園","栄","金山","大曽根"],
          "名港線": ["金山","名古屋港"],
          // 実データに合わせて拡張可能
        };
        S.lines = lines;
      })();

      // =============================
      // 5) DOM要素のキャッシュ（E）
      // =============================
      (function cacheElements(){
        const E = {};
        E.from = qs('#from'); E.to = qs('#to'); E.search = qs('#search');
        E.startNav = qs('#start-nav'); E.stopNav = qs('#stop-nav');
        E.modeBtns = qsa('.mode-btn');
        E.chkFollow = qs('#chk-follow'); E.chkRotate = qs('#chk-rotate'); E.chkCenterLock = qs('#chk-centerlock');
        E.stationFrom = qs('#station-from'); E.stationTo = qs('#station-to'); E.searchTransit = qs('#search-transit');
        E.nearestStationBtn = qs('#nearest-station'); E.transitResult = qs('#transit-result');
        E.hudTotalDist = qs('#hud-total-dist'); E.hudRemDist = qs('#hud-rem-dist'); E.hudNext = qs('#hud-next');
        E.compass = qs('#compass');
        S.E = E;
      })();

      // =============================
      // 6) Helper: 地図初期化（Leaflet）
      // =============================
      function initMap(){
        S.map = L.map('map', {
          center: CFG.INITIAL_CENTER,
          zoom: CFG.INITIAL_ZOOM,
          zoomControl: true,
          preferCanvas: false
        });

        L.tileLayer(CFG.TILE_URL, { attribution: CFG.TILE_ATTR, maxZoom: 19, keepBuffer: 6 }).addTo(S.map);
        S.mapPane = S.map.getPane('mapPane');

        // 現在地マーカーのHTMLを用意（divIcon）
        S.userIconHtml = `<div class="marker-heading" id="user-marker"><div class="arrow" id="user-arrow"></div></div>`;
        S.userMarker = L.marker(CFG.INITIAL_CENTER, {
          icon: L.divIcon({ html: S.userIconHtml, className: '', iconSize: [28,28] }),
          interactive: false,
          zIndexOffset: 1000
        }).addTo(S.map);

        // 駅マーカーを配置（小さいラベル）
        for(const name in S.stations){
          const latlng = S.stations[name];
          L.circleMarker(latlng, { radius:6, fillColor:'#333', color:'#fff', weight:1, fillOpacity:0.95 })
            .bindTooltip(name, {permanent:false, direction:'top'})
            .addTo(S.map);
        }

        // サイドの駅セレクトを埋める
        populateStationSelects();
      }

      // =============================
      // 7) Helper: 駅セレクトを埋める
      // =============================
      function populateStationSelects(){
        const E = S.E;
        const names = Object.keys(S.stations).sort((a,b)=>a.localeCompare(b,'ja'));
        E.stationFrom.innerHTML = '';
        E.stationTo.innerHTML = '';
        names.forEach(n=>{
          E.stationFrom.innerHTML += `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`;
          E.stationTo.innerHTML += `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`;
        });
      }

      // =============================
      // 8) HTML サニタイズ（単純）
      // =============================
      function escapeHtml(s){ return (''+s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

      // =============================
      // 9) Orientation & Compass（センサー） — smoothing included
      // =============================
      function initOrientation(){
        function screenAngle(){
          const a = (screen.orientation && typeof screen.orientation.angle === 'number') ? screen.orientation.angle : (typeof window.orientation === 'number' ? window.orientation : 0);
          return a || 0;
        }

        function handleEvent(e){
          // iOS Safari の webkitCompassHeading を優先
          let heading = null;
          if(typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)){
            heading = e.webkitCompassHeading;
          } else if (typeof e.alpha === 'number' && !Number.isNaN(e.alpha)) {
            // alpha -> 0 = device facing north? Convert into compass heading approx.
            // base = 360 - alpha + screenAngle()
            heading = norm360(360 - e.alpha + screenAngle());
          }
          if(heading !== null){
            updateHeading(heading);
          }
        }

        // requestPermission 対応
        if(window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function'){
          document.body.addEventListener('click', function once(){
            DeviceOrientationEvent.requestPermission().then(res=>{
              if(res === 'granted'){
                window.addEventListener('deviceorientation', handleEvent, { passive:true });
              }
            }).catch(()=>{ /* ignore */ });
            document.body.removeEventListener('click', once);
          }, { once:true });
        } else if(window.DeviceOrientationEvent){
          window.addEventListener('deviceorientation', handleEvent, { passive:true });
        }
      }

      // Heading のスムージング
      function updateHeading(raw){
        const now = nowMs();
        const d = norm360(raw);
        S.headingView = easeAngle(S.headingView || d, d, CFG.HEADING_SMOOTH_ALPHA);
        S.headingRaw = d;

        // Update compass UI
        try{
          const comp = S.E.compass;
          comp.style.transform = `rotate(${S.headingView}deg)`;
        }catch(e){}

        // 地図回転目標（ナビ中 or 常時rotate許可）
        if(S.rotate && (!S.nav ? false : true)){
          S.targetMapRotation = -S.headingView;
        } else if(S.rotate && !S.nav && !CFG.ROTATE_ONLY_WHEN_NAV){
          S.targetMapRotation = -S.headingView;
        }
      }

      // =============================
      // 10) Geolocation（現在地更新） — センターロックを常に守るコア
      // =============================
      function startGeolocation(){
        if(!navigator.geolocation){
          alert('このブラウザは位置情報に対応していません');
          return;
        }
        if(S.watchId != null) { try{ navigator.geolocation.clearWatch(S.watchId); }catch{} }
        S.watchId = navigator.geolocation.watchPosition(onPositionUpdate, onPositionError, { enableHighAccuracy:true, maximumAge:1000, timeout:15000 });
      }

      function stopGeolocation(){
        if(S.watchId != null){
          try{ navigator.geolocation.clearWatch(S.watchId); }catch(e){}
          S.watchId = null;
        }
      }

      // 位置更新のメインハンドラ
      function onPositionUpdate(pos){
        try{
          const lat = pos.coords.latitude, lon = pos.coords.longitude;
          const acc = pos.coords.accuracy || 10;
          handlePosition(lat, lon, acc);
        }catch(e){ warn('onPositionUpdate error', e); }
      }
      function onPositionError(err){
        warn('位置取得失敗', err);
      }

      // 現在地をセットし、**必ず中央に戻す**コア
      function handlePosition(lat, lon, acc){
        // 1) update prev
        S.prevPos = S.prevPos || { lat, lon };
        S.prevPos.lat = lat; S.prevPos.lon = lon;

        // 2) move user marker
        ensureUserMarker(lat, lon);

        // 3) if follow is ON, enforce center (setView no animate to avoid jitter)
        enforceCenter(lat, lon);

        // 4) update rotation target (if device heading exists)
        if(S.headingView != null && S.rotate){
          S.targetMapRotation = -S.headingView;
        }

        // 5) update HUD / guidance etc.
        updateNavigationState(lat, lon);
      }

      // 現在地マーカーを作成・更新
      function ensureUserMarker(lat, lon){
        if(!S.userMarker){
          // already created in initMap
          return;
        }
        S.userMarker.setLatLng([lat, lon]);
        // rotate the visual arrow so it aligns with headingView
        try{
          const arrow = document.getElementById('user-arrow');
          if(arrow) arrow.style.transform = `rotate(${S.headingView || 0}deg)`;
        }catch(e){}
      }

      // センターロックのコア：地図を強制的に真ん中へ
      function enforceCenter(lat, lon){
        try{
          // choose zoom - keep current zoom
          const z = clamp(S.map.getZoom(), 12, 19);
          // setView without animation to avoid jumps due to transform
          S.map.setView([lat, lon], z, { animate: false });
        }catch(e){
          warn('enforceCenter failed', e);
        }
      }

      // =============================
      // 11) Map rotation animation（smooth） — anim loopで回す
      // =============================
      function animateMapRotation(){
        // interpolate S.currentMapRotation -> S.targetMapRotation
        const cur = S.currentMapRotation || 0, tgt = S.targetMapRotation || 0;
        const diff = shortestAngleDiff(cur, tgt);
        if(Math.abs(diff) > 0.2){
          S.currentMapRotation = easeAngle(cur, tgt, CFG.ROTATE_SMOOTH_ALPHA);
          applyMapRotation(S.currentMapRotation);
        } else if(cur !== tgt){
          S.currentMapRotation = tgt;
          applyMapRotation(S.currentMapRotation);
        }
        requestAnimationFrame(animateMapRotation);
      }

      function applyMapRotation(deg){
        // rotate the map pane (visually) — but we still do setView on pos updates to keep center
        const scale = S.rotationActive ? CFG.ROTATE_SCALE : 1;
        S.mapPane.style.transform = `rotate(${deg}deg) scale(${scale})`;
      }

      function setRotationActive(flag){
        if(S.rotationActive === !!flag) return;
        S.rotationActive = !!flag;
        if(!S.rotationActive) S.targetMapRotation = 0;
        // invalidate size to re-render tiles
        requestAnimationFrame(()=> S.map.invalidateSize({ debounceMoveend:true }));
      }

      // =============================
      // 12) Routing: OSRM によるルート検索（車/徒歩/自転車）
      // =============================
      async function requestOSRMRoute(start, end, profile='driving'){
        // start = {lat, lon} or [lon, lat] ; end likewise
        // profile: driving | foot | bicycle
        // Build URL
        const fmt = p => Array.isArray(p) ? `${p[1]},${p[0]}` : `${p.lon},${p.lat}`;
        const s = Array.isArray(start) ? `${start[1]},${start[0]}` : `${start.lon},${start.lat}`;
        const e = Array.isArray(end) ? `${end[1]},${end[0]}` : `${end.lon},${end.lat}`;
        const profileName = profile === 'foot' ? 'foot' : (profile === 'bike' ? 'bicycle' : 'driving');
        const url = `${CFG.OSRM_HOST}/route/v1/${profileName}/${s};${e}?overview=full&geometries=geojson&steps=true&alternatives=true`;
        try{
          const ctrl = new AbortController(); const t = setTimeout(()=>ctrl.abort(), 12000);
          const res = await fetch(url, { signal: ctrl.signal });
          clearTimeout(t);
          if(!res.ok) throw new Error('HTTP ' + res.status);
          const j = await res.json();
          if(j && j.code === 'Ok' && j.routes && j.routes.length > 0) return j.routes;
          return null;
        }catch(e){
          warn('requestOSRMRoute fail', e);
          return null;
        }
      }

      // draw routes (multiple alternatives)
      function drawRoutes(routes){
        // clear previous
        clearRoutes();
        if(!routes || !routes.length) return;
        S.routes = routes;
        routes.forEach((r, idx)=>{
          const geo = r.geometry;
          const coords = geo.coordinates.map(c=>[c[1], c[0]]);
          const color = idx === 0 ? CFG.ROUTE_MAIN_COLOR : '#888';
          const weight = idx === 0 ? 7 : 5;
          const opacity = idx === 0 ? 0.95 : 0.4;
          const line = L.polyline(coords, { color, weight, opacity }).addTo(S.map);
          line.on('click', ()=> selectRoute(idx));
          S.routeLayers.push(line);

          // candidate list in sidebar
          const div = document.createElement('div');
          div.className = 'route-item';
          div.style.padding = '8px';
          div.style.border = '1px solid #eee';
          div.style.borderRadius = '8px';
          div.style.marginBottom = '6px';
          div.style.cursor = 'pointer';
          if(idx === 0) div.style.background = CFG.ROUTE_MAIN_COLOR, div.style.color = '#fff';
          div.textContent = `候補 ${idx+1} — ${(r.distance/1000).toFixed(2)} km / ${formatTimeSec( (r.distance/1000)/ (S.E.modeSpeed || 42) * 3600 )}`;
          div.addEventListener('click', ()=> selectRoute(idx));
          S.E.transitResult.insertAdjacentElement('beforebegin', div); // place above result
        });
        selectRoute(0);
      }

      function clearRoutes(){
        S.routeLayers.forEach(l=>{ try{ S.map.removeLayer(l); }catch(e){} });
        S.routeLayers = [];
        if(S.progressLayer){ try{ S.map.removeLayer(S.progressLayer); }catch(e){} S.progressLayer = null; }
        // clear previous small route-items in sidebar
        const olds = document.querySelectorAll('.route-item');
        olds.forEach(n=> n.remove());
      }

      function selectRoute(i){
        if(!S.routes || i < 0 || i >= S.routes.length) return;
        S.selected = i;
        S.routeLayers.forEach((l, idx)=>{
          if(idx === i) l.setStyle({ color: CFG.ROUTE_MAIN_COLOR, weight:8, opacity:0.98 }), l.bringToFront();
          else l.setStyle({ color:'#888', weight:5, opacity:0.4 });
        });

        // render steps of selected route
        const r = S.routes[i];
        const steps = r.legs && r.legs[0] && r.legs[0].steps ? r.legs[0].steps : [];
        renderTurnByTurn(steps);
        S.lastSnapIdx = 0;
        // center to route bounds momentarily — but follow/centerLock will re-center on next pos update
        try{ S.map.fitBounds(L.latLngBounds(r.geometry.coordinates.map(c=>[c[1],c[0]])), { padding: [50,50] }); }catch(e){}
        // HUD update
        S.E.hudTotalDist.textContent = (r.distance/1000).toFixed(2) + ' km';
      }

      // render turn-by-turn list into sidebar
      function renderTurnByTurn(steps){
        const turns = S.E.transitResult;
        // clear old turn elements area (we'll put below)
        // create container
        const container = document.createElement('div');
        container.style.marginTop = '8px';
        container.style.paddingTop = '8px';
        container.style.borderTop = '1px dashed #eee';
        if(!steps || !steps.length){
          container.innerHTML = '<div class="muted">ターンバイターン情報がありません</div>';
        } else {
          steps.forEach((s, idx)=>{
            const d = document.createElement('div');
            d.style.padding = '6px 0';
            d.style.borderBottom = '1px dashed #f1f1f1';
            const inst = jpInstruction(s);
            const dist = formatDist(s.distance || 0);
            d.innerHTML = `<div style="font-weight:700">${idx+1}. ${escapeHtml(inst)}</div><div class="muted">距離: ${escapeHtml(dist)} ${s.name? '｜'+escapeHtml(s.name):''}</div>`;
            d.addEventListener('mouseenter', ()=>{
              if(s.maneuver && s.maneuver.location){
                const [lon, lat] = s.maneuver.location;
                L.popup({ autoClose:true, closeButton:false, offset:[0,-10] })
                  .setLatLng([lat, lon])
                  .setContent(`<b>${escapeHtml(inst)}</b>`)
                  .openOn(S.map);
              }
            });
            container.appendChild(d);
          });
        }
        // place at bottom of sidebar (replace previous)
        S.E.transitResult.innerHTML = '';
        S.E.transitResult.appendChild(container);
      }

      // human friendly JP instruction from OSRM step
      function jpInstruction(step){
        if(!step || !step.maneuver) return '直進';
        const m = step.maneuver, type = m.type || '', mod = m.modifier || '';
        const name = step.name ? `（${step.name}）` : '';
        const dirMap = { left:'左', right:'右', 'slight left':'やや左', 'slight right':'やや右', 'sharp left':'大きく左', 'sharp right':'大きく右', straight:'直進', uturn:'Uターン' };
        let base = '進む';
        switch(type){
          case 'depart': base='出発'; break;
          case 'arrive': base='到着'; break;
          case 'turn': base = (dirMap[mod] ? `${dirMap[mod]}に曲がる` : '曲がる'); break;
          case 'new name': base='道なりに進む'; break;
          case 'merge': base='合流'; break;
          case 'roundabout': base = `環状交差点（${m.exit ? m.exit + '番出口' : '出口指定なし'}）`; break;
          default: base = type || '進む';
        }
        return `${base}${name}`;
      }

      // =============================
      // 13) 徒歩ルート取得（現在地→最寄駅 / 到着駅→目的地）
      //     — OSRM foot profile を使用 (key不要)
      // =============================
      async function getWalkRouteGeoJSON(startLonLat, endLonLat){
        // startLonLat: [lon, lat]
        const url = `${CFG.OSRM_HOST}/route/v1/foot/${startLonLat[0]},${startLonLat[1]};${endLonLat[0]},${endLonLat[1]}?overview=full&geometries=geojson&steps=false`;
        try{
          const ctrl = new AbortController(); const t = setTimeout(()=>ctrl.abort(),12000);
          const res = await fetch(url, { signal: ctrl.signal });
          clearTimeout(t);
          if(!res.ok) throw new Error('HTTP '+res.status);
          const j = await res.json();
          if(j && j.code === 'Ok' && j.routes && j.routes.length > 0) return j.routes[0].geometry;
          return null;
        }catch(e){
          warn('getWalkRouteGeoJSON fail', e);
          return null;
        }
      }

      function drawWalkGeoJSON(geo, style){
        if(!geo) return null;
        const coords = geo.coordinates.map(c=>[c[1], c[0]]);
        const pl = L.polyline(coords, style).addTo(S.map);
        S.walkLayers.push(pl);
        return pl;
      }

      function clearWalkLayers(){
        S.walkLayers.forEach(l=>{ try{ S.map.removeLayer(l); }catch(e){} });
        S.walkLayers = [];
      }

      // =============================
      // 14) 乗換経路探索（BFSベースの最短経路）
      //     - 簡易的な実装（路線を基に隣接駅を列挙）
      // =============================
      function findTransitPath(startStation, endStation, maxTransfer = 3){
        // BFS over stations graph
        const graph = buildStationGraph();
        const q = [[startStation]];
        const seen = new Set([startStation]);
        while(q.length){
          const path = q.shift();
          const last = path[path.length - 1];
          if(last === endStation) return path;
          if(path.length > 50) continue;
          const neighbors = graph[last] || [];
          for(const n of neighbors){
            if(!seen.has(n)){
              seen.add(n);
              const newPath = path.concat([n]);
              q.push(newPath);
            }
          }
        }
        return null;
      }

      function buildStationGraph(){
        // create adjacency map from S.lines
        const g = {};
        for(const line in S.lines){
          const arr = S.lines[line];
          for(let i=0;i<arr.length;i++){
            const cur = arr[i];
            g[cur] = g[cur] || new Set();
            if(i>0) g[cur].add(arr[i-1]);
            if(i<arr.length-1) g[cur].add(arr[i+1]);
          }
        }
        // convert sets to arrays
        const out = {};
        for(const k in g) out[k] = Array.from(g[k]);
        return out;
      }

      // =============================
      // 15) ユーティリティ: 最寄り駅を求める（現在地から距離最短）
      // =============================
      function findNearestStation(lat, lon){
        let best = null, bestD = Infinity;
        for(const name in S.stations){
          const [slat, slon] = S.stations[name];
          const d = haversine(lat, lon, slat, slon);
          if(d < bestD){
            best = { name, lat: slat, lon: slon, dist: d };
            bestD = d;
          }
        }
        return best;
      }

      // ハーサイン距離（メートル）
      function haversine(lat1, lon1, lat2, lon2){
        const R = 6371000;
        const toRad = v => v * Math.PI / 180;
        const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
        return 2*R*Math.asin(Math.sqrt(a));
      }

      // =============================
      // 16) Navigation update: ルート進捗 / 次の案内判定 / リルート判定
      // =============================
      function updateNavigationState(lat, lon){
        // if we have a selected route from OSRM, compute nearest point and progress
        if(!S.routes || !S.routes.length) return;
        const route = S.routes[S.selected || 0];
        if(!route) return;

        const line = turf.lineString(route.geometry.coordinates);
        const pt = turf.point([lon, lat]);
        const snapped = turf.nearestPointOnLine(line, pt, { units:'meters' });
        const distToLine = snapped.properties && snapped.properties.dist ? snapped.properties.dist : 0;
        const snapIdx = snapped.properties && (typeof snapped.properties.index === 'number') ? snapped.properties.index : 0;

        if(snapIdx > S.lastSnapIdx){
          S.lastSnapIdx = snapIdx;
          updateProgressLayer(route, snapIdx);
        }

        // find next step
        const steps = route.legs[0].steps || [];
        let next = null;
        for(let i=0;i<steps.length;i++){
          const st = steps[i];
          if(!st.maneuver || !st.maneuver.location) continue;
          const d = turf.distance(turf.point([lon, lat]), turf.point([st.maneuver.location[0], st.maneuver.location[1]]), { units:'meters' });
          if(d > 5) { next = { index: i, step: st, dist: d }; break; }
        }
        if(!next && steps.length) next = { index: steps.length-1, step: steps[steps.length-1], dist: 0 };
        if(next){
          const msg = `${formatDist(next.dist)} 先、${jpInstruction(next.step)}`;
          S.E.hudNext.textContent = '次の案内 — ' + msg;
          if(next.dist < CFG.SPEAK_NEXT_AT_METERS) speak(msg);
        }

        // remaining distance
        const totalDist = route.distance || 0;
        const remLine = turf.lineString(route.geometry.coordinates.slice(snapIdx));
        const remKm = turf.length(remLine, { units: 'kilometers' });
        const remM = Math.max(0, Math.round(remKm * 1000));
        S.E.hudRemDist.textContent = formatDist(remM);

        // reroute if too far off
        const thr = offRouteThreshold();
        const now = nowMs();
        if(distToLine > thr && (now - S.lastRerouteTs) > 8000){
          S.lastRerouteTs = now;
          setStatus(`コース外（${Math.round(distToLine)}m）。リルートを試みます…`);
          // attempt reroute from current position to original destination
          const cur = { lat, lon };
          const dest = S.toLocation;
          if(dest){
            requestOSRMRoute(cur, dest, getMode()).then(rs=>{
              if(rs && rs.length){
                drawRoutes(rs);
                setStatus('自動リルート完了');
                // ensure center again
                enforceCenter(lat, lon);
              } else {
                setStatus('自動リルート失敗', true);
              }
            });
          }
        }
      }

      function offRouteThreshold(){
        const m = getMode();
        return m === 'foot' ? 30 : m === 'bike' ? 50 : 100;
      }

      function updateProgressLayer(route, snapIdx){
        try{
          const coords = route.geometry.coordinates;
          const seg = coords.slice(0, Math.min(snapIdx+1, coords.length)).map(c=>[c[1], c[0]]);
          if(!S.progressLayer){
            S.progressLayer = L.polyline(seg, { color: CFG.ROUTE_PROGRESS_COLOR, weight:8, opacity:0.95 }).addTo(S.map);
          } else {
            S.progressLayer.setLatLngs(seg);
          }
        }catch(e){
          warn('updateProgressLayer failed', e);
        }
      }

      // =============================
      // 17) 音声（簡易） — speak
      // =============================
      function speak(text){
        if(!window.speechSynthesis) return;
        try{
          const u = new SpeechSynthesisUtterance(text);
          u.lang = 'ja-JP';
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(u);
        }catch(e){}
      }

      // =============================
      // 18) Mode helpers（UI） — getMode, setModeSpeed
      // =============================
      function getMode(){
        const active = document.querySelector('.mode-btn.active');
        return active ? (active.dataset.mode || 'driving') : 'driving';
      }

      // set mode speed hint for HUD time calc (approx)
      function setModeSpeed(mode){
        const speeds = { driving: 42, bike: 16, foot: 4.8 };
        S.E.modeSpeed = speeds[mode] || 42;
      }

      // =============================
      // 19) misc helpers
      // =============================
      function setStatus(msg, isErr){
        const statusEl = qs('#hud') || null;
        if(statusEl){
          // not writing to hud element top-level; use console & transitResult
        }
        log('[STATUS]', msg);
      }

      // =============================
      // 20) UI binding  — handlers for buttons etc.
      // =============================
      function bindUI(){
        S.E.search.addEventListener('click', async ()=>{
          try{
            setStatus('出発地・目的地の解決中...');
            const f = await resolvePlaceInput(S.E.from ? S.E.from.value : qs('#from').value);
            const t = await resolvePlaceInput(S.E.to ? S.E.to.value : qs('#to').value);
            if(!f || !t) { alert('出発地・目的地の解決に失敗しました'); return; }
            S.fromLocation = { lat: f.lat, lon: f.lon };
            S.toLocation = { lat: t.lat, lon: t.lon };
            setStatus('経路検索（OSRM）…');
            const routes = await requestOSRMRoute({lat:f.lat, lon:f.lon}, {lat:t.lat, lon:t.lon}, getMode());
            if(routes && routes.length){
              drawRoutes(routes);
              setStatus('経路候補を表示しました');
            } else {
              setStatus('経路検索に失敗しました', true);
            }
          }catch(e){ warn('search click error', e); setStatus('検索でエラー', true); }
        });

        S.E.startNav.addEventListener('click', ()=>{
          startNavigation();
        });
        S.E.stopNav.addEventListener('click', ()=>{
          stopNavigation();
        });

        S.E.modeBtns.forEach(b=>{
          b.addEventListener('click', async ()=>{
            S.E.modeBtns.forEach(x=>x.classList.remove('active'));
            b.classList.add('active');
            setModeSpeed(b.dataset.mode || 'driving');
            // if we already have from/to, re-run route
            if(S.fromLocation && S.toLocation){
              const rs = await requestOSRMRoute(S.fromLocation, S.toLocation, getMode());
              if(rs) drawRoutes(rs);
            }
          });
        });

        S.E.chkFollow.addEventListener('change', (e)=>{ S.follow = e.target.checked; });
        S.E.chkCenterLock.addEventListener('change', (e)=>{ S.centerLock = e.target.checked; });
        S.E.chkRotate.addEventListener('change', (e)=>{ S.rotate = e.target.checked; if(!S.rotate) setRotationActive(false); });

        // station transit UI
        S.E.searchTransit.addEventListener('click', async ()=>{
          const fromSt = S.E.stationFrom.value;
          const toSt = S.E.stationTo.value;
          const path = findTransitPath(fromSt, toSt, parseInt(S.E.maxTransfer.value || 3));
          if(!path){ alert('経路が見つかりません'); return; }
          S.transitPath = path;
          renderTransitPathOnMap(path);
          // create combined route: current -> nearest station walking, station path (station coords), station -> destination walking
          await createCompleteTransitRoute(path);
        });

        S.E.nearestStationBtn.addEventListener('click', ()=>{
          // find nearest to current user marker
          const latlng = S.userMarker.getLatLng();
          const nearest = findNearestStation(latlng.lat, latlng.lng);
          if(nearest){
            alert(`最寄駅: ${nearest.name} （${Math.round(nearest.dist)} m）`);
            // pan to that station momentarily (but center lock will bring it back)
            S.map.panTo([nearest.lat, nearest.lon]);
          }
        });

        // map click to set to/from
        S.map.on('click', (e)=>{
          // if user clicks while typing focus? we set to field 'to' as coordinates
          qs('#to').value = `${e.latlng.lat.toFixed(6)},${e.latlng.lng.toFixed(6)}`;
        });

        // user interactions to detect manual pan/zoom (center lock behavior)
        ['movestart','dragstart','zoomstart'].forEach(ev=>{
          S.map.on(ev, ()=>{ S.lastUserInteractTs = nowMs(); });
        });

      }

      // =============================
      // 21) transit path render (station polyline) + minimal UI text
      // =============================
      function renderTransitPathOnMap(path){
        // clear old
        if(S.transitLayer){ try{ S.map.removeLayer(S.transitLayer); }catch(e){} S.transitLayer = null; }
        const coords = path.map(st => S.stations[st]);
        S.transitLayer = L.polyline(coords, { color: CFG.ROUTE_MAIN_COLOR, weight:6, opacity:0.95 }).addTo(S.map);
        S.map.fitBounds(S.transitLayer.getBounds());
        // textual representation
        S.E.transitResult.innerHTML = `<div style="font-weight:700">乗換経路</div><div class="muted">${path.join(' → ')}</div>`;
      }

      // =============================
      // 22) createCompleteTransitRoute
      // - 現在地 -> 最寄駅（歩行）
      // - 駅間（transitLayer）既に表示
      // - 目的駅 -> 最終目的地（歩行） — 最終目的地は S.toLocation がある場合のみ
      // =============================
      async function createCompleteTransitRoute(path){
        clearWalkLayers();
        try{
          const userPos = S.userMarker.getLatLng();
          const nearest = findNearestStation(userPos.lat, userPos.lng);
          if(nearest){
            // get pedestrian route from user -> nearest station
            const start = [userPos.lng, userPos.lat];
            const end = [nearest.lon, nearest.lat];
            const geo = await getWalkRouteGeoJSON(start, end);
            if(geo) drawWalkGeoJSON(geo, { color: CFG.WALK_COLOR, weight:4, dashArray: '6,6' });
          }
          // station-to-station walking? usually none

          // if S.toLocation is set (user searched an arbitrary destination), draw walk from last station to that point
          if(S.toLocation){
            const lastStName = path[path.length - 1];
            const last = S.stations[lastStName];
            if(last){
              const start2 = [last[1], last[0]];
              const end2 = [S.toLocation.lon, S.toLocation.lat];
              const geo2 = await getWalkRouteGeoJSON(start2, end2);
              if(geo2) drawWalkGeoJSON(geo2, { color: CFG.WALK_COLOR, weight:4, dashArray:'6,6' });
            }
          }

        }catch(e){
          warn('createCompleteTransitRoute fail', e);
        }
      }

      // =============================
      // 23) Navigation start/stop
      // =============================
      function startNavigation(){
        if(S.nav) return;
        S.nav = true;
        S.E.startNav.disabled = true;
        S.E.stopNav.disabled = false;
        setRotationActive(true);
        startGeolocation();
      }
      function stopNavigation(){
        if(!S.nav) return;
        S.nav = false;
        S.E.startNav.disabled = false;
        S.E.stopNav.disabled = true;
        setRotationActive(false);
        stopGeolocation();
      }

      // =============================
      // 24) resolvePlaceInput (geocode) — Nominatim (簡易)
      // =============================
      async function resolvePlaceInput(q){
        // if coords, parse and return
        const p = q && q.trim().match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
        if(p) return { lat: parseFloat(p[1]), lon: parseFloat(p[2]) };

        // special cases
        if(!q || q.trim() === '' ) return null;
        if(q.trim() === '現在地' || q.trim() === 'current' || q.trim() === 'いま'){
          // attempt to read current marker
          if(S.userMarker){
            const ll = S.userMarker.getLatLng();
            return { lat: ll.lat, lon: ll.lng };
          } else return null;
        }

        // Nominatim
        const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=3&q=' + encodeURIComponent(q);
        try{
          const ctrl = new AbortController(); const t = setTimeout(()=>ctrl.abort(), 8000);
          const res = await fetch(url, { signal: ctrl.signal, headers: { 'Accept-Language': 'ja' }});
          clearTimeout(t);
          if(!res.ok) throw new Error('HTTP ' + res.status);
          const j = await res.json();
          if(j && j.length) return { lat: parseFloat(j[0].lat), lon: parseFloat(j[0].lon), display_name: j[0].display_name };
          return null;
        }catch(e){
          warn('geocode fail', e);
          return null;
        }
      }

      // =============================
      // 25) Utility: escape for logs
      // =============================
      function safe(obj){ try{ return JSON.stringify(obj); }catch(e){ return String(obj); } }

      // =============================
      // 26) Initial bootsrap: init map/orientation/ui/animation
      // =============================
      (function bootstrap(){
        initMap();
        initOrientation();
        bindUI();
        // start anim loop for rotation smoothing
        requestAnimationFrame(animateMapRotation);
        // start also the position watch if user chooses to start nav — but we can start geolocation immediately (optional)
        // startGeolocation(); // Not auto-start to respect user's click
      })();

      // =============================
      // 27) Small tests / sanity checks (ログ)
      // =============================
      (function selfChecks(){
        log('YK long init OK. Stations loaded:', Object.keys(S.stations).length);
      })();

      // Expose some internals for debugging
      window.__YK_LONG = { S, CFG, requestOSRMRoute };

    })(); // end outer IIFE
  } // end if not initialized
  </script>
</body>
</html>
