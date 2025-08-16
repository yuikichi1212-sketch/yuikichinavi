<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<title>ゆいきちナビ（完全版・フルスク対応）</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
:root{--accent:#1e90ff;--bg:#f7f9fc;--ink:#111;--header-h:64px;--vh:1vh}
html,body{height:100%;margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,'Noto Sans JP',sans-serif;background:var(--bg);color:var(--ink);}
body{height:100%;}
#app{height:100%;position:relative;overflow:hidden}
header{position:absolute;top:env(safe-area-inset-top);left:env(safe-area-inset-left);right:env(safe-area-inset-right);z-index:2000;display:flex;gap:8px;align-items:center;padding:8px;background:#fff;border-radius:12px;box-shadow:0 6px 22px rgba(0,0,0,0.12);flex-wrap:wrap;max-width:calc(100% - 24px)}
header h1{margin:0;font-size:16px;white-space:nowrap}
.controls{display:flex;gap:8px;align-items:center;flex:1;flex-wrap:wrap}
.controls input{padding:8px;border:1px solid #ddd;border-radius:8px;width:min(260px,38vw)}
.controls button{padding:10px 12px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer}
.controls .mode-btn{padding:7px 10px;border-radius:8px}
.controls .mode-btn.active{background:var(--accent);color:#fff;border-color:var(--accent)}
#map{position:absolute;top:calc(var(--header-h) + 8px + env(safe-area-inset-top));bottom:0;left:0;right:0;}
body.fullscreen #map{top:0;}
aside.sidebar{position:absolute;right:12px;top:calc(var(--header-h) + 16px + env(safe-area-inset-top));z-index:1400;background:#fff;padding:12px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.14);width:360px;max-height:70vh;overflow:auto}
.route-item{padding:8px;border-radius:8px;border:1px solid #eee;margin-bottom:6px;cursor:pointer}
.route-item.selected{background:var(--accent);color:#fff;border-color:var(--accent);font-weight:700}
.turn-step{padding:6px;border-bottom:1px dashed #eee}
#status{position:absolute;left:12px;bottom:calc(90px + env(safe-area-inset-bottom));z-index:1500;background:rgba(255,255,255,0.95);padding:8px 10px;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,0.12)}
.small{font-size:12px;color:#666}
.hud{position:absolute;left:12px;top:calc(var(--header-h) + 12px + env(safe-area-inset-top));z-index:1500;background:rgba(255,255,255,0.96);padding:8px 10px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.12);min-width:220px;}
.hud .row{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
.hud .key{font-size:12px;color:#777}
.hud .val{font-weight:700}
.fullscreen-btn{position:absolute;right:12px;top:calc(var(--header-h) + 12px + env(safe-area-inset-top));z-index:1500;background:var(--accent);color:#fff;border:none;border-radius:10px;padding:10px 12px;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,0.18)}
.compass{position:absolute;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:1500;background:rgba(255,255,255,0.95);padding:8px;border-radius:50%;width:44px;height:44px;display:grid;place-items:center;box-shadow:0 6px 18px rgba(0,0,0,0.12)}
.compass > div{transform-origin:center center}
.rotateable{transition:transform 120ms ease}
.marker-heading{width:22px;height:22px;border-radius:50%;background:#1e90ff;border:2px solid #fff;box-shadow:0 0 0 2px rgba(30,144,255,0.25);position:relative;}
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
  <input id="from" placeholder="出発地" />
  <input id="to" placeholder="目的地" />
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
<div id="map">地図読み込み中…</div>
<div class="hud">
  <div class="row"><span class="key">合計距離</span><span class="val" id="hud-total-dist">—</span><span class="key">合計時間</span><span class="val" id="hud-total-time">—</span></div>
  <div class="row"><span class="key">残り距離</span><span class="val" id="hud-rem-dist">—</span><span class="key">到着まで</span><span class="val" id="hud-rem-time">—</span></div>
  <div class="row small" id="hud-next">次の案内 — —</div>
  <label class="small"><input type="checkbox" id="chk-follow" checked> 追尾</label>
  <label class="small" style="margin-left:5px"><input type="checkbox" id="chk-rotate" checked> コンパス回転</label>
</div>
<aside class="sidebar">
  <div style="font-weight:700;margin-bottom:6px">ルート候補</div>
  <div id="route-list" class="route-list small">— 検索して下さい —</div>
  <div style="font-weight:700;margin-top:8px">ルート詳細</div>
  <div id="turns" style="margin-top:6px">— ルートを選択してください —</div>
</aside>
<button class="fullscreen-btn" id="btn-fs">⛶ 全画面</button>
<div class="compass"><div id="compass-needle">🧭</div></div>
<div id="status">状態: 初期化中</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js"></script>
<script>
function setVhVar(){ const vh=window.innerHeight*0.01; document.documentElement.style.setProperty('--vh', vh+'px'); }
setVhVar(); window.addEventListener('resize', setVhVar); window.addEventListener('orientationchange', setVhVar);

if(window._ykNavV7){console.warn('初期化済み');}else{window._ykNavV7=true;(function(){
const app={state:{map:null,markers:{},routes:[],routeLayers:[],progressLayer:null,selected:-1,nav:false,watchId:null,heading:0,lastHeadingTs:0,setMode:'driving',mapClickMode:null,useDummy:false,lastSnapIdx:0,stepLayer:null,follow:true,rotate:true}};
const els={from:document.getElementById('from'),to:document.getElementById('to'),swap:document.getElementById('swap'),modes:document.getElementById('modes'),search:document.getElementById('search'),setFromMap:document.getElementById('set-from-map'),setToMap:document.getElementById('set-to-map'),routeList:document.getElementById('route-list'),turns:document.getElementById('turns'),status:document.getElementById('status'),startNav:document.getElementById('start-nav'),stopNav:document.getElementById('stop-nav'),hudTotalDist:document.getElementById('hud-total-dist'),hudTotalTime:document.getElementById('hud-total-time'),hudRemDist:document.getElementById('hud-rem-dist'),hudRemTime:document.getElementById('hud-rem-time'),hudNext:document.getElementById('hud-next'),chkFollow:document.getElementById('chk-follow'),chkRotate:document.getElementById('chk-rotate'),compass:document.getElementById('compass-needle'),useCur:document.getElementById('use-cur'),btnFs:document.getElementById('btn-fs')};

// 地図初期化
app.state.map=L.map('map',{zoomControl:true}).setView([35.681236,139.767125],16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors'}).addTo(app.state.map);

els.btnFs.addEventListener('click',()=>{document.body.classList.toggle('fullscreen'); setTimeout(()=>app.state.map.invalidateSize(),200);});
els.chkFollow.addEventListener('change',e=>{app.state.follow=e.target.checked});
els.chkRotate.addEventListener('change',e=>{app.state.rotate=e.target.checked});

// 地図クリック設定
app.state.map.on('click',e=>{ if(app.state.mapClickMode==='from'){els.from.value=`${e.latlng.lat.toFixed(6)},${e.latlng.lng.toFixed(6)}`; app.state.mapClickMode=null;} else if(app.state.mapClickMode==='to'){els.to.value=`${e.latlng.lat.toFixed(6)},${e.latlng.lng.toFixed(6)}`; app.state.mapClickMode=null;}});
els.setFromMap.addEventListener('click',()=>{app.state.mapClickMode='from'});
els.setToMap.addEventListener('click',()=>{app.state.mapClickMode='to'});

// モード切替
els.modes.querySelectorAll('.mode-btn').forEach(btn=>btn.addEventListener('click',()=>{
 els.modes.querySelectorAll('.mode-btn').forEach(b=>b.classList.remove('active'));
 btn.classList.add('active');
 app.state.setMode=btn.dataset.mode;
}));

// ルート途中マーカー
function addStepMarker(latlng,label){
 return L.marker(latlng,{icon:L.divIcon({className:'step-label',html:`<span class='ico'>📍</span>${label}`})}).addTo(app.state.map);
}

})();
</script>
</div>
</body>
</html>
