<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<title>ゆいきちナビ 完全版（フルスク・ステップラベル対応）</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
:root{--accent:#1e90ff;--bg:#f7f9fc;--ink:#111;--header-h:64px;--vh:1vh}
html,body{height:100%;margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,'Noto Sans JP',sans-serif;background:var(--bg);color:var(--ink)}
body{height:calc(var(--vh)*100)}
#app{height:100%;position:relative;overflow:hidden}
header{position:absolute;top:env(safe-area-inset-top);left:env(safe-area-inset-left);right:env(safe-area-inset-right);z-index:2000;display:flex;gap:8px;align-items:center;padding:8px;background:#fff;border-radius:12px;box-shadow:0 6px 22px rgba(0,0,0,0.12);flex-wrap:wrap;max-width:calc(100% - 24px)}
header h1{margin:0;font-size:16px;white-space:nowrap}
.controls{display:flex;gap:8px;align-items:center;flex:1;flex-wrap:wrap}
.controls input{padding:8px;border:1px solid #ddd;border-radius:8px;width:min(260px,38vw)}
.controls button{padding:10px 12px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer}
.controls .mode-btn{padding:7px 10px;border-radius:8px}
.controls .mode-btn.active{background:var(--accent);color:#fff;border-color:var(--accent)}
#map{position:absolute;inset:0}
aside.sidebar{position:absolute;right:12px;top:calc(var(--header-h) + 16px + env(safe-area-inset-top));z-index:1400;background:#fff;padding:12px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.14);width:360px;max-height:70vh;overflow:auto}
.route-item{padding:8px;border-radius:8px;border:1px solid #eee;margin-bottom:6px;cursor:pointer}
.route-item.selected{background:var(--accent);color:#fff;border-color:var(--accent);font-weight:700}
.turn-step{padding:6px;border-bottom:1px dashed #eee}
#status{position:absolute;left:12px;bottom:calc(90px + env(safe-area-inset-bottom));z-index:1500;background:rgba(255,255,255,0.95);padding:8px 10px;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,0.12)}
.small{font-size:12px;color:#666}
.hud{position:absolute;left:12px;top:calc(var(--header-h) + 12px + env(safe-area-inset-top));z-index:1500;background:rgba(255,255,255,0.96);padding:8px 10px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.12);min-width:220px;transform-origin:top left;transform:scale(0.66)}
.hud .row{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
.hud .key{font-size:12px;color:#777}
.hud .val{font-weight:700}
.fullscreen-btn{position:absolute;right:12px;top:calc(var(--header-h) + 12px + env(safe-area-inset-top));z-index:1500;background:var(--accent);color:#fff;border:none;border-radius:10px;padding:10px 12px;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,0.18)}
.compass{position:absolute;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:1500;background:rgba(255,255,255,0.95);padding:8px;border-radius:50%;width:44px;height:44px;display:grid;place-items:center;box-shadow:0 6px 18px rgba(0,0,0,0.12)}
.compass > div{transform-origin:center center}
.rotateable{transition:transform 120ms ease}
.marker-heading{width:22px;height:22px;border-radius:50%;background:#1e90ff;border:2px solid #fff;box-shadow:0 0 0 2px rgba(30,144,255,0.25);position:relative}
.marker-heading::after{content:"";position:absolute;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:10px solid #1e90ff;top:-8px;left:5px;transform-origin:center}
.turn-marker div{pointer-events:auto}
.step-label{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:2px 6px;font-size:12px;box-shadow:0 6px 16px rgba(0,0,0,0.12);white-space:nowrap}
.step-label .ico{margin-right:4px}
@media(max-width:820px){
  header{left:8px;right:8px}
  aside.sidebar{position:static;left:0;right:0;top:auto;bottom:0;width:100%;max-height:38vh;border-radius:12px 12px 0 0}
  .hud{top:auto;bottom:calc(120px + env(safe-area-inset-bottom))}
}
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
<button id="start-nav" class="primary">ナビ開始</button>
<button id="stop-nav" disabled>ナビ停止</button>
</div>
</header>
<div id="map" aria-label="地図">地図を読み込み中…</div>
<div class="hud" aria-live="polite">
<div class="row"><span class="key">合計距離</span><span class="val" id="hud-total-dist">—</span><span class="key">合計時間</span><span class="val" id="hud-total-time">—</span></div>
<div class="row"><span class="key">残り距離</span><span class="val" id="hud-rem-dist">—</span><span class="key">到着まで</span><span class="val" id="hud-rem-time">—</span></div>
<div class="row small" id="hud-next">次の案内 — —</div>
<label class="small"><input type="checkbox" id="chk-follow" checked> 追尾</label>
<label class="small" style="margin-left:5px"><input type="checkbox" id="chk-rotate" checked> コンパス回転</label>
</div>
<aside class="sidebar" aria-live="polite">
<div style="font-weight:700;margin-bottom:6px">ルート候補</div>
<div id="route-list" class="route-list small">— 検索して下さい —</div>
<div style="font-weight:700;margin-top:8px">ルート詳細</div>
<div id="turns" style="margin-top:6px">— ルートを選択してください —</div>
</aside>
<button class="fullscreen-btn" id="btn-fs">⛶ 全画面</button>
<div class="compass"><div id="compass-needle">🧭</div></div>
<div id="status">状態: 初期化中</div>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js"></script>
<script>
// ====== 可変100vh ======
function setVhVar(){ const vh=window.innerHeight*0.01; document.documentElement.style.setProperty('--vh', vh+'px'); }
setVhVar(); window.addEventListener('resize', setVhVar); window.addEventListener('orientationchange', setVhVar);

// ====== アプリ状態 ======
if(window._ykNavV7){console.warn('初期化済み');}else{window._ykNavV7=true;(function(){
const app={state:{map:null,markers:{},routes:[],routeLayers:[],stepLayer:null,progressLayer:null,selected:-1,nav:false,watchId:null,heading:0,lastSnapIdx:0,setMode:'driving',mapClickMode:null,follow:true,rotate:true}};
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

// ====== 日本語ターン指示 ======
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
function initMap(){ if(app.state.map) return app.state.map;
const map=L.map('map',{center:[35.681236,139.767125],zoom:5});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19, attribution:'© OpenStreetMap contributors'}).addTo(map);
app.state.map=map;
map.on('click',e=>{
if(app.state.mapClickMode==='from'){ setFrom({lat:e.latlng.lat, lon:e.latlng.lng, display_name:`${e.latlng.lat.toFixed(5)},${e.latlng.lng.toFixed(5)}`}); app.state.mapClickMode=null; setStatus('出発地設定完了'); }
else if(app.state.mapClickMode==='to'){ setTo({lat:e.latlng.lat, lon:e.latlng.lng, display_name:`${e.latlng.lat.toFixed(5)},${e.latlng.lng.toFixed(5)}`}); app.state.mapClickMode=null; setStatus('目的地設定完了'); }
});
return map;}
const map = initMap();

function ensureMarker(name){ if(app.state.markers[name]) return app.state.markers[name]; const m=L.marker(map.getCenter()).addTo(map); app.state.markers[name]=m; return m; }
function setFrom(loc){ app.state.from=loc; els.from.value=loc.display_name||`${loc.lat.toFixed(5)},${loc.lon.toFixed(5)}`; const m=ensureMarker('from'); m.setLatLng([loc.lat,loc.lon]).bindPopup('出発').openPopup(); }
function setTo(loc){ app.state.to=loc; els.to.value=loc.display_name||`${loc.lat.toFixed(5)},${loc.lon.toFixed(5)}`; const m=ensureMarker('to'); m.setLatLng([loc.lat,loc.lon]).bindPopup('目的地').openPopup(); }
function setCurrentMarker(lat,lon,bearing){ const html=`<div class="marker-heading rotateable" style="position:relative;"></div>`; if(!app.state.markers.cur){ app.state.markers.cur=L.marker([lat,lon],{title:'現在地', icon:L.divIcon({html,className:'',iconSize:[22,22]})}).addTo(map); } app.state.markers.cur.setLatLng([lat,lon]); try{ const el=app.state.markers.cur.getElement().querySelector('.rotateable'); if(el) el.style.transform=`rotate(${bearing||0}deg)`;}catch(e){} }

function parseLatLon(q){ if(!q) return null; const m=q.trim().match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/); if(m) return {lat:parseFloat(m[1]), lon:parseFloat(m[2]), display_name:`${parseFloat(m[1]).toFixed(5)},${parseFloat(m[2]).toFixed(5)}`}; return null; }
async function geocode(q){ const parsed=parseLatLon(q); if(parsed) return parsed; const url='https://nominatim.openstreetmap.org/search?format=json&limit=5&q='+encodeURIComponent(q); const res=await fetch(url); const data=await res.json(); if(data?.length>0){ return {lat:parseFloat(data[0].lat), lon:parseFloat(data[0].lon), display_name:data[0].display_name};} return null;}

// ====== モード切替 ======
els.modes.querySelectorAll('.mode-btn').forEach(b=>{ b.addEventListener('click',()=>{els.modes.querySelectorAll('.mode-btn').forEach(bb=>bb.classList.remove('active')); b.classList.add('active'); app.state.setMode=b.dataset.mode; }); });

// ====== 入れ替え ======
els.swap.addEventListener('click',()=>{ const f=els.from.value,t=els.to.value; els.from.value=t; els.to.value=f; const tmp=app.state.from; app.state.from=app.state.to; app.state.to=tmp; if(app.state.markers.from && app.state.markers.to){ const fl=app.state.markers.from.getLatLng(); const tl=app.state.markers.to.getLatLng(); app.state.markers.from.setLatLng(tl); app.state.markers.to.setLatLng(fl); } });

// ====== 現在地取得 ======
async function useCurrentAsFrom(){ if(!navigator.geolocation){ alert('GPS非対応'); return;} navigator.geolocation.getCurrentPosition(p=>{ setFrom({lat:p.coords.latitude, lon:p.coords.longitude, display_name:'現在地'}); map.setView([p.coords.latitude,p.coords.longitude],15); }); }
els.useCur.addEventListener('click',useCurrentAsFrom);

// ====== 地図クリックでセット ======
els.setFromMap.addEventListener('click',()=>{ app.state.mapClickMode='from'; setStatus('地図をクリックして出発地を選択'); });
els.setToMap.addEventListener('click',()=>{ app.state.mapClickMode='to'; setStatus('地図をクリックして目的地を選択'); });

// ====== ルート検索 ======
async function searchRoutes(){ setStatus('ルート検索中'); els.routeList.innerHTML='検索中…'; if(!app.state.from || !app.state.to){ setStatus('出発地・目的地を指定してください',true); return;}
const modes={'driving':'car','foot':'foot','bike':'bike'}; const mode=app.state.setMode;
const url=`https://router.project-osrm.org/route/v1/${mode}/${app.state.from.lon},${app.state.from.lat};${app.state.to.lon},${app.state.to.lat}?overview=full&geometries=geojson&steps=true&alternatives=true&annotations=true`; try{ const res=await fetch(url); const data=await res.json(); if(data.code!=='Ok'){ setStatus('ルート取得失敗',true); return;} const routes=data.routes; app.state.routes=routes; drawRoutes(); }catch(e){console.error(e); setStatus('ルート取得エラー',true);}}

// ====== ルート描画 ======
function drawRoutes(){ clearRoutes(); els.routeList.innerHTML=''; app.state.routes.forEach((r,i)=>{
const color=i===0?'#1e90ff':'#888'; const poly=L.geoJSON(r.geometry,{color,weight:5,opacity:0.7}).addTo(map); poly.on('click',()=>selectRoute(i)); app.state.routeLayers.push(poly);
const div=document.createElement('div'); div.className='route-item'+(i===0?' selected':''); div.textContent=`候補 ${i+1} (${formatDist(r.distance)}, ${formatDuration(r.duration)})`; div.addEventListener('click',()=>selectRoute(i)); els.routeList.appendChild(div);
});
selectRoute(0); setStatus('ルート候補表示完了'); }

function clearRoutes(){app.state.routeLayers.forEach(l=>map.removeLayer(l)); app.state.routeLayers=[]; if(app.state.stepLayer){map.removeLayer(app.state.stepLayer); app.state.stepLayer=null;}}

// ====== ルート選択 ======
function selectRoute(idx){ app.state.selected=idx; els.routeList.querySelectorAll('.route-item').forEach((d,i)=>d.classList.toggle('selected',i===idx));
if(app.state.stepLayer){map.removeLayer(app.state.stepLayer); app.state.stepLayer=null;}
const r=app.state.routes[idx]; if(!r) return;
const steps=[]; r.legs.forEach(leg=>leg.steps.forEach(st=>steps.push(st)));
const stepGroup=L.layerGroup().addTo(map); steps.forEach((st,j)=>{
const co=st.geometry.coordinates[st.geometry.coordinates.length-1]; const label=L.marker([co[1],co[0]],{icon:L.divIcon({className:'turn-marker',html:`<div class="step-label"><span class="ico">${stepIcon(st)}</span>${jpInstruction(st)}</div>`})}).addTo(stepGroup);
}); app.state.stepLayer=stepGroup;
// HUD
els.hudTotalDist.textContent=formatDist(r.distance); els.hudTotalTime.textContent=formatDuration(r.duration);
els.turns.innerHTML=''; steps.forEach((st,j)=>{ const d=document.createElement('div'); d.className='turn-step'; d.innerHTML=`${j+1}. ${jpInstruction(st)} (${formatDist(st.distance)}, ${formatDuration(st.duration)})`; els.turns.appendChild(d);});
map.fitBounds(L.geoJSON(r.geometry).getBounds().pad(0.1));
}

// ====== ナビ開始 ======
function startNav(){ if(app.state.nav) return; if(app.state.selected===-1){ alert('ルート選択してください'); return;} app.state.nav=true; els.startNav.disabled=true; els.stopNav.disabled=false; setStatus('ナビ開始'); watchPosition(); }
function stopNav(){ app.state.nav=false; els.startNav.disabled=false; els.stopNav.disabled=true; if(app.state.watchId){ navigator.geolocation.clearWatch(app.state.watchId); app.state.watchId=null;} setStatus('ナビ停止'); }
els.startNav.addEventListener('click',startNav); els.stopNav.addEventListener('click',stopNav);

// ====== 現在地ウォッチ ======
function watchPosition(){ if(!navigator.geolocation){ alert('GPS非対応'); return;} app.state.watchId=navigator.geolocation.watchPosition(pos=>{
const lat=pos.coords.latitude, lon=pos.coords.longitude, bearing=app.state.heading||0; setCurrentMarker(lat,lon,bearing); updateHudNav(lat,lon); },err=>{console.warn(err); setStatus('GPS取得失敗',true);},{enableHighAccuracy:true,maximumAge:5000,timeout:5000});}

// ====== HUD更新 ======
function updateHudNav(lat,lon){ if(app.state.selected===-1) return; const r=app.state.routes[app.state.selected]; const steps=[]; r.legs.forEach(leg=>leg.steps.forEach(st=>steps.push(st)));
let closest=null,closestIdx=0,closestDist=9999999;
steps.forEach((st,i)=>{
const line=turf.lineString(st.geometry.coordinates); const pt=turf.point([lon,lat]); const d=turf.pointToLineDistance(pt,line,{units:'meters'}); if(d<closestDist){ closest=d; closestIdx=i; }});
const remDist=steps.slice(closestIdx).reduce((a,s)=>a+s.distance,0); const remTime=steps.slice(closestIdx).reduce((a,s)=>a+s.duration,0); els.hudRemDist.textContent=formatDist(remDist); els.hudRemTime.textContent=formatDuration(remTime); els.hudNext.textContent=`次の案内: ${jpInstruction(steps[closestIdx])}`;
if(app.state.follow) map.setView([lat,lon]);}

// ====== HUD追尾／回転 ======
els.chkFollow.addEventListener('change',()=>app.state.follow=els.chkFollow.checked);
els.chkRotate.addEventListener('change',()=>app.state.rotate=els.chkRotate.checked);

// ====== コンパス ======
if(window.DeviceOrientationEvent){ window.addEventListener('deviceorientationabsolute',e=>{ const alpha=e.alpha||0; app.state.heading=alpha; if(app.state.rotate){ els.compass.style.transform=`rotate(${360-alpha}deg)`; const m=app.state.markers.cur; if(m && m.getElement()) { m.getElement().querySelector('.rotateable').style.transform=`rotate(${alpha}deg)`; } } },true);}

// ====== ルート検索ボタン ======
els.search.addEventListener('click',searchRoutes);

// ====== 全画面切替 ======
els.btnFs.addEventListener('click',()=>{ if(!document.fullscreenElement){ document.documentElement.requestFullscreen(); document.body.classList.add('fullscreen'); }else{ document.exitFullscreen(); document.body.classList.remove('fullscreen'); }});

})();}

</script>
</body>
</html>
