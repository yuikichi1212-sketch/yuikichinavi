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
    header{display:flex;align-items:center;gap:10px;padding:10px;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,0.06)}
    header h1{font-size:16px;margin:0}
    #map-wrap{position:relative;flex:1;min-height:360px}
    #map{position:absolute;inset:0}

    /* ── 左上パネル（地図内オーバーレイ; スマホで約1/2サイズ） */
    .panel{position:absolute;z-index:1400;left:12px;top:12px;background:#fff;border:1px solid #e9eef3;border-radius:14px;box-shadow:0 12px 30px rgba(0,0,0,.12);padding:10px}
    .panel .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .panel input{padding:8px;border:1px solid #ddd;border-radius:8px;min-width:220px;flex:1 1 200px}
    .panel button{padding:8px 10px;border-radius:10px;border:1px solid #ddd;background:#fff;cursor:pointer}
    .panel .mode-btn{padding:6px 10px;border-radius:10px}
    .panel .mode-btn.active{background:var(--accent);color:#fff;border-color:var(--accent)}
    .panel .bar{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:8px}

    /* 右のルート/詳細 */
    aside.sidebar{position:absolute;right:12px;top:12px;z-index:1400;background:#fff;padding:12px;border-radius:14px;box-shadow:0 12px 30px rgba(0,0,0,0.12);width:360px;max-height:72vh;overflow:auto}
    .route-item{padding:8px;border-radius:10px;border:1px solid #eee;margin-bottom:6px;cursor:pointer}
    .route-item.selected{background:var(--accent);color:#fff;border-color:var(--accent);font-weight:700}
    .turn-step{padding:6px;border-bottom:1px dashed #eee}

    /* HUD/コンパス/ステータス */
    #status{position:absolute;left:12px;bottom:12px;z-index:1500;background:rgba(255,255,255,0.95);padding:8px 10px;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,0.12)}
    .small{font-size:12px;color:#666}
    .hud{position:absolute;left:12px;bottom:82px;z-index:1500;background:rgba(255,255,255,0.96);padding:10px 12px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.12);min-width:260px}
    .hud .row{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
    .hud .key{font-size:12px;color:#777}
    .hud .val{font-weight:700}
    .compass{position:absolute;right:12px;bottom:12px;z-index:1500;background:rgba(255,255,255,0.95);padding:8px;border-radius:50%;width:44px;height:44px;display:grid;place-items:center;box-shadow:0 6px 18px rgba(0,0,0,0.12)}
    .compass > div{transform-origin:center center}
    .rotateable{transition:transform 120ms ease}
    .marker-heading{width:22px;height:22px;border-radius:50%;background:#1e90ff;border:2px solid #fff;box-shadow:0 0 0 2px rgba(30,144,255,0.25)}
    .marker-heading::after{content:"";position:absolute;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:10px solid #1e90ff;top:-8px;left:5px;transform-origin:center}

    /* Leaflet 既存ズームを大きくして押しやすく */
    .leaflet-control-zoom{transform-origin:top left}
    @media(max-width:800px){
      header{padding:8px}
      /* スマホ：パネル/サイドバーをコンパクト化 */
      .panel{transform:scale(.75);transform-origin:top left}
      aside.sidebar{width:min(92vw,420px);top:auto;bottom:12px;max-height:46vh}
      .hud{bottom:72px}
      .compass{bottom:12px}
      /* ズームボタン拡大 */
      .leaflet-control-zoom{transform:scale(1.35)}
    }
    @media(min-width:801px){
      .leaflet-control-zoom{transform:scale(1.1)}
    }
  </style>
</head>
<body>
  <div id="app">
    <header>
      <h1>ゆいきちナビ</h1>
      <div class="small">（地図左上のパネルから操作できます）</div>
    </header>

    <div id="map-wrap">
      <div id="map" aria-label="地図">地図を読み込み中…</div>

      <!-- 左上：操作パネル（地図オーバーレイ） -->
      <div class="panel" role="search" aria-live="polite">
        <div class="row">
          <input id="from" placeholder="出発地（住所 / 緯度,経度 / 現在地）" />
          <input id="to" placeholder="目的地（住所 / 緯度,経度 / 地図クリック）" />
          <button id="swap" title="入れ替え">⇄</button>
        </div>
        <div class="bar" id="modes">
          <button class="mode-btn active" data-mode="driving" id="m-driv">車</button>
          <button class="mode-btn" data-mode="foot" id="m-foot">徒歩</button>
          <button class="mode-btn" data-mode="bike" id="m-bike">自転車</button>
          <button id="search">検索</button>
          <button id="set-from-map">地図で出発</button>
          <button id="set-to-map">地図で目的</button>
        </div>
        <div class="bar">
          <button id="start-nav" class="primary">ゆいきちナビ開始</button>
          <button id="stop-nav" disabled>ゆいきちナビ停止</button>
          <label class="small"><input type="checkbox" id="chk-follow" checked> 追尾</label>
          <label class="small"><input type="checkbox" id="chk-rotate" checked> コンパス回転</label>
        </div>
      </div>

      <!-- 右：候補/詳細 -->
      <aside class="sidebar" aria-live="polite">
        <div style="font-weight:700;margin-bottom:6px">ルート候補</div>
        <div id="route-list" class="route-list small">— 検索して下さい —</div>
        <div style="font-weight:700;margin-top:8px">ルート詳細</div>
        <div id="turns" style="margin-top:6px">— ルートを選択してください —</div>
      </aside>

      <!-- HUD/コンパス/状態 -->
      <div class="hud" aria-live="polite">
        <div class="row"><span class="key">合計距離</span><span class="val" id="hud-total-dist">—</span><span class="key">合計時間</span><span class="val" id="hud-total-time">—</span></div>
        <div class="row"><span class="key">残り距離</span><span class="val" id="hud-rem-dist">—</span><span class="key">到着まで</span><span class="val" id="hud-rem-time">—</span></div>
        <div class="row small" id="hud-next">次の案内 — —</div>
      </div>
      <div class="compass"><div id="compass-needle">🧭</div></div>
      <div id="status">状態: 初期化中</div>
    </div>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js"></script>
  <script>
  // ====== 再初期化ガード ======
  if (window._navCompleteInitializedV4) {
    console.warn('nav_complete V4 は既に初期化済み — 再利用します');
  } else {
    window._navCompleteInitializedV4 = true;

    (function(){
      // ====== アプリ状態 ======
      window._navComplete = window._navComplete || {};
      const app = window._navComplete;
      app.state = app.state || {
        map:null, markers:{from:null,to:null,cur:null},
        routes:[], routeLayers:[], routeTooltips:[], turnMarkers:[], progressLayer:null, selected:-1,
        nav:false, watchId:null, heading:0, lastHeadingTs:0,
        setMode:'driving', mapClickMode:null, useDummy:false,
        lastRerouteTs:0, follow:true, rotate:true,
        lastSnapIdx:0
      };

      const els = {
        from: document.getElementById('from'),
        to: document.getElementById('to'),
        swap: document.getElementById('swap'),
        modes: document.getElementById('modes'),
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
        compass: document.getElementById('compass-needle')
      };

      function setStatus(msg, isErr){ els.status.textContent = '状態: ' + msg; els.status.style.color = isErr? 'red':'black'; console.log('[nav]', msg); }
      function formatDist(m){ return m>=1000? (m/1000).toFixed(2)+' km' : Math.round(m)+' m'; }
      function formatDuration(sec){ if(!sec && sec!==0) return '-'; const s=Math.round(sec); const h=Math.floor(s/3600); const m=Math.round((s%3600)/60); if(h>0){ return `${h}時間${m}分`; } return `${m}分`; }

      // ====== 日本語案内生成 ======
      function jpInstruction(step){
        if(!step || !step.maneuver) return '直進';
        const m = step.maneuver; const type=m.type||''; const mod=m.modifier||''; const name = step.name? `（${step.name}）` : '';
        const roundaboutExit = (m.exit? `${m.exit} 番目の出口` : '');
        const dir = (x=>({
          'left':'左方向','slight left':'やや左方向','sharp left':'大きく左方向',
          'right':'右方向','slight right':'やや右方向','sharp right':'大きく右方向',
          'straight':'直進','uturn':'Uターン'
        }[x]||''))(mod);
        let text='';
        switch(type){
          case 'depart': text='出発'; break;
          case 'arrive': text='目的地に到着'; break;
          case 'turn': text= dir||'曲がる'; break;
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

      // ====== 地図初期化 ======
      function initMap(){
        if (app.state.map) return app.state.map;
        const map = L.map('map', { center:[35.681236,139.767125], zoom:5, zoomControl:true });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19, attribution:'© OpenStreetMap contributors'}).addTo(map);
        app.state.map = map;
        map.on('click', (e)=>{
          if (app.state.mapClickMode === 'from'){
            setFrom({lat:e.latlng.lat, lon:e.latlng.lng, display_name:`${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`});
            app.state.mapClickMode = null; setStatus('地図で出発地を設定しました');
          } else if (app.state.mapClickMode === 'to'){
            setTo({lat:e.latlng.lat, lon:e.latlng.lng, display_name:`${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`});
            app.state.mapClickMode = null; setStatus('地図で目的地を設定しました');
          }
        });
        return map;
      }
      const map = initMap();

      // ====== マーカー ======
      function ensureMarker(name){ if (app.state.markers[name]) return app.state.markers[name]; const m = L.marker(map.getCenter()).addTo(map); app.state.markers[name]=m; return m; }
      function setFrom(loc){ app.state.from = loc; els.from.value = loc.display_name || `${loc.lat.toFixed(5)},${loc.lon.toFixed(5)}`; const m = ensureMarker('from'); m.setLatLng([loc.lat,loc.lon]).bindPopup('出発').openPopup(); }
      function setTo(loc){ app.state.to = loc; els.to.value = loc.display_name || `${loc.lat.toFixed(5)},${loc.lon.toFixed(5)}`; const m = ensureMarker('to'); m.setLatLng([loc.lat,loc.lon]).bindPopup('目的地').openPopup(); }

      // 現在地マーカー（進行方向アイコン）
      function setCurrentMarker(lat,lon,bearing){
        const html = `<div class="marker-heading rotateable" style="position:relative;"></div>`;
        if(!app.state.markers.cur){ app.state.markers.cur = L.marker([lat,lon],{ title:'現在地', icon: L.divIcon({html, className:'', iconSize:[22,22]})}).addTo(map); }
        app.state.markers.cur.setLatLng([lat,lon]);
        try{ const el = app.state.markers.cur.getElement().querySelector('.rotateable'); if(el){ el.style.transform = `rotate(${bearing||0}deg)`; } }catch(e){}
      }

      // ====== ジオコーディング/パース ======
      function parseLatLon(q){ if(!q) return null; const m = q.trim().match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/); if(m) return {lat:parseFloat(m[1]), lon:parseFloat(m[2]), display_name:`${parseFloat(m[1]).toFixed(5)}, ${parseFloat(m[2]).toFixed(5)}`}; return null; }
      async function geocode(q){ const parsed = parseLatLon(q); if(parsed) return parsed; const url='https://nominatim.openstreetmap.org/search?format=json&limit=5&q='+encodeURIComponent(q); try{ const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(),8000); const res=await fetch(url,{signal:ctrl.signal, headers:{'Accept-Language':'ja'}}); clearTimeout(t); if(!res.ok) throw new Error('HTTP '+res.status); const j=await res.json(); if(j&&j.length>0) return {lat:parseFloat(j[0].lat), lon:parseFloat(j[0].lon), display_name:j[0].display_name}; return null;}catch(e){console.warn('geocode fail',e); return null;} }

      // ====== ルート取得（OSRM） ======
      async function fetchRoutes(from,to,mode){ const profile = mode==='driving'?'driving': mode==='foot'?'foot':'bicycle'; const url=`https://router.project-osrm.org/route/v1/${profile}/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`; try{ const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(),12000); const res=await fetch(url,{signal:ctrl.signal}); clearTimeout(t); if(!res.ok) throw new Error('HTTP '+res.status); const j=await res.json(); if(j && j.code==='Ok' && j.routes && j.routes.length>0) return j.routes; return null;}catch(e){console.warn('fetchRoutes fail',e); return null;} }

      // ====== モード別 推定速度(ETA補正) ======
      const SPEED_KMH = { foot: 4.8, bike: 16, driving: 42 };
      function etaSeconds(distanceMeters, mode){ const v = SPEED_KMH[mode] || 42; return (distanceMeters/1000) / v * 3600; }

      // ====== ルート描画＆リスト（線/ツールチップ/曲がりマーカー） ======
      function clearRouteLayers(){
        app.state.routeLayers.forEach(l=>{ try{ map.removeLayer(l);}catch{} });
        app.state.routeTooltips.forEach(t=>{ try{ map.removeLayer(t);}catch{} });
        app.state.turnMarkers.forEach(m=>{ try{ map.removeLayer(m);}catch{} });
        if(app.state.progressLayer){ try{ map.removeLayer(app.state.progressLayer);}catch{} app.state.progressLayer=null; }
        app.state.routeLayers=[]; app.state.routeTooltips=[]; app.state.turnMarkers=[];
        app.state.routes=[]; app.state.selected=-1;
        els.routeList.innerHTML=''; els.turns.innerHTML='';
        els.hudTotalDist.textContent='—'; els.hudTotalTime.textContent='—'; els.hudRemDist.textContent='—'; els.hudRemTime.textContent='—';
      }

      function makeTurnMarker(step){
        if(!step || !step.maneuver || !step.maneuver.location) return null;
        const [lon,lat] = step.maneuver.location;
        const marker = L.circleMarker([lat,lon], {radius:6, weight:2, color:'#1e90ff', fillColor:'#1e90ff', fillOpacity:0.85});
        const label = `<div style="font-weight:700">${jpInstruction(step)}</div><div class="small">${formatDist(step.distance)} ${step.name ? '｜ '+step.name:''}</div>`;
        marker.bindPopup(label);
        marker.bindTooltip(jpInstruction(step), {permanent:false, direction:'top', offset:[0,-6]});
        return marker;
      }

      function drawRoutes(routes){
        clearRouteLayers();
        app.state.routes = routes;
        routes.forEach((r,i)=>{
          const coords = r.geometry.coordinates.map(c=>[c[1],c[0]]);
          const line = L.polyline(coords,{color:i===0?'#1e90ff':'#888',weight:i===0?7:5,opacity:i===0?0.95:0.45}).addTo(map);
          line.on('click',()=> selectRoute(i));
          line.bindTooltip(`候補 ${i+1}｜${(r.distance/1000).toFixed(2)} km｜${formatDuration(etaSeconds(r.distance, app.state.setMode))}`);
          app.state.routeLayers.push(line);

          // 主要曲がりポイントにマーカー
          const steps = (r.legs && r.legs[0] && r.legs[0].steps) ? r.legs[0].steps : [];
          const every = Math.max(1, Math.floor(steps.length/40)); // 過密回避
          steps.forEach((s,idx)=>{
            if(!s.maneuver || s.maneuver.type==='depart') return;
            if(idx % every !== 0 && s.maneuver.type!=='turn' && s.maneuver.type!=='arrive') return;
            const m = makeTurnMarker(s);
            if(m){ m.addTo(map); app.state.turnMarkers.push(m); }
          });

          const div = document.createElement('div');
          div.className='route-item'; if(i===0) div.classList.add('selected');
          const distKm = (r.distance/1000).toFixed(2);
          const durStr = formatDuration(etaSeconds(r.distance, app.state.setMode));
          div.textContent=`候補 ${i+1} — ${distKm} km / ${durStr}`;
          div.addEventListener('click',()=> selectRoute(i));
          els.routeList.appendChild(div);
        });
        app.state.selected=0; selectRoute(0);
      }

      function selectRoute(i){
        if(i<0||i>=app.state.routes.length) return;
        app.state.selected=i;
        app.state.routeLayers.forEach((l,idx)=>{ l.setStyle({color: idx===i? '#1e90ff':'#888', weight: idx===i?8:5, opacity: idx===i?0.98:0.4}); if(idx===i) l.bringToFront(); });
        const items = els.routeList.querySelectorAll('.route-item'); items.forEach((it,idx)=> it.classList.toggle('selected', idx===i));
        const r = app.state.routes[i];
        const steps = r.legs[0].steps; renderTurns(steps);
        const coords = r.geometry.coordinates.map(c=>[c[1],c[0]]);
        const bounds = L.latLngBounds(coords); map.fitBounds(bounds,{padding:[50,50]});
        els.hudTotalDist.textContent = (r.distance/1000).toFixed(2)+' km';
        els.hudTotalTime.textContent = formatDuration(etaSeconds(r.distance, app.state.setMode));
        app.state.lastSnapIdx=0; // reset progress
        if(app.state.progressLayer){ try{ map.removeLayer(app.state.progressLayer);}catch{} app.state.progressLayer=null; }
      }

      function renderTurns(steps){
        els.turns.innerHTML='';
        if(!steps||steps.length===0){ els.turns.textContent='ターンバイターンデータがありません'; return;}
        steps.forEach((s)=>{
          const node = document.createElement('div');
          node.className='turn-step';
          node.innerHTML=`<div><strong>${jpInstruction(s)}</strong></div><div class=\"small\">距離: ${formatDist(s.distance)} ${s.name? '｜ 道路: '+s.name : ''}</div>`;
          node.addEventListener('mouseenter', ()=>{ // ホバーで該当マーカー強調
            if(!s.maneuver||!s.maneuver.location) return;
            const [lon,lat] = s.maneuver.location; L.popup({autoClose:true, closeButton:false, offset:[0,-10]})
              .setLatLng([lat,lon])
              .setContent(`<b>${jpInstruction(s)}</b><div class='small'>${formatDist(s.distance)} ${s.name? '｜ '+s.name:''}</div>`)
              .openOn(map);
          });
          els.turns.appendChild(node);
        });
      }

      // ====== 音声読み上げ（日本語） ======
      function speakJa(text){ if(!window.speechSynthesis) return; try{ const u = new SpeechSynthesisUtterance(text); u.lang='ja-JP'; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);}catch(e){console.warn('speak fail',e);} }

      // ====== 追尾/回転（地図は回転しない） ======
      function applyFollowAndRotate(lat,lon,bearing){
        if(app.state.follow){ const z = Math.max(15, map.getZoom()); map.setView([lat,lon], Math.min(17,z)); }
        if(app.state.rotate){ const deg = (bearing||0); try{ els.compass.style.transform = `rotate(${deg}deg)`; }catch(e){} } else { try{ els.compass.style.transform='none'; }catch(e){} }
      }

      // ====== ナビ実行・自動リルート ======
      function startNavigation(){ if(app.state.nav) return; if(!app.state.routes||app.state.routes.length===0){ setStatus('先にルートを検索してください',true); return;} app.state.nav=true; setStatus('ナビ開始：ルートを追跡します'); els.startNav.disabled=true; els.stopNav.disabled=false;
        if(!navigator.geolocation){ setStatus('位置情報非対応。ダミーを使用します',true); applyDummy(); return; }
        try{ app.state.watchId = navigator.geolocation.watchPosition(onNavPosition, onNavError, { enableHighAccuracy:true, maximumAge:1000, timeout:15000}); }catch(e){ console.warn('watch fail',e); applyDummy(); }
      }
      function stopNavigation(){ if(!app.state.nav) return; app.state.nav=false; setStatus('ナビ停止'); els.startNav.disabled=false; els.stopNav.disabled=true; try{ if(app.state.watchId!==null){ navigator.geolocation.clearWatch(app.state.watchId); app.state.watchId=null; }}catch(e){} }

      function onNavError(err){ console.warn('nav pos err',err); if(err && err.code===1){ setStatus('位置情報が許可されていません', true); }

      }

      function offRouteThreshold(){ switch(app.state.setMode){ case 'foot': return 30; case 'bike': return 50; default: return 100; } }
      function rerouteCooldownMs(){ return 8000; }

      function updateProgressLayer(route, snapIdx){ if(!route) return; const coords = route.geometry.coordinates; if(snapIdx<=0) return; const seg = coords.slice(0, Math.min(snapIdx+1, coords.length)).map(c=>[c[1],c[0]]); if(!app.state.progressLayer){ app.state.progressLayer = L.polyline(seg,{color:'#2ecc71', weight:8, opacity:0.9}).addTo(map); } else { app.state.progressLayer.setLatLngs(seg); } }

      // ★ 角度補正・正規化ヘルパ
      function norm360(deg){ if(typeof deg!=='number'||Number.isNaN(deg)) return 0; return (deg%360+360)%360; }

      function onNavPosition(pos){
        const lat=pos.coords.latitude, lon=pos.coords.longitude;
        let bearing = 0; const nowTs = Date.now(); const headingFresh = (nowTs - app.state.lastHeadingTs) < 2500;
        if(headingFresh){ bearing = norm360(app.state.heading); }
        else if(app._prev){ const dy = lat - app._prev.lat, dx = lon - app._prev.lon; if(Math.abs(dy)+Math.abs(dx) > 1e-6){ bearing = norm360(Math.atan2(dx, dy) * 180/Math.PI); } }
        setCurrentMarker(lat,lon,bearing);
        applyFollowAndRotate(lat,lon,bearing);
        app._prev = {lat,lon};
        if(app.state.useDummy) return;

        const route = app.state.routes[app.state.selected]; if(!route) return;
        const line = turf.lineString(route.geometry.coordinates);
        const pt = turf.point([lon,lat]);
        const snapped = turf.nearestPointOnLine(line, pt, {units:'meters'});
        const distToRoute = snapped.properties.dist; // m
        const snapIdx = snapped.properties.index || 0; // 進捗
        if(snapIdx > app.state.lastSnapIdx){ app.state.lastSnapIdx = snapIdx; updateProgressLayer(route, snapIdx); }

        // 次の案内（日本語）
        const steps = route.legs[0].steps || [];
        let chosen = null; for(let i=0;i<steps.length;i++){ const s=steps[i]; const mloc = s.maneuver && s.maneuver.location; if(!mloc) continue; const d = turf.distance(turf.point([lon,lat]), turf.point([mloc[0],mloc[1]]), {units:'meters'}); if(d>5){ chosen = {index:i, step:s, dist:d}; break; } }
        if(!chosen && steps.length){ chosen = {index:steps.length-1, step:steps[steps.length-1], dist:0}; }
        if(chosen){ const msg = `${formatDist(chosen.dist)} 先、${jpInstruction(chosen.step)}`; els.hudNext.textContent = `次の案内 — ${msg}`; if(chosen.dist < 60){ speakJa(msg); } }

        // 残り距離/時間
        const totalDist = route.distance; const totalDur = etaSeconds(route.distance, app.state.setMode); // 補正後の総時間(秒)
        const routeCoords = route.geometry.coordinates;
        const remainingLine = turf.lineString(routeCoords.slice(snapIdx));
        const remKm = turf.length(remainingLine, {units:'kilometers'});
        const remDistM = Math.max(0, Math.round(remKm*1000));
        const remTimeSec = totalDist>0 ? (totalDur * (remDistM/totalDist)) : 0;
        els.hudRemDist.textContent = formatDist(remDistM);
        els.hudRemTime.textContent = formatDuration(remTimeSec);

        // 自動リルート判定
        const now = Date.now();
        if(distToRoute > offRouteThreshold() && (now - app.state.lastRerouteTs) > rerouteCooldownMs()){
          app.state.lastRerouteTs = now;
          setStatus(`コースを外れました（${Math.round(distToRoute)}m）。新ルートを再検索します…`);
          const cur = {lat, lon}; const dest = app.state.to;
          if(dest){ fetchRoutes(cur, dest, app.state.setMode).then(rs=>{ if(rs && rs.length){ drawRoutes(rs); setStatus('自動リルート完了'); speakJa('ルートを再計算しました'); if(app.state.follow) map.setView([lat,lon], 16); }
            else { setStatus('リルートに失敗しました', true); } }); }
        }
      }

      // ====== デバイス方位（コンパス） ======
      function initOrientation(){
        function screenAngle(){
          const a = (screen.orientation && typeof screen.orientation.angle==='number') ? screen.orientation.angle :
                    (typeof window.orientation==='number' ? window.orientation : 0);
          return (a||0);
        }
        function handleFromAlpha(alpha){ const head = norm360(360 - alpha + screenAngle()); app.state.heading = head; app.state.lastHeadingTs = Date.now(); }
        function handleGeneric(e){ const wh = (typeof e.webkitCompassHeading === 'number' ? e.webkitCompassHeading : null); if(wh!=null && !Number.isNaN(wh)){ app.state.heading = norm360(wh + 0); app.state.lastHeadingTs = Date.now(); } else if(typeof e.alpha === 'number' && !Number.isNaN(e.alpha)){ handleFromAlpha(e.alpha); } }
        if(window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function'){
          document.body.addEventListener('click', function once(){ DeviceOrientationEvent.requestPermission().then(state=>{ if(state==='granted'){ window.addEventListener('deviceorientation', handleGeneric, {passive:true}); window.addEventListener('deviceorientationabsolute', handleGeneric, {passive:true}); } }).catch(()=>{}); document.body.removeEventListener('click', once); }, {once:true});
        } else if(window.DeviceOrientationEvent){ window.addEventListener('deviceorientationabsolute', handleGeneric, {passive:true}); window.addEventListener('deviceorientation', handleGeneric, {passive:true}); }
        window.addEventListener('orientationchange', ()=>{ app.state.lastHeadingTs = 0; }, {passive:true});
      }
      initOrientation();

      // ====== ダミー位置 ======
      const DUMMY = {lat:35.170915, lon:136.881537, name:'名古屋駅'};
      function applyDummy(){ app.state.useDummy = true; setCurrentMarker(DUMMY.lat,DUMMY.lon,0); map.setView([DUMMY.lat,DUMMY.lon],16); setStatus('ダミー位置を使用中'); }

      // ====== 入力解決："現在地"を解釈 ======
      async function resolveFromInput(){ const v = (els.from.value||'').trim(); if(!v || v==='現在地' || v==='いま' || v.toLowerCase()==='current'){ return await getCurrentLocation(); } const g = await geocode(v); if(!g){ throw new Error('出発地が見つかりません'); } return g; }
      async function resolveToInput(){ const v = (els.to.value||'').trim(); const g = parseLatLon(v) || (v? await geocode(v):null); if(!g) throw new Error('目的地が見つかりません'); return g; }
      function getCurrentLocation(){ return new Promise((resolve,reject)=>{ if(!navigator.geolocation){ reject(new Error('この端末は位置情報に対応していません')); return; } navigator.geolocation.getCurrentPosition(p=>{ resolve({lat:p.coords.latitude, lon:p.coords.longitude, display_name:'現在地'}); }, err=>{ reject(err); }, {enableHighAccuracy:true, timeout:12000}); }); }

      // ====== UI動作 ======
      els.swap.addEventListener('click', ()=>{ const a=els.from.value; els.from.value=els.to.value; els.to.value=a; const af=app.state.from; app.state.from=app.state.to; app.state.to=af; if(app.state.from) setFrom(app.state.from); if(app.state.to) setTo(app.state.to); });
      document.querySelectorAll('#modes .mode-btn').forEach(b=> b.addEventListener('click', async ()=>{ document.querySelectorAll('#modes .mode-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); app.state.setMode = b.dataset.mode; if(app.state.from && app.state.to){ setStatus('モード変更に合わせてルートを再検索します…'); const routes = await fetchRoutes(app.state.from, app.state.to, app.state.setMode); if(routes){ drawRoutes(routes); setStatus('モード変更を反映しました'); } else { setStatus('モード変更の反映に失敗しました', true); } } }));
      els.setFromMap.addEventListener('click', ()=>{ app.state.mapClickMode='from'; setStatus('地図をタップして出発地を選んでください'); });
      els.setToMap.addEventListener('click', ()=>{ app.state.mapClickMode='to'; setStatus('地図をタップして目的地を選んでください'); });

      els.search.addEventListener('click', async ()=>{
        try{
          setStatus('出発地を解決中...');
          const f = await resolveFromInput();
          setFrom(f);
          setStatus('目的地を解決中...');
          const t = await resolveToInput();
          setTo(t);
          setStatus('ルート検索中...');
          const routes = await fetchRoutes(f,t, app.state.setMode);
          if(!routes){ setStatus('ルート検索に失敗しました（外部API制限の可能性）', true); return; }
          drawRoutes(routes);
          setStatus('ルート候補を表示しました');
        }catch(e){ setStatus(e.message || '検索に失敗しました', true); }
      });

      els.startNav.addEventListener('click', ()=> startNavigation());
      els.stopNav.addEventListener('click', ()=> stopNavigation());
      els.chkFollow.addEventListener('change', ()=>{ app.state.follow = els.chkFollow.checked; });
      els.chkRotate.addEventListener('change', ()=>{ app.state.rotate = els.chkRotate.checked; if(!app.state.rotate){ try{ els.compass.style.transform='none'; }catch(e){} } });
      [els.from, els.to].forEach(i=> i.addEventListener('keydown', e=>{ if(e.key==='Enter') els.search.click(); }));

      els.from.placeholder = '例: 現在地 / 名古屋駅 / 35.170915,136.881537';
      els.to.placeholder='例: 東京駅 / 35.681236,139.767125（地図クリックでも設定可）';
      setStatus('初期化完了 — 出発地と目的地を入力して検索してください');

      // ====== ちょいテスト（簡易ユニット） ======
      (function selfTests(){
        function assertEq(name,a,b){ if(a!==b){ console.error('TEST FAIL',name,a,b);} else { console.log('TEST OK',name);} }
        assertEq('formatDist_500', formatDist(500), '500 m');
        assertEq('formatDist_1500', formatDist(1500), '1.50 km');
        assertEq('formatDuration_59m', formatDuration(59*60), '59分');
        assertEq('formatDuration_2h5m', formatDuration(2*3600+5*60), '2時間5分');
        const d = 10000; // 10km
        const etaFoot = Math.round(etaSeconds(d,'foot')/60);
        const etaBike = Math.round(etaSeconds(d,'bike')/60);
        const etaCar  = Math.round(etaSeconds(d,'driving')/60);
        console.log('ETA test (10km) foot/bike/car =', etaFoot, etaBike, etaCar);
        if(!(etaFoot > etaBike && etaBike > etaCar)) console.error('TEST FAIL eta order'); else console.log('TEST OK eta order');
        const s1 = {distance:120, name:'桜通', maneuver:{type:'turn', modifier:'right'}};
        console.log('JP instruction sample:', jpInstruction(s1));
      })();

      // export
      app.api = { setFrom, setTo, fetchRoutes, drawRoutes, startNavigation, stopNavigation, applyDummy };
      window._navComplete = app;
    })();
  }
  </script>
</body>
</html>
