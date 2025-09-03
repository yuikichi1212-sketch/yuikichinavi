<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <title>ゆいきちナビ — 名古屋 完全統合版（徒歩＋地下鉄＋ナビ）</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    :root{--accent:#1e90ff;--bg:#f7f9fc;--ink:#111;--card:#fff;--muted:#6b7280;--ok:#2ecc71;--warn:#ff9800;--danger:#e53935;--walk:#1e90ff;--higashiyama:#f1c40f;--meijo:#8e44ad;--meiko:#e67e22;--tsurumai:#00bcd4;--sakura:#e74c3c;--kamiiida:#795548}
    html,body{height:100%;margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,-apple-system,Segoe UI,Roboto,"Noto Sans JP",sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
    #app{height:100%;display:flex;flex-direction:column}

    header.toolbar{background:var(--card);box-shadow:0 1px 8px rgba(0,0,0,.06);padding:8px;position:relative;z-index:1000}
    .bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .brand{font-weight:800;margin-right:6px}
    .ipt{padding:10px 12px;border:1px solid #e4e8ee;border-radius:12px;min-width:220px;flex:1 1 260px;background:#fff}
    .btn{padding:10px 12px;border:1px solid #dfe3ea;border-radius:12px;background:#fff;cursor:pointer;user-select:none}
    .btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
    .mode-btn{padding:6px 10px;border-radius:10px;border:1px solid #dfe3ea;background:#fff;cursor:pointer}
    .mode-btn.active{background:var(--accent);color:#fff;border-color:var(--accent)}

    #main{position:relative;flex:1;min-height:460px}
    #map{position:absolute;inset:0;overflow:hidden;background:#eaeaea}

    .sidebar{position:absolute;right:12px;top:12px;z-index:1400;background:#fff;padding:10px;border-radius:14px;box-shadow:0 12px 30px rgba(0,0,0,0.12);width:380px;max-height:78vh;overflow:auto}
    .sidebar .title{font-weight:800;margin:4px 0}
    .seg{border-left:4px solid #ddd;padding:6px 8px;margin:6px 0}
    .seg.walk{border-color:var(--walk)}
    .seg.subway{border-color:#6c5ce7}
    .badge{display:inline-block;border-radius:999px;padding:2px 8px;font-size:12px;background:#f3f4f6;margin-right:6px}

    .hud{position:absolute;left:12px;bottom:12px;z-index:1500;background:rgba(255,255,255,0.94);padding:8px;border-radius:10px;box-shadow:0 8px 20px rgba(0,0,0,.12);max-width:70vw}
    .compass{position:absolute;right:12px;bottom:12px;z-index:1500;background:rgba(255,255,255,0.95);padding:6px;border-radius:50%;width:40px;height:40px;display:grid;place-items:center;box-shadow:0 6px 18px rgba(0,0,0,0.12)}
    #status{position:absolute;left:12px;top:12px;z-index:1500;background:rgba(255,255,255,0.95);padding:6px 8px;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,0.12);font-size:12px}

    #route-steps{position:absolute;left:0;right:0;bottom:0;z-index:1401;background:rgba(255,255,255,0.96);border-top:1px solid #eee;max-height:42%;overflow:auto;padding:10px;display:none}
    #route-steps .drag{font-size:12px;color:#666;text-align:center;margin-bottom:4px}

    .marker-heading{position:relative;width:22px;height:22px;border-radius:50%;background:#1e90ff;border:2px solid #fff;box-shadow:0 0 0 2px rgba(30,144,255,.25);transform-origin:center center;will-change:transform}
    .marker-heading::after{content:"";position:absolute;left:5px;top:-8px;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:10px solid #1e90ff;transform-origin:center}

    @media(max-width:900px){.sidebar{width:min(92vw,420px);top:auto;bottom:12px;max-height:60vh}}
  </style>
</head>
<body>
  <div id="app">
    <header class="toolbar">
      <div class="bar">
        <div class="brand">ゆいきちナビ — 名古屋 完全統合</div>
        <input id="to" class="ipt" placeholder="目的地（住所 / 名称 / 地図クリック可）" />
        <button id="set-to-map" class="btn">地図で目的地</button>
        <button id="search" class="btn primary">検索</button>
        <button id="start-nav" class="btn">ナビ開始</button>
        <button id="stop-nav" class="btn" disabled>停止</button>
        <span class="divider"></span>
        <div class="muted">移動モード:</div>
        <button class="mode-btn active" data-mode="transit" id="m-transit">公共交通</button>
        <button class="mode-btn" data-mode="driving" id="m-driv">車</button>
        <button class="mode-btn" data-mode="foot" id="m-foot">徒歩</button>
        <button class="mode-btn" data-mode="bike" id="m-bike">自転車</button>
      </div>
    </header>

    <div id="main">
      <div id="map" aria-label="地図">地図を読み込み中…</div>

      <aside class="sidebar" id="sidebar" aria-live="polite">
        <div class="title">ルート / 行程</div>
        <div id="itinerary" class="muted">— 目的地を指定して検索してください —</div>
        <div style="margin-top:8px"> 
          <div><strong>HUD</strong></div>
          <div id="hud-total-dist">合計距離 —</div>
          <div id="hud-total-time">合計時間 —</div>
          <div id="hud-next">次の案内 —</div>
        </div>
      </aside>

      <div class="hud" id="hud">
        <div style="font-size:12px"><span id="hud-sum">—</span></div>
        <div style="font-size:11px;color:#666" id="hud-detail">—</div>
      </div>
      <div class="compass"><div id="compass-needle">🧭</div></div>
      <div id="status">状態: 初期化中</div>

      <div id="route-steps">
        <div class="drag">▼ ルート案内（タップで閉じる）</div>
        <div id="route-steps-body"></div>
      </div>
    </div>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js"></script>

  <script>
  // =====================================================================
  // 統合版：ナビ（音声・HUD・コンパス） + 名古屋市営地下鉄乗換（徒歩+地下鉄+徒歩）
  // できるだけ前の機能を保持しつつ、公共交通モードを実装。
  // 注意：公共交通は時刻表を参照せず、固定路線グラフとOSRMの徒歩で計算します。
  // =====================================================================

  // ------------------ 基本設定 ------------------
  const CFG = { SPEAK_NEXT_AT_METERS:60, SPEED_KMH:{foot:4.8,bike:16,driving:42}, SMOOTH_ALPHA:0.10, ROTATE_ONLY_WHEN_NAV:true, FOLLOW_MIN_ZOOM:15, FOLLOW_MAX_ZOOM:17 };

  // ------------------ 状態 ------------------
  const S = { map:null, curMarker:null, nav:false, watchId:null, follow:true, rotate:true, headingView:0, lastHeadingTs:0, routes:[], selected: -1, layers:{}, stationNodes:new Map(), subwayLines:null, currentRouteSteps:[], currentMode:'transit', dest:null, currentPos:null };

  // ------------------ DOM ------------------
  const E = { to:qs('#to'), setToMap:qs('#set-to-map'), search:qs('#search'), startNav:qs('#start-nav'), stopNav:qs('#stop-nav'), hudSum:qs('#hud-sum'), hudDetail:qs('#hud-detail'), hudNext:qs('#hud-next'), itinerary:qs('#itinerary'), routeSteps:qs('#route-steps'), routeStepsBody:qs('#route-steps-body'), status:qs('#status'), compass:qs('#compass-needle') };

  function qs(s){return document.querySelector(s)}
  function setStatus(msg,isErr){E.status.textContent='状態: '+msg; E.status.style.color=isErr? 'red':'#111'; console.log('[YK]',msg)}

  // ------------------ 地図初期化 ------------------
  const map = L.map('map',{center:[35.1709,136.8815],zoom:13});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
  S.map = map; S.mapPane = map.getPane('mapPane');

  // ------------------ マーカー ------------------
  function ensureCurMarker(lat,lon){ const html='<div class="marker-heading"></div>'; if(!S.curMarker){ S.curMarker=L.marker([lat,lon],{icon:L.divIcon({html,className:'',iconSize:[22,22]}),title:'現在地'}).addTo(map);} S.curMarker.setLatLng([lat,lon]); }
  function rotateMarkerScreen(deg){ try{ const el=S.curMarker && S.curMarker.getElement() && S.curMarker.getElement().querySelector('.marker-heading'); if(el){ el.style.transform=`rotate(${deg}deg)`;} }catch(e){} }

  // ------------------ 音声 ------------------
  function speakJa(t){ if(!window.speechSynthesis) return; try{ const u=new SpeechSynthesisUtterance(t); u.lang='ja-JP'; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);}catch(e){} }

  // ------------------ 方向センサー ------------------
  function norm360(d){ if(typeof d!=='number'||Number.isNaN(d)) return 0; return (d%360+360)%360 }
  function shortestAngleDiff(a,b){ let d=(b-a+540)%360-180; return d }
  function easeAngleToward(current,target,alpha){ const d=shortestAngleDiff(current,target); return norm360(current + d*alpha) }
  function updateHeadingFromSensor(deg){ let d=norm360(deg); S.headingView=easeAngleToward(S.headingView,d,CFG.SMOOTH_ALPHA); S.lastHeadingTs=Date.now(); try{ E.compass.style.transform=`rotate(${S.headingView}deg)` }catch(e){} }
  function initOrientation(){ if(window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission==='function'){ document.body.addEventListener('click', function once(){ DeviceOrientationEvent.requestPermission().then(st=>{ if(st==='granted'){ window.addEventListener('deviceorientation', generic,{passive:true}); window.addEventListener('deviceorientationabsolute', generic,{passive:true}); } }).catch(()=>{}); document.body.removeEventListener('click', once); },{once:true}); } else if(window.DeviceOrientationEvent){ window.addEventListener('deviceorientationabsolute', generic,{passive:true}); window.addEventListener('deviceorientation', generic,{passive:true}); }
    function generic(e){ const wh=(typeof e.webkitCompassHeading==='number'? e.webkitCompassHeading : null); if(wh!=null && !Number.isNaN(wh)){ updateHeadingFromSensor(wh); } else if(typeof e.alpha==='number' && !Number.isNaN(e.alpha)){ const screenAngle=(screen.orientation && typeof screen.orientation.angle==='number')? screen.orientation.angle : (typeof window.orientation==='number'?window.orientation:0); const base=norm360(360 - e.alpha + screenAngle); updateHeadingFromSensor(base); } }
  }
  initOrientation();

  // ------------------ 名古屋路線データ（前出） ------------------
  const LINES = { '東山線': ["高畑","八田","岩塚","中村公園","中村日赤","本陣","亀島","名古屋","伏見","栄","新栄町","千種","今池","池下","覚王山","本山","東山公園","星ヶ丘","一社","上社","本郷","藤が丘"], '名城線': ["大曽根","平安通","志賀本通","黒川","名城公園","市役所","久屋大通","栄","矢場町","上前津","東別院","金山","新瑞橋","八事","名古屋大学","本山","自由ヶ丘","茶屋ヶ坂","砂田橋","ナゴヤドーム前矢田","大曽根"], '名港線': ["金山","東別院","上前津","六番町","日比野","名古屋港"], '鶴舞線': ["上小田井","庄内緑地公園","庄内通","浄心","浅間町","丸の内","伏見","大須観音","上前津","鶴舞","荒畑","御器所","川名","いりなか","八事","塩釜口","植田","原","平針","赤池"], '桜通線': ["中村区役所","名古屋","国際センター","丸の内","久屋大通","高岳","車道","今池","吹上","御器所","桜山","瑞穂区役所","新瑞橋","桜本町","鶴里","野並","鳴子北","相生山","神沢","徳重"], '上飯田線': ["平安通","上飯田"] };

  // ------------------ 駅データ取得（Overpass） ------------------
  async function loadStations(){ const bbox='34.8,136.75,35.4,137.2'; const q="[out:json][timeout:25];(node[\"railway\"~\"station|halt\"][\"station\"=\"subway\"]("+bbox+");node[\"railway\"=\"subway_entrance\"]("+bbox+"););out body;"; try{ const res=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:q,headers:{'Content-Type':'text/plain'}}); const j=await res.json(); for(const el of j.elements||[]){ const name=el.tags && (el.tags.name || el.tags['name:ja']); if(!name) continue; const lat=el.lat, lon=el.lon; if(S.stationNodes.has(name)){ const cur=S.stationNodes.get(name); S.stationNodes.set(name,{lat:(cur.lat+lat)/2, lng:(cur.lng+lon)/2}); } else S.stationNodes.set(name,{lat, lng}); }
    for(const [name,pt] of S.stationNodes){ const m=L.circleMarker([pt.lat,pt.lng],{radius:4,weight:1,opacity:.5,color:'#555',fillOpacity:.35}); m.bindTooltip(name); m.addTo(map); }
    setStatus('駅データ読み込み完了'); }catch(e){ console.warn('overpass fail',e); setStatus('駅データ読み込み失敗（繰り返し試行してください）',true);} }
  loadStations();

  // ------------------ ヘルパー ------------------
  function findNearestStation(pt){ let best=null,bestD=Infinity; const p=turf.point([pt.lng,pt.lat]); const allowed=new Set(Object.values(LINES).flat()); for(const [name,coord] of S.stationNodes){ if(!allowed.has(name)) continue; const d=turf.distance(p,turf.point([coord.lng,coord.lat]),{units:'kilometers'}); if(d<bestD){ bestD=d; best={name,lat:coord.lat,lng:coord.lng}; } } return best; }

  function buildGraph(){ const adj=new Map(); const push=(a,b,line)=>{ if(!adj.has(a)) adj.set(a,[]); adj.get(a).push({to:b,line}); } for(const [line,arr] of Object.entries(LINES)){ for(let i=0;i<arr.length-1;i++){ const a=arr[i], b=arr[i+1]; push(a,b,line); push(b,a,line); } if(line==='名城線' && arr[0]!==arr[arr.length-1]){ push(arr[0],arr[arr.length-1],line); push(arr[arr.length-1],arr[0],line); } } return adj; }

  function findSubwayRoute(fromName,toName,maxTransfers=3){ const adj=buildGraph(); const q=[]; const seen=new Map(); const starts=(adj.get(fromName)||[]).map(e=>e.line); const uniqStarts=Array.from(new Set(starts.length?starts:['*'])); for(const ln of uniqStarts){ const key=fromName+'|'+ln; seen.set(key,{transfers:0,stops:0,prev:null,prevLine:ln}); q.push({name:fromName,line:ln,transfers:0,stops:0}); } while(q.length){ const cur=q.shift(); if(cur.name===toName) return reconstruct(fromName,cur.name,cur.line,seen); for(const e of (adj.get(cur.name)||[])){ const nextLine=e.line; const willTransfer=(cur.line!=='*' && nextLine!==cur.line)?1:0; const nt=cur.transfers+willTransfer; if(nt>maxTransfers) continue; const ns=cur.stops+1; const key=e.to+'|'+nextLine; const prev=seen.get(key); if(!prev || (nt<prev.transfers) || (nt===prev.transfers && ns<prev.stops)){ seen.set(key,{transfers:nt,stops:ns,prev:cur.name+'|'+cur.line,prevLine:nextLine}); q.push({name:e.to,line:nextLine,transfers:nt,stops:ns}); } } } return null; }
  function reconstruct(start,end,endLine,seen){ const path=[]; let key=end+'|'+endLine; let lastLine=endLine; while(key){ const [name,line]=key.split('|'); path.push({name,line:lastLine}); const rec=seen.get(key); if(!rec) break; key=rec.prev; lastLine=rec.prevLine; if(name===start) break; } path.reverse(); const segments=[]; let cur=null; for(const p of path){ if(!cur) cur={line:p.line,stops:[p.name]}; else if(p.line===cur.line){ cur.stops.push(p.name); } else { segments.push(cur); cur={line:p.line,stops:[p.name]}; } } if(cur) segments.push(cur); return {segments}; }

  // ------------------ OSRM 徒歩 ------------------
  async function fetchFootRoute(a,b){ const url=`https://router.project-osrm.org/route/v1/foot/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson&steps=true&alternatives=false`; const res=await fetch(url); if(!res.ok) throw new Error('OSRMエラー'); const j=await res.json(); if(j.code!=='Ok' || !j.routes||!j.routes[0]) throw new Error('徒歩ルートなし'); const r=j.routes[0]; return {coords:r.geometry.coordinates.map(c=>[c[1],c[0]]),dist:r.distance,dur:r.duration,steps:r.legs[0].steps}; }

  // ------------------ 描画 ------------------
  function clearAll(){ for(const k in S.layers){ if(S.layers[k]){ try{ map.removeLayer(S.layers[k]); }catch(e){} S.layers[k]=null; } } if(S.curMarker){ try{ map.removeLayer(S.curMarker); }catch(e){} S.curMarker=null; } }
  function drawWalk(coords,key){ const line=L.polyline(coords,{color:getComputedStyle(document.documentElement).getPropertyValue('--walk').trim()||'#1e90ff',weight:6,opacity:.9}); line.addTo(map); S.layers[key]=line; return line; }
  async function drawSubway(segments){ const pls=[]; for(const seg of segments){ let color=getComputedStyle(document.documentElement).getPropertyValue('--meijo').trim(); // default
      if(seg.line==='東山線') color=getComputedStyle(document.documentElement).getPropertyValue('--higashiyama').trim();
      if(seg.line==='名城線') color=getComputedStyle(document.documentElement).getPropertyValue('--meijo').trim();
      if(seg.line==='名港線') color=getComputedStyle(document.documentElement).getPropertyValue('--meiko').trim();
      if(seg.line==='鶴舞線') color=getComputedStyle(document.documentElement).getPropertyValue('--tsurumai').trim();
      if(seg.line==='桜通線') color=getComputedStyle(document.documentElement).getPropertyValue('--sakura').trim();
      if(seg.line==='上飯田線') color=getComputedStyle(document.documentElement).getPropertyValue('--kamiiida').trim();
      const pts=[]; for(const name of seg.stops){ const pt=S.stationNodes.get(name); if(pt) pts.push([pt.lat,pt.lng]); }
      if(pts.length>=2){ const pl=L.polyline(pts,{color:color||'#6c5ce7',weight:6,opacity:.95}); pl.addTo(map); pls.push(pl); }
  }
  const g=L.layerGroup(pls).addTo(map); S.layers.subway=g; return g; }

  // ------------------ 行程UI ------------------
  function fmtDist(m){ return m>=1000? (m/1000).toFixed(2)+' km' : Math.round(m)+' m' }
  function fmtDur(s){ const m=Math.round(s/60); return m<60? `${m}分` : `${Math.floor(m/60)}時間${m%60}分` }
  function estimateSubwayTime(segments){ let stops=0,distKm=0; for(const seg of segments){ stops+=Math.max(0,seg.stops.length-1); for(let i=0;i<seg.stops.length-1;i++){ const a=S.stationNodes.get(seg.stops[i]); const b=S.stationNodes.get(seg.stops[i+1]); if(a&&b) distKm+=turf.distance(turf.point([a.lng,a.lat]),turf.point([b.lng,b.lat]),{units:'kilometers'}); } } const cruise=(distKm/32)*3600; const dwell=stops*90; return {seconds:cruise+dwell,stops}; }
  function estimateFare(stops){ return Math.min(340,210+stops*20); }

  function renderItineraryCombined({startStation,endStation,segments,walk1,walk2}){ const est=estimateSubwayTime(segments); const fare=estimateFare(est.stops); const totalSec=(walk1?walk1.dur:0)+est.seconds+(walk2?walk2.dur:0); const frag=[]; frag.push(`<div class="seg walk"><span class="badge">徒歩</span> 現在地 → <b>${startStation.name}</b>（${fmtDist(walk1.dist)} / ${fmtDur(walk1.dur)}）</div>`);
    for(const seg of segments){ frag.push(`<div class="seg subway"><span class="badge">${seg.line}</span> ${seg.stops[0]} → ${seg.stops[seg.stops.length-1]}（${seg.stops.length-1}駅）</div>`); }
    frag.push(`<div class="seg walk"><span class="badge">徒歩</span> <b>${endStation.name}</b> → 目的地（${fmtDist(walk2.dist)} / ${fmtDur(walk2.dur)}）</div>`);
    frag.push(`<div style="margin-top:8px"><b>合計所要時間</b>：${fmtDur(totalSec)}　<b>概算運賃</b>：${fare.toLocaleString()}円　<b>乗換回数</b>：${Math.max(0,segments.length-1)}回</div>`);
    E.itinerary.innerHTML=frag.join('');
    E.hudSum.textContent=`所要:${fmtDur(totalSec)} 運賃:${fare}円`; E.hudDetail.textContent=`徒歩:${fmtDist((walk1.dist||0)+(walk2.dist||0))} 地下鉄駅数:${est.stops}`; }

  // ------------------ 検索フロー ------------------
  async function performTransitSearch(){ try{ setStatus('検索開始'); if(!S.currentPos){ await getCurrentOnce(); }
      if(!S.dest){ const q=(E.to.value||'').trim(); if(!q) throw new Error('目的地を入力または地図で選択'); S.dest = await geocode(q); L.marker([S.dest.lat,S.dest.lng]).addTo(map).bindPopup('目的地').openPopup(); }
      clearAll(); const startStation=findNearestStation(S.currentPos); const endStation=findNearestStation(S.dest);
      if(!startStation||!endStation) throw new Error('最寄り駅が見つかりません'); setStatus(`出発最寄:${startStation.name} 到着最寄:${endStation.name}`);
      const rr=findSubwayRoute(startStation.name,endStation.name,3); if(!rr) throw new Error('地下鉄ルートが見つかりません');
      // 徒歩ルート取得
      const [walk1,walk2] = await Promise.all([ fetchFootRoute(S.currentPos,{lat:startStation.lat,lng:startStation.lng}), fetchFootRoute({lat:endStation.lat,lng:endStation.lng}, S.dest) ]);
      // 描画
      drawWalk(walk1.coords,'walk1'); await drawSubway(rr.segments); drawWalk(walk2.coords,'walk2'); const fg = L.featureGroup([S.layers.walk1, S.layers.subway, S.layers.walk2]); map.fitBounds(fg.getBounds(),{padding:[40,40]}); renderItineraryCombined({startStation,endStation,segments:rr.segments,walk1,walk2});
      // build navigation steps (linearized): walking steps then subway segments then walking steps
      buildNavSteps({startStation,endStation,walk1,walk2,segments:rr.segments}); setStatus('検索完了');
  }catch(e){ console.error(e); setStatus(e.message,true); E.itinerary.innerHTML=`<span style="color:#e53935">検索失敗：${e.message}</span>`; } }

  // ------------------ ジオコーディング ------------------
  async function geocode(q){ const url='https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=ja&q='+encodeURIComponent(q); const res=await fetch(url); if(!res.ok) throw new Error('ジオコード失敗'); const j=await res.json(); if(!j||!j[0]) throw new Error('場所が見つかりません'); return {lat:+j[0].lat,lng:+j[0].lon,label:j[0].display_name}; }

  // ------------------ 現在地取得 ------------------
  async function getCurrentOnce(){ return new Promise((res,rej)=>{ if(!navigator.geolocation){ rej(new Error('位置情報非対応')); return; } navigator.geolocation.getCurrentPosition(p=>{ S.currentPos={lat:p.coords.latitude,lng:p.coords.longitude}; ensureCurMarker(S.currentPos.lat,S.currentPos.lng); map.setView([S.currentPos.lat,S.currentPos.lng],14); res(); }, err=>rej(err), {enableHighAccuracy:true,timeout:15000}); }); }

  // ------------------ ナビ・ステップ構築 ------------------
  function buildNavSteps({startStation,endStation,walk1,walk2,segments}){
    const steps=[];
    // walk1 steps: use OSRM steps to create human messages
    for(const s of walk1.steps){ const instr=(s.maneuver && s.maneuver.instruction) || s.name || s.mode || ''; steps.push({type:'walk',text:stripHtml(s.maneuver && s.maneuver.instruction ? s.maneuver.instruction : (s.name||'徒歩で進む')),loc:s.maneuver && s.maneuver.location ? {lat:s.maneuver.location[1],lng:s.maneuver.location[0]}:null,dist:s.distance}); }
    // add board instruction
    steps.push({type:'info',text:`${startStation.name} に到着。ここから ${segments.length} セグメントで移動`});
    for(const seg of segments){ steps.push({type:'subway',text:`${seg.line}：${seg.stops[0]} → ${seg.stops[seg.stops.length-1]}（${seg.stops.length-1}駅）`,seg}); }
    steps.push({type:'info',text:`${endStation.name} に到着。ここから目的地まで徒歩`});
    for(const s of walk2.steps){ steps.push({type:'walk',text:stripHtml(s.maneuver && s.maneuver.instruction ? s.maneuver.instruction : (s.name||'徒歩で進む')),loc:s.maneuver && s.maneuver.location ? {lat:s.maneuver.location[1],lng:s.maneuver.location[0]}:null,dist:s.distance}); }
    S.currentRouteSteps = steps; renderRouteSteps(); }

  function stripHtml(t){ return t? t.replace(/<[^>]+>/g,'') : ''; }

  // ------------------ ステップ表示 ------------------
  function renderRouteSteps(){ E.routeStepsBody.innerHTML=''; const fr=document.createDocumentFragment(); S.currentRouteSteps.forEach((st,idx)=>{ const d=document.createElement('div'); d.className='turn-step'; d.textContent=`${idx+1}. ${st.type.toUpperCase()} — ${st.text}`; d.addEventListener('click',()=>{ if(st.loc) map.panTo([st.loc.lat,st.loc.lng]); else if(st.seg){ // zoom to segment
        const pts=st.seg.stops.map(n=>{ const p=S.stationNodes.get(n); return p? [p.lat,p.lng]:null }).filter(Boolean); if(pts.length) map.fitBounds(L.latLngBounds(pts),{padding:[40,40]}); } }); fr.appendChild(d); }); E.routeStepsBody.appendChild(fr); E.routeSteps.style.display='block'; }

  // ------------------ ナビ制御 ------------------
  function startNavigation(){ if(S.nav) return; if(!S.currentRouteSteps||!S.currentRouteSteps.length){ setStatus('ルートがありません',true); return; } S.nav=true; setStatus('ナビ開始'); E.startNav.disabled=true; E.stopNav.disabled=false; if(!navigator.geolocation){ setStatus('位置情報未対応。ナビ不可',true); return; } S.watchId = navigator.geolocation.watchPosition(onNavPos, onNavErr, {enableHighAccuracy:true,maximumAge:1000,timeout:15000}); }
  function stopNavigation(){ if(!S.nav) return; S.nav=false; setStatus('ナビ停止'); E.startNav.disabled=false; E.stopNav.disabled=true; if(S.watchId!=null){ navigator.geolocation.clearWatch(S.watchId); S.watchId=null; } }

  function onNavErr(e){ console.warn(e); setStatus('位置情報エラー',true); }

  function onNavPos(p){ const lat=p.coords.latitude, lng=p.coords.longitude; S.currentPos={lat,lng}; ensureCurMarker(lat,lng); if(S.follow) map.setView([lat,lng], clamp(map.getZoom(), CFG.FOLLOW_MIN_ZOOM, CFG.FOLLOW_MAX_ZOOM), {animate:false}); // update heading from movement if needed
    // determine next step
    const nextIdx = findNextStepIndex({lat,lng}); if(nextIdx!=null){ const st=S.currentRouteSteps[nextIdx]; E.hudNext.textContent = `次: ${st.text}`; if(st.type==='walk'){ // distance to step
        if(st.loc){ const d = turf.distance(turf.point([lng,lat]), turf.point([st.loc.lng,st.loc.lat]),{units:'meters'}); if(d < CFG.SPEAK_NEXT_AT_METERS){ speakJa(st.text); } } }
      else if(st.type==='subway'){ // detect proximity to stations
        // get upcoming alight station coords
        const seg=st.seg; const lastStation = seg.stops[seg.stops.length-1]; const pt=S.stationNodes.get(lastStation); if(pt){ const d=turf.distance(turf.point([lng,lat]), turf.point([pt.lng,pt.lat]),{units:'meters'}); if(d<300){ speakJa(`${lastStation} 到着間近。降車の準備をしてください`); } } }
    }
  }

  function findNextStepIndex(pos){ // naive: find first walk step with a loc further than threshold or subway step not yet passed
    for(let i=0;i<S.currentRouteSteps.length;i++){ const st=S.currentRouteSteps[i]; if(st.type==='walk' && st.loc){ const d=turf.distance(turf.point([pos.lng,pos.lat]), turf.point([st.loc.lng,st.loc.lat]),{units:'meters'}); if(d>5) return i; }
      if(st.type==='subway'){ // if current position near boarding station, return subway step
        const board = st.seg.stops[0]; const pt=S.stationNodes.get(board); if(pt){ const d=turf.distance(turf.point([pos.lng,pos.lat]), turf.point([pt.lng,pt.lat]),{units:'meters'}); if(d<300) return i; }
      }
    }
    return 0; }

  function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }

  // ------------------ UI wiring ------------------
  function getMode(){ const el=document.querySelector('.mode-btn.active'); return el? el.dataset.mode : 'transit'; }

  E.search.addEventListener('click', async ()=>{ const mode=getMode(); S.currentMode=mode; if(mode==='transit'){ await performTransitSearch(); } else { // existing OSRM route (driving/foot/bike)
      setStatus('外部ルート検索（OSRM）'); try{ const from=S.currentPos || await getCurrentOnce(); const to = await geocode(E.to.value); const profile = mode==='driving'?'driving':'foot'; const url=`https://router.project-osrm.org/route/v1/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`; const res=await fetch(url); const j=await res.json(); if(j.code==='Ok' && j.routes && j.routes.length){ const r=j.routes[0]; clearAll(); const coords=r.geometry.coordinates.map(c=>[c[1],c[0]]); drawWalk(coords,'walk1'); map.fitBounds(L.latLngBounds(coords)); S.currentRouteSteps = (r.legs[0].steps||[]).map(s=>({type:'walk',text:stripHtml(s.maneuver && s.maneuver.instruction? s.maneuver.instruction: s.name), loc: s.maneuver && s.maneuver.location? {lat:s.maneuver.location[1],lng:s.maneuver.location[0]}:null, dist:s.distance})); renderRouteSteps(); setStatus('ルート描画完了'); } else setStatus('ルート取得失敗',true); } });

  E.startNav.addEventListener('click', startNavigation); E.stopNav.addEventListener('click', stopNavigation);

  document.querySelectorAll('.mode-btn').forEach(b=> b.addEventListener('click', async ()=>{ document.querySelectorAll('.mode-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); }));

  // ------------------ 地図クリックで目的地 ------------------
  let clickMode=null; E.setToMap.addEventListener('click', ()=>{ clickMode='to'; setStatus('地図をクリックして目的地を選択してください'); }); map.on('click',(e)=>{ if(clickMode==='to'){ S.dest={lat:e.latlng.lat,lng:e.latlng.lng,label:'地図で選択'}; L.marker([S.dest.lat,S.dest.lng]).addTo(map).bindPopup('目的地').openPopup(); clickMode=null; setStatus('目的地が設定されました'); } });

  // ------------------ ユーティリティ: OSRM 歩行取得再定義 for earlier use ------------------
  async function fetchFootRoute(a,b){ const url=`https://router.project-osrm.org/route/v1/foot/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson&steps=true`; const res=await fetch(url); if(!res.ok) throw new Error('OSRMエラー'); const j=await res.json(); if(j.code!=='Ok' || !j.routes || !j.routes[0]) throw new Error('徒歩ルートなし'); const r=j.routes[0]; return {coords:r.geometry.coordinates.map(c=>[c[1],c[0]]),dist:r.distance,dur:r.duration,steps:r.legs[0].steps}; }

  // ------------------ getCurrentOnce duplicate for robustness ------------------
  async function getCurrentOnce(){ return new Promise((res,rej)=>{ if(!navigator.geolocation){ rej(new Error('位置情報未対応')); return; } navigator.geolocation.getCurrentPosition(p=>{ S.currentPos={lat:p.coords.latitude,lng:p.coords.longitude}; ensureCurMarker(S.currentPos.lat,S.currentPos.lng); map.setView([S.currentPos.lat,S.currentPos.lng],14); res(S.currentPos); }, err=>rej(err), {enableHighAccuracy:true,timeout:15000}); }); }

  // ------------------ 小さな初期化メッセージ ------------------
  setStatus('初期化完了 — 目的地を入力して検索してください');

  </script>
</body>
</html>
