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
