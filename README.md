<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <title>ゆいきちナビ</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    :root{
      --accent:#1e90ff;
      --bg:#f7f9fc;
      --ink:#111;
      --panel-w:360px;
    }
    html,body{height:100%;margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans JP",sans-serif;background:var(--bg);color:var(--ink)}
    #app{height:100vh;display:flex;flex-direction:column}
    header{display:flex;align-items:center;gap:10px;padding:10px;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,0.06);z-index:1600}
    header h1{font-size:16px;margin:0}
    #map-wrap{position:relative;flex:1;min-height:360px}
    #map{position:absolute;inset:0;height:100%;width:100%}

    /* パネル（地図内オーバーレイ）。折りたたみ可能。 */
    .panel{position:absolute;z-index:1400;left:12px;top:12px;background:#fff;border:1px solid #e9eef3;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.12);padding:10px;max-width:calc(var(--panel-w) - 16px)}
    .panel.compact{transform:scale(.78);transform-origin:top left}
    .panel .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .panel input{padding:8px;border:1px solid #ddd;border-radius:8px;min-width:120px;flex:1 1 120px}
    .panel button{padding:8px 10px;border-radius:10px;border:1px solid #ddd;background:#fff;cursor:pointer}
    .panel .mode-btn{padding:6px 10px;border-radius:10px}
    .panel .mode-btn.active{background:var(--accent);color:#fff;border-color:var(--accent)}
    .panel .ctrl-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}
    .panel .toggle-btn{background:transparent;border:none;cursor:pointer;padding:6px;border-radius:8px}

    /* 右サイドパネル */
    aside.sidebar{position:absolute;right:12px;top:12px;z-index:1400;background:#fff;padding:12px;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,0.12);width:var(--panel-w);max-height:72vh;overflow:auto}
    aside.sidebar.hidden{display:none}
    .route-item{padding:8px;border-radius:10px;border:1px solid #eee;margin-bottom:6px;cursor:pointer}
    .route-item.selected{background:var(--accent);color:#fff;border-color:var(--accent);font-weight:700}
    .turn-step{padding:6px;border-bottom:1px dashed #eee}

    /* HUD/コンパス/ステータス */
    #status{position:absolute;left:12px;bottom:12px;z-index:1500;background:rgba(255,255,255,0.95);padding:8px 10px;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,0.12)}
    .small{font-size:12px;color:#666}
    .hud{position:absolute;left:12px;bottom:92px;z-index:1500;background:rgba(255,255,255,0.96);padding:10px 12px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.12);min-width:220px;max-width:60vw}
    .hud .row{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
    .hud .key{font-size:12px;color:#777}
    .hud .val{font-weight:700}
    .compass{position:absolute;right:12px;bottom:12px;z-index:1500;background:rgba(255,255,255,0.95);padding:8px;border-radius:50%;width:44px;height:44px;display:grid;place-items:center;box-shadow:0 6px 18px rgba(0,0,0,0.12)}
    .compass > div{transform-origin:center center}
    .rotateable{transition:transform 120ms ease}

    /* Leafletズームボタンを押しやすく */
    .leaflet-control-zoom{transform-origin:top left}
    .expand-map-btn{position:absolute;right:74px;top:12px;z-index:1500;background:#fff;border-radius:8px;padding:6px;border:1px solid #ddd;box-shadow:0 6px 18px rgba(0,0,0,0.12);cursor:pointer}

    /* ルートステップ下部シート */
    #route-steps{position:absolute;left:12px;right:12px;bottom:12px;background:rgba(255,255,255,0.98);max-height:40%;overflow:auto;padding:12px;border-radius:12px;display:none;z-index:1501}

    /* レスポンシブ調整 */
    @media(max-width:900px){
      :root{--panel-w:320px}
      .panel{left:8px;top:8px;padding:8px}
      .panel.compact{transform:scale(.72)}
      aside.sidebar{width:92vw;right:4vw;top:auto;bottom:12px;max-height:46vh}
      .hud{min-width:180px}
      .leaflet-control-zoom{transform:scale(1.35)}
      .expand-map-btn{right:12px;top:12px}
    }
    @media(min-width:901px){
      .leaflet-control-zoom{transform:scale(1.05)}
    }

    /* 視認性のための微調整 */
    ol{padding-left:18px;margin:6px 0}
    li[data-idx]{cursor:pointer;padding:6px;border-radius:6px}
    li[data-idx]:hover{background:#f0f8ff}
  </style>
</head>
<body>
  <div id="app">
    <header>
      <h1>ゆいきちナビ — 完全版</h1>
      <div class="small">スマホでも見やすく、パネルは折りたたみ可能</div>
    </header>

    <div id="map-wrap">
      <div id="map" aria-label="地図">地図を読み込み中…</div>

      <!-- パネル（地図内オーバーレイ）-->
      <div id="panel" class="panel" role="search" aria-live="polite">
        <div class="row">
          <input id="from" placeholder="出発地（住所 / 緯度,経度 / 現在地）" />
          <input id="to" placeholder="目的地（住所 / 緯度,経度 / 地図クリック）" />
          <button id="swap" title="入れ替え">⇄</button>
        </div>

        <div class="ctrl-row">
          <button class="mode-btn active" data-mode="driving" id="m-driv">車</button>
          <button class="mode-btn" data-mode="foot" id="m-foot">徒歩</button>
          <button class="mode-btn" data-mode="bike" id="m-bike">自転車</button>
          <button id="search">検索</button>
        </div>

        <div class="ctrl-row">
          <button id="set-from-map">地図で出発</button>
          <button id="set-to-map">地図で目的</button>
          <button id="start-nav">ゆいきちナビ開始</button>
          <button id="stop-nav" disabled>ゆいきちナビ停止</button>
        </div>

        <div class="ctrl-row">
          <label class="small"><input type="checkbox" id="chk-follow" checked> 追尾</label>
          <label class="small"><input type="checkbox" id="chk-rotate" checked> コンパス回転</label>
          <button id="collapse-panel" class="toggle-btn" title="パネルを閉じる">▢</button>
        </div>
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

      <div class="hud" aria-live="polite">
        <div class="row"><span class="key">合計距離</span><span class="val" id="hud-total-dist">—</span><span class="key">合計時間</span><span class="val" id="hud-total-time">—</span></div>
        <div class="row"><span class="key">残り距離</span><span class="val" id="hud-rem-dist">—</span><span class="key">到着まで</span><span class="val" id="hud-rem-time">—</span></div>
        <div class="row small" id="hud-next">次の案内 — —</div>
      </div>

      <div class="compass"><div id="compass-needle">🧭</div></div>
      <div id="status">状態: 初期化中</div>

      <div id="route-steps"></div>
    </div>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js"></script>
  <script>
  // ---------- 初期化 ----------
  const map = L.map('map', { center:[35.681236,139.767125], zoom:13, zoomControl:true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19, attribution:'© OpenStreetMap contributors'}).addTo(map);

  // 変数は1回だけ宣言（重複宣言でエラーが出ないように）
  let routeLayer = null;
  const stepMarkers = [];    // 各ターンのマーカー（重複宣言はNG）
  const turnMarkers = [];    // 他の補助マーカー
  let progressLayer = null;

  const app = {
    routes: [], selected: -1, nav:false, watchId:null, heading:0, lastHeadingTs:0,
    setMode:'driving', mapClickMode:null, useDummy:false, lastRerouteTs:0, follow:true, rotate:true, lastSnapIdx:0
  };

  const els = {
    panel: document.getElementById('panel'),
    from: document.getElementById('from'),
    to: document.getElementById('to'),
    swap: document.getElementById('swap'),
    search: document.getElementById('search'),
    setFromMap: document.getElementById('set-from-map'),
    setToMap: document.getElementById('set-to-map'),
    routeList: document.getElementById('route-list'),
    turns: document.getElementById('turns'),
    status: document.getElementById('status'),
    startNav: document.getElementById('start-nav'),
    stopNav: document.getElementById('stop-nav'),
    hudTotalDist: document.getElementById('hud-total-dist'),
    hudTotalTime: document.getElementById('hud-total-time'),
    hudRemDist: document.getElementById('hud-rem-dist'),
    hudRemTime: document.getElementById('hud-rem-time'),
    hudNext: document.getElementById('hud-next'),
    chkFollow: document.getElementById('chk-follow'),
    chkRotate: document.getElementById('chk-rotate'),
    sidebar: document.getElementById('sidebar'),
    collapseBtn: document.getElementById('collapse-panel'),
    expandMapBtn: document.getElementById('expand-map'),
    hideSidebarBtn: document.getElementById('hide-sidebar'),
    routeSteps: document.getElementById('route-steps')
  };

  function setStatus(msg, isErr){ els.status.textContent = '状態: ' + msg; els.status.style.color = isErr? 'red':'black'; console.log('[nav]', msg); }
  function formatDist(m){ return m>=1000? (m/1000).toFixed(2)+' km' : Math.round(m)+' m'; }
  function formatDuration(sec){ if(sec===0) return '0分'; if(!sec && sec!==0) return '-'; const s=Math.round(sec); const h=Math.floor(s/3600); const m=Math.round((s%3600)/60); if(h>0){ return `${h}時間${m}分`; } return `${m}分`; }

  // clear helpers
  function clearStepMarkers(){ while(stepMarkers.length){ const m = stepMarkers.pop(); try{ map.removeLayer(m);}catch(e){} } }
  function clearTurnMarkers(){ while(turnMarkers.length){ const m = turnMarkers.pop(); try{ map.removeLayer(m);}catch(e){} } }
  function clearProgress(){ if(progressLayer){ try{ map.removeLayer(progressLayer);}catch(e){} progressLayer=null; } }

  // ---------- ルート描画（coords = [[lat,lng],...], steps = [{latlng:[lat,lng],instruction:'',distance:..}, ...]) ----------
  function drawRoute(coords, steps){
    // remove previous
    if(routeLayer){ try{ map.removeLayer(routeLayer);}catch(e){} routeLayer = null; }
    clearStepMarkers(); clearTurnMarkers(); clearProgress();

    // draw main polyline
    routeLayer = L.polyline(coords, {color:'#1e90ff', weight:6, opacity:0.95}).addTo(map);
    routeLayer.bindTooltip(`ルート — ${coords.length} 点`).openTooltip();
    map.fitBounds(routeLayer.getBounds(), {padding:[50,50]});

    // add step markers
    const listItems = [];
    steps.forEach((s, idx) => {
      const m = L.circleMarker(s.latlng, {radius:6, color:'#1e90ff', fillColor:'#fff', fillOpacity:1, weight:2}).addTo(map);
      m.bindPopup(`<strong>${s.instruction}</strong><div class='small'>距離: ${formatDist(s.distance||0)}</div>`);
      m.on('click', ()=> m.openPopup());
      stepMarkers.push(m);

      // small arrow/label markers for important turns (also add to turnMarkers array)
      if((s.flag && s.flag==='important') || s.instruction.toLowerCase().includes('曲') || idx % Math.max(1, Math.floor(steps.length/30)) === 0 ){
        const t = L.marker(s.latlng, {
          icon: L.divIcon({
            className: '',
            html: `<div style="background:${idx===0? '#2ecc71':'#ff8c00'};color:#fff;padding:4px 6px;border-radius:6px;font-size:11px">${idx===0? '出発':'曲'}</div>`,
            iconSize: [48,24], iconAnchor: [24,12]
          })
        }).addTo(map);
        turnMarkers.push(t);
      }

      listItems.push(`<li data-idx="${idx}"><strong>${s.instruction}</strong><div class="small">${formatDist(s.distance||0)}</div></li>`);
    });

    // show steps sheet
    els.routeSteps.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><strong>ルート案内</strong><button id="close-steps" style="background:transparent;border:none;cursor:pointer">閉じる</button></div><ol>${listItems.join('')}</ol>`;
    els.routeSteps.style.display = 'block';

    // make list clickable
    els.routeSteps.querySelectorAll('li[data-idx]').forEach(li=>{
      li.addEventListener('click', ()=> {
        const i = parseInt(li.dataset.idx,10);
        if(stepMarkers[i]){
          map.panTo(stepMarkers[i].getLatLng());
          stepMarkers[i].openPopup();
        }
      });
    });
    const closeStepsBtn = document.getElementById('close-steps');
    if(closeStepsBtn) closeStepsBtn.addEventListener('click', ()=> { els.routeSteps.style.display='none'; });

    // update HUD summary (approximate)
    const distMeters = estimateDistanceMeters(coords);
    els.hudTotalDist.textContent = (distMeters/1000).toFixed(2) + ' km';
    // simple ETA using mode speeds
    const etaSec = etaSeconds(distMeters, app.setMode);
    els.hudTotalTime.textContent = formatDuration(etaSec);
  }

  // ---------- ヘルパ: 総距離を簡易計算 ----------
  function estimateDistanceMeters(coords){
    if(!coords || coords.length < 2) return 0;
    let sum = 0;
    for(let i=1;i<coords.length;i++){
      sum += turf.distance(turf.point([coords[i-1][1],coords[i-1][0]]), turf.point([coords[i][1],coords[i][0]]), {units:'meters'});
    }
    return Math.round(sum);
  }

  // ---------- ETA 補正 ----------
  const SPEED_KMH = { foot: 4.8, bike: 16, driving: 42 };
  function etaSeconds(distanceMeters, mode){
    const v = SPEED_KMH[mode] || 42;
    return (distanceMeters/1000) / v * 3600;
  }

  // ---------- UI: イベントバインド ----------
  // サンプルデータ（テスト）
  const sampleCoords = [ [35.1815,136.9066], [35.1827,136.9140], [35.1850,136.9260] ];
  const sampleSteps = [
    { latlng:[35.1815,136.9066], instruction:'出発（名古屋駅）', distance:0, flag:'start' },
    { latlng:[35.1827,136.9140], instruction:'右折して大通りへ', distance:1200 },
    { latlng:[35.1850,136.9260], instruction:'目的地に到着（金山駅）', distance:2200, flag:'important' }
  ];

  els.search.addEventListener('click', async ()=>{
    setStatus('出発地/目的地を解決中...');
    try{
      // NOTE: 本稼働時はここでジオコーディングと経路APIを呼ぶ
      drawRoute(sampleCoords, sampleSteps);
      setStatus('サンプルルートを表示しました');
      // show route candidates in sidebar
      renderRouteList([{distance:estimateDistanceMeters(sampleCoords), duration:etaSeconds(estimateDistanceMeters(sampleCoords), app.setMode), geometry: {coordinates: sampleCoords}}]);
    }catch(e){
      console.error(e); setStatus('ルート表示に失敗しました', true);
    }
  });

  function renderRouteList(routes){
    els.routeList.innerHTML = '';
    routes.forEach((r, i) => {
      const div = document.createElement('div');
      div.className = 'route-item' + (i===0? ' selected':'');
      div.innerHTML = `候補 ${i+1} — ${(r.distance/1000 || (estimateDistanceMeters(r.geometry.coordinates)/1000)).toFixed(2)} km / ${formatDuration(Math.round(r.duration||etaSeconds(estimateDistanceMeters(r.geometry.coordinates), app.setMode)))}`;
      div.addEventListener('click', ()=> {
        // select and draw
        document.querySelectorAll('.route-item').forEach(x=>x.classList.remove('selected'));
        div.classList.add('selected');
        drawRoute(r.geometry.coordinates, sampleSteps);
      });
      els.routeList.appendChild(div);
    });
  }

  // stop nav clears overlays
  els.stopNav.addEventListener('click', ()=>{
    if(routeLayer){ try{ map.removeLayer(routeLayer);}catch(e){} routeLayer=null; }
    clearStepMarkers(); clearTurnMarkers(); clearProgress();
    els.routeSteps.style.display='none';
    setStatus('ナビ停止');
    els.stopNav.disabled = true;
    els.startNav.disabled = false;
  });

  els.startNav.addEventListener('click', ()=> {
    if(!routeLayer){ setStatus('先にルートを検索してください', true); return; }
    setStatus('ナビを開始します');
    els.startNav.disabled = true;
    els.stopNav.disabled = false;
    // geolocation watch を開始など（未実装の詳細ナビはここへ）
    // ここではデモ的に進捗ラインを引くなどを行うことが可能
  });

  // set from/to on map mode
  els.setFromMap.addEventListener('click', ()=> { app.mapClickMode = 'from'; setStatus('地図をタップして出発地を設定してください'); });
  els.setToMap.addEventListener('click', ()=> { app.mapClickMode = 'to'; setStatus('地図をタップして目的地を設定してください'); });

  map.on('click', (e) => {
    if(app.mapClickMode === 'from' || appState.mapClickMode === 'from'){
      els.from.value = `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`;
      app.mapClickMode = null; appState.mapClickMode = null;
      setStatus('出発地を設定しました');
    } else if(app.mapClickMode === 'to' || appState.mapClickMode === 'to'){
      els.to.value = `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`;
      app.mapClickMode = null; appState.mapClickMode = null;
      setStatus('目的地を設定しました');
    }
  });

  // swap
  els.swap.addEventListener('click', ()=> {
    const a = els.from.value; els.from.value = els.to.value; els.to.value = a;
  });

  // mode buttons
  document.querySelectorAll('.mode-btn').forEach(btn => btn.addEventListener('click', async (e)=>{
    document.querySelectorAll('.mode-btn').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    app.setMode = btn.dataset.mode;
    setStatus('移動モードを ' + app.setMode + ' に切替えました');
    // モードごとに再検索を促す
  }));

  // follow/rotate
  els.chkFollow.addEventListener('change', (e)=> { app.follow = e.target.checked; });
  els.chkRotate.addEventListener('change', (e)=> { app.rotate = e.target.checked; });

  // collapse panel / expand map / hide sidebar
  let panelHidden = false;
  els.collapseBtn.addEventListener('click', ()=> {
    panelHidden = !panelHidden;
    if(panelHidden){
      els.panel.style.display = 'none';
      els.expandMapBtn.style.display = 'block';
    } else {
      els.panel.style.display = 'block';
      els.expandMapBtn.style.display = 'block';
    }
  });

  els.expandMapBtn.addEventListener('click', ()=> {
    // toggle full map: hide panel & sidebar
    if(!els.panel.style.display || els.panel.style.display !== 'none'){
      els.panel.style.display = 'none';
      els.sidebar.classList.add('hidden');
      els.expandMapBtn.textContent = 'コントロール表示';
    } else {
      els.panel.style.display = 'block';
      els.sidebar.classList.remove('hidden');
      els.expandMapBtn.textContent = '地図を大きく';
    }
    // small delay to allow layout then invalidate leaflet size
    setTimeout(()=> map.invalidateSize(), 260);
  });

  els.hideSidebarBtn.addEventListener('click', ()=> {
    els.sidebar.classList.add('hidden');
  });

  // route steps close on click outside
  document.addEventListener('click', (ev)=>{
    const steps = els.routeSteps;
    if(steps.style.display === 'block'){
      const target = ev.target;
      if(!steps.contains(target) && !els.panel.contains(target)){
        // keep it open — only close via close button to avoid accidental hide
      }
    }
  });

  // ---------- orientation & compass (improved handling) ----------
  function norm360(deg){ if(typeof deg!=='number' || Number.isNaN(deg)) return 0; return (deg%360+360)%360; }
  function initOrientation(){
    function handleGeneric(e){
      // Try webkitCompassHeading (iOS), then alpha (others). Apply screen orientation correction.
      let heading = null;
      if(typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)){
        heading = e.webkitCompassHeading;
      } else if(typeof e.alpha === 'number' && !Number.isNaN(e.alpha)){
        // convert alpha to compass heading: alpha is rotation around z-axis.
        heading = 360 - e.alpha;
      }
      if(heading !== null){
        const screenAngle = (screen.orientation && typeof screen.orientation.angle === 'number') ? screen.orientation.angle : (typeof window.orientation === 'number' ? window.orientation : 0);
        const corrected = norm360(heading + screenAngle);
        app.heading = corrected;
        app.lastHeadingTs = Date.now();
        try{ document.getElementById('compass-needle').style.transform = `rotate(${corrected}deg)`; }catch(e){}
      }
    }

    if(window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function'){
      // iOS: need user gesture to request permission
      document.body.addEventListener('click', function once(){
        DeviceOrientationEvent.requestPermission().then(state=>{
          if(state === 'granted'){
            window.addEventListener('deviceorientation', handleGeneric, {passive:true});
            window.addEventListener('deviceorientationabsolute', handleGeneric, {passive:true});
          }
        }).catch(()=>{});
        document.body.removeEventListener('click', once);
      }, {once:true});
    } else if(window.DeviceOrientationEvent){
      window.addEventListener('deviceorientation', handleGeneric, {passive:true});
      window.addEventListener('deviceorientationabsolute', handleGeneric, {passive:true});
    }
    window.addEventListener('orientationchange', ()=> { app.lastHeadingTs = 0; }, {passive:true});
  }
  initOrientation();

  // ---------- small helpers for debugging ----------
  window._yuikichi = {
    drawRoute, clearStepMarkers, clearTurnMarkers, estimateDistanceMeters
  };

  // initialize UI
  window.addEventListener('load', ()=> {
    setStatus('初期化完了 — 出発地と目的地を入力して検索してください');
    // keep panels visible by default
    els.expandMapBtn.style.display = 'block';
    // improve leaflet controls visibility after initial layout
    setTimeout(()=> map.invalidateSize(), 300);
  });
  </script>
</body>
</html>
