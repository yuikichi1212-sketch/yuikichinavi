<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <title>ゆいきちナビ — やばい超完全版</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    :root{--accent:#1e90ff;--bg:#f7f9fc;--ink:#111;--card:#fff}
    html,body{height:100%;margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,'Noto Sans JP',sans-serif;background:var(--bg);color:var(--ink)}
    #app{height:100%;display:flex;flex-direction:column}

    /* ===== Top Toolbar（地図の外に固定／スマホで折りたたみ可） ===== */
    header.toolbar{background:var(--card);box-shadow:0 1px 8px rgba(0,0,0,.06);padding:8px;z-index:1000}
    .bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .brand{font-weight:800;margin-right:6px}
    .ipt{padding:8px;border:1px solid #e4e8ee;border-radius:10px;min-width:220px;flex:1 1 240px}
    .btn{padding:8px 12px;border:1px solid #dfe3ea;border-radius:10px;background:#fff;cursor:pointer}
    .btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
    .mode-btn{padding:6px 10px;border-radius:10px;border:1px solid #dfe3ea;background:#fff}
    .mode-btn.active{background:var(--accent);color:#fff;border-color:var(--accent)}
    .muted{font-size:12px;color:#777}
    .collapse-area{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .collapse{display:none}

    /* ===== Map Area with rotation canvas ===== */
    #main{position:relative;flex:1;min-height:420px;overflow:hidden}
    /* 外側キャンバス（茶色タイル隠しの余白＆スケール） */
    #map-canvas{position:absolute;inset:-12%; /* 余白を広げて回転角で端が見えないように */
                 display:grid;place-items:center;will-change:transform}
    #map-rotor{width:120%;height:120%;transform-origin:center center;will-change:transform}
    #map{width:100%;height:100%}

    /* Sidebar / HUD / Compass */
    .sidebar{position:absolute;right:12px;top:12px;z-index:1400;background:#fff;padding:10px;border-radius:14px;box-shadow:0 12px 30px rgba(0,0,0,0.12);width:360px;max-height:72vh;overflow:auto}
    .sidebar.hidden{display:none}
    .sidebar .title{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
    .route-item{padding:8px;border-radius:10px;border:1px solid #eee;margin-bottom:6px;cursor:pointer}
    .route-item.selected{background:var(--accent);color:#fff;border-color:var(--accent);font-weight:700}
    .turn-step{padding:6px;border-bottom:1px dashed #eee}

    .hud{position:absolute;left:12px;bottom:12px;z-index:1500;background:rgba(255,255,255,0.92);padding:6px 8px;border-radius:10px;box-shadow:0 8px 20px rgba(0,0,0,.12)}
    .hud .row{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
    .hud .key{font-size:11px;color:#666}
    .hud .val{font-weight:700;font-size:12px}
    .hud .next{font-size:11px;color:#444;margin-top:2px}

    .compass{position:absolute;right:12px;bottom:12px;z-index:1500;background:rgba(255,255,255,0.95);padding:6px;border-radius:50%;width:40px;height:40px;display:grid;place-items:center;box-shadow:0 6px 18px rgba(0,0,0,0.12)}
    .compass > div{transform-origin:center center}
    #status{position:absolute;left:12px;top:12px;z-index:1500;background:rgba(255,255,255,0.95);padding:6px 8px;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,0.12);font-size:12px}

    /* Bottom-sheet（手順一覧） */
    #route-steps{position:absolute;left:0;right:0;bottom:0;background:rgba(255,255,255,0.96);border-top:1px solid #eee;max-height:42%;overflow:auto;padding:10px;display:none;z-index:1401}
    #route-steps .drag{font-size:12px;color:#666;text-align:center;margin-bottom:4px}

    /* Leaflet zoom bigger on mobile */
    .leaflet-control-zoom{transform-origin:top left}

    @media(max-width:900px){
      .ipt{min-width:140px;flex:1 1 160px}
      .collapse{display:inline-flex}
      .collapse-area{display:none}
      .sidebar{width:min(92vw,420px);top:auto;bottom:12px;max-height:46vh}
      .leaflet-control-zoom{transform:scale(1.35)}
      #map-canvas{inset:-16%} /* さらに余白確保（回転時の端見せ防止） */
      #map-rotor{width:128%;height:128%}
    }
    @media(min-width:901px){
      .leaflet-control-zoom{transform:scale(1.15)}
    }

    /* 現在地マーカー（上向き固定。地図が回るので見かけは進行方向を示す） */
    .me-pin{width:22px;height:22px;border-radius:50%;background:#1e90ff;border:2px solid #fff;box-shadow:0 0 0 2px rgba(30,144,255,.25)}
  </style>
</head>
<body>
  <div id="app">
    <!-- ===== Toolbar ===== -->
    <header class="toolbar">
      <div class="bar">
        <div class="brand">ゆいきちナビ</div>
        <input id="from" class="ipt" placeholder="出発地（住所 / 緯度,経度 / 現在地）" />
        <input id="to" class="ipt" placeholder="目的地（住所 / 緯度,経度 / 地図クリック）" />
        <button id="swap" class="btn" title="入れ替え">⇄</button>
        <button id="search" class="btn primary">検索</button>
        <button id="toggle-more" class="btn collapse" aria-expanded="false">詳細 ▾</button>
      </div>
      <div id="more" class="bar collapse-area" style="margin-top:6px">
        <div class="muted">移動モード:</div>
        <button class="mode-btn active" data-mode="driving" id="m-driv">車</button>
        <button class="mode-btn" data-mode="foot" id="m-foot">徒歩</button>
        <button class="mode-btn" data-mode="bike" id="m-bike">自転車</button>
        <span style="flex:1"></span>
        <button id="set-from-map" class="btn">地図で出発</button>
        <button id="set-to-map" class="btn">地図で目的</button>
        <button id="start-nav" class="btn">ナビ開始</button>
        <button id="stop-nav" class="btn" disabled>停止</button>
        <label class="muted"><input type="checkbox" id="chk-follow" checked> 追尾</label>
        <label class="muted"><input type="checkbox" id="chk-rotate" checked> コンパス回転</label>
        <button id="toggle-sidebar" class="btn" title="右パネルの表示/非表示">パネル切替</button>
      </div>
    </header>

    <!-- ===== Map Area with rotation canvas ===== -->
    <div id="main">
      <div id="map-canvas">
        <div id="map-rotor">
          <div id="map" aria-label="地図">地図を読み込み中…</div>
        </div>
      </div>

      <!-- 右：候補/詳細 -->
      <aside class="sidebar" id="sidebar" aria-live="polite">
        <div class="title"><span style="font-weight:700">ルート候補</span></div>
        <div id="route-list" class="route-list muted">— 検索して下さい —</div>
        <div class="title" style="margin-top:6px"><span style="font-weight:700">ルート詳細</span></div>
        <div id="turns" style="margin-top:4px">— ルートを選択してください —</div>
      </aside>

      <!-- HUD / Compass / Status -->
      <div class="hud" aria-live="polite">
        <div class="row"><span class="key">合計距離</span><span class="val" id="hud-total-dist">—</span><span class="key">合計時間</span><span class="val" id="hud-total-time">—</span></div>
        <div class="row"><span class="key">残り距離</span><span class="val" id="hud-rem-dist">—</span><span class="key">到着まで</span><span class="val" id="hud-rem-time">—</span></div>
        <div class="next" id="hud-next">次の案内 — —</div>
      </div>
      <div class="compass"><div id="compass-needle">🧭</div></div>
      <div id="status">状態: 初期化中</div>

      <!-- Bottom sheet -->
      <div id="route-steps">
        <div class="drag">▼ ルート案内（タップで閉じる）</div>
        <div id="route-steps-body"></div>
      </div>
    </div>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js"></script>
  <script>
  // ===== 再初期化防止 =====
  if (window._yabaiUltraInit) {
    console.warn('already initialized');
  } else {
    window._yabaiUltraInit = true;

    (function(){
      const S = {
        map:null, from:null, to:null,
        routes:[], routeLayers:[], progressLayer:null,
        selected:-1, nav:false, watchId:null,
        heading:0, lastHeadingTs:0, setMode:'driving',
        mapClickMode:null, follow:true, rotate:true, useDummy:false,
        lastRerouteTs:0, lastSnapIdx:0,
        // 回転管理
        targetBearing:0, renderBearing:0, rotating:false, rafId:0,
        lastSpokenStepIdx:-1
      };

      // ===== Elements
      const E = {
        from: qs('#from'), to: qs('#to'), swap: qs('#swap'), search: qs('#search'),
        modes: qsa('.mode-btn'), setFromMap: qs('#set-from-map'), setToMap: qs('#set-to-map'),
        routeList: qs('#route-list'), turns: qs('#turns'), status: qs('#status'),
        startNav: qs('#start-nav'), stopNav: qs('#stop-nav'),
        hudTotalDist: qs('#hud-total-dist'), hudTotalTime: qs('#hud-total-time'),
        hudRemDist: qs('#hud-rem-dist'), hudRemTime: qs('#hud-rem-time'), hudNext: qs('#hud-next'),
        chkFollow: qs('#chk-follow'), chkRotate: qs('#chk-rotate'),
        compass: qs('#compass-needle'), sidebar: qs('#sidebar'),
        stepsSheet: qs('#route-steps'), stepsBody: qs('#route-steps-body'),
        toggleMore: qs('#toggle-more'), more: qs('#more'), toggleSidebar: qs('#toggle-sidebar'),
        rotor: qs('#map-rotor')
      };

      // ===== Helpers
      function qs(s){return document.querySelector(s)}
      function qsa(s){return Array.from(document.querySelectorAll(s))}
      function setStatus(msg, err){E.status.textContent = '状態: '+msg; E.status.style.color = err?'red':'#111'; console.log('[nav]', msg)}
      function formatDist(m){return m>=1000? (m/1000).toFixed(2)+' km' : Math.round(m)+' m'}
      function formatDuration(sec){ if(sec==null) return '—'; const s=Math.round(sec); const h=Math.floor(s/3600); const m=Math.round((s%3600)/60); return h>0? `${h}時間${m}分` : `${m}分`}
      const SPEED_KMH = {foot:4.8, bike:16, driving:42}
      function etaSeconds(meters, mode){ const v=SPEED_KMH[mode]||42; return (meters/1000)/v*3600 }
      function norm360(d){ if(typeof d!=='number'||Number.isNaN(d)) return 0; return (d%360+360)%360 }
      function shortAngleDiff(a,b){ // a->b の最短差（-180..180）
        let d = norm360(b) - norm360(a);
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        return d;
      }

      function jpInstruction(step){
        if(!step||!step.maneuver) return '直進';
        const m=step.maneuver, type=m.type||'', mod=m.modifier||'', name=step.name?`（${step.name}）`:'';
        const round=`${m.exit? m.exit+' 番目の出口':''}`;
        const dir=({left:'左方向','slight left':'やや左方向','sharp left':'大きく左方向',right:'右方向','slight right':'やや右方向','sharp right':'大きく右方向',straight:'直進',uturn:'Uターン'})[mod]||'';
        let t='進む';
        switch(type){case'depart':t='出発';break;case'arrive':t='目的地に到着';break;case'turn':t=dir||'曲がる';break;case'new name':t='道なりに進む';break;case'merge':t='合流';break;case'on ramp':t='入口から進入';break;case'off ramp':t='出口で出る';break;case'roundabout':case'rotary':t=`環状交差点で${round||'目的の出口'}へ`;break;case'roundabout turn':t=`環状交差点で${dir}`;break;case'fork':t=`分岐で${dir}`;break;case'end of road':t=`突き当たりで${dir}`;break;case'continue':t='直進';break;case'use lane':t='車線に従う';break}
        return `${t}${name}`.trim()
      }

      // ===== Map init
      const map = L.map('map', {center:[35.681236,139.767125], zoom:5, zoomControl:true});
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19, attribution:'© OpenStreetMap contributors'}).addTo(map);
      S.map = map;

      // 現在地マーカー（上向き固定）
      let curMarker=null;
      function setCurrentMarker(lat,lon){
        const html = `<div class="me-pin"></div>`;
        if(!curMarker){
          curMarker = L.marker([lat,lon],{title:'現在地', icon:L.divIcon({html, className:'', iconSize:[22,22]})}).addTo(map);
        }
        curMarker.setLatLng([lat,lon]);
      }

      // ジオコーディング等
      function parseLatLon(q){ if(!q) return null; const m=q.trim().match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/); if(m) return {lat:parseFloat(m[1]), lon:parseFloat(m[2]), display_name:`${parseFloat(m[1]).toFixed(5)}, ${parseFloat(m[2]).toFixed(5)}`}; return null }
      async function geocode(q){ const p=parseLatLon(q); if(p) return p; const url='https://nominatim.openstreetmap.org/search?format=json&limit=5&q='+encodeURIComponent(q); try{ const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(),8000); const res=await fetch(url,{signal:ctrl.signal, headers:{'Accept-Language':'ja'}}); clearTimeout(t); if(!res.ok) throw new Error('HTTP '+res.status); const j=await res.json(); if(j&&j.length>0) return {lat:+j[0].lat, lon:+j[0].lon, display_name:j[0].display_name}; return null }catch(e){ console.warn('geocode fail',e); return null } }
      async function fetchRoutes(from,to,mode){ const profile=mode==='driving'?'driving': mode==='foot'?'foot':'bicycle'; const url=`https://router.project-osrm.org/route/v1/${profile}/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`; try{ const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(),12000); const res=await fetch(url,{signal:ctrl.signal}); clearTimeout(t); if(!res.ok) throw new Error('HTTP '+res.status); const j=await res.json(); if(j && j.code==='Ok' && j.routes && j.routes.length>0) return j.routes; return null }catch(e){ console.warn('fetchRoutes fail',e); return null } }

      // ルート描画（曲がり角マーカーは出さない＝変な点なし）
      function clearRoutes(){
        S.routeLayers.forEach(l=>{try{map.removeLayer(l)}catch{}});
        S.routeLayers=[];
        if(S.progressLayer){ try{ map.removeLayer(S.progressLayer) }catch{} S.progressLayer=null }
        E.routeList.innerHTML=''; E.turns.innerHTML='';
        S.routes=[]; S.selected=-1;
        E.hudTotalDist.textContent='—'; E.hudTotalTime.textContent='—'; E.hudRemDist.textContent='—'; E.hudRemTime.textContent='—';
        qs('#route-steps').style.display='none'
      }

      function drawRoutes(routes){
        clearRoutes(); S.routes=routes;
        routes.forEach((r,i)=>{
          const coords=r.geometry.coordinates.map(c=>[c[1],c[0]]);
          const line=L.polyline(coords,{color:i===0?'#1e90ff':'#888',weight:i===0?7:5,opacity:i===0?0.95:0.45}).addTo(map);
          line.on('click',()=> selectRoute(i));
          line.bindTooltip(`候補 ${i+1}｜${(r.distance/1000).toFixed(2)} km｜${formatDuration(etaSeconds(r.distance,S.setMode))}`);
          S.routeLayers.push(line);

          const div=document.createElement('div');
          div.className='route-item'; if(i===0) div.classList.add('selected');
          div.textContent=`候補 ${i+1} — ${(r.distance/1000).toFixed(2)} km / ${formatDuration(etaSeconds(r.distance,S.setMode))}`;
          div.addEventListener('click',()=> selectRoute(i));
          E.routeList.appendChild(div);
        });
        S.selected=0; selectRoute(0);
      }

      function selectRoute(i){
        if(i<0||i>=S.routes.length) return; S.selected=i;
        S.routeLayers.forEach((l,idx)=>{ l.setStyle({color: idx===i? '#1e90ff':'#888', weight: idx===i?8:5, opacity: idx===i?0.98:0.4}); if(idx===i) l.bringToFront() });
        E.routeList.querySelectorAll('.route-item').forEach((n,idx)=> n.classList.toggle('selected', idx===i));
        const r=S.routes[i]; const steps=r.legs[0].steps; renderTurns(steps);
        const coords=r.geometry.coordinates.map(c=>[c[1],c[0]]); map.fitBounds(L.latLngBounds(coords),{padding:[50,50]});
        E.hudTotalDist.textContent=(r.distance/1000).toFixed(2)+' km';
        E.hudTotalTime.textContent=formatDuration(etaSeconds(r.distance,S.setMode));
        S.lastSnapIdx=0; S.lastSpokenStepIdx=-1;
        if(S.progressLayer){ try{map.removeLayer(S.progressLayer)}catch{} S.progressLayer=null }
      }

      function renderTurns(steps){
        E.turns.innerHTML='';
        if(!steps||!steps.length){ E.turns.textContent='ターンバイターンデータがありません'; return }
        const fr=document.createDocumentFragment();
        steps.forEach((s)=>{
          const node=document.createElement('div');
          node.className='turn-step';
          node.innerHTML=`<div><strong>${jpInstruction(s)}</strong></div><div class='muted'>距離: ${formatDist(s.distance)} ${s.name?'｜道路: '+s.name:''}</div>`;
          node.addEventListener('mouseenter',()=>{ if(!s.maneuver||!s.maneuver.location) return; const [lon,lat]=s.maneuver.location; L.popup({autoClose:true,closeButton:false,offset:[0,-10]}).setLatLng([lat,lon]).setContent(`<b>${jpInstruction(s)}</b><div class='muted'>${formatDist(s.distance)} ${s.name? '｜'+s.name:''}</div>`).openOn(map) });
          fr.appendChild(node)
        });
        E.turns.appendChild(fr);

        // bottom-sheet
        const listHtml = steps.map((s,idx)=>`<li data-idx="${idx}">${jpInstruction(s)} <span class='muted'>${formatDist(s.distance||0)}</span></li>`).join('');
        E.stepsBody.innerHTML = `<ol>${listHtml}</ol>`;
        E.stepsSheet.style.display='block';
        E.stepsBody.querySelectorAll('li').forEach(li=> li.addEventListener('click',()=>{ const s=steps[+li.dataset.idx]; if(s&&s.maneuver){ const [lon,lat]=s.maneuver.location; map.panTo([lat,lon]); L.popup().setLatLng([lat,lon]).setContent(`<b>${jpInstruction(s)}</b>`).openOn(map) } }))
      }

      // ===== 音声
      function speakJa(t){ if(!window.speechSynthesis) return; try{ const u=new SpeechSynthesisUtterance(t); u.lang='ja-JP'; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u) }catch{} }

      // ===== コンパス（デバイス方位） → targetBearing に反映
      function initOrientation(){
        function scr(){ const a=(screen.orientation&&typeof screen.orientation.angle==='number')? screen.orientation.angle : (typeof window.orientation==='number'? window.orientation:0); return a||0 }
        function fromAlpha(alpha){ S.heading = norm360(360 - alpha + scr()); S.lastHeadingTs=Date.now() }
        function gen(e){
          const wh=(typeof e.webkitCompassHeading==='number'? e.webkitCompassHeading : null);
          if(wh!=null && !Number.isNaN(wh)){ S.heading=norm360(wh); S.lastHeadingTs=Date.now() }
          else if(typeof e.alpha==='number' && !Number.isNaN(e.alpha)){ fromAlpha(e.alpha + 180) }

          // ナビ中のみ回転ターゲット更新
          if(S.nav && S.rotate){ S.targetBearing = S.heading+ 180 }
}

        }
        if(window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission==='function'){
          document.body.addEventListener('click', function once(){
            DeviceOrientationEvent.requestPermission().then(st=>{
              if(st==='granted'){
                window.addEventListener('deviceorientation', gen,{passive:true});
                window.addEventListener('deviceorientationabsolute', gen,{passive:true});
              }
            }).catch(()=>{});
            document.body.removeEventListener('click', once)
          }, {once:true});
        } else if(window.DeviceOrientationEvent){
          window.addEventListener('deviceorientationabsolute', gen,{passive:true});
          window.addEventListener('deviceorientation', gen,{passive:true});
        }
        window.addEventListener('orientationchange', ()=>{ S.lastHeadingTs=0 }, {passive:true})
      }
      initOrientation();

      // ===== 回転レンダリング（なめらか補間）
      function startRotor(){
        if(S.rafId) cancelAnimationFrame(S.rafId);
        S.rotating = true;
        const tick = ()=>{
          if(!S.rotating){ S.rafId = 0; return }
          // 目標角へスムージング（比例制御）
          const diff = shortAngleDiff(S.renderBearing, S.targetBearing);
          // 最大回転速度・減衰（大きいと速く追随）
          S.renderBearing = norm360(S.renderBearing + diff * 0.12); // 0.12係数で滑らかに
          // 適用
          E.rotor.style.transform = `rotate(${S.renderBearing}deg)`;
          // コンパス（逆回転で北を指す風に）
          E.compass.style.transform = `rotate(${S.renderBearing}deg)`;
          S.rafId = requestAnimationFrame(tick);
        };
        S.rafId = requestAnimationFrame(tick);
      }
      function stopRotor(){
        S.rotating = false;
        if(S.rafId){ cancelAnimationFrame(S.rafId); S.rafId=0 }
        S.targetBearing = 0; S.renderBearing = 0;
        E.rotor.style.transform = 'rotate(0deg)';
        E.compass.style.transform = 'none';
      }

      // ===== ダミー位置
      const DUMMY={lat:35.170915, lon:136.881537};
      function applyDummy(){ S.useDummy=true; setCurrentMarker(DUMMY.lat,DUMMY.lon); map.setView([DUMMY.lat,DUMMY.lon],16); setStatus('ダミー位置を使用中') }

      // ===== 現在地
      function getCurrentLocation(){ return new Promise((res,rej)=>{ if(!navigator.geolocation){ rej(new Error('この端末は位置情報に対応していません')); return } navigator.geolocation.getCurrentPosition(p=> res({lat:p.coords.latitude, lon:p.coords.longitude, display_name:'現在地'}), err=> rej(err), {enableHighAccuracy:true, timeout:12000}) }) }

      // ===== ナビ
      function offRouteThreshold(){ return S.setMode==='foot'?30: S.setMode==='bike'?50:100 }
      function rerouteCooldownMs(){ return 8000 }
      function updateProgressLayer(route, snapIdx){
        if(!route) return; const coords=route.geometry.coordinates;
        if(snapIdx<=0) return;
        const seg=coords.slice(0,Math.min(snapIdx+1,coords.length)).map(c=>[c[1],c[0]]);
        if(!S.progressLayer){ S.progressLayer=L.polyline(seg,{color:'#2ecc71',weight:8,opacity:.9}).addTo(map) } else { S.progressLayer.setLatLngs(seg) }
      }

      function startNavigation(){
        if(S.nav) return;
        if(!S.routes.length){ setStatus('先にルートを検索してください',true); return }
        S.nav=true; setStatus('ナビ開始'); E.startNav.disabled=true; E.stopNav.disabled=false;
        // 回転はナビ中のみ
        if(S.rotate){ startRotor() }

        if(!navigator.geolocation){ setStatus('位置情報非対応。ダミーを使用します',true); applyDummy(); return }
        try{
          S.watchId = navigator.geolocation.watchPosition(onNavPos, onNavErr,{enableHighAccuracy:true, maximumAge:1000, timeout:15000})
        }catch(e){ console.warn(e); applyDummy() }
      }
      function stopNavigation(){
        if(!S.nav) return;
        S.nav=false; setStatus('ナビ停止'); E.startNav.disabled=false; E.stopNav.disabled=true;
        try{ if(S.watchId!=null){ navigator.geolocation.clearWatch(S.watchId); S.watchId=null } }catch{}
        stopRotor();
      }
      function onNavErr(err){ console.warn('nav err',err); if(err&&err.code===1){ setStatus('位置情報が許可されていません',true) } }

      function onNavPos(pos){
        const lat=pos.coords.latitude, lon=pos.coords.longitude;
        setCurrentMarker(lat,lon);

        // 中央固定（パンせずセンタリング）
        if(S.follow){ const z=Math.max(15,map.getZoom()); map.setView([lat,lon], Math.min(17,z)) }

        // ナビ中の地図回転：方位が新鮮ならそれに追随、なければ移動ベクトル
        const now=Date.now(); const fresh=(now - S.lastHeadingTs) < 2500;
        if(S.nav && S.rotate){
          if(fresh){ S.targetBearing = S.heading }
          else if(S._prev){
            const dy=lat-S._prev.lat, dx=lon-S._prev.lon;
            if(Math.abs(dy)+Math.abs(dx) > 1e-6){
              const bearing = norm360(Math.atan2(dx,dy)*180/Math.PI);
              S.targetBearing = bearing;
            }
          }
        }
        S._prev={lat,lon};
        if(S.useDummy) return;

        // 進捗＆次案内＆残り
        const route=S.routes[S.selected]; if(!route) return;
        const line=turf.lineString(route.geometry.coordinates);
        const pt=turf.point([lon,lat]);
        const snapped=turf.nearestPointOnLine(line, pt, {units:'meters'});
        const distTo=snapped.properties.dist;
        const snapIdx=snapped.properties.index||0;
        if(snapIdx>S.lastSnapIdx){ S.lastSnapIdx=snapIdx; updateProgressLayer(route,snapIdx) }

        const steps=route.legs[0].steps||[];
        let chosen=null;
        for(let i=0;i<steps.length;i++){
          const st=steps[i]; const loc=st.maneuver&&st.maneuver.location; if(!loc) continue;
          const d=turf.distance(turf.point([lon,lat]), turf.point([loc[0],loc[1]]), {units:'meters'});
          if(d>5){ chosen={index:i, step:st, dist:d}; break }
        }
        if(!chosen && steps.length){ chosen={index:steps.length-1, step:steps[steps.length-1], dist:0} }
        if(chosen){
          const msg=`${formatDist(chosen.dist)} 先、${jpInstruction(chosen.step)}`;
          E.hudNext.textContent=`次の案内 — ${msg}`;
          // 近づいたら一度だけ読み上げ
          if(chosen.dist < 60 && S.lastSpokenStepIdx !== chosen.index){
            speakJa(msg); S.lastSpokenStepIdx = chosen.index;
          }
        }

        const totalDist=route.distance; const totalDur=etaSeconds(route.distance,S.setMode);
        const remLine=turf.lineString(route.geometry.coordinates.slice(snapIdx));
        const remKm=turf.length(remLine,{units:'kilometers'});
        const remM=Math.max(0,Math.round(remKm*1000));
        const remSec = totalDist>0 ? (totalDur*(remM/totalDist)) : 0;
        E.hudRemDist.textContent=formatDist(remM); E.hudRemTime.textContent=formatDuration(remSec);

        // 自動リルート
        const nowMs=Date.now();
        if(distTo>offRouteThreshold() && (nowMs-S.lastRerouteTs)>rerouteCooldownMs()){
          S.lastRerouteTs=nowMs;
          setStatus(`コース外（${Math.round(distTo)}m）。再検索…`);
          const cur={lat,lon}; const dest=S.to;
          if(dest){
            fetchRoutes(cur,dest,S.setMode).then(rs=>{
              if(rs&&rs.length){ drawRoutes(rs); setStatus('自動リルート完了'); if(S.follow) map.setView([lat,lon],16) }
              else { setStatus('リルート失敗',true) }
            })
          }
        }
      }

      // ===== 入力ヘルパ
      async function resolveFromInput(){ const v=(E.from.value||'').trim(); if(!v || v==='現在地' || v==='いま' || v.toLowerCase()==='current'){ return await getCurrentLocation() } const g=await geocode(v); if(!g) throw new Error('出発地が見つかりません'); return g }
      async function resolveToInput(){ const v=(E.to.value||'').trim(); const g=parseLatLon(v) || (v? await geocode(v):null); if(!g) throw new Error('目的地が見つかりません'); return g }

      // ===== UI 配線
      E.swap.addEventListener('click',()=>{ const a=E.from.value; E.from.value=E.to.value; E.to.value=a; const af=S.from; S.from=S.to; S.to=af })
      E.modes.forEach(b=> b.addEventListener('click', async ()=>{ E.modes.forEach(x=>x.classList.remove('active')); b.classList.add('active'); S.setMode=b.dataset.mode; if(S.from&&S.to){ setStatus('モード変更: 再検索…'); const routes=await fetchRoutes(S.from,S.to,S.setMode); if(routes){ drawRoutes(routes); setStatus('モード変更を反映しました') } else { setStatus('モード変更の反映に失敗',true) } } }))
      E.setFromMap.addEventListener('click',()=>{ S.mapClickMode='from'; setStatus('地図をタップして出発地を選んでください') })
      E.setToMap.addEventListener('click',()=>{ S.mapClickMode='to'; setStatus('地図をタップして目的地を選んでください') })
      map.on('click',(e)=>{ if(S.mapClickMode==='from'){ S.from={lat:e.latlng.lat, lon:e.latlng.lng, display_name:`${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`}; E.from.value=S.from.display_name; S.mapClickMode=null; setStatus('出発地を設定しました') } else if(S.mapClickMode==='to'){ S.to={lat:e.latlng.lat, lon:e.latlng.lng, display_name:`${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`}; E.to.value=S.to.display_name; S.mapClickMode=null; setStatus('目的地を設定しました') } })

      E.search.addEventListener('click', async ()=>{
        try{
          setStatus('出発地を解決中...'); const f=await resolveFromInput(); S.from=f;
          setStatus('目的地を解決中...'); const t=await resolveToInput(); S.to=t;
          setStatus('ルート検索中...'); const rs=await fetchRoutes(f,t,S.setMode);
          if(!rs){ setStatus('ルート検索に失敗しました（外部API制限の可能性）', true); return }
          drawRoutes(rs); setStatus('ルート候補を表示しました')
        }catch(e){ setStatus(e.message||'検索に失敗しました', true) }
      })
      E.startNav.addEventListener('click', startNavigation)
      E.stopNav.addEventListener('click', stopNavigation)
      E.chkFollow.addEventListener('change',()=>{ S.follow=E.chkFollow.checked })
      E.chkRotate.addEventListener('change',()=>{ S.rotate=E.chkRotate.checked; if(!S.rotate){ stopRotor() } else if(S.nav){ startRotor() } })
      ;[E.from,E.to].forEach(i=> i.addEventListener('keydown',e=>{ if(e.key==='Enter') E.search.click() }))

      // Sidebar / more トグル
      E.toggleSidebar.addEventListener('click',()=>{ E.sidebar.classList.toggle('hidden') })
      E.toggleMore.addEventListener('click',()=>{ const open = E.more.style.display!=='none' && getComputedStyle(E.more).display!=='none'; if(open){ E.more.style.display='none'; E.toggleMore.setAttribute('aria-expanded','false'); E.toggleMore.textContent='詳細 ▸' } else { E.more.style.display='flex'; E.toggleMore.setAttribute('aria-expanded','true'); E.toggleMore.textContent='詳細 ▾' } })
      qs('#route-steps').addEventListener('click',()=>{ const s=qs('#route-steps'); s.style.display = (s.style.display==='none'?'block':'none') })

      setStatus('初期化完了 — 出発地と目的地を入力して検索してください');

      // ===== Mini self tests（前作のテスト維持＋追加） =====
      ;(function(){
        function eq(name,a,b){ if(a!==b){ console.error('TEST FAIL',name,a,b) } else { console.log('TEST OK',name) } }
        eq('formatDist_500', formatDist(500), '500 m');
        eq('formatDist_1500', formatDist(1500), '1.50 km');
        eq('formatDuration_59m', formatDuration(59*60), '59分');
        eq('formatDuration_2h5m', formatDuration(2*3600+5*60), '2時間5分');
        const d=10000; const f=Math.round(etaSeconds(d,'foot')/60), b=Math.round(etaSeconds(d,'bike')/60), c=Math.round(etaSeconds(d,'driving')/60);
        if(!(f>b && b>c)) console.error('TEST FAIL eta order'); else console.log('TEST OK eta order');
        // 角度系テスト
        const n = norm360(-45); eq('norm360_-45', n, 315);
        const sd1 = shortAngleDiff(350, 10); // +20
        const sd2 = shortAngleDiff(10, 350); // -20
        if(!(sd1===20 && sd2===-20)) console.error('TEST FAIL shortAngleDiff'); else console.log('TEST OK shortAngleDiff');
      })();

      // export
      window._yuikichiYABAI = { state:S }
    })();
  }
  </script>
</body>
</html>
