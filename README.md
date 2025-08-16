<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>ゆいきちナビ</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
:root{
  --accent:#1e90ff;
  --accent-2:#ff4757;
  --bg:#f7f9fc;
  --ink:#111;
  --ok:#2ecc71;
}
*{box-sizing:border-box}
html,body{height:100%;margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,'Noto Sans JP',sans-serif;background:var(--bg);color:var(--ink)}
#app{height:100%;display:flex;flex-direction:column}

/* Header */
header{display:flex;gap:8px;align-items:center;padding:8px;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,0.06);flex-wrap:wrap;z-index:2000}
header h1{margin:0 6px 0 0;font-size:16px;white-space:nowrap}
.controls{display:flex;gap:8px;align-items:center;flex:1;flex-wrap:wrap}
.controls input{padding:9px 10px;border:1px solid #ddd;border-radius:10px;width:230px;background:#fff}
.controls button{padding:10px 12px;border-radius:10px;border:1px solid #ddd;background:#fff;cursor:pointer}
.controls .mode-btn{padding:8px 10px}
.controls .mode-btn.active{background:var(--accent);color:#fff;border-color:var(--accent)}
.controls .pill{border-radius:999px}

/* Map */
#map{flex:1;min-height:320px;position:relative}

/* Sidebar */
aside.sidebar{
  position:absolute;right:12px;top:76px;z-index:1200;background:#fff;padding:12px;border-radius:12px;
  box-shadow:0 10px 30px rgba(0,0,0,0.12);width:360px;max-height:70vh;overflow:auto
}
.sidebar h3{margin:4px 0 6px 0;font-size:14px}
.route-item{padding:8px;border-radius:10px;border:1px solid #eee;margin-bottom:6px;cursor:pointer;background:#fff}
.route-item.selected{background:var(--accent);color:#fff;border-color:var(--accent);font-weight:700}
.turn-step{padding:6px;border-bottom:1px dashed #eee;font-size:13px;cursor:pointer}
.turn-step.active{background:rgba(30,144,255,0.12)}

/* HUD (non-blocking, inside map bottom-right) */
.hud{
  position:absolute;right:12px;bottom:74px;z-index:1500;background:rgba(255,255,255,0.92);
  padding:10px 12px;border-radius:12px;box-shadow:0 6px 18px rgba(0,0,0,0.12);min-width:240px;font-size:13px;backdrop-filter:blur(2px)
}
.hud .row{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
.hud .key{font-size:12px;color:#777}
.hud .val{font-weight:700}
.hud .toggles{display:flex;gap:10px;margin-top:6px;font-size:12px;color:#666}
.hud .toggles label{display:flex;align-items:center;gap:6px;cursor:pointer}

/* Compass & Status */
.compass{position:absolute;right:12px;bottom:12px;z-index:1500;background:rgba(255,255,255,0.96);padding:8px;border-radius:50%;width:46px;height:46px;display:grid;place-items:center;box-shadow:0 6px 18px rgba(0,0,0,0.12)}
.compass > div{transform-origin:center center}
#status{
  position:absolute;left:12px;bottom:12px;z-index:1500;background:rgba(255,255,255,0.96);
  padding:8px 10px;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,0.12);font-size:13px
}
.small{font-size:12px;color:#666}

/* Current marker (heading dot) */
.rotateable{transition:transform 120ms ease}
.marker-heading{width:24px;height:24px;border-radius:50%;background:var(--accent);border:2px solid #fff;box-shadow:0 0 0 2px rgba(30,144,255,0.25)}
.marker-heading::after{content:"";position:absolute;width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:12px solid var(--accent);top:-9px;left:5px;transform-origin:center}

/* Turn bubble marker */
.turn-marker div{pointer-events:auto;}
.turn-badge{
  background:var(--accent);color:#fff;padding:2px 6px;border-radius:6px;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,0.15);white-space:nowrap
}
.turn-badge.alert{background:var(--accent-2)}
.turn-badge.dim{background:#667db7}

/* Mobile tweaks */
@media(max-width:880px){
  aside.sidebar{position:static;width:100%;max-height:260px;border-radius:0;margin-top:6px}
  .hud{right:12px;bottom:74px}
  .controls{flex-direction:column;align-items:stretch}
}
</style>
</head>
<body>
<div id="app">
  <header>
    <h1>ゆいきちナビ</h1>
    <div class="controls" role="search" aria-label="ルート検索">
      <input id="from" placeholder="出発地（住所 / 緯度,経度 / 現在地）" />
      <input id="to" placeholder="目的地（住所 / 緯度,経度 / 地図クリック）" />
      <button id="swap" title="入れ替え">⇄ 入れ替え</button>
      <div id="modes" aria-label="移動モード切替">
        <button class="mode-btn active pill" data-mode="driving" id="m-driv"> 車</button>
        <button class="mode-btn pill" data-mode="foot" id="m-foot"> 徒歩</button>
        <button class="mode-btn pill" data-mode="bike" id="m-bike"> 自転車</button>
      </div>
      <button id="search" class="pill">検索</button>
      <button id="set-from-map" class="pill"> 出発地=地図タップ</button>
      <button id="set-to-map" class="pill"> 目的地=地図タップ</button>
      <button id="start-nav" class="pill">ゆいきちナビ開始</button>
      <button id="stop-nav" class="pill" disabled>⏹ゆいきちナビ停止</button>
      <button id="sim-toggle" class="pill" title="デバッグ用">シミュレータ</button>
    </div>
  </header>

  <div id="map" aria-label="地図">地図を読み込み中…</div>

  <!-- HUD: 非干渉・右下 -->
  <div class="hud" aria-live="polite">
    <div class="row"><span class="key">合計距離</span><span class="val" id="hud-total-dist">—</span><span class="key">合計時間</span><span class="val" id="hud-total-time">—</span></div>
    <div class="row"><span class="key">残り距離</span><span class="val" id="hud-rem-dist">—</span><span class="key">到着まで</span><span class="val" id="hud-rem-time">—</span></div>
    <div class="row small" id="hud-next">次の案内 — —</div>
    <div class="toggles">
      <label><input type="checkbox" id="chk-follow" checked>追尾</label>
      <label><input type="checkbox" id="chk-voice" checked>音声</label>
      <label><input type="checkbox" id="chk-pop" checked>吹き出し</label>
      <label><input type="checkbox" id="chk-rotate">コンパス回転</label>
    </div>
  </div>

  <!-- Sidebar: ルート候補＆詳細 -->
  <aside class="sidebar" aria-live="polite">
    <h3>ルート候補</h3>
    <div id="route-list" class="route-list small">— 検索して下さい —</div>
    <h3>ルート詳細</h3>
    <div id="turns" style="margin-top:6px">— ルートを選択してください —</div>
  </aside>

  <div class="compass" title="方位"><div id="compass-needle">🧭</div></div>
  <div id="status">状態: 初期化中</div>
</div>

<!-- Libs -->
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js"></script>

<script>
/* ==========================================================
   ゆいきちナビ Ultra
   ========================================================== */
(function(){
  // ---- アプリ状態 ----
  const app = {
    map:null,
    markers:{from:null,to:null,cur:null},
    routes:[], routeLayers:[], stepMarkers:[], progressLayer:null, selected:-1,
    nav:false, sim:false, watchId:null,
    heading:0, lastHeadingTs:0,
    setMode:'driving', mapClickMode:null, useDummy:false,
    lastRerouteTs:0, follow:true, rotate:false, voice:true, pop:true,
    lastSnapIdx:0, // route geometry index progress
    announcedStepIndex:-1,
    nextPopup:null
  };

  // ---- 要素 ----
  const els = {
    from: $('#from'), to: $('#to'), swap: $('#swap'),
    modes: $('#modes'), search: $('#search'),
    setFromMap: $('#set-from-map'), setToMap: $('#set-to-map'),
    routeList: $('#route-list'), turns: $('#turns'),
    startNav: $('#start-nav'), stopNav: $('#stop-nav'),
    status: $('#status'), compass: $('#compass-needle'),
    hudTotalDist: $('#hud-total-dist'), hudTotalTime: $('#hud-total-time'),
    hudRemDist: $('#hud-rem-dist'), hudRemTime: $('#hud-rem-time'),
    hudNext: $('#hud-next'),
    chkFollow: $('#chk-follow'), chkRotate: $('#chk-rotate'),
    chkVoice: $('#chk-voice'), chkPop: $('#chk-pop'),
    simToggle: $('#sim-toggle')
  };
  function $(id){ return document.getElementById(id); }
  function setStatus(msg, isErr=false){ els.status.textContent = '状態: '+msg; els.status.style.color = isErr?'#d33':'#111'; console.log('[nav]', msg); }
  function formatDist(m){ return m>=1000? (m/1000).toFixed(2)+' km' : Math.round(m)+' m'; }
  function formatDuration(sec){ if(sec==null) return '—'; const s=Math.max(0,Math.round(sec)); const h=Math.floor(s/3600), m=Math.round((s%3600)/60); return h>0?`${h}時間${m}分`:`${m}分`; }
  const SPEED_KMH = { foot: 4.8, bike: 16, driving: 42 };
  function etaSeconds(distanceMeters, mode){ const v=SPEED_KMH[mode]||42; return (distanceMeters/1000)/v*3600; }

  // ---- 日本語案内 ----
  function jpInstruction(step){
    if(!step||!step.maneuver) return '直進';
    const m=step.maneuver; const type=m.type||''; const mod=m.modifier||''; const name = step.name? `（${step.name}）` : '';
    const roundaboutExit = (m.exit? `${m.exit} 番目の出口` : '');
    const dir = (x=>({
      'left':'左折','slight left':'やや左','sharp left':'大きく左',
      'right':'右折','slight right':'やや右','sharp right':'大きく右',
      'straight':'直進','uturn':'Uターン'
    }[x]||''))(mod);
    let text='';
    switch(type){
      case 'depart': text='出発'; break;
      case 'arrive': text='目的地に到着'; break;
      case 'turn': text = dir||'曲がる'; break;
      case 'new name': text='道なり'; break;
      case 'merge': text='合流'; break;
      case 'on ramp': text='入口から進入'; break;
      case 'off ramp': text='出口で出る'; break;
      case 'roundabout':
      case 'rotary': text = `環状交差点で${roundaboutExit||'目的の出口'}へ`; break;
      case 'roundabout turn': text = `環状交差点で${dir}`; break;
      case 'fork': text=`分岐で${dir}`; break;
      case 'end of road': text=`突き当たりで${dir}`; break;
      case 'continue': text='直進'; break;
      case 'use lane': text='車線に従う'; break;
      default: text='進む';
    }
    return `${text}${name}`.trim();
  }

  // ---- 初期化：地図 ----
  function initMap(){
    if(app.map) return app.map;
    const map = L.map('map',{center:[35.681236,139.767125], zoom: 5});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19, attribution:'© OpenStreetMap contributors'}).addTo(map);
    app.map = map;

    map.on('click', (e)=>{
      if(app.mapClickMode==='from'){
        setFromLoc({lat:e.latlng.lat, lon:e.latlng.lng, display_name:`${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`});
        app.mapClickMode=null; setStatus('地図で出発地を設定しました');
      } else if(app.mapClickMode==='to'){
        setToLoc({lat:e.latlng.lat, lon:e.latlng.lng, display_name:`${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`});
        app.mapClickMode=null; setStatus('地図で目的地を設定しました');
      }
    });

    return map;
  }
  initMap();

  // ---- マーカー ----
  function ensureMarker(name){
    if(app.markers[name]) return app.markers[name];
    const m = L.marker(app.map.getCenter()).addTo(app.map);
    app.markers[name]=m; return m;
  }
  function setFromLoc(loc){
    app.from = loc; els.from.value = loc.display_name || `${loc.lat.toFixed(5)},${loc.lon.toFixed(5)}`;
    const m=ensureMarker('from'); m.setLatLng([loc.lat,loc.lon]).bindPopup('出発').openPopup();
  }
  function setToLoc(loc){
    app.to = loc; els.to.value = loc.display_name || `${loc.lat.toFixed(5)},${loc.lon.toFixed(5)}`;
    const m=ensureMarker('to'); m.setLatLng([loc.lat,loc.lon]).bindPopup('目的地').openPopup();
  }
  function setCurrentMarker(lat,lon,bearing){
    const html = `<div class="marker-heading rotateable" style="position:relative;"></div>`;
    if(!app.markers.cur){
      app.markers.cur = L.marker([lat,lon],{ title:'現在地', icon: L.divIcon({html, className:'', iconSize:[24,24]})}).addTo(app.map);
    }
    app.markers.cur.setLatLng([lat,lon]);
    try{
      const el = app.markers.cur.getElement().querySelector('.rotateable');
      if(el) el.style.transform = `rotate(${bearing||0}deg)`;
    }catch(e){}
  }

  // ---- 入力・ジオコーディング ----
  function parseLatLon(q){
    if(!q) return null;
    const m = q.trim().match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
    if(m) return {lat:parseFloat(m[1]), lon:parseFloat(m[2]), display_name:`${parseFloat(m[1]).toFixed(5)}, ${parseFloat(m[2]).toFixed(5)}`};
    return null;
  }
  async function geocode(q){
    const parsed = parseLatLon(q); if(parsed) return parsed;
    if(!q) return null;
    const url='https://nominatim.openstreetmap.org/search?format=json&limit=5&q='+encodeURIComponent(q);
    try{
      const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(),9000);
      const res=await fetch(url,{signal:ctrl.signal, headers:{'Accept-Language':'ja'}});
      clearTimeout(t); if(!res.ok) throw new Error('HTTP '+res.status);
      const j=await res.json(); if(j&&j.length>0) return {lat:parseFloat(j[0].lat), lon:parseFloat(j[0].lon), display_name:j[0].display_name};
      return null;
    }catch(e){ console.warn('geocode fail',e); return null; }
  }
  function getCurrentLocation(){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation){ reject(new Error('この端末は位置情報に対応していません')); return; }
      navigator.geolocation.getCurrentPosition(p=>{
        resolve({lat:p.coords.latitude, lon:p.coords.longitude, display_name:'現在地'});
      }, err=>reject(err), {enableHighAccuracy:true, timeout:12000});
    });
  }
  async function resolveFromInput(){
    const v=(els.from.value||'').trim();
    if(!v || v==='現在地' || v==='いま' || v.toLowerCase()==='current') return await getCurrentLocation();
    const g = await geocode(v); if(!g) throw new Error('出発地が見つかりません'); return g;
  }
  async function resolveToInput(){
    const v=(els.to.value||'').trim();
    const g = parseLatLon(v) || (v? await geocode(v):null);
    if(!g) throw new Error('目的地が見つかりません'); return g;
  }

  // ---- ルート取得 ----
  async function fetchRoutes(from,to,mode){
    const profile = mode==='driving' ? 'driving' : (mode==='foot' ? 'foot' : 'bicycle');
    const url = `https://router.project-osrm.org/route/v1/${profile}/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
    try{
      const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(),12000);
      const res=await fetch(url,{signal:ctrl.signal}); clearTimeout(t);
      if(!res.ok) throw new Error('HTTP '+res.status);
      const j=await res.json();
      if(j && j.code==='Ok' && j.routes && j.routes.length>0) return j.routes;
      return null;
    }catch(e){ console.warn('fetchRoutes fail',e); return null; }
  }

  // ---- 描画関連 ----
  function clearRouteLayers(){
    app.routeLayers.forEach(l=>{ try{ app.map.removeLayer(l);}catch{} });
    app.routeLayers=[];
    if(app.progressLayer){ try{ app.map.removeLayer(app.progressLayer);}catch{}; app.progressLayer=null; }
    app.stepMarkers.forEach(m=>{ try{ app.map.removeLayer(m);}catch{} });
    app.stepMarkers=[];
    app.announcedStepIndex=-1;
    if(app.nextPopup){ try{ app.map.closePopup(app.nextPopup);}catch{}; app.nextPopup=null; }
  }

  function drawRoutes(routes){
    clearRouteLayers();
    app.routes = routes||[];
    if(app.routes.length===0){ els.routeList.innerHTML='— ルートがありません —'; els.turns.innerHTML=''; return; }

    // ルート線（複数候補）
    app.routes.forEach((r,i)=>{
      const coords = r.geometry.coordinates.map(c=>[c[1],c[0]]);
      const line = L.polyline(coords,{color: i===app.selected? '#1e90ff' : '#888', weight: i===app.selected? 8:5, opacity: i===app.selected? 0.98:0.45}).addTo(app.map);
      line.on('click',()=> selectRoute(i));
      app.routeLayers.push(line);
    });

    // 候補リスト
    els.routeList.innerHTML='';
    app.routes.forEach((r,i)=>{
      const div=document.createElement('div'); div.className='route-item'+(i===0?' selected':'');
      const eta=etaSeconds(r.distance, app.setMode);
      div.textContent = `候補 ${i+1} — ${(r.distance/1000).toFixed(2)} km / ${formatDuration(eta)}`;
      div.addEventListener('click',()=> selectRoute(i));
      els.routeList.appendChild(div);
    });

    app.selected = 0;
    selectRoute(0);
  }

  function selectRoute(i){
    if(i<0 || i>=app.routes.length) return;
    app.selected=i;
    // ルートスタイル更新
    app.routeLayers.forEach((l,idx)=> l.setStyle({color: idx===i? '#1e90ff':'#888', weight: idx===i?8:5, opacity: idx===i?0.98:0.45}));
    const items = els.routeList.querySelectorAll('.route-item');
    items.forEach((it,idx)=> it.classList.toggle('selected', idx===i));

    // 総距離・時間
    const r = app.routes[i];
    els.hudTotalDist.textContent = (r.distance/1000).toFixed(2)+' km';
    els.hudTotalTime.textContent = formatDuration(etaSeconds(r.distance, app.setMode));
    app.lastSnapIdx=0;

    // ルート詳細＆ステップマーカー
    renderTurns(r.legs[0].steps||[]);
    placeStepMarkers(r.legs[0].steps||[]);

    // 地図フィット
    try{
      const coords = r.geometry.coordinates.map(c=>[c[1],c[0]]);
      const bounds = L.latLngBounds(coords); app.map.fitBounds(bounds,{padding:[50,50]});
    }catch(e){}
  }

  function renderTurns(steps){
    els.turns.innerHTML='';
    if(!steps||steps.length===0){ els.turns.textContent='ターンバイターンデータがありません'; return; }
    steps.forEach((s,idx)=>{
      const node=document.createElement('div');
      node.className='turn-step';
      node.innerHTML = `<strong>${idx+1}. ${jpInstruction(s)}</strong><div class="small">${formatDist(s.distance)} / ${formatDuration(s.duration||0)}</div>`;
      node.addEventListener('click', ()=>{
        if(!s.maneuver||!s.maneuver.location) return;
        const [lon,lat]=s.maneuver.location;
        app.map.setView([lat,lon], Math.max(16, app.map.getZoom()));
        highlightStep(idx, true);
      });
      els.turns.appendChild(node);
    });
  }

  function placeStepMarkers(steps){
    // 既存クリア
    app.stepMarkers.forEach(m=>{ try{ app.map.removeLayer(m);}catch{} });
    app.stepMarkers=[];
    // 配置
    steps.forEach((s,idx)=>{
      if(!s.maneuver||!s.maneuver.location) return;
      const [lon,lat] = s.maneuver.location;
      const badge = `<div class="turn-badge">${escapeHtml(jpInstruction(s))}</div>`;
      const mk = L.marker([lat,lon],{
        icon: L.divIcon({className:'turn-marker', html:badge, iconSize:null})
      }).addTo(app.map);
      mk._isAlert = false;
      mk._index = idx;
      mk.bindPopup(`<b>${escapeHtml(jpInstruction(s))}</b><br>距離: ${formatDist(s.distance)}<br>時間: ${formatDuration(s.duration||0)}`);
      mk.on('click', ()=> highlightStep(idx, true));
      app.stepMarkers.push(mk);
    });
  }

  function highlightStep(idx, openPopup=false){
    const listNodes = els.turns.querySelectorAll('.turn-step');
    listNodes.forEach((n,i)=> n.classList.toggle('active', i===idx));
    const mk = app.stepMarkers[idx]; if(!mk) return;
    // マーカーの色替え（赤バッジ）
    const step = (app.routes[app.selected]?.legs[0]?.steps||[])[idx];
    if(step){
      const html = `<div class="turn-badge ${openPopup?'alert':''}">${escapeHtml(jpInstruction(step))}</div>`;
      mk.setIcon(L.divIcon({className:'turn-marker', html, iconSize:null}));
      if(openPopup && app.pop){ mk.openPopup(); }
    }
  }

  function updateProgressLayer(route, snapIdx){
    if(!route) return; const coords = route.geometry.coordinates;
    if(snapIdx<=0) return;
    const seg = coords.slice(0, Math.min(snapIdx+1, coords.length)).map(c=>[c[1],c[0]]);
    if(!app.progressLayer){
      app.progressLayer = L.polyline(seg,{color:varOk(), weight:8, opacity:0.9}).addTo(app.map);
    } else {
      app.progressLayer.setLatLngs(seg);
    }
  }
  function varOk(){ return '#2ecc71'; }

  // ---- 音声案内 ----
  function speakJa(text){
    if(!app.voice || !window.speechSynthesis) return;
    try{
      const u = new SpeechSynthesisUtterance(text);
      u.lang='ja-JP'; u.rate=1; u.pitch=1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }catch(e){ console.warn('speak fail', e); }
  }

  // ---- 追尾/コンパス ----
  function applyFollow(lat,lon){ if(app.follow){ const z=Math.max(15, app.map.getZoom()); app.map.setView([lat,lon], Math.min(17,z)); } }
  function applyRotate(deg){ try{ els.compass.style.transform=`rotate(${deg}deg)`; }catch(e){} }

  // ---- ナビ開始/停止 ----
  function startNavigation(){
    if(app.nav) return;
    if(!app.routes || app.routes.length===0){ setStatus('先にルート検索をしてください', true); return; }
    app.nav=true; els.startNav.disabled=true; els.stopNav.disabled=false; setStatus('ナビ開始：ルート追跡中');
    app.lastSnapIdx=0; app.announcedStepIndex=-1;

    if(app.sim){
      simulateNavTick();
      return;
    }

    if(!navigator.geolocation){ setStatus('位置情報非対応。シミュレータを使用します', true); app.sim=true; simulateNavTick(); return; }
    try{
      app.watchId = navigator.geolocation.watchPosition(onNavPosition, onNavError, { enableHighAccuracy:true, maximumAge:1000, timeout:15000});
    }catch(e){
      console.warn('watch fail', e);
      app.sim=true; simulateNavTick();
    }
  }
  function stopNavigation(){
    if(!app.nav) return;
    app.nav=false; els.startNav.disabled=false; els.stopNav.disabled=true; setStatus('ナビ停止');
    try{ if(app.watchId!=null){ navigator.geolocation.clearWatch(app.watchId); app.watchId=null; } }catch(e){}
  }
  function onNavError(err){
    console.warn('nav pos err',err);
    if(err && err.code===1){ setStatus('位置情報が許可されていません（シミュレータを使えます）', true); }
  }

  // ---- しきい値など ----
  function offRouteThreshold(){ switch(app.setMode){ case 'foot': return 30; case 'bike': return 50; default: return 100; } }
  function rerouteCooldownMs(){ return 8000; }

  // ---- 実ナビ：位置更新 ----
  function onNavPosition(pos){
    const lat=pos.coords.latitude, lon=pos.coords.longitude;
    // 方位：デバイス方位がなければ移動ベクトル
    let bearing = app.heading || 0;
    if(app._prev){ const dy=lat-app._prev.lat, dx=lon-app._prev.lon; if(Math.abs(dy)+Math.abs(dx)>1e-6){ bearing = (Math.atan2(dx, dy)*180/Math.PI); } }
    setCurrentMarker(lat,lon,bearing);
    applyFollow(lat,lon);
    if(app.rotate){ applyRotate(bearing); }
    app._prev = {lat,lon};

    processSnapAndGuidance(lat,lon, bearing);
  }

  // ---- スナップ＆案内共通処理（実ナビ/シミュ） ----
  function processSnapAndGuidance(lat,lon,bearing){
    const route = app.routes[app.selected]; if(!route) return;
    const line = turf.lineString(route.geometry.coordinates);
    const pt = turf.point([lon,lat]);
    const snapped = turf.nearestPointOnLine(line, pt, {units:'meters'});
    const distToRoute = (snapped.properties && snapped.properties.dist) || 0;
    const snapIdx = (snapped.properties && snapped.properties.index) || 0;

    if(snapIdx > app.lastSnapIdx){ app.lastSnapIdx = snapIdx; updateProgressLayer(route, snapIdx); }

    // 次案内の決定
    const steps = route.legs[0].steps || [];
    let chosen = null;
    for(let i=0;i<steps.length;i++){
      const s=steps[i]; const mloc=s.maneuver && s.maneuver.location; if(!mloc) continue;
      const d = turf.distance(turf.point([lon,lat]), turf.point([mloc[0],mloc[1]]), {units:'meters'});
      if(d>5){ chosen = {index:i, step:s, dist:d}; break; }
    }
    if(!chosen && steps.length){ chosen = {index:steps.length-1, step:steps[steps.length-1], dist:0}; }
    if(chosen){
      const msg = `${formatDist(chosen.dist)} 先、${jpInstruction(chosen.step)}`;
      els.hudNext.textContent = `次の案内 — ${msg}`;
      // 接近時の演出（吹き出し＋音声＋赤化）
      if(chosen.dist < 80){ // 近接しきい値
        if(app.announcedStepIndex !== chosen.index){
          if(app.pop){ try{ const mk=app.stepMarkers[chosen.index]; if(mk){ mk.setIcon(L.divIcon({className:'turn-marker', html:`<div class="turn-badge alert">${escapeHtml(jpInstruction(chosen.step))}</div>`, iconSize:null})); mk.openPopup(); }}catch(e){} }
          if(app.voice){ speakJa(`${msg}`); }
          app.announcedStepIndex = chosen.index;
          highlightStep(chosen.index, false);
        }
      }
    }

    // 残り距離/時間
    const totalDist = route.distance;
    const totalDur  = etaSeconds(route.distance, app.setMode);
    const routeCoords = route.geometry.coordinates;
    const remainingLine = turf.lineString(routeCoords.slice(snapIdx));
    const remKm = turf.length(remainingLine, {units:'kilometers'});
    const remDistM = Math.max(0, Math.round(remKm*1000));
    const remTimeSec = totalDist>0 ? (totalDur * (remDistM/totalDist)) : 0;
    els.hudRemDist.textContent = formatDist(remDistM);
    els.hudRemTime.textContent = formatDuration(remTimeSec);

    // 自動リルート
    const now = Date.now();
    if(distToRoute > offRouteThreshold() && (now - app.lastRerouteTs) > rerouteCooldownMs()){
      app.lastRerouteTs = now;
      setStatus(`コースを外れました（約${Math.round(distToRoute)}m）。新ルートを再検索…`);
      const cur={lat,lon}; const dest=app.to;
      if(dest){
        fetchRoutes(cur,dest,app.setMode).then(rs=>{
          if(rs && rs.length){
            drawRoutes(rs);
            setStatus('自動リルート完了');
            if(app.follow) app.map.setView([lat,lon], Math.max(16, app.map.getZoom()));
            if(app.voice) speakJa('ルートを再計算しました');
          } else {
            setStatus('リルートに失敗しました', true);
          }
        });
      }
    }
  }

  // ---- シミュレータ（デバッグ/位置情報不可対策） ----
  function simulateNavTick(){
    if(!app.nav || !app.sim) return;
    const route=app.routes[app.selected]; if(!route){ setStatus('ルートがありません', true); return; }
    const coords=route.geometry.coordinates.map(c=>[c[1],c[0]]);
    if(app.lastSnapIdx===0 && coords.length>0){
      setCurrentMarker(coords[0][0], coords[0][1], 0);
      app.map.setView(coords[0], 16);
    }
    if(app.lastSnapIdx>=coords.length){ setStatus('到着しました'); stopNavigation(); return; }
    const pos=coords[app.lastSnapIdx];
    // 疑似方位
    let bearing=app.heading||0;
    if(app.lastSnapIdx>0){
      const a=coords[app.lastSnapIdx-1], b=pos;
      const dy=b[0]-a[0], dx=b[1]-a[1]; if(Math.abs(dy)+Math.abs(dx)>1e-9){ bearing = Math.atan2(dx,dy)*180/Math.PI; }
    }
    setCurrentMarker(pos[0],pos[1],bearing);
    if(app.rotate) applyRotate(bearing);
    if(app.follow) app.map.panTo(pos,{animate:true,duration:0.5});

    processSnapAndGuidance(pos[0],pos[1],bearing);

    app.lastSnapIdx++;
    setTimeout(simulateNavTick, 900);
  }

  // ---- デバイス方位（コンパス） ----
  function initOrientation(){
    function handle(ang){ if(typeof ang==='number' && !Number.isNaN(ang)){ app.heading = ang; app.lastHeadingTs = Date.now(); } }
    if(window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function'){
      // iOS: 最初のタップで許可
      document.body.addEventListener('click', function once(){
        DeviceOrientationEvent.requestPermission().then(state=>{ if(state==='granted'){ window.addEventListener('deviceorientation', (e)=> handle(e.alpha)); } });
        document.body.removeEventListener('click', once);
      }, {once:true});
    } else if(window.DeviceOrientationEvent){
      window.addEventListener('deviceorientationabsolute', (e)=> handle(e.alpha));
      window.addEventListener('deviceorientation', (e)=> handle(e.alpha));
    }
  }
  initOrientation();

  // ---- ユーティリティ ----
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

  // ---- UIイベント ----
  els.swap.addEventListener('click', ()=>{
    const a=els.from.value; els.from.value=els.to.value; els.to.value=a;
    const af=app.from; app.from=app.to; app.to=af;
    if(app.from) setFromLoc(app.from); if(app.to) setToLoc(app.to);
  });

  els.setFromMap.addEventListener('click', ()=>{ app.mapClickMode='from'; setStatus('地図をクリックして出発地を選択'); });
  els.setToMap.addEventListener('click',   ()=>{ app.mapClickMode='to';   setStatus('地図をクリックして目的地を選択'); });

  // モード切替（押したら即再検索）
  els.modes.querySelectorAll('.mode-btn').forEach(b=>{
    b.addEventListener('click', async ()=>{
      els.modes.querySelectorAll('.mode-btn').forEach(x=>x.classList.remove('active'));
      b.classList.add('active'); app.setMode = b.dataset.mode;
      if(app.from && app.to){
        setStatus('モード変更に合わせてルートを再検索…');
        const routes = await fetchRoutes(app.from, app.to, app.setMode);
        if(routes){ drawRoutes(routes); setStatus('モード変更を反映しました'); }
        else{ setStatus('モード変更の反映に失敗しました', true); }
      }
    });
  });

  els.search.addEventListener('click', async ()=>{
    try{
      setStatus('出発地を解決中…');
      const f = await resolveFromInput(); setFromLoc(f);
      setStatus('目的地を解決中…');
      const t = await resolveToInput(); setToLoc(t);
      setStatus('ルート検索中…');
      const routes = await fetchRoutes(f,t, app.setMode);
      if(!routes){ setStatus('ルート検索に失敗しました（API制限の可能性）', true); return; }
      drawRoutes(routes);
      setStatus('ルート候補を表示しました');
    }catch(e){ setStatus(e.message||'検索に失敗しました', true); }
  });
  [els.from, els.to].forEach(i=> i.addEventListener('keydown', e=>{ if(e.key==='Enter') els.search.click(); }));

  els.startNav.addEventListener('click', startNavigation);
  els.stopNav.addEventListener('click',  stopNavigation);

  els.chkFollow.addEventListener('change', ()=>{ app.follow = els.chkFollow.checked; });
  els.chkRotate.addEventListener('change', ()=>{ app.rotate = els.chkRotate.checked; });
  els.chkVoice.addEventListener('change',  ()=>{ app.voice  = els.chkVoice.checked; if(!app.voice && window.speechSynthesis) window.speechSynthesis.cancel(); });
  els.chkPop.addEventListener('change',    ()=>{ app.pop    = els.chkPop.checked; });

  // シミュレータトグル
  els.simToggle.addEventListener('click', ()=>{
    app.sim = !app.sim;
    els.simToggle.style.borderColor = app.sim? 'var(--accent-2)':'#ddd';
    setStatus(app.sim?'シミュレータ: ON':'シミュレータ: OFF');
  });

  // 位置追跡（ナビ以外でも現在地マーカーをゆるく更新）
  if(navigator.geolocation){
    navigator.geolocation.watchPosition(p=>{
      const lat=p.coords.latitude, lon=p.coords.longitude;
      setCurrentMarker(lat,lon, app.heading||0);
    },()=>{}, {enableHighAccuracy:true, maximumAge:2000, timeout:8000});
  }

  // 初期案内
  els.from.placeholder = '例: 現在地 / 名古屋駅 / 35.170915,136.881537';
  els.to.placeholder   = '例: 東京駅 / 35.681236,139.767125（地図クリックでもOK）';
  setStatus('初期化完了 — 出発地と目的地を入力して「検索」してください');

  // ====== ちょい自己テスト ======
  (function selfTests(){
    function assertEq(n,a,b){ if(a!==b) console.error('TEST FAIL',n,a,b); else console.log('TEST OK',n); }
    assertEq('formatDist_500', formatDist(500), '500 m');
    assertEq('formatDist_1500', formatDist(1500), '1.50 km');
    assertEq('formatDuration_59m', formatDuration(59*60), '59分');
    assertEq('formatDuration_2h5m', formatDuration(2*3600+5*60), '2時間5分');
    const d=10000; // 10km
    const etaFoot=Math.round(etaSeconds(d,'foot')/60);
    const etaBike=Math.round(etaSeconds(d,'bike')/60);
    const etaCar =Math.round(etaSeconds(d,'driving')/60);
    if(!(etaFoot>etaBike && etaBike>etaCar)) console.error('TEST FAIL eta order'); else console.log('TEST OK eta order');
 <!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>ゆいきちナビ</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
:root{--accent:#1e90ff;--bg:#f7f9fc;--ink:#111}
html,body{height:100%;margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,'Noto Sans JP',sans-serif;background:var(--bg);color:var(--ink)}
#app{height:100%;display:flex;flex-direction:column}
header{display:flex;gap:8px;align-items:center;padding:8px;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,0.06);flex-wrap:wrap}
header h1{margin:0;font-size:16px}
.controls{display:flex;gap:8px;align-items:center;flex:1;flex-wrap:wrap}
.controls input{padding:8px;border:1px solid #ddd;border-radius:8px;width:220px}
.controls button{padding:10px 12px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer;margin-bottom:4px;}
.controls .mode-btn{padding:7px 10px;border-radius:8px}
.controls .mode-btn.active{background:var(--accent);color:#fff;border-color:var(--accent)}
#map{flex:1;min-height:320px;position:relative}
aside.sidebar{position:absolute;right:12px;top:72px;z-index:1400;background:#fff;padding:12px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.12);width:360px;max-height:70vh;overflow:auto}
.route-item{padding:8px;border-radius:8px;border:1px solid #eee;margin-bottom:6px;cursor:pointer}
.route-item.selected{background:var(--accent);color:#fff;border-color:var(--accent);font-weight:700}
.turn-step{padding:6px;border-bottom:1px dashed #eee}
#status{position:absolute;left:12px;bottom:90px;z-index:1500;background:rgba(255,255,255,0.95);padding:8px;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,0.12)}
.small{font-size:12px;color:#666}
.hud{position:absolute;left:12px;top:74px;z-index:1500;background:rgba(255,255,255,0.96);padding:10px 12px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.12);min-width:260px}
.hud .row{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
.hud .key{font-size:12px;color:#777}
.hud .val{font-weight:700}
.compass{position:absolute;right:12px;bottom:12px;z-index:1500;background:rgba(255,255,255,0.95);padding:8px;border-radius:50%;width:44px;height:44px;display:grid;place-items:center;box-shadow:0 6px 18px rgba(0,0,0,0.12)}
.compass > div{transform-origin:center center}
.rotateable{transition:transform 120ms ease}
.marker-heading{width:22px;height:22px;border-radius:50%;background:#1e90ff;border:2px solid #fff;box-shadow:0 0 0 2px rgba(30,144,255,0.25)}
.marker-heading::after{content:"";position:absolute;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:10px solid #1e90ff;top:-8px;left:5px;transform-origin:center}
.turn-marker div{pointer-events:auto;}
@media(max-width:800px){
  aside.sidebar{position:static;width:100%;max-height:240px;border-radius:0}
  .hud{top:auto;bottom:120px}
  .controls{flex-direction:column;gap:6px;}
}
</style>
</head>
<body>
<div id="app">
<header>
<h1>ゆいきちナビ</h1>
<div class="controls" role="search">
<input id="from" placeholder="出発地（住所 / 緯度,経度 / 現在地）" />
<input id="to" placeholder="目的地（住所 / 緯度,経度 / 地図クリック）" />
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

<div id="map">地図を読み込み中…</div>

<div class="hud" aria-live="polite">
<div class="row"><span class="key">合計距離</span><span class="val" id="hud-total-dist">—</span><span class="key">合計時間</span><span class="val" id="hud-total-time">—</span></div>
<div class="row"><span class="key">残り距離</span><span class="val" id="hud-rem-dist">—</span><span class="key">到着まで</span><span class="val" id="hud-rem-time">—</span></div>
<div class="row small" id="hud-next">次の案内 — —</div>
<label class="small"><input type="checkbox" id="chk-follow" checked> 追尾</label>
<label class="small" style="margin-left:8px"><input type="checkbox" id="chk-rotate" checked> コンパス回転</label>
</div>

<aside class="sidebar" aria-live="polite">
<div style="font-weight:700;margin-bottom:6px">ルート候補</div>
<div id="route-list" class="route-list small">— 検索して下さい —</div>
<div style="font-weight:700;margin-top:8px">ルート詳細</div>
<div id="turns" style="margin-top:6px">— ルートを選択してください —</div>
</aside>

<div class="compass"><div id="compass-needle">🧭</div></div>
<div id="status">状態: 初期化中</div>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js"></script>
<script>
if(window._navCompleteInitializedV4){console.warn('nav_complete V4は既に初期化済み');}else{window._navCompleteInitializedV4=true;
(function(){
  const app = window._navComplete = {state:{map:null,markers:{},routes:[],routeLayers:[],progressLayer:null,selected:-1,nav:false,watchId:null,heading:0,lastHeadingTs:0,setMode:'driving',mapClickMode:null,useDummy:false,lastRerouteTs:0,follow:true,rotate:true,lastSnapIdx:0}};

  const els={
    from:document.getElementById('from'), to:document.getElementById('to'), swap:document.getElementById('swap'),
    modes:document.getElementById('modes'), search:document.getElementById('search'), setFromMap:document.getElementById('set-from-map'),
    setToMap:document.getElementById('set-to-map'), routeList:document.getElementById('route-list'), turns:document.getElementById('turns'),
    status:document.getElementById('status'), startNav:document.getElementById('start-nav'), stopNav:document.getElementById('stop-nav'),
    hudTotalDist:document.getElementById('hud-total-dist'), hudTotalTime:document.getElementById('hud-total-time'),
    hudRemDist:document.getElementById('hud-rem-dist'), hudRemTime:document.getElementById('hud-rem-time'),
    hudNext:document.getElementById('hud-next'), chkFollow:document.getElementById('chk-follow'), chkRotate:document.getElementById('chk-rotate'),
    compass:document.getElementById('compass-needle')
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
    return `${text}${name}`.trim();
  }

  // --- 地図初期化 ---
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

  async function fetchRoutes(from,to,mode){ const profile=mode==='driving'?'driving':mode==='foot'?'foot':'bicycle'; const url=`https://router.project-osrm.org/route/v1/${profile}/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`; try{ const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(),12000); const res=await fetch(url,{signal:ctrl.signal}); clearTimeout(t); if(!res.ok) throw new Error('HTTP '+res.status); const j=await res.json(); if(j&&j.code==='Ok'&&j.routes&&j.routes.length>0) return j.routes; return null;}catch(e){console.warn('fetchRoutes fail',e); return null;} }

  const SPEED_KMH={ foot:4.8, bike:16, driving:42 };
  function etaSeconds(distanceMeters, mode){ const v=SPEED_KMH[mode]||42; return (distanceMeters/1000)/v*3600; }

  function clearRouteLayers(){ app.state.routeLayers.forEach(l=>{try{map.removeLayer(l);}catch{} }); if(app.state.progressLayer){try{map.removeLayer(app.state.progressLayer);}catch{}; app.state.progressLayer=null;} app.state.routeLayers=[]; }
  function drawRoutes(routes){
    clearRouteLayers(); if(!routes) return;
    routes.forEach((r,i)=>{
      const line=L.geoJSON(r.geometry,{color:i===app.state.selected?varAccent:'#aaa',weight:i===app.state.selected?7:5,opacity:i===app.state.selected?0.9:0.6}).addTo(map);
      app.state.routeLayers.push(line);
      // ルート上の曲がるポイント表示
      r.legs[0].steps.forEach(s=>{
        if(!s.maneuver||!s.maneuver.location) return;
        const [lon,lat]=s.maneuver.location;
        const marker=L.marker([lat,lon],{icon:L.divIcon({className:'turn-marker',html:`<div style="background:var(--accent);color:#fff;padding:2px 4px;border-radius:4px;font-size:12px;">${jpInstruction(s)}</div>`})}).addTo(map);
        app.state.routeLayers.push(marker);
      });
    });
    if(app.state.selected>=0 && routes[app.state.selected]) map.fitBounds(L.geoJSON(routes[app.state.selected].geometry).getBounds(),{padding:[40,40]});
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

  async function doSearch(){
    setStatus('検索中…');
    let from=app.state.from||await geocode(els.from.value); if(!from){ setStatus('出発地を認識できません',true); return; }
    let to=app.state.to||await geocode(els.to.value); if(!to){ setStatus('目的地を認識できません',true); return; }
    setFrom(from); setTo(to);
    const mode=app.state.setMode||'driving';
    const routes=await fetchRoutes(from,to,mode);
    if(!routes){ setStatus('ルート取得に失敗',true); return; }
    app.state.routes=routes; app.state.selected=0; drawRoutes(routes); updateRouteList(routes); showTurnSteps(routes[0]);
    setStatus('ルート取得完了');
  }

  els.search.addEventListener('click',doSearch);
  els.swap.addEventListener('click',()=>{ const f=els.from.value; els.from.value=els.to.value; els.to.value=f; const tmp=app.state.from; app.state.from=app.state.to; app.state.to=tmp; });

  els.setFromMap.addEventListener('click',()=>{ app.state.mapClickMode='from'; setStatus('地図をタップして出発地を指定') });
  els.setToMap.addEventListener('click',()=>{ app.state.mapClickMode='to'; setStatus('地図をタップして目的地を指定') });

  els.modes.querySelectorAll('.mode-btn').forEach(b=>{
    b.addEventListener('click',()=>{ els.modes.querySelectorAll('.mode-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); app.state.setMode=b.dataset.mode; });
  });

  // --- ナビ簡易シミュレーション ---
  els.startNav.addEventListener('click',()=>{
    if(!app.state.routes||app.state.routes.length===0){ setStatus('ルートがありません',true); return; }
    app.state.nav=true; els.startNav.disabled=true; els.stopNav.disabled=false; setStatus('ナビ開始');
    app.state.lastSnapIdx=0;
    simulateNav();
  });

  els.stopNav.addEventListener('click',()=>{ app.state.nav=false; els.startNav.disabled=false; els.stopNav.disabled=true; setStatus('ナビ停止'); });

  function simulateNav(){
    if(!app.state.nav) return;
    const route=app.state.routes[app.state.selected]; if(!route) return;
    const coords=route.geometry.coordinates.map(c=>[c[1],c[0]]);
    if(app.state.lastSnapIdx>=coords.length) { setStatus('到着しました'); return; }
    const pos=coords[app.state.lastSnapIdx]; setCurrentMarker(pos[0],pos[1],app.state.heading);
    map.panTo(pos,{animate:true,duration:0.5});
    const remainingDist=coords.slice(app.state.lastSnapIdx).reduce((a,c,i,arr)=>{ if(i===0) return a; return a+turf.distance(turf.point([arr[i-1][1],arr[i-1][0]]), turf.point([c[1],c[0]]),'meters'); },0);
    els.hudRemDist.textContent=formatDist(remainingDist);
    els.hudRemTime.textContent=formatDuration(etaSeconds(remainingDist,app.state.setMode));
    const nextStep=route.legs[0].steps.find(s=>{ const [lat,lon]=s.maneuver.location; return turf.distance(turf.point([lon,lat]), turf.point([pos[1],pos[0]]),'meters')>0; });
    els.hudNext.textContent=nextStep?`次: ${jpInstruction(nextStep)} (${formatDist(nextStep.distance)}, ${formatDuration(nextStep.duration)})`:'次の案内 — —';
    app.state.lastSnapIdx++; setTimeout(simulateNav,1200);
  }

  // --- HUDチェックボックス ---
  els.chkFollow.addEventListener('change',()=>{ app.state.follow=els.chkFollow.checked; });
  els.chkRotate.addEventListener('change',()=>{ app.state.rotate=els.chkRotate.checked; });

  // --- Geolocation & Compass ---
  if(navigator.geolocation) navigator.geolocation.watchPosition(pos=>{
    const lat=pos.coords.latitude, lon=pos.coords.longitude;
    setCurrentMarker(lat,lon,app.state.heading);
    if(app.state.follow) map.panTo([lat,lon]);
  },e=>{}, {enableHighAccuracy:true,maximumAge:1000,timeout:5000});

  if(window.DeviceOrientationEvent) window.addEventListener('deviceorientation',e=>{
    const alpha=e.alpha||0; app.state.heading=alpha;
    if(app.state.rotate){ els.compass.style.transform=`rotate(${-alpha}deg)`; }
  });
})();
}
</script>
</body>
</html>


